/**
 * Puerto de `ccnmt: packages/output/src/buffers/buffered-writer.ts`
 * (verbatim — sin imports en la fuente). Agrupa escrituras pequenas en
 * lotes mas grandes para reducir el overhead de syscall, con dos
 * disparadores de flush: por temporizador y por tamano/bytes.
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
  // Lote desprendido por overflow que aun no se escribio. Se rastrea para
  // que flush()/dispose() lo pueda drenar sincronicamente si el proceso
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

  // Desprende el buffer sincronicamente para que quien llama nunca espere
  // a writeFn. writeFn puede bloquear (p. ej. un appendFileSync de un sink
  // de log de errores) — si el overflow dispara a mitad de un render o de
  // una tecla, diferir la escritura mantiene corto el tick actual. Los
  // flushes por temporizador ya corren fuera de rutas de codigo de usuario,
  // asi que se quedan sincronicos.
  function flushDeferred(): void {
    if (pendingOverflow) {
      // Una escritura de overflow anterior sigue en cola. Se coalesce en
      // ella para preservar el orden — las escrituras aterrizan en un solo
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
