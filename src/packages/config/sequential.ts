/**
 * Puerto de `ccnmt: packages/config/sequential.ts` (56 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 */

type QueueItem<T extends unknown[], R> = {
  args: T
  resolve: (value: R) => void
  reject: (reason?: unknown) => void
  context: unknown
}

/**
 * Crea un envoltorio de ejecución secuencial para funciones async, para
 * evitar condiciones de carrera. Garantiza que las llamadas concurrentes a
 * la función envuelta se ejecuten una a la vez, en el orden en que se
 * recibieron, preservando los valores de retorno correctos.
 *
 * Útil para operaciones que deben ejecutarse secuencialmente, como
 * escrituras de archivo o actualizaciones de base de datos que podrían
 * entrar en conflicto si se ejecutan concurrentemente.
 *
 * @param fn la función async a envolver con ejecución secuencial
 * @returns una versión envuelta de la función que ejecuta las llamadas secuencialmente
 */
export function sequential<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  const queue: QueueItem<T, R>[] = []
  let processing = false

  async function processQueue(): Promise<void> {
    if (processing) return
    if (queue.length === 0) return

    processing = true

    while (queue.length > 0) {
      const { args, resolve, reject, context } = queue.shift()!

      try {
        const result = await fn.apply(context, args)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    processing = false

    // Comprueba si se añadieron ítems nuevos mientras se procesaba.
    if (queue.length > 0) {
      void processQueue()
    }
  }

  return function (this: unknown, ...args: T): Promise<R> {
    return new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject, context: this })
      void processQueue()
    })
  }
}
