/**
 * La contraparte TypeScript de `reach.py`, acotada a sus consumidores reales.
 *
 * PORTE PARCIAL DECLARADO, y su tramo de árbol YA NO lo es. Se portan
 * `readEnvFile`, `envFilePath`, `envValue` y `thyroxRoot`, más `agentsDir`,
 * que la mitad Python no declara porque ningún consumidor suyo emite
 * artefactos de agente; y desde hoy también el tramo del árbol de clones
 * —`cloneName`, `cloneNames`, `envNames`, `treeRoot`, `root`, `roots`,
 * `extraRoots`, `reach`—, que la nota anterior daba por no portado *porque
 * ningún `.ts` lo consultaba*. Ya lo consulta: `paths/docs.ts` resuelve la
 * raíz de `kaupamex-docs`, y hasta hoy lo hacía con su PROPIA cadena
 * (`KAUPAMEX_DOCS_ROOT` + ascenso a `source/gestion/pm/`) — una segunda
 * fuente de verdad para una decisión que este módulo ya tomaba.
 *
 * Lo que sigue SIN portar, y su razón: `consumerRoot` (su consumidor es la
 * familia de gates en Python), `paths`, `requireAll` y `main` (el CLI). Un
 * porte parcial declarado se completa cuando aparece su consumidor, no se
 * deja con la nota — `porte-completo-no-parcial.md`.
 *
 * Divergencia respecto de la fuente, declarada: `thyroxRoot` NO tiene el
 * tercer paso —el barrido de hermanos vía `treeRoot`—, que la mitad Python sí
 * hace. Ahora que `treeRoot` está portado el paso es construible; queda fuera
 * de este pase porque cambiaría la resolución de la raíz del PROVEEDOR, que
 * no es lo que el consumidor nuevo necesita, y su control es otro.
 *
 * El defecto que cierra: 12 archivos `.ts` de este árbol resuelven su raíz con
 * aritmética de ruta (`join(dir, '..','..','..','..')`), que es la forma que
 * el docstring de `reach.py` declara que **falla en silencio** al mover el
 * archivo un nivel. Ya falló aquí: el renombre que llevó `.claude/agents/` a
 * `src/agents/definitions/` dejó dos rutas atrás y el control byte a byte
 * apuntó semanas a un directorio que no existe.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Dónde buscar el archivo de entorno, si no se declara uno explícito. */
export const ENV_FILE_VAR = 'THYROX_ENV_FILE'
export const ENV_FILE_NAME = '.env'

/** La variable que declara la raíz de THYROX mismo. */
export const THYROX_ROOT_VAR = 'THYROX_ROOT'

/**
 * El marcador por el que se reconoce la raíz de thyrox al ascender. Es un
 * ARCHIVO y no el nombre del directorio a propósito: un clon renombrado o
 * copiado sigue siendo thyrox, y un directorio llamado `thyrox` sin el
 * mecanismo dentro no lo es.
 */
export const THYROX_MARKER = join('src', 'paths', 'reach.py')

/** La variable que declara dónde se emiten los artefactos de agente. */
export const AGENTS_DIR_VAR = 'THYROX_AGENTS_DIR'

/** El hogar propio, relativo a la raíz de thyrox, cuando nadie declara otro. */
export const AGENTS_DIR_DEFAULT = join('src', 'agents', 'definitions')

export class ReachRootError extends Error {}

/**
 * Analiza un `.env` y devuelve sus pares, sin librería de terceros.
 *
 * Cubre lo mismo que la mitad Python: comentarios, líneas en blanco, el
 * prefijo `export` y comillas alrededor del valor. Una línea sin `=` se
 * descarta en silencio — rehusar el archivo entero por una línea suelta
 * dejaría al consumidor sin ninguna de las buenas. No expande `${OTRA}`: la
 * interpolación es una segunda gramática y no hay consumidor que la pida.
 */
export function readEnvFile(path: string): Record<string, string> {
  const values: Record<string, string> = {}
  if (!existsSync(path) || !statSync(path).isFile()) return values
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    let line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice('export '.length).trimStart()
    const cut = line.indexOf('=')
    if (cut === -1) continue
    const key = line.slice(0, cut).trim()
    if (!key) continue
    let value = line.slice(cut + 1).trim()
    if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

/** El directorio desde el que arranca un ascenso cuando nadie declara otro. */
function defaultStart(): string {
  return dirname(fileURLToPath(import.meta.url))
}

/** Cada nivel desde `from` hasta la raíz del sistema de archivos, incluido. */
function levelsUpward(from: string): string[] {
  const levels: string[] = []
  let level = resolve(from)
  for (;;) {
    levels.push(level)
    const parent = dirname(level)
    if (parent === level) return levels
    level = parent
  }
}

/**
 * El `.env` que gobierna: el declarado por `THYROX_ENV_FILE`, si no el primero
 * que aparezca ascendiendo desde `start`. El ascenso es el mismo criterio que
 * el de `thyroxRoot` y por la misma razón: no depende de la profundidad a la
 * que viva el consumidor.
 */
export function envFilePath(start?: string): string | null {
  const declared = process.env[ENV_FILE_VAR]
  if (declared) {
    return existsSync(declared) && statSync(declared).isFile() ? declared : null
  }
  for (const level of levelsUpward(start ?? defaultStart())) {
    const candidate = join(level, ENV_FILE_NAME)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/**
 * El valor de una variable: primero el proceso, después el `.env`.
 *
 * El proceso gana porque es la declaración más inmediata: quien exporta una
 * variable para UNA invocación está corrigiendo, a propósito, lo que el
 * archivo dice para todas.
 */
export function envValue(name: string, start?: string): string | null {
  const fromProcess = process.env[name]
  if (fromProcess) return fromProcess
  const path = envFilePath(start)
  if (path === null) return null
  return readEnvFile(path)[name] || null
}

/**
 * La raíz de THYROX mismo, por variable declarada o por ascenso al marcador.
 *
 * `start` es un parámetro y no `import.meta.url` por la misma razón que en la
 * mitad Python: un mecanismo comprobable a cualquier profundidad, no uno que
 * sólo acierta desde donde su autor lo escribió.
 */
export function thyroxRoot(start?: string): string {
  const declared = envValue(THYROX_ROOT_VAR, start)
  if (declared) return declared
  const here = resolve(start ?? defaultStart())
  for (const level of levelsUpward(here)) {
    const marker = join(level, THYROX_MARKER)
    if (existsSync(marker) && statSync(marker).isFile()) return level
  }
  throw new ReachRootError(
    `no se pudo derivar la raíz de thyrox desde ${here}: ni la variable ` +
      `${THYROX_ROOT_VAR}, ni el ascenso por ${THYROX_MARKER}. Declara ` +
      `${THYROX_ROOT_VAR}.`,
  )
}

/**
 * El hogar de los artefactos de agente — un PARÁMETRO, no un literal.
 *
 * Dos entradas, ambas de entorno, en el orden que `envValue` fija: la variable
 * del proceso y la del `.env`. Y un tercer camino que no es de entorno: el
 * hogar propio de thyrox, para que el producto sea usable **sin configurar
 * nada**. Declarar el hogar por usuario es una decisión del consumidor, no un
 * requisito del emisor: es lo que hace que el multi-repo funcione sin que
 * thyrox tenga que saber dónde vive cada clon.
 *
 * NO se verifica que el directorio exista. Un hogar declarado y ausente es un
 * hecho del consumidor que su llamador tiene que poder ver; inventarlo o
 * crearlo aquí escondería la divergencia que este mecanismo existe para
 * exponer.
 */
export function agentsDir(start?: string): string {
  const declared = envValue(AGENTS_DIR_VAR, start)
  if (declared) return declared
  return join(thyroxRoot(start), AGENTS_DIR_DEFAULT)
}

/** Los nombres de los `.md` de agente presentes en un hogar dado. */
export function agentArtifacts(dir: string = agentsDir()): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
}

/**
 * Las raíces DECLARADAS del alcance, en el orden de `reach.py`.
 *
 * `thyrox` no está aquí a propósito: es el PROVEEDOR, y su raíz la resuelve
 * `thyroxRoot()` por su propio marcador. Estas cinco son los consumidores.
 */
export const REACH_ROOTS = ['api', 'db', 'docs', 'server', 'ui'] as const
export type ReachRoot = typeof REACH_ROOTS[number]

/**
 * El prefijo del nombre de clon. Vive aquí y no repetido en cada consumidor
 * porque el rename `e-comerce-*` -> `kaupamex-*` (DEC-KX-06) ya demostró que
 * cambia.
 */
export const CLONE_PREFIX = 'kaupamex-'

/**
 * Las grafías del árbol, EN ORDEN. Gana la primera declarada.
 *
 * `KAUPAMEX_ROOT` queda de segunda y no por cortesía: tiene consumidores vivos
 * que se romperían al retirarla. Mismo criterio que la mitad Python.
 */
export const TREE_ROOT_VARS = ['THYROX_REACH_ROOT', 'KAUPAMEX_ROOT'] as const

/** Las grafías del tramo extensible, EN ORDEN. Separadas por `:`, como `PATH`. */
export const EXTRA_ROOTS_VARS = ['THYROX_EXTRA_REACH_ROOTS', 'KAUPAMEX_EXTRA_ROOTS'] as const

/** El nombre largo del clon: `api` -> `kaupamex-api`. */
export function cloneName(repo: string): string {
  if (!(REACH_ROOTS as readonly string[]).includes(repo)) {
    throw new ReachRootError(
      `raíz desconocida: ${JSON.stringify(repo)}. Las declaradas son ${REACH_ROOTS.join(', ')}.`,
    )
  }
  return `${CLONE_PREFIX}${repo}`
}

/** Los nombres largos de las raíces declaradas, en su orden. */
export function cloneNames(): string[] {
  return REACH_ROOTS.map(cloneName)
}

/**
 * Las constantes por raíz, EN ORDEN: `docs` -> `THYROX_REACH_DOCS`, `KAUPAMEX_DOCS`.
 *
 * Públicas porque las LEE `root()`: forman parte del contrato, y quien quiera
 * declarar una raíz necesita saber cómo se llama su variable sin reconstruir
 * la regla.
 */
export function envNames(repo: string): string[] {
  const suffix = repo.toUpperCase().replace(/-/g, '_')
  return ['THYROX_REACH_ROOT', 'KAUPAMEX'].map((v) =>
    v.endsWith('_ROOT') ? `${v.slice(0, -'_ROOT'.length)}_${suffix}` : `${v}_${suffix}`,
  )
}

/**
 * El padre de los clones, por variable declarada o por ascenso.
 *
 * `start` es un parámetro y no `import.meta.url` por la misma razón que en la
 * mitad Python: un mecanismo comprobable a cualquier profundidad, no uno que
 * sólo acierta desde donde su autor lo escribió.
 */
export function treeRoot(start?: string): string {
  for (const v of TREE_ROOT_VARS) {
    const declared = envValue(v, start)
    if (declared) return declared
  }
  const here = resolve(start ?? defaultStart())
  const names = cloneNames()
  for (const level of levelsUpward(here)) {
    if (names.some((n) => existsSync(join(level, n)) && statSync(join(level, n)).isDirectory())) {
      return level
    }
  }
  throw new ReachRootError(
    `no se pudo derivar el padre de los clones ascendiendo desde ${here}. Ninguno de ` +
      `${names.join(', ')} apareció en ningún nivel. Declara ${TREE_ROOT_VARS[0]} o ` +
      'invoca desde dentro del árbol.',
  )
}

/**
 * La ruta absoluta de una raíz declarada, por la cadena de precedencia.
 *
 * NO comprueba que exista: un consumidor que sólo necesita componer una ruta
 * no debe pagar una llamada al sistema de archivos por cada raíz.
 */
export function root(repo: string, start?: string): string {
  const name = cloneName(repo)          // valida el repo antes de mirar el entorno
  for (const v of envNames(repo)) {
    const declared = envValue(v, start)
    if (declared) return declared
  }
  return join(treeRoot(start), name)
}

/** Sólo las DECLARADAS, sin el tramo extra — la vista hermana de `reach()`. */
export function roots(start?: string): Record<string, string> {
  return Object.fromEntries(REACH_ROOTS.map((r) => [r, root(r, start)]))
}

/**
 * El tramo extensible, leído del entorno.
 *
 * Cada ruta debe ser **absoluta**: sin esa verificación, el tramo extra sería
 * la vía por la que una relativa entra al conjunto, y cada consumidor la
 * resolvería contra su propio directorio de trabajo.
 */
export function extraRoots(): Record<string, string> {
  const raw = EXTRA_ROOTS_VARS.map((v) => process.env[v]).find(Boolean) ?? ''
  const result: Record<string, string> = {}
  for (const piece of raw.split(':').filter(Boolean)) {
    if (!piece.startsWith('/')) {
      throw new ReachRootError(
        `la raíz extra ${JSON.stringify(piece)} no es absoluta. ${EXTRA_ROOTS_VARS[0]} las ` +
          'exige absolutas: una relativa se resolvería contra el directorio de trabajo de ' +
          'cada consumidor, que es distinto.',
      )
    }
    result[piece.split('/').filter(Boolean).pop() as string] = piece
  }
  return result
}

/** El conjunto RESUELTO: las declaradas más el tramo extra. */
export function reach(start?: string): Record<string, string> {
  return { ...roots(start), ...extraRoots() }
}
