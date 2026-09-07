#!/usr/bin/env bun
/**
 * La puerta al paquete storage: leer lo que ya persiste en disco.
 *
 * El problema que cierra. `src/packages/storage` tiene 68 módulos de
 * producto y NINGUNA puerta (medido con
 * `kaupamex-docs: .claude/eventos/puertas-cli-faltantes-20260907T020525/
 * probes/census_cli_doors.py`) — el conteo más alto del árbol. Ahí viven
 * los stores que son el estado de una sesión (`stores/transcriptStore.ts`,
 * `stores/sessionMetadataStore.ts`, `stores/artifactStore.ts`,
 * `task/diskOutput.ts`) y su infraestructura (`sessionPaths.ts`,
 * `cache-paths.ts`, `lockfile.ts`, `backends/localFileBackend.ts`). Un
 * turno que necesita saber qué hay guardado no tenía cómo preguntarlo.
 *
 * SÓLO LECTURA, a propósito: multiplicar la superficie a 68 puertas es
 * coste de mantenimiento sin necesidad demostrada, y una puerta que
 * ESCRIBE en el estado de una sesión desde la línea de comandos es una
 * superficie de daño que nadie pidió. Si hiciera falta escribir, eso se
 * registra como hallazgo con su sucesor — no se decide aquí.
 *
 * La raíz del estado (dónde viven transcripts/metadata de sesión) es un
 * PARÁMETRO DEL CONSUMIDOR, no una constante de este mecanismo. Va por
 * las DOS entradas que `paths/reach.ts` ya resuelve para cualquier
 * variable: el valor directo del proceso, y — si no está — la ruta a su
 * declaración en un `.env` (gobernado por `THYROX_ENV_FILE`, o el primer
 * `.env` que aparezca ascendiendo). Aquí la variable es `CLAUDE_CONFIG_DIR`
 * — el mismo nombre que `sessionPaths.ts` ya lee del proceso — y sólo si
 * ninguna de las dos entradas la declara se cae al `~/.claude` que el
 * propio mecanismo portado ya usaba de default. Ningún `parents[N]`: el
 * único ascenso que ocurre es el de `envFilePath()` dentro de
 * `paths/reach.ts`, ya escrito y probado para eso.
 */
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { envValue } from '../../../paths/reach.ts'
import { CACHE_PATHS, setCwdFn } from '../src/cache-paths.ts'
import { BackendArtifactStore, FileSessionMetadataStore, FileTranscriptStore, LocalFileStorageBackend } from '../src/index.ts'
import { check as checkLock } from '../src/lockfile.ts'
import { getProjectDir, setOriginalCwd, setSessionId } from '../src/sessionPaths.ts'
import { getTaskOutput, getTaskOutputPath } from '../src/task/diskOutput.ts'

/** La grafía que declara dónde vive el estado real de una sesión. */
const STATE_ROOT_VAR = 'CLAUDE_CONFIG_DIR'

const AYUDA = `storage — leer lo que el paquete ya persiste en disco (SÓLO LECTURA)

  bun run bin/storage.ts <subcomando> [argumentos] [opciones]

  sessions                        lista los ids de sesión (transcripts) de un proyecto
    --project <cwd>                  el proyecto cuyas sesiones se listan (por defecto: cwd)

  transcript <sessionId>           imprime los eventos JSONL de una sesión
    --project <cwd>                  ídem
    --tail <n>                       sólo los últimos n eventos

  metadata <sessionId> --dir <ruta>  imprime la metadata.json de una sesión
                                     --dir es OBLIGATORIO: no hay directorio
                                     canónico que adivinar para este store

  artifact <ruta>                  imprime un artefacto por su ruta exacta
                                     (el contrato de ArtifactStore no tiene
                                     raíz propia — la ruta ES la clave)

  task-output <taskId>             imprime la salida en disco de una tarea bash
    --session-id <id>                OBLIGATORIO: sin él se generaría un id
                                     de sesión NUEVO y se leería el directorio
                                     equivocado en silencio
    --cwd <ruta>                     el proyecto de esa sesión (por defecto: cwd)

  cache-paths                     imprime las rutas de caché resueltas (logs,
                                     errores, mensajes) para un proyecto
    --cwd <ruta>                     por defecto: cwd

  lock-status <ruta>               ¿está bloqueada esta ruta ahora mismo?

  Comunes:
  --state-root <ruta>              fuerza la raíz del estado (transcripts/
                                     metadata); si se omite, se deriva de
                                     ${STATE_ROOT_VAR} (proceso, luego \`.env\`),
                                     y si tampoco está declarada, de ~/.claude

  Salidas: 0 con dato · 1 si el objeto consultado no existe (resultado real,
  no error de invocación) · 2 si falta una precondición — nunca se adivina.
`

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

/**
 * Resuelve y APLICA la raíz del estado: la deja en `process.env.CLAUDE_CONFIG_DIR`
 * para que `sessionPaths.ts` (que SÍ es el mecanismo real, no una copia)
 * la vea y derive `getProjectDir`/`getTranscriptPath` sobre ella. Evita una
 * segunda fuente de verdad para la misma resolución de ruta.
 */
function applyStateRoot(argv: string[]): string {
  const declared = arg(argv, 'state-root')
  const value = declared ?? envValue(STATE_ROOT_VAR) ?? join(homedir(), '.claude')
  process.env[STATE_ROOT_VAR] = value
  return value
}

const backend = new LocalFileStorageBackend()

function sessionsCommand(argv: string[]): number {
  const stateRoot = applyStateRoot(argv)
  const project = arg(argv, 'project') ?? process.cwd()
  const sessionsDir = getProjectDir(project)
  if (!existsSync(sessionsDir)) {
    process.stdout.write(`· estado: ${stateRoot}\n· proyecto: ${project}\n`)
    process.stdout.write(`· sesiones: 0 (el directorio ${sessionsDir} no existe)\n`)
    return 0
  }
  const ids = readdirSync(sessionsDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => f.slice(0, -'.jsonl'.length))
    .sort()
  process.stdout.write(`· estado: ${stateRoot}\n· proyecto: ${project}\n`)
  process.stdout.write(`· sesiones: ${ids.length} en ${sessionsDir}\n`)
  for (const id of ids) process.stdout.write(`${id}\n`)
  return 0
}

async function transcriptCommand(argv: string[], sessionId: string | undefined): Promise<number> {
  if (!sessionId) {
    process.stderr.write('Falta el id de sesión: bin/storage.ts transcript <sessionId>\n')
    return 2
  }
  applyStateRoot(argv)
  const project = arg(argv, 'project') ?? process.cwd()
  const sessionsDir = getProjectDir(project)
  const store = new FileTranscriptStore(backend, sessionsDir)
  const path = join(sessionsDir, `${sessionId}.jsonl`)
  if (!existsSync(path)) {
    process.stderr.write(`no existe: ${path}\n`)
    return 1
  }
  const events = await store.readSessionEvents(sessionId)
  const tailArg = arg(argv, 'tail')
  const shown = tailArg ? events.slice(-Number(tailArg)) : events
  for (const line of shown) process.stdout.write(`${line}\n`)
  process.stdout.write(`· eventos: ${shown.length} de ${events.length} en ${path}\n`)
  return 0
}

async function metadataCommand(argv: string[], sessionId: string | undefined): Promise<number> {
  if (!sessionId) {
    process.stderr.write('Falta el id de sesión: bin/storage.ts metadata <sessionId> --dir <ruta>\n')
    return 2
  }
  const dir = arg(argv, 'dir')
  if (!dir) {
    // Rehusar antes que adivinar: SessionMetadataStore no declara un
    // directorio canónico en este árbol (ningún consumidor lo fija aún) —
    // inventar uno daría un "no encontrado" que se lee como "no existe"
    // cuando en realidad se miró en el lugar equivocado.
    process.stderr.write(
      'Falta --dir <ruta>: FileSessionMetadataStore no tiene un directorio ' +
        'canónico que adivinar en este árbol. Declararlo evita mirar en el ' +
        'lugar equivocado y leerlo como "no existe".\n',
    )
    return 2
  }
  const store = new FileSessionMetadataStore(backend, dir)
  const path = join(dir, `${sessionId}.metadata.json`)
  const metadata = await store.readSessionMetadata(sessionId)
  if (metadata === null) {
    process.stderr.write(`no existe o es inválido: ${path}\n`)
    return 1
  }
  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
  return 0
}

async function artifactCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write('Falta la ruta: bin/storage.ts artifact <ruta>\n')
    return 2
  }
  const store = new BackendArtifactStore(backend)
  const data = await store.readArtifact(path)
  if (data === null) {
    process.stderr.write(`no existe: ${path}\n`)
    return 1
  }
  const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8')
  process.stdout.write(`${text}\n`)
  return 0
}

async function taskOutputCommand(argv: string[], taskId: string | undefined): Promise<number> {
  if (!taskId) {
    process.stderr.write('Falta el id de tarea: bin/storage.ts task-output <taskId> --session-id <id>\n')
    return 2
  }
  const sessionId = arg(argv, 'session-id')
  if (!sessionId) {
    // Sin --session-id, getSessionId() generaría un UUID NUEVO en este
    // proceso y getTaskOutputDir() calcularía el directorio de una sesión
    // que nunca existió — un "no encontrado" que en realidad es "miré en
    // el lugar equivocado". Rehusar es más barato que ese engaño.
    process.stderr.write(
      'Falta --session-id <id>: sin él se generaría un id de sesión NUEVO ' +
        'para este proceso, y se leería el directorio de una sesión que ' +
        'nunca existió — un "no encontrado" que en realidad sería "miré ' +
        'en el lugar equivocado".\n',
    )
    return 2
  }
  setOriginalCwd(arg(argv, 'cwd') ?? process.cwd())
  setSessionId(sessionId)
  const path = getTaskOutputPath(taskId)
  if (!existsSync(path)) {
    process.stderr.write(`no existe: ${path}\n`)
    return 1
  }
  const content = await getTaskOutput(taskId)
  process.stdout.write(content)
  if (!content.endsWith('\n')) process.stdout.write('\n')
  process.stdout.write(`· fuente: ${path}\n`)
  return 0
}

function cachePathsCommand(argv: string[]): number {
  const cwd = arg(argv, 'cwd') ?? process.cwd()
  setCwdFn(() => cwd)
  const rows: [string, string][] = [
    ['baseLogs', CACHE_PATHS.baseLogs()],
    ['errors', CACHE_PATHS.errors()],
    ['messages', CACHE_PATHS.messages()],
  ]
  for (const [name, path] of rows) {
    process.stdout.write(`${name.padEnd(9)} ${existsSync(path) ? '(existe)   ' : '(ausente)  '} ${path}\n`)
  }
  return 0
}

async function lockStatusCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write('Falta la ruta: bin/storage.ts lock-status <ruta>\n')
    return 2
  }
  if (!existsSync(path)) {
    process.stderr.write(`no existe: ${path}\n`)
    return 1
  }
  let locked: boolean
  try {
    locked = await checkLock(path)
  } catch (e) {
    // `lockfile.ts` carga `proper-lockfile` de forma perezosa (§docstring
    // del archivo) precisamente para no pagar su costo si nadie bloquea
    // nada — pero eso significa que su ausencia sólo se ve AQUÍ, en el
    // primer uso real. Es una precondición del entorno, no del argumento:
    // se rehúsa con su razón, no se adivina "libre".
    process.stderr.write(`lock-status: ${(e as Error).message}\n`)
    return 2
  }
  process.stdout.write(`${locked ? 'bloqueada' : 'libre'}: ${path}\n`)
  return 0
}

export async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv

  switch (sub) {
    case 'sessions':
      return sessionsCommand(rest)
    case 'transcript':
      return transcriptCommand(rest, firstPositional(rest))
    case 'metadata':
      return metadataCommand(rest, firstPositional(rest))
    case 'artifact':
      return artifactCommand(firstPositional(rest))
    case 'task-output':
      return taskOutputCommand(rest, firstPositional(rest))
    case 'cache-paths':
      return cachePathsCommand(rest)
    case 'lock-status':
      return lockStatusCommand(firstPositional(rest))
    case undefined:
    case '-h':
    case '--help':
      process.stdout.write(AYUDA)
      return sub === undefined ? 2 : 0
    default:
      process.stderr.write(`storage: «${sub}» no es un subcomando.\n\n${AYUDA}`)
      return 2
  }
}

/** El primer argumento que no empieza con `--` y no es el valor de una opción previa. */
function firstPositional(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a.startsWith('--')) {
      i++ // consume el valor de la opción
      continue
    }
    return a
  }
  return undefined
}

if (import.meta.main) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((e) => {
      process.stderr.write(`${(e as Error).message}\n`)
      process.exit(2)
    })
}
