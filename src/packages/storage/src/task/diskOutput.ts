/**
 * Puerto de `ccnmt: packages/storage/src/task/diskOutput.ts` (330 líneas
 * fuente). Escritura asíncrona a disco de la salida de una tarea en
 * segundo plano (bash), con cola de escritura plana (GC-friendly), cap
 * de disco de 5GB, e inicialización por archivo o por symlink (con
 * reintento ante colisión).
 *
 * Cuatro dependencias hermanas ausentes, reimplementadas:
 *
 *  - `getSessionId` (`app-host/bootstrap/state.js`) — se importa de
 *    `../sessionPaths.js` (uno de mis 14 módulos), NO se reimplementa —
 *    así comparte el mismo id de sesión que `agentMetadata.ts` y
 *    `sessionEnvironment.ts` dentro del mismo proceso.
 *  - `getErrnoCode` (`local-observability/errorHelpers.js`) — fiel, tres
 *    líneas (duplicado a propósito por archivo — cada módulo de esta
 *    tanda es dueño exclusivo de sus símbolos).
 *  - `getProjectTempDir` (`permission/filesystem.js`, paquete `permission`
 *    ausente por completo del árbol) — la fuente compone
 *    `getClaudeTempDirName()` (`claude-{uid}` en POSIX, `'claude'` en
 *    Windows) + `sanitizePath(getOriginalCwd())`, con resuelto de
 *    symlinks de `/tmp` (macOS) y honrando `CLAUDE_CODE_TMPDIR`. Se
 *    reimplementa aquí fiel a esa fórmula sin el resuelto de symlinks
 *    (ningún test de este pase corre en macOS) — `sanitizePath` se
 *    reusa de `../sessionStoragePortable.js` (hermano YA portado en este
 *    árbol, no una reimplementación nueva); `getOriginalCwd` se importa
 *    de `../sessionPaths.js` (mismo criterio que `getSessionId`).
 *  - `readFileRange`/`tailFile` (`../fsOperations.js`, archivo de
 *    23801 B en la fuente, AUSENTE de este árbol y fuera de mis 14
 *    módulos) — se reimplementan aquí, PEQUEÑOS y sin más dependencias
 *    que `fs/promises`, verbatim al cuerpo real de la fuente (abrir con
 *    `open()`, leer con offset, cerrar con `using`).
 *
 * `logError` SÍ se reusa de verdad: se importa de `../logging.js`,
 * hermano YA portado en este árbol.
 */
import { constants as fsConstants } from 'fs'
import {
  type FileHandle,
  mkdir,
  open,
  stat,
  symlink,
  unlink,
} from 'fs/promises'
import { tmpdir } from 'os'
import { join, sep } from 'path'
import { logError } from '../logging.js'
import { getOriginalCwd, getSessionId } from '../sessionPaths.js'
import { sanitizePath } from '../sessionStoragePortable.js'

// SEGURIDAD: O_NOFOLLOW evita seguir symlinks al abrir archivos de salida
// de tarea. Sin esto, un atacante dentro del sandbox podría crear
// symlinks en el directorio de tareas apuntando a archivos arbitrarios,
// causando que Claude Code en el host escriba en esos archivos.
// O_NOFOLLOW no está disponible en Windows, pero el vector de ataque del
// sandbox es sólo-Unix.
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0

const DEFAULT_MAX_READ_BYTES = 8 * 1024 * 1024 // 8MB

/**
 * Cap de disco para archivos de salida de tarea. En modo archivo (bash),
 * un watchdog sondea el tamaño del archivo y mata el proceso. En modo
 * pipe (hooks), DiskTaskOutput descarta chunks por encima de este
 * límite. Compartido para que ambos caps se mantengan sincronizados.
 */
export const MAX_TASK_OUTPUT_BYTES = 5 * 1024 * 1024 * 1024
export const MAX_TASK_OUTPUT_BYTES_DISPLAY = '5GB'

// ---------------------------------------------------------------------------
// Sustitutos — ver docstring del archivo.
// ---------------------------------------------------------------------------

function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

/** Fiel a `permission/filesystem.ts::getClaudeTempDirName` — ver docstring. */
function getClaudeTempDirName(): string {
  if (process.platform === 'win32') return 'claude'
  const uid = process.getuid?.() ?? 0
  return `claude-${uid}`
}

/** Fiel a `permission/filesystem.ts::getClaudeTempDir`, sin el resuelto
 * de symlinks de macOS — ver docstring del archivo. */
function getClaudeTempDir(): string {
  const base =
    process.env.CLAUDE_CODE_TMPDIR ||
    (process.platform === 'win32' ? tmpdir() : '/tmp')
  return join(base, getClaudeTempDirName())
}

/**
 * Devuelve la ruta del directorio temporal de proyecto con separador
 * final. Formato: /tmp/claude-{uid}/{cwd-saneado}/
 */
export function getProjectTempDir(): string {
  return join(getClaudeTempDir(), sanitizePath(getOriginalCwd())) + sep
}

export type ReadFileRangeResult = {
  content: string
  bytesRead: number
  bytesTotal: number
}

/**
 * Lee hasta `maxBytes` de un archivo empezando en `offset`. Devuelve un
 * string plano desde un Buffer — sin referencias de string recortadas a
 * un padre más grande. Devuelve null si el archivo es más chico que el
 * offset.
 */
export async function readFileRange(
  path: string,
  offset: number,
  maxBytes: number,
): Promise<ReadFileRangeResult | null> {
  await using fh = await open(path, 'r')
  const size = (await fh.stat()).size
  if (size <= offset) {
    return null
  }
  const bytesToRead = Math.min(size - offset, maxBytes)
  const buffer = Buffer.allocUnsafe(bytesToRead)

  let totalRead = 0
  while (totalRead < bytesToRead) {
    const { bytesRead } = await fh.read(
      buffer,
      totalRead,
      bytesToRead - totalRead,
      offset + totalRead,
    )
    if (bytesRead === 0) {
      break
    }
    totalRead += bytesRead
  }

  return {
    content: buffer.toString('utf8', 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  }
}

/**
 * Lee los últimos `maxBytes` de un archivo. Devuelve el archivo entero
 * si es más chico que maxBytes.
 */
export async function tailFile(
  path: string,
  maxBytes: number,
): Promise<ReadFileRangeResult> {
  await using fh = await open(path, 'r')
  const size = (await fh.stat()).size
  if (size === 0) {
    return { content: '', bytesRead: 0, bytesTotal: 0 }
  }
  const offset = Math.max(0, size - maxBytes)
  const bytesToRead = size - offset
  const buffer = Buffer.allocUnsafe(bytesToRead)

  let totalRead = 0
  while (totalRead < bytesToRead) {
    const { bytesRead } = await fh.read(
      buffer,
      totalRead,
      bytesToRead - totalRead,
      offset + totalRead,
    )
    if (bytesRead === 0) {
      break
    }
    totalRead += bytesRead
  }

  return {
    content: buffer.toString('utf8', 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  }
}

// ---------------------------------------------------------------------------
// El módulo real — porte fiel.
// ---------------------------------------------------------------------------

/**
 * Obtiene el directorio de salida de tarea para esta sesión. Usa el
 * directorio temporal de proyecto para que las lecturas queden
 * auto-permitidas por checkReadableInternalPath.
 *
 * El session ID se incluye para que sesiones concurrentes en el mismo
 * proyecto no se pisen los archivos de salida entre sí. Una limpieza de
 * arranque en una sesión previamente desenlazaba archivos de salida en
 * vuelo de otras sesiones — el fd del proceso que escribe mantiene el
 * inode vivo, pero las lecturas por ruta fallan con ENOENT y getStdout()
 * devolvía string vacío (inc-4586 / boris-20260309-060423).
 *
 * El session ID se captura en la PRIMERA LLAMADA, no se re-lee en cada
 * invocación. /clear llama a regenerateSessionId(), que si no haría que
 * ensureOutputDir() creara una ruta de nueva-sesión mientras las
 * instancias existentes de TaskOutput siguen con rutas de la sesión
 * vieja — open() daría ENOENT. Las tareas de bash en segundo plano que
 * sobreviven a /clear necesitan que sus archivos de salida sigan siendo
 * alcanzables.
 */
let _taskOutputDir: string | undefined
export function getTaskOutputDir(): string {
  if (_taskOutputDir === undefined) {
    _taskOutputDir = join(getProjectTempDir(), getSessionId(), 'tasks')
  }
  return _taskOutputDir
}

/** Helper de test — limpia el directorio memoizado. */
export function _resetTaskOutputDirForTest(): void {
  _taskOutputDir = undefined
}

/**
 * Asegura que el directorio de salida de tarea exista
 */
async function ensureOutputDir(): Promise<void> {
  await mkdir(getTaskOutputDir(), { recursive: true })
}

/**
 * Obtiene la ruta del archivo de salida de una tarea
 */
export function getTaskOutputPath(taskId: string): string {
  return join(getTaskOutputDir(), `${taskId}.output`)
}

// Rastrea promesas fire-and-forget (initTaskOutput, initTaskOutputAsSymlink,
// evictTaskOutput, #drain) para que los tests puedan drenar antes del
// teardown. Evita la clase de flake async-ENOENT-tras-teardown (#24957,
// #25065): un `void` de una async se retoma después de que el afterEach
// del preload ya tumbó el directorio temporal → ENOENT → unhandled
// rejection → test flaky. allSettled para que un rechazo no corte el
// drenado y deje otras operaciones compitiendo con el rmSync.
const _pendingOps = new Set<Promise<unknown>>()
function track<T>(p: Promise<T>): Promise<T> {
  _pendingOps.add(p)
  void p.finally(() => _pendingOps.delete(p)).catch(() => {})
  return p
}

/**
 * Encapsula escrituras async a disco de la salida de una sola tarea.
 *
 * Usa un arreglo plano como cola de escritura procesada por un solo loop
 * de drenado, para que cada chunk pueda liberarse por el GC apenas
 * termine su escritura. Esto evita el problema de retención de memoria
 * de closures .then() encadenados, donde cada reacción retiene sus datos
 * hasta que resuelve toda la cadena.
 */
export class DiskTaskOutput {
  #path: string
  #fileHandle: FileHandle | null = null
  #queue: string[] = []
  #bytesWritten = 0
  #capped = false
  #flushPromise: Promise<void> | null = null
  #flushResolve: (() => void) | null = null

  constructor(taskId: string) {
    this.#path = getTaskOutputPath(taskId)
  }

  append(content: string): void {
    if (this.#capped) {
      return
    }
    // content.length (unidades de código UTF-16) subcuenta los bytes
    // UTF-8 por a lo sumo ~3×. Aceptable para una guarda gruesa de
    // llenado de disco — evita re-escanear cada chunk.
    this.#bytesWritten += content.length
    if (this.#bytesWritten > MAX_TASK_OUTPUT_BYTES) {
      this.#capped = true
      this.#queue.push(
        `\n[output truncated: exceeded ${MAX_TASK_OUTPUT_BYTES_DISPLAY} disk cap]\n`,
      )
    } else {
      this.#queue.push(content)
    }
    if (!this.#flushPromise) {
      this.#flushPromise = new Promise<void>(resolve => {
        this.#flushResolve = resolve
      })
      void track(this.#drain())
    }
  }

  flush(): Promise<void> {
    return this.#flushPromise ?? Promise.resolve()
  }

  cancel(): void {
    this.#queue.length = 0
  }

  async #drainAllChunks(): Promise<void> {
    while (true) {
      try {
        if (!this.#fileHandle) {
          await ensureOutputDir()
          this.#fileHandle = await open(
            this.#path,
            process.platform === 'win32'
              ? 'a'
              : fsConstants.O_WRONLY |
                  fsConstants.O_APPEND |
                  fsConstants.O_CREAT |
                  O_NOFOLLOW,
          )
        }
        while (true) {
          await this.#writeAllChunks()
          if (this.#queue.length === 0) {
            break
          }
        }
      } finally {
        if (this.#fileHandle) {
          const fileHandle = this.#fileHandle
          this.#fileHandle = null
          await fileHandle.close()
        }
      }
      // Podría haber otro .append() mientras esperamos que el archivo
      // cierre, así que se revisa la cola de nuevo antes de salir del todo.
      if (this.#queue.length) {
        continue
      }

      break
    }
  }

  #writeAllChunks(): Promise<void> {
    // Este código es extremadamente preciso.
    // NO se debe agregar un await aquí — eso haría que la memoria crezca
    // sin control a medida que la cola crece.
    // Sí está bien agregar un `await` en quien llama a este método
    // (p. ej. #drainAllChunks) porque eso no mantiene vivo el Buffer[]
    // en memoria.
    return this.#fileHandle!.appendFile(
      // Esta variable necesita liberarse por el GC lo antes posible.
      this.#queueToBuffers(),
    )
  }

  /** Mantener esto en un método separado para que el GC no lo retenga
   * más de lo debido. */
  #queueToBuffers(): Buffer {
    // Usa .splice para mutar el arreglo in-place, informando al GC que
    // puede liberarlo.
    const queue = this.#queue.splice(0, this.#queue.length)

    let totalLength = 0
    for (const str of queue) {
      totalLength += Buffer.byteLength(str, 'utf8')
    }

    const buffer = Buffer.allocUnsafe(totalLength)
    let offset = 0
    for (const str of queue) {
      offset += buffer.write(str, offset, 'utf8')
    }

    return buffer
  }

  async #drain(): Promise<void> {
    try {
      await this.#drainAllChunks()
    } catch (e) {
      // Errores de fs transitorios (EMFILE en CI ocupado, EPERM en
      // Windows con delete pendiente) antes se propagaban como
      // unhandled rejection a través de `void this.#drain()` mientras la
      // promesa de flush igual resolvía — quien llamaba veía un archivo
      // vacío sin error. Reintenta una vez para el caso transitorio (la
      // cola sigue intacta si open() falló), luego loguea y se rinde.
      logError(e)
      if (this.#queue.length > 0) {
        try {
          await this.#drainAllChunks()
        } catch (e2) {
          logError(e2)
        }
      }
    } finally {
      const resolve = this.#flushResolve!
      this.#flushPromise = null
      this.#flushResolve = null
      resolve()
    }
  }
}

const outputs = new Map<string, DiskTaskOutput>()

/**
 * Helper de test — cancela escrituras pendientes, espera operaciones en
 * vuelo, limpia el mapa. backgroundShells.test.ts y otros tests de tarea
 * lanzan shells reales que escriben a través de este módulo sin limpieza
 * en afterEach; sus entradas se filtran a diskOutput.test.ts en el mismo
 * shard.
 *
 * Espera todas las promesas rastreadas hasta que el conjunto se
 * estabilice — una promesa que se asienta puede engendrar otra
 * (el catch de initTaskOutputAsSymlink → initTaskOutput). Llamar esto en
 * afterEach ANTES de rmSync para evitar async-ENOENT-tras-teardown.
 */
export async function _clearOutputsForTest(): Promise<void> {
  for (const output of outputs.values()) {
    output.cancel()
  }
  while (_pendingOps.size > 0) {
    await Promise.allSettled([..._pendingOps])
  }
  outputs.clear()
}

function getOrCreateOutput(taskId: string): DiskTaskOutput {
  let output = outputs.get(taskId)
  if (!output) {
    output = new DiskTaskOutput(taskId)
    outputs.set(taskId, output)
  }
  return output
}

/**
 * Apenda salida al archivo de disco de una tarea de forma asíncrona.
 * Crea el archivo si no existe.
 */
export function appendTaskOutput(taskId: string, content: string): void {
  getOrCreateOutput(taskId).append(content)
}

/**
 * Espera a que todas las escrituras pendientes de una tarea terminen.
 * Útil antes de leer la salida para asegurar que todos los datos ya se
 * volcaron.
 */
export async function flushTaskOutput(taskId: string): Promise<void> {
  const output = outputs.get(taskId)
  if (output) {
    await output.flush()
  }
}

/**
 * Saca un DiskTaskOutput del mapa en memoria, tras hacerle flush.
 * A diferencia de cleanupTaskOutput, esto NO borra el archivo de salida
 * en disco. Llamar esto cuando una tarea termina y su salida ya se
 * consumió.
 */
export function evictTaskOutput(taskId: string): Promise<void> {
  return track(
    (async () => {
      const output = outputs.get(taskId)
      if (output) {
        await output.flush()
        outputs.delete(taskId)
      }
    })(),
  )
}

/**
 * Obtiene el delta (contenido nuevo) desde la última lectura. Lee sólo
 * desde el offset de bytes, hasta maxBytes — nunca carga el archivo
 * completo.
 */
export async function getTaskOutputDelta(
  taskId: string,
  fromOffset: number,
  maxBytes: number = DEFAULT_MAX_READ_BYTES,
): Promise<{ content: string; newOffset: number }> {
  try {
    const result = await readFileRange(
      getTaskOutputPath(taskId),
      fromOffset,
      maxBytes,
    )
    if (!result) {
      return { content: '', newOffset: fromOffset }
    }
    return {
      content: result.content,
      newOffset: fromOffset + result.bytesRead,
    }
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return { content: '', newOffset: fromOffset }
    }
    logError(e)
    return { content: '', newOffset: fromOffset }
  }
}

/**
 * Obtiene la salida de una tarea, leyendo el final del archivo. Limita a
 * maxBytes para evitar cargar archivos de varios GB en memoria.
 */
export async function getTaskOutput(
  taskId: string,
  maxBytes: number = DEFAULT_MAX_READ_BYTES,
): Promise<string> {
  try {
    const { content, bytesTotal, bytesRead } = await tailFile(
      getTaskOutputPath(taskId),
      maxBytes,
    )
    if (bytesTotal > bytesRead) {
      return `[${Math.round((bytesTotal - bytesRead) / 1024)}KB of earlier output omitted]\n${content}`
    }
    return content
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return ''
    }
    logError(e)
    return ''
  }
}

/**
 * Obtiene el tamaño (offset) actual del archivo de salida de una tarea.
 */
export async function getTaskOutputSize(taskId: string): Promise<number> {
  try {
    return (await stat(getTaskOutputPath(taskId))).size
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return 0
    }
    logError(e)
    return 0
  }
}

/**
 * Limpia el archivo de salida de una tarea y su cola de escritura.
 */
export async function cleanupTaskOutput(taskId: string): Promise<void> {
  const output = outputs.get(taskId)
  if (output) {
    output.cancel()
    outputs.delete(taskId)
  }

  try {
    await unlink(getTaskOutputPath(taskId))
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return
    }
    logError(e)
  }
}

/**
 * Inicializa el archivo de salida de una tarea nueva.
 * Crea un archivo vacío para asegurar que la ruta exista.
 */
export function initTaskOutput(taskId: string): Promise<string> {
  return track(
    (async () => {
      await ensureOutputDir()
      const outputPath = getTaskOutputPath(taskId)
      // SEGURIDAD: O_NOFOLLOW evita ataques de symlink-following desde
      // el sandbox. O_EXCL asegura que se crea un archivo nuevo y falla
      // si ya existe algo en esa ruta. En Windows, usar flags de string
      // — O_EXCL numérico puede producir EINVAL a través de libuv.
      const fh = await open(
        outputPath,
        process.platform === 'win32'
          ? 'wx'
          : fsConstants.O_WRONLY |
              fsConstants.O_CREAT |
              fsConstants.O_EXCL |
              O_NOFOLLOW,
      )
      await fh.close()
      return outputPath
    })(),
  )
}

/**
 * Inicializa el archivo de salida como un symlink a otro archivo
 * (p. ej. el transcript de un agente). Intenta crear el symlink
 * primero; si ya existe un archivo, lo elimina y reintenta.
 */
export function initTaskOutputAsSymlink(
  taskId: string,
  targetPath: string,
): Promise<string> {
  return track(
    (async () => {
      try {
        await ensureOutputDir()
        const outputPath = getTaskOutputPath(taskId)

        try {
          await symlink(targetPath, outputPath)
        } catch {
          await unlink(outputPath)
          await symlink(targetPath, outputPath)
        }

        return outputPath
      } catch (error) {
        logError(error)
        return initTaskOutput(taskId)
      }
    })(),
  )
}
