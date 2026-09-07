#!/usr/bin/env bun
/**
 * La puerta al paquete de configuración: qué settings gana aquí, qué claves
 * existen, y si un archivo es válido.
 *
 * El problema que cierra. `settings/load.ts`, `settings/inventory.ts` y
 * `settings/validation.ts` están probados y son **inalcanzables desde donde
 * se necesitan**: siete módulos de producto, cero puertas (`bin/`, entrada
 * `bin` de `package.json`, o shebang). Un turno que pregunta «¿qué gana
 * aquí — el proyecto o lo local?» hoy sólo puede responderlo leyendo código.
 * Es la misma capacidad muerta que `flow-selection-agile.md` describe, aquí
 * para la capa que el harness y el resto del tooling ya consumen
 * (`@thyrox/config` es dependencia de `@thyrox/harness`).
 *
 * Tres subcomandos, derivados de lo que el paquete YA sabe hacer — no se
 * inventa superficie nueva:
 *
 * - `resolve`   — fusiona las fuentes declaradas por precedencia y muestra
 *                 el valor y el ORIGEN de cada clave (`settings/load.ts`).
 * - `inventory` — las claves del cliente con su ESTADO — consumida,
 *                 declarada o diferida (`settings/inventory.ts`).
 * - `validate`  — un archivo de settings contra el esquema, con los avisos
 *                 de `settings/validation.ts` y las claves diferidas que
 *                 traiga (`settings/inventory.ts`).
 *
 * Salidas: 0 si el subcomando corrió sin defecto que reportar · 1 si
 * `validate`/`resolve` encontraron un archivo que existe y no cargó · 2 si
 * falta una precondición (subcomando ausente, argumento obligatorio ausente,
 * archivo declarado que no existe) — **nunca se emite una cifra adivinada**.
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  deferredCondition, deferredReason, keysByStatus, type KeyStatus,
} from '../settings/inventory.ts'
import { isEnvTruthy, readEnv } from '../env/utils.ts'
import { loadSettings, type LoadSpec, type LoadResult } from '../settings/load.ts'
import { parseSettingSourcesFlag, sourceDisplayName, type SettingSource } from '../settings/constants.ts'

/** Salida de un subcomando: sus líneas de stdout y el código con el que sale. */
type CommandResult = { exitCode: number; lines: string[] }

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

/** El primer token que no empieza con `--`: el posicional del subcomando. */
function positional(argv: string[]): string | undefined {
  return argv.find((a) => !a.startsWith('--'))
}

/**
 * El hogar de los settings de usuario, sin traer `@thyrox/storage` sólo por
 * esta línea — mismo criterio que `app-host/src/main/startup/settings.ts` ya
 * aplicó al reimplementar piezas de un párrafo en vez de cruzar de paquete.
 * El patrón (`CLAUDE_CONFIG_DIR` o `~/.claude`) se repite igual en
 * `storage/src/{plans,projectPurge,sessionEnvironment,sessionPaths}.ts` y en
 * `app-host/src/startup/startupProfiler.ts`.
 */
function userConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
}

/** Las tres fuentes con convención de ruta conocida EN ESTE ÁRBOL. */
function defaultSpecs(cwd: string): LoadSpec[] {
  return [
    { source: 'userSettings', path: join(userConfigDir(), 'settings.json') },
    { source: 'projectSettings', path: join(cwd, '.claude', 'settings.json') },
    { source: 'localSettings', path: join(cwd, '.claude', 'settings.local.json') },
  ]
}

/**
 * `--source NOMBRE=RUTA`, repetible. `NOMBRE` acepta el alias corto
 * (`user`, `project`, `local`, `flag`, `policy`) o el nombre canónico — la
 * misma resolución que `parseSettingSourcesFlag` ya hace, reusada en vez de
 * duplicar el mapa de alias.
 */
function parseSourceFlags(argv: string[]): LoadSpec[] {
  const specs: LoadSpec[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--source') continue
    const raw = argv[i + 1]
    if (!raw || !raw.includes('=')) {
      throw new Error(
        `--source exige NOMBRE=RUTA (recibido: ${JSON.stringify(raw)}). ` +
          'NOMBRE es un alias (user, project, local, flag, policy) o el nombre canónico.',
      )
    }
    const cut = raw.indexOf('=')
    const name = raw.slice(0, cut)
    const path = raw.slice(cut + 1)
    const [source] = parseSettingSourcesFlag(name) as [SettingSource]
    specs.push({ source, path })
  }
  return specs
}

/**
 * Las fuentes por defecto más las explícitas — una explícita REEMPLAZA a la
 * por defecto de la misma fuente, no la duplica: dos rutas para
 * `projectSettings` fusionarían el mismo nivel de precedencia dos veces y
 * `mergeSettings` no tiene forma de saber cuál de las dos manda.
 */
function specsFor(argv: string[], cwd: string): LoadSpec[] {
  const explicit = parseSourceFlags(argv)
  const base = argv.includes('--skip-defaults') ? [] : defaultSpecs(cwd)
  const byName = new Map<SettingSource, LoadSpec>(base.map((s) => [s.source, s]))
  for (const e of explicit) byName.set(e.source, e)
  return [...byName.values()]
}

/**
 * `resolve` — la precedencia efectiva, con el origen de cada clave.
 *
 * El guard que decide el código de salida: un archivo DECLARADO que EXISTE y
 * no terminó en `loaded` falló por su contenido (JSON o esquema inválidos) —
 * eso es 1. Un archivo que simplemente no existe no es un defecto de esta
 * invocación (`loadSettings` ya lo salta en silencio); confundir los dos
 * marcaría como roto un árbol sin `settings.local.json`, que es el caso
 * normal.
 */
function resolveCommand(argv: string[], cwd: string): CommandResult {
  let specs: LoadSpec[]
  try {
    specs = specsFor(argv, cwd)
  } catch (e) {
    return { exitCode: 2, lines: [(e as Error).message] }
  }

  const r: LoadResult = loadSettings(specs)
  const broken = specs.filter((s) => existsSync(s.path) && !r.loaded.some((l) => l.path === s.path))
  const exitCode = broken.length > 0 ? 1 : 0

  if (argv.includes('--json')) {
    return { exitCode, lines: [JSON.stringify({ ...r, broken: broken.map((s) => s.path) }, null, 2)] }
  }

  const lines: string[] = []
  for (const s of specs) {
    const estado = r.loaded.some((l) => l.path === s.path)
      ? 'cargado'
      : existsSync(s.path)
        ? 'FALLÓ'
        : 'ausente'
    lines.push(`  ${sourceDisplayName(s.source).padEnd(24)} ${estado.padEnd(9)} ${s.path}`)
  }
  lines.push('')
  const claves = Object.keys(r.settings).sort()
  if (claves.length === 0) {
    lines.push('  (ninguna clave fusionada)')
  } else {
    for (const clave of claves) {
      lines.push(`  ${clave.padEnd(24)} ${sourceDisplayName(r.origin[clave]!).padEnd(24)} ${JSON.stringify((r.settings as Record<string, unknown>)[clave])}`)
    }
  }
  for (const e of r.errors) lines.push(`  aviso: ${e.file} — ${e.message}`)
  lines.push('')
  lines.push(`· alcance: ${claves.length} clave(s) fusionadas de ${r.loaded.length} de ${specs.length} fuente(s) cargadas`)
  lines.push('· Métrica: `mergeSettings` sobre las fuentes con archivo presente y válido, ordenadas por precedencia.')
  lines.push(
    '· Ciega a: `policySettings` sin ruta convencional en este árbol (declárala con --source policy=<ruta>); ' +
      'y una clave presente en el archivo pero rechazada por el esquema, que sale en los avisos, no en la fusión.',
  )
  return { exitCode, lines }
}

/** `inventory` — las claves del cliente, con su estado y (si diferida) su condición de entrada. */
function inventoryCommand(argv: string[]): CommandResult {
  const filtro = arg(argv, 'status')
  if (filtro !== undefined && !['consumida', 'declarada', 'diferida'].includes(filtro)) {
    return {
      exitCode: 2,
      lines: [`inventory: --status desconocido: ${JSON.stringify(filtro)}. Válidos: consumida, declarada, diferida.`],
    }
  }
  const porEstado = keysByStatus()
  const estados: KeyStatus[] = filtro ? [filtro as KeyStatus] : ['consumida', 'declarada', 'diferida']

  if (argv.includes('--json')) {
    const rows = estados.flatMap((estado) =>
      porEstado[estado].map((key) => ({
        key,
        status: estado,
        ...(estado === 'diferida' ? { reason: deferredReason(key), condition: deferredCondition(key) } : {}),
      })),
    )
    return { exitCode: 0, lines: [JSON.stringify(rows, null, 2)] }
  }

  const lines: string[] = []
  for (const estado of estados) {
    const keys = porEstado[estado]
    lines.push(`${estado} (${keys.length}):`)
    for (const key of keys) {
      lines.push(estado === 'diferida'
        ? `  ${key.padEnd(32)} ${deferredReason(key)} — entraría ${deferredCondition(key)}`
        : `  ${key}`)
    }
    lines.push('')
  }
  const total = Object.values(porEstado).reduce((n, ks) => n + ks.length, 0)
  lines.push(`· alcance: ${estados.reduce((n, e) => n + porEstado[e].length, 0)} de ${total} clave(s) del cliente`)
  return { exitCode: 0, lines }
}

/**
 * `validate` — un archivo de settings contra el esquema.
 *
 * El guard que decide el rehúso (2): un archivo declarado que NO EXISTE no
 * se intenta — sin este check, `loadSettings` lo salta en silencio
 * (`if (!existsSync(path)) continue`, sin tocar `errors`), y el resultado
 * sería indistinguible de un archivo con contenido inválido: los dos
 * terminan con `loaded.length === 0`. Es la diferencia entre «no se pudo
 * intentar» y «se intentó y falló» — 2 contra 1 — y sin el guard colapsan en
 * el mismo código.
 */
function validateCommand(argv: string[]): CommandResult {
  const path = positional(argv)
  if (!path) {
    return {
      exitCode: 2,
      lines: ['Falta el archivo: `settings.ts validate <archivo.json>`. No se adivina cuál validar.'],
    }
  }
  if (!existsSync(path)) {
    return {
      exitCode: 2,
      lines: [`validate: «${path}» no existe. No se adivina el contenido de un archivo ausente.`],
    }
  }

  const r = loadSettings([{ source: 'flagSettings', path }])
  const ok = r.loaded.some((l) => l.path === path)
  const lines: string[] = []
  for (const e of r.errors) lines.push(`  ${e.path}: ${e.message}`)
  lines.push(ok
    ? `válido: ${Object.keys(r.settings).length} clave(s) de nivel superior aceptadas`
    : 'inválido: el archivo no cargó (ver los avisos arriba)')
  lines.push('· Métrica: `SettingsSchema` de `settings/types.ts` sobre el contenido de este archivo.')
  lines.push(
    '· Ciega a: si el harness consumirá cada clave (ver `inventory` para el estado por clave) y si un ' +
      'comando de hook referenciado existe de verdad en el filesystem.',
  )
  return { exitCode: ok ? 0 : 1, lines }
}

/** Las formas que `isEnvTruthy` acepta, para publicarlas junto al veredicto. */
const TRUTHY_FORMS = '1, true, yes, on (sin distinguir mayúsculas, con espacios al margen)'

/**
 * El veredicto de verdad del proyecto sobre una variable de entorno.
 *
 * Separa tres estados y no dos: verdadera, declarada-y-falsa, y **no
 * declarada**. Las dos últimas comparten el booleano y tienen conductas
 * opuestas para quien pregunta — «lo apagué» contra «nunca lo declaré»—, así
 * que colapsarlas sería el mismo defecto que un cero impreso sin poder medir.
 *
 * `--quiet` lleva el veredicto al código de salida (0 verdadero, 1 falso) para
 * uso desde shell. Ojo al componerlo bajo `pipefail`: el código se lee del
 * proceso, no del final de una tubería.
 */
function truthyCommand(argv: string[]): CommandResult {
  const name = positional(argv)
  if (name === undefined) {
    return {
      exitCode: 2,
      lines: [
        'truthy: falta el nombre de la variable. NO se emite veredicto: un',
        '«falso» aquí no distinguiría «la variable es falsa» de «no se preguntó».',
      ],
    }
  }
  const raw = readEnv(name)
  const verdict = isEnvTruthy(raw)
  if (argv.includes('--quiet')) return { exitCode: verdict ? 0 : 1, lines: [] }
  const state = raw === undefined
    ? 'no declarada'
    : `declarada como ${JSON.stringify(raw)}`
  return {
    exitCode: 0,
    lines: [
      `${name}: ${verdict ? 'verdadero' : 'falso'} — ${state}`,
      `  cuentan como verdadero: ${TRUTHY_FORMS}`,
    ],
  }
}

const AYUDA = `settings — la puerta a @thyrox/config

  bun run bin/settings.ts <subcomando> [opciones]

  resolve [--cwd <ruta>] [--source NOMBRE=RUTA ...] [--skip-defaults] [--json]
        fusiona userSettings/projectSettings/localSettings (rutas por
        convención bajo <ruta o cwd>/.claude/ y ~/.claude/, o \${CLAUDE_CONFIG_DIR})
        por precedencia y muestra valor + origen de cada clave.
        --source repite; NOMBRE=user|project|local|flag|policy (o el nombre
        canónico) sustituye a la ruta por defecto de esa fuente.
        --skip-defaults: sólo las --source dadas, sin las convencionales.

  inventory [--status consumida|declarada|diferida] [--json]
        las claves del cliente (CLIENT_SETTING_KEYS) con su estado; las
        diferidas listan el motivo y la condición que las traería.

  validate <archivo.json> [--json]
        el archivo contra SettingsSchema, con los avisos de claves diferidas
        presentes y de reglas de permiso no-cadena descartadas.

  truthy <VARIABLE> [--quiet]
        si el proyecto cuenta esa variable de entorno como verdadera, con la
        tabla de formas aceptadas y si está declarada o ausente.
        --quiet: sin salida, el veredicto en el código (0 verdadero, 1 falso).

  -h, --help    esta ayuda
`

export function main(argv: string[]): number {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    console.log(AYUDA)
    return argv.length === 0 ? 2 : 0
  }
  const sub = argv[0]
  const rest = argv.slice(1)
  const cwd = arg(rest, 'cwd') ?? process.cwd()

  let result: CommandResult
  if (sub === 'resolve') result = resolveCommand(rest, cwd)
  else if (sub === 'inventory') result = inventoryCommand(rest)
  else if (sub === 'validate') result = validateCommand(rest)
  else if (sub === 'truthy') result = truthyCommand(rest)
  else {
    console.error(`settings: subcomando desconocido: ${JSON.stringify(sub)}. Válidos: resolve, inventory, validate, truthy.\n`)
    console.log(AYUDA)
    return 2
  }
  for (const line of result.lines) console.log(line)
  return result.exitCode
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)))
}
