/**
 * Puerto de `ccnmt: packages/config/sleep.ts` (84 líneas fuente). Sin
 * dependencias — `setTimeout`/`AbortSignal` puros. Reimplementación fiel:
 * mismos nombres, misma firma, mismo comportamiento (ver
 * `porte-completo-no-parcial.md`, «la licencia cambia el mecanismo, nunca
 * la fidelidad»).
 *
 * `sleep` resuelve tras `ms` milisegundos, o de inmediato si `signal` se
 * aborta antes — para que un loop de backoff no bloquee un shutdown.
 * `withTimeout` corre una promesa contra un timeout: si no se resuelve a
 * tiempo, rechaza con `Error(message)`.
 */

/**
 * Sleep que responde a abort. Por defecto un abort resuelve en silencio; quien
 * llama revisa `signal.aborted` después del await. Con `throwOnAbort: true`
 * (o `abortError` provisto) el abort rechaza en vez de resolver — útil dentro
 * de un loop de reintento cuyo rechazo debe burbujear y cancelar la operación
 * entera. `abortError` permite personalizar el error de rechazo (implica
 * `throwOnAbort: true`); sirve para loops que atrapan una clase de error
 * concreta.
 */
export function sleep(
  ms: number,
  signal?: AbortSignal,
  opts?: { throwOnAbort?: boolean; abortError?: () => Error; unref?: boolean },
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Se revisa el estado abortado ANTES de armar el timer. Si `onAbort` se
    // definiera primero y se llamara sincrónicamente aquí, referenciaría a
    // `timer` mientras aún está en la Temporal Dead Zone.
    if (signal?.aborted) {
      if (opts?.throwOnAbort || opts?.abortError) {
        reject(opts.abortError?.() ?? new Error('aborted'))
      } else {
        resolve()
      }
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort(): void {
      clearTimeout(timer)
      if (opts?.throwOnAbort || opts?.abortError) {
        reject(opts.abortError?.() ?? new Error('aborted'))
      } else {
        resolve()
      }
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    if (opts?.unref) {
      timer.unref?.()
    }
  })
}

/**
 * Corre una promesa contra un timeout. Rechaza con `Error(message)` si la
 * promesa no se asienta dentro de `ms`. El timer se limpia cuando la promesa
 * se asienta (sin timer colgante) y se hace `unref` para no bloquear la
 * salida del proceso.
 *
 * No cancela el trabajo subyacente: si la promesa está respaldada por una
 * operación async fuera de control, esa operación sigue corriendo. Esto sólo
 * devuelve el control a quien llama.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
    timer.unref?.()
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
}
