/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/sessionWriteQueue.ts`
 * (186 líneas fuente). Cola de escritura por-archivo con append por
 * lotes, usada por la clase Project de sessionStorage's para el JSONL de
 * sesión. Tres responsabilidades en un solo subsistema autocontenido:
 *
 *   1. Colas por-archivo — varias sesiones/sidechains en un mismo proceso
 *      apendan a distintos archivos JSONL; cada uno tiene su propia cola
 *      para no bloquearse entre sí.
 *   2. Appends por lote — coalesce hasta MAX_CHUNK_BYTES de líneas
 *      pendientes en una sola llamada a fsAppendFile, para amortizar el
 *      costo de syscall + fsync.
 *   3. Tracking de escrituras pendientes — contador separado para
 *      operaciones rastreadas fuera de la cola (p. ej. removeMessageByUuid
 *      hace escrituras posicionales que no pasan por la cola pero igual
 *      necesitan drenarse en un flush).
 *
 * Dos divergencias declaradas:
 *
 *  - `jsonStringify` (`local-observability/slowOperations.js`) — en la
 *    fuente es `JSON.stringify` envuelto en `using _ = slowLogging\`...\``
 *    (logging de operación lenta vía diagnósticos ausentes). Se
 *    reimplementa como `JSON.stringify` directo — ningún test de este
 *    pase ejercita el logging de diagnóstico, y el valor devuelto es
 *    idéntico.
 *  - `Entry` (`agent/logsTypes.js`) — la fuente fija el tipo de la
 *    entrada a `Entry` del paquete `agent` (agent ya importa de storage;
 *    la dirección inversa reabriría el ciclo). Esta clase sólo serializa
 *    la entrada con `JSON.stringify` — no inspecciona su forma — así que
 *    se genericiza como `SessionWriteQueue<TEntry = unknown>` en vez de
 *    fijar un alias local que fingiera la forma real de `Entry`.
 */
import { appendFile as fsAppendFile, mkdir } from 'fs/promises'
import { dirname } from 'path'

export class SessionWriteQueue<TEntry = unknown> {
  private writeQueues = new Map<
    string,
    Array<{ entry: TEntry; resolve: () => void }>
  >()
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private activeDrain: Promise<void> | null = null
  private pendingWriteCount = 0
  private flushResolvers: Array<() => void> = []

  private flushIntervalMs = 100
  private readonly MAX_CHUNK_BYTES = 100 * 1024 * 1024

  /**
   * Cambia a un intervalo de flush más rápido. Lo usa el remote-ingress
   * (CCR) cuando está habilitado — esos consumidores quieren latencia
   * sub-100ms hacia el visor remoto.
   */
  setFlushIntervalMs(ms: number): void {
    this.flushIntervalMs = ms
  }

  /** @internal Reinicia todo el estado de la cola para test. */
  resetForTesting(): void {
    this.pendingWriteCount = 0
    this.flushResolvers = []
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.activeDrain = null
    this.writeQueues = new Map()
  }

  /**
   * Apenda `entry` a `filePath` como una sola línea JSONL. Varias
   * llamadas a la misma ruta se coalescen en una sola invocación de
   * fsAppendFile. La promesa devuelta resuelve cuando los bytes
   * realmente tocaron disco (o lo más cerca que el filesystem lo
   * permita — aquí no hay fsync).
   */
  enqueue(filePath: string, entry: TEntry): Promise<void> {
    return new Promise<void>(resolve => {
      let queue = this.writeQueues.get(filePath)
      if (!queue) {
        queue = []
        this.writeQueues.set(filePath, queue)
      }
      queue.push({ entry, resolve })
      this.scheduleDrain()
    })
  }

  /**
   * Rastrea una operación de escritura fuera de la cola (p. ej.
   * escrituras posicionales de removeMessageByUuid). La promesa
   * devuelta refleja el asentamiento de `fn`; el contador se decrementa
   * en un finally para que flush() pueda esperarlo.
   */
  async trackWrite<T>(fn: () => Promise<T>): Promise<T> {
    this.pendingWriteCount++
    try {
      return await fn()
    } finally {
      this.pendingWriteCount--
      if (this.pendingWriteCount === 0) {
        for (const resolve of this.flushResolvers) {
          resolve()
        }
        this.flushResolvers = []
      }
    }
  }

  /**
   * Espera a que todas las escrituras en cola en curso Y las escrituras
   * rastreadas fuera de la cola terminen. Cancela el timer de flush si
   * está activo, para que la espera esté acotada por el tiempo real de
   * drenado, no por el intervalo del timer.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.activeDrain) {
      await this.activeDrain
    }
    await this.drainWriteQueue()

    if (this.pendingWriteCount === 0) {
      return
    }
    return new Promise<void>(resolve => {
      this.flushResolvers.push(resolve)
    })
  }

  private scheduleDrain(): void {
    if (this.flushTimer) {
      return
    }
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null
      this.activeDrain = this.drainWriteQueue()
      await this.activeDrain
      this.activeDrain = null
      // Si llegaron más items durante el drenado, programa de nuevo.
      if (this.writeQueues.size > 0) {
        this.scheduleDrain()
      }
    }, this.flushIntervalMs)
  }

  private async appendToFile(filePath: string, data: string): Promise<void> {
    try {
      await fsAppendFile(filePath, data, { mode: 0o600 })
    } catch {
      // El directorio puede no existir — algunos filesystems tipo NFS
      // devuelven códigos de error inesperados, así que no se discrimina
      // por code.
      await mkdir(dirname(filePath), { recursive: true, mode: 0o700 })
      await fsAppendFile(filePath, data, { mode: 0o600 })
    }
  }

  private async drainWriteQueue(): Promise<void> {
    for (const [filePath, queue] of this.writeQueues) {
      if (queue.length === 0) {
        continue
      }
      const batch = queue.splice(0)

      let content = ''
      const resolvers: Array<() => void> = []

      for (const { entry, resolve } of batch) {
        const line = JSON.stringify(entry) + '\n'

        if (content.length + line.length >= this.MAX_CHUNK_BYTES) {
          // Vuelca el chunk y resuelve sus entradas antes de empezar uno nuevo.
          await this.appendToFile(filePath, content)
          for (const r of resolvers) {
            r()
          }
          resolvers.length = 0
          content = ''
        }

        content += line
        resolvers.push(resolve)
      }

      if (content.length > 0) {
        await this.appendToFile(filePath, content)
        for (const r of resolvers) {
          r()
        }
      }
    }

    // Limpia colas vacías.
    for (const [filePath, queue] of this.writeQueues) {
      if (queue.length === 0) {
        this.writeQueues.delete(filePath)
      }
    }
  }
}
