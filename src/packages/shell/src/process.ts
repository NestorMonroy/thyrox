/**
 * Utilidad de espera sobre streams tipo stdin.
 *
 * `registerProcessOutputErrorHandlers`, `writeToStdout` y `writeToStderr`
 * se portan (2026-09-24) desde 2.1.275 (`pur`, `dr`, `OX` y sus auxiliares
 * `pkt`, `v`, `HQe` en `chunk-q4s29khb.js`). pendiente: `exitWithError`
 * (`tlo`) no tiene consumidor en este árbol, y de la contabilidad de
 * vaciado de stdout sólo se porta el conteo de bytes pendientes: la espera
 * de vaciado al salir (`OQe`) vive con el cierre del proceso, que no está.
 *
 * @module
 */

// Usado por el modo `-p` para distinguir un productor de pipe real de un
// stdin heredado pero inactivo. Espera a que el stream tipo stdin cierre,
// pero se rinde a los `ms` si no llega ningún dato. El primer chunk de
// datos cancela el timeout — a partir de ahí se espera el fin
// incondicionalmente (el acumulador del llamador necesita TODos los
// chunks, no sólo el primero). Devuelve `true` si expiró el timeout,
// `false` si el stream terminó.
export function peekForStdinData(
  stream: NodeJS.EventEmitter,
  ms: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const done = (timedOut: boolean): void => {
      clearTimeout(peek)
      stream.off('end', onEnd)
      stream.off('data', onFirstData)
      void resolve(timedOut)
    }
    const onEnd = (): void => done(false)
    const onFirstData = (): void => {
      clearTimeout(peek)
    }
    // eslint-disable-next-line no-restricted-syntax -- no es un sleep: compite el timeout contra los eventos end/data del stream
    const peek = setTimeout(done, ms, true)
    stream.once('end', onEnd)
    stream.once('data', onFirstData)
  })
}

// Un error con estos códigos significa que el otro extremo ya no lee.
const DEAD_STREAM_CODES = new Set(['EPIPE', 'EIO', 'ENXIO', 'EBADF'])
// Estos, sin ser de stream muerto, también delatan una salida rota.
const BROKEN_OUTPUT_CODES = new Set(['EISDIR', 'ENOTCONN', 'ECONNRESET'])

/** `HQe`: ¿el error es de una salida que ya no se puede usar? */
export function isDeadStreamError(error: unknown): boolean {
  const code =
    error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined
  return code !== undefined && (BROKEN_OUTPUT_CODES.has(code) || DEAD_STREAM_CODES.has(code))
}

type OutputStream = NodeJS.EventEmitter & {
  destroyed?: boolean
  writableEnded?: boolean
  write(chunk: string | Uint8Array, callback?: () => void): boolean
  destroy?(): void
}

/** `pkt`: ante un error de stream muerto, lo destruye y avisa con el código. */
export function handleDeadStreamErrors(stream: OutputStream, onDead?: (code: string) => void): void {
  stream.on('error', (error: { code?: string }) => {
    if (error.code !== undefined && DEAD_STREAM_CODES.has(error.code)) {
      try {
        stream.destroy?.()
      } catch {}
      onDead?.(error.code)
    }
  })
}

/** `v`: escribe salvo que el stream esté destruido o terminado. */
export function writeToStream(stream: OutputStream, chunk: string | Uint8Array, callback?: () => void): boolean {
  if (stream.destroyed || stream.writableEnded) return false
  stream.write(chunk, callback)
  return true
}

// Contabilidad de bytes de stdout: encolados contra vaciados.
let stdoutQueued = 0
let stdoutFlushed = 0
let stdoutErrored = false

/** Bytes de stdout escritos y aún sin vaciar (0 si stdout murió). */
export function getStdoutOutstandingBytes(): number {
  if (process.stdout.destroyed || stdoutErrored) return 0
  return stdoutQueued - stdoutFlushed
}

/** `pur`: registra el manejo de errores en stdin, stdout y stderr. */
export function registerProcessOutputErrorHandlers(
  onDead?: (stream: 'stdin' | 'stdout', code: string) => void,
): void {
  handleDeadStreamErrors(process.stdin as unknown as OutputStream, code => onDead?.('stdin', code))
  handleDeadStreamErrors(process.stdout as unknown as OutputStream, code => onDead?.('stdout', code))
  process.stdout.on('error', () => {
    stdoutErrored = true
  })
  handleDeadStreamErrors(process.stderr as unknown as OutputStream)
}

/** `dr`: escribe en stdout y cuenta los bytes hasta que se vacían. */
export function writeToStdout(data: string): void {
  const bytes = Buffer.byteLength(data)
  if (writeToStream(process.stdout as unknown as OutputStream, data, () => { stdoutFlushed += bytes }))
    stdoutQueued += bytes
}

/** `OX`: escribe en stderr si sigue vivo. */
export function writeToStderr(data: string): void {
  writeToStream(process.stderr as unknown as OutputStream, data)
}
