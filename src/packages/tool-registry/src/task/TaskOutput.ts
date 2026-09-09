import { unlink } from 'fs/promises'

import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { CircularBuffer } from '@thyrox/output/buffers'
import { safeJoinLines } from '@thyrox/output/utils/stringUtils.js'
import { getMaxOutputLength } from '@thyrox/shell/legacy/outputLimits.js'
import { tailFile, readFileRange } from '@thyrox/storage/fsOperations.js'
import {
  DiskTaskOutput,
  getTaskOutputPath,
} from '@thyrox/storage/task/diskOutput.js'

/**
 * Puerto de `ccnmt: packages/tool-registry/src/task/TaskOutput.ts`
 * (TASK-DOCS-0234). Reimplementación del patrón, no copia: ccnmt declara
 * `"license": "UNLICENSED"`.
 *
 * Es la fuente única de la salida de un comando de shell, y tiene DOS modos
 * que no comparten camino:
 *
 * - **Modo archivo** (bash): stdout y stderr van al archivo por descriptor,
 *   sin pasar por JS. El progreso se saca sondeando la cola del archivo, y
 *   `getStderr()` devuelve `''` porque stderr va intercalado en el mismo
 *   archivo.
 * - **Modo pipe** (hooks): los datos entran por `writeStdout`/`writeStderr`,
 *   se acumulan en memoria y se derraman a disco al pasar el límite.
 *
 * El sondeo es **estático y compartido**: un solo `setInterval` recorre todas
 * las instancias activas, en vez de un temporizador por tarea.
 */

/** 8 MB — cuánto se acumula en memoria antes de derramar a disco. */
const DEFAULT_MAX_MEMORY = 8 * 1024 * 1024
/** Cadencia del sondeo compartido del modo archivo. */
const POLL_INTERVAL_MS = 1000
/** Cuánta cola del archivo se lee en cada tick. */
const PROGRESS_TAIL_BYTES = 4096
/** Cuántos bytes de líneas se extraen por chunk en modo pipe. */
const MAX_PROGRESS_BYTES = 4096
/** Cuántas líneas se extraen por chunk en modo pipe. */
const MAX_PROGRESS_LINES = 100
/** Capacidad del anillo de líneas recientes. */
const RECENT_LINES_CAPACITY = 1000

export type ProgressCallback = (
  lastLines: string,
  allLines: string,
  totalLines: number,
  totalBytes: number,
  isIncomplete: boolean,
) => void

export class TaskOutput {
  readonly taskId: string
  readonly path: string
  /** Verdadero cuando stdout va a un descriptor de archivo (sin pasar por JS). */
  readonly stdoutToFile: boolean

  #stdoutBuffer = ''
  #stderrBuffer = ''
  #disk: DiskTaskOutput | null = null
  #recentLines = new CircularBuffer<string>(RECENT_LINES_CAPACITY)
  #totalLines = 0
  #totalBytes = 0
  #maxMemory: number
  #onProgress: ProgressCallback | null
  /** Lo fija `getStdout()`: el archivo se leyó entero (≤ maxOutputLength). */
  #outputFileRedundant = false
  /** Lo fija `getStdout()`: tamaño total del archivo en bytes. */
  #outputFileSize = 0

  // --- Estado del sondeo compartido ---

  /** Todas las instancias de modo archivo con callback de progreso. */
  static #registry = new Map<string, TaskOutput>()
  /** El subconjunto que se está sondeando ahora mismo. */
  static #activePolling = new Map<string, TaskOutput>()
  static #pollInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    taskId: string,
    onProgress: ProgressCallback | null,
    stdoutToFile = false,
    maxMemory: number = DEFAULT_MAX_MEMORY,
  ) {
    this.taskId = taskId
    this.path = getTaskOutputPath(taskId)
    this.stdoutToFile = stdoutToFile
    this.#maxMemory = maxMemory
    this.#onProgress = onProgress

    // Sólo se registra para sondeo si hay archivo QUE sondear y alguien a
    // quien avisar. El sondeo en sí lo arranca y lo para el consumidor.
    if (stdoutToFile && onProgress) {
      TaskOutput.#registry.set(taskId, this)
    }
  }

  /** Empieza a sondear el archivo de esta tarea. */
  static startPolling(taskId: string): void {
    const instance = TaskOutput.#registry.get(taskId)
    if (!instance || !instance.#onProgress) {
      return
    }
    TaskOutput.#activePolling.set(taskId, instance)
    if (!TaskOutput.#pollInterval) {
      TaskOutput.#pollInterval = setInterval(TaskOutput.#tick, POLL_INTERVAL_MS)
      TaskOutput.#pollInterval.unref()
    }
  }

  /** Deja de sondear. El temporizador muere cuando no queda nadie activo. */
  static stopPolling(taskId: string): void {
    TaskOutput.#activePolling.delete(taskId)
    if (TaskOutput.#activePolling.size === 0 && TaskOutput.#pollInterval) {
      clearInterval(TaskOutput.#pollInterval)
      TaskOutput.#pollInterval = null
    }
  }

  /**
   * Tick compartido: lee la cola del archivo de cada tarea activa.
   *
   * El cuerpo NO es async a propósito — usa `.then` y no se espera. Un
   * cuerpo async apilaría ticks si la E/S va más lenta que la cadencia.
   */
  static #tick(): void {
    for (const [, entry] of TaskOutput.#activePolling) {
      if (!entry.#onProgress) {
        continue
      }
      void tailFile(entry.path, PROGRESS_TAIL_BYTES).then(
        ({ content, bytesRead, bytesTotal }) => {
          if (!entry.#onProgress) {
            return
          }
          // Se avisa incluso con contenido vacío, para que el bucle de
          // progreso despierte y pueda comprobar si hay que mandar la
          // tarea a segundo plano. Un `git log -S` pasa minutos sin
          // escribir una línea.
          if (!content) {
            entry.#onProgress('', '', entry.#totalLines, bytesTotal, false)
            return
          }
          // Un solo recorrido hacia atrás: cuenta saltos de línea y anota
          // los puntos de corte de las últimas 5 y las últimas 100. Sin
          // tope, para que la extrapolación siga siendo fiel cuando la
          // salida es densa (líneas cortas → >100 saltos en 4 KB).
          let pos = content.length
          let n5 = 0
          let n100 = 0
          let lineCount = 0
          while (pos > 0) {
            pos = content.lastIndexOf('\n', pos - 1)
            lineCount++
            if (lineCount === 5) n5 = pos <= 0 ? 0 : pos + 1
            if (lineCount === 100) n100 = pos <= 0 ? 0 : pos + 1
          }
          // `lineCount` es exacto cuando el archivo entero cabe en la cola.
          // Si no, se extrapola desde la muestra; el máximo monótono impide
          // que el contador retroceda cuando un tick pilla líneas largas.
          const totalLines =
            bytesRead >= bytesTotal
              ? lineCount
              : Math.max(
                  entry.#totalLines,
                  Math.round((bytesTotal / bytesRead) * lineCount),
                )
          entry.#totalLines = totalLines
          entry.#totalBytes = bytesTotal
          entry.#onProgress(
            content.slice(n5),
            content.slice(n100),
            totalLines,
            bytesTotal,
            bytesRead < bytesTotal,
          )
        },
        () => {
          // El archivo puede no existir todavía.
        },
      )
    }
  }

  /** Escribe stdout — sólo en modo pipe (hooks). */
  writeStdout(data: string): void {
    this.#writeBuffered(data, false)
  }

  /** Escribe stderr — siempre por pipe, en los dos modos. */
  writeStderr(data: string): void {
    this.#writeBuffered(data, true)
  }

  #writeBuffered(data: string, isStderr: boolean): void {
    this.#totalBytes += data.length

    this.#updateProgress(data)

    // Si ya se derramó, todo va derecho a disco.
    if (this.#disk) {
      this.#disk.append(isStderr ? `[stderr] ${data}` : data)
      return
    }

    const totalMem =
      this.#stdoutBuffer.length + this.#stderrBuffer.length + data.length
    if (totalMem > this.#maxMemory) {
      this.#spillToDisk(isStderr ? data : null, isStderr ? null : data)
      return
    }

    if (isStderr) {
      this.#stderrBuffer += data
    } else {
      this.#stdoutBuffer += data
    }
  }

  /**
   * Un solo recorrido hacia atrás que hace dos cosas: cuenta los saltos de
   * línea (para `totalLines`) y extrae las últimas líneas como copias
   * planas para el anillo.
   *
   * `Buffer.from(line).toString()` NO es redundante: `slice` de V8 devuelve
   * una vista que retiene el string padre entero. La copia la desprende, y
   * sin ella el anillo de 1000 líneas puede retener megabytes de chunks
   * que ya nadie mira.
   *
   * Sólo se usa en modo pipe; el modo archivo va por el sondeo compartido.
   */
  #updateProgress(data: string): void {
    let lineCount = 0
    const lines: string[] = []
    let extractedBytes = 0
    let pos = data.length

    while (pos > 0) {
      const prev = data.lastIndexOf('\n', pos - 1)
      if (prev === -1) {
        break
      }
      lineCount++
      if (
        lines.length < MAX_PROGRESS_LINES &&
        extractedBytes < MAX_PROGRESS_BYTES
      ) {
        const lineLen = pos - prev - 1
        if (lineLen > 0 && lineLen <= MAX_PROGRESS_BYTES - extractedBytes) {
          const line = data.slice(prev + 1, pos)
          if (line.trim()) {
            lines.push(Buffer.from(line).toString())
            extractedBytes += lineLen
          }
        }
      }
      pos = prev
    }

    this.#totalLines += lineCount

    // El recorrido fue hacia atrás, así que `lines` está en orden inverso:
    // se añade al anillo desde el final para restituir el orden original.
    for (let i = lines.length - 1; i >= 0; i--) {
      this.#recentLines.add(lines[i]!)
    }

    if (this.#onProgress && lines.length > 0) {
      const recent = this.#recentLines.getRecent(5)
      this.#onProgress(
        safeJoinLines(recent, '\n'),
        safeJoinLines(this.#recentLines.getRecent(100), '\n'),
        this.#totalLines,
        this.#totalBytes,
        this.#disk !== null,
      )
    }
  }

  #spillToDisk(stderrChunk: string | null, stdoutChunk: string | null): void {
    this.#disk = new DiskTaskOutput(this.taskId)

    // Primero lo ya acumulado, para que el archivo conserve el orden.
    if (this.#stdoutBuffer) {
      this.#disk.append(this.#stdoutBuffer)
      this.#stdoutBuffer = ''
    }
    if (this.#stderrBuffer) {
      this.#disk.append(`[stderr] ${this.#stderrBuffer}`)
      this.#stderrBuffer = ''
    }

    // Y después el chunk que provocó el desbordamiento.
    if (stdoutChunk) {
      this.#disk.append(stdoutChunk)
    }
    if (stderrChunk) {
      this.#disk.append(`[stderr] ${stderrChunk}`)
    }
  }

  /**
   * Devuelve stdout. En modo archivo lo lee del archivo; en modo pipe
   * devuelve el búfer en memoria, o la cola del anillo si ya se derramó.
   */
  async getStdout(): Promise<string> {
    if (this.stdoutToFile) {
      return this.#readStdoutFromFile()
    }
    if (this.#disk) {
      const recent = this.#recentLines.getRecent(5)
      const tail = safeJoinLines(recent, '\n')
      const sizeKB = Math.round(this.#totalBytes / 1024)
      const notice = `\nOutput truncated (${sizeKB}KB total). Full output saved to: ${this.path}`
      return tail ? tail + notice : notice.trimStart()
    }
    return this.#stdoutBuffer
  }

  async #readStdoutFromFile(): Promise<string> {
    const maxBytes = getMaxOutputLength()
    try {
      const result = await readFileRange(this.path, 0, maxBytes)
      if (!result) {
        this.#outputFileRedundant = true
        return ''
      }
      const { content, bytesRead, bytesTotal } = result
      // Si el archivo cabe, quedó capturado entero en línea y se puede
      // borrar. Si no, se devuelve lo leído y el formateo del resultado
      // se encarga de la persistencia aguas abajo.
      this.#outputFileSize = bytesTotal
      this.#outputFileRedundant = bytesTotal <= bytesRead
      return content
    } catch (err) {
      // Se expone el error en vez de devolver vacío en silencio. Un ENOENT
      // aquí significa que el archivo se borró mientras el comando corría
      // (históricamente: la limpieza de arranque de otro proceso en el
      // mismo proyecto). Devolver un diagnóstico deja el resultado no
      // vacío, y le dice al modelo —y a quien lea el transcript— qué pasó.
      const code =
        err instanceof Error && 'code' in err ? String(err.code) : 'unknown'
      logForDebugging(
        `TaskOutput.#readStdoutFromFile: failed to read ${this.path} (${code}): ${err}`,
      )
      return `<bash output unavailable: output file ${this.path} could not be read (${code}). This usually means another Claude Code process in the same project deleted it during startup cleanup.>`
    }
  }

  /** Getter síncrono para el stderr del resultado de ejecución. */
  getStderr(): string {
    if (this.#disk) {
      return ''
    }
    return this.#stderrBuffer
  }

  get isOverflowed(): boolean {
    return this.#disk !== null
  }

  get totalLines(): number {
    return this.#totalLines
  }

  get totalBytes(): number {
    return this.#totalBytes
  }

  /**
   * Verdadero después de `getStdout()` cuando el archivo se leyó entero: su
   * contenido es redundante con lo devuelto y el archivo se puede borrar.
   */
  get outputFileRedundant(): boolean {
    return this.#outputFileRedundant
  }

  /** Tamaño del archivo en bytes, que fija `getStdout()` al leerlo. */
  get outputFileSize(): number {
    return this.#outputFileSize
  }

  /** Fuerza a disco todo lo acumulado. Se llama al mandar a segundo plano. */
  spillToDisk(): void {
    if (!this.#disk) {
      this.#spillToDisk(null, null)
    }
  }

  async flush(): Promise<void> {
    await this.#disk?.flush()
  }

  /** Borra el archivo de salida. Seguro de llamar sin esperar. */
  async deleteOutputFile(): Promise<void> {
    try {
      await unlink(this.path)
    } catch {
      // Puede que ya no exista.
    }
  }

  clear(): void {
    this.#stdoutBuffer = ''
    this.#stderrBuffer = ''
    this.#recentLines.clear()
    this.#onProgress = null
    this.#disk?.cancel()
    TaskOutput.stopPolling(this.taskId)
    TaskOutput.#registry.delete(this.taskId)
  }
}
