/**
 * Combinacion de senales de aborto con vencimiento propio — porte de
 * `ccnmt: packages/agent/combinedAbortSignal.ts`.
 */
import { createAbortController } from './abortController.ts'

/**
 * Una senal que aborta cuando lo hace `signal`, cuando lo hace `signalB`, o
 * cuando vence `timeoutMs`. Devuelve tambien la limpieza de sus escuchas.
 *
 * El vencimiento se pasa como `timeoutMs` y NO como una tercera senal creada
 * con `AbortSignal.timeout(ms)`: bajo Bun ese temporizador se finaliza de
 * forma perezosa y se acumula en memoria nativa hasta disparar. Con
 * `setTimeout`/`clearTimeout` la limpieza lo libera en el acto.
 */
export function createCombinedAbortSignal(
  signal: AbortSignal | undefined,
  opts?: { signalB?: AbortSignal; timeoutMs?: number },
): { signal: AbortSignal; cleanup: () => void } {
  const { signalB, timeoutMs } = opts ?? {}
  const combined = createAbortController()

  // Alguna ya abortó: la combinada nace abortada y no hay nada que limpiar.
  if (signal?.aborted || signalB?.aborted) {
    combined.abort()
    return { signal: combined.signal, cleanup: () => {} }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const abortCombined = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    combined.abort()
  }

  if (timeoutMs !== undefined) {
    timer = setTimeout(abortCombined, timeoutMs)
    timer.unref?.()
  }
  signal?.addEventListener('abort', abortCombined)
  signalB?.addEventListener('abort', abortCombined)

  const cleanup = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    signal?.removeEventListener('abort', abortCombined)
    signalB?.removeEventListener('abort', abortCombined)
  }

  return { signal: combined.signal, cleanup }
}
