/**
 * Sustituto local de
 * `@claude-code-how-works/output/buffers/buffered-writer.js`'s
 * `BufferedWriter`/`createBufferedWriter` — verbatim a
 * `output/src/buffers/buffered-writer.ts` (100 líneas, sin dependencias
 * de paquete hermano en la propia fuente).
 *
 * `@thyrox/output` está en porte CONCURRENTE en esta misma sesión (otro
 * agente, fuera de mi alcance de escritura) — aunque su `package.json`
 * ya declara `./buffers` con contenido real, depender de un paquete en
 * vuelo violaría el aislamiento de esta tarea (Clase 2: nada en tránsito
 * de otro agente). Se sustituye localmente en vez de importar.
 *
 * Sólo lo usa `debug.ts` de este paquete. `logging/error-log-sink.ts`
 * NO usa este sustituto — trae su PROPIA implementación, más simple
 * (sin `immediateMode` ni el camino de desborde `pendingOverflow`), tal
 * cual la declara la fuente real (`error-log-sink.ts:61-121`), cuyo
 * propio comentario justifica la duplicación a propósito ("small enough
 * to inline here so local-observability stays src/-free"). No es un
 * defecto — es una asimetría dentro del mismo paquete (un archivo evita
 * la dependencia a `output`, el otro no), registrada como observación
 * (ver `hallazgo-H-DOCS-1152-dos-writers-bufferizados-para-un-proposito-casi-igual.rst`).
 */

type WriteFn = (content: string) => void

export type BufferedWriter = {
  write: (content: string) => void
  flush: () => void
  dispose: () => void
}

export function createBufferedWriter({
  writeFn,
  flushIntervalMs = 1000,
  maxBufferSize = 100,
  maxBufferBytes = Infinity,
  immediateMode = false,
}: {
  writeFn: WriteFn
  flushIntervalMs?: number
  maxBufferSize?: number
  maxBufferBytes?: number
  immediateMode?: boolean
}): BufferedWriter {
  let buffer: string[] = []
  let bufferBytes = 0
  let flushTimer: NodeJS.Timeout | null = null
  // Lote desprendido por desborde que aún no se escribió. Se rastrea para
  // que flush()/dispose() puedan drenarlo sincrónicamente si el proceso
  // termina antes de que dispare el setImmediate.
  let pendingOverflow: string[] | null = null

  function clearTimer(): void {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  function flush(): void {
    if (pendingOverflow) {
      writeFn(pendingOverflow.join(''))
      pendingOverflow = null
    }
    if (buffer.length === 0) return
    writeFn(buffer.join(''))
    buffer = []
    bufferBytes = 0
    clearTimer()
  }

  function scheduleFlush(): void {
    if (!flushTimer) {
      flushTimer = setTimeout(flush, flushIntervalMs)
    }
  }

  // Desprende el buffer sincrónicamente para que el llamador nunca espere
  // a writeFn. writeFn puede bloquear (p. ej. appendFileSync de
  // error-log-sink.ts) — si el desborde dispara a mitad de un render o de
  // una tecla, diferir la escritura mantiene corto el tick actual. Los
  // flushes por timer ya corren fuera de los caminos de código de usuario,
  // así que se quedan sincrónicos.
  function flushDeferred(): void {
    if (pendingOverflow) {
      // Una escritura de desborde anterior sigue en cola. Se coalesce
      // para preservar el orden — las escrituras aterrizan en un solo
      // lote ordenado por setImmediate.
      pendingOverflow.push(...buffer)
      buffer = []
      bufferBytes = 0
      clearTimer()
      return
    }
    const detached = buffer
    buffer = []
    bufferBytes = 0
    clearTimer()
    pendingOverflow = detached
    setImmediate(() => {
      const toWrite = pendingOverflow
      pendingOverflow = null
      if (toWrite) writeFn(toWrite.join(''))
    })
  }

  return {
    write(content: string): void {
      if (immediateMode) {
        writeFn(content)
        return
      }
      buffer.push(content)
      bufferBytes += content.length
      scheduleFlush()
      if (buffer.length >= maxBufferSize || bufferBytes >= maxBufferBytes) {
        flushDeferred()
      }
    },
    flush,
    dispose(): void {
      flush()
    },
  }
}
