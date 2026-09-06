/**
 * Utilidad de espera sobre streams tipo stdin.
 *
 * PORTE PARCIAL. La fuente (`claude-code-nestor-monroy-tools:
 * packages/shell/src/process.ts`) también declara
 * `registerProcessOutputErrorHandlers`, `writeToStdout`, `writeToStderr` y
 * `exitWithError` (manejo de EPIPE en stdout/stderr y el patrón
 * console.error+exit). El único test portado (`peekForStdinData.test.ts`)
 * ejercita sólo `peekForStdinData`; las otras cuatro se OMITEN por no estar
 * ejercitadas — ninguna tiene dependencia externa, así que portarlas sería
 * mecánico si hiciera falta.
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
