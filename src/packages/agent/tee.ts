/**
 * Reparto de un `AsyncIterable` en N consumidores independientes — porte de
 * `ccnmt: packages/agent/tee.ts`.
 *
 * Cada consumidor recibe TODOS los elementos de la fuente. La fuente se drena
 * una sola vez, en segundo plano: el consumidor rapido acumula en su propia
 * cola en vez de esperar al lento, que es lo que evita que el mas lento fije
 * el ritmo de todos.
 */
export function tee<T>(source: AsyncIterable<T>, count = 2): AsyncIterable<T>[] {
  const queues: T[][] = Array.from({ length: count }, () => [])
  type Pending = {
    resolve: (value: IteratorResult<T, undefined>) => void
    reject: (reason: unknown) => void
  }
  const pendings: Pending[][] = Array.from({ length: count }, () => [])
  let sourceDone = false
  let sourceError: unknown

  /** Entrega al consumidor `i`: a su espera si la tiene, a su cola si no. */
  function deliver(i: number, item: T): void {
    const waiting = pendings[i].shift()
    if (waiting) waiting.resolve({ value: item, done: false })
    else queues[i].push(item)
  }

  /**
   * Cierra al consumidor `i`.
   *
   * Si la fuente lanzo, la espera pendiente se RECHAZA en vez de resolverse
   * como terminada: resolverla perderia el error, y quien espera leeria un
   * final limpio de un flujo que fallo.
   */
  function close(i: number): void {
    for (const p of pendings[i]) {
      if (sourceError !== undefined) p.reject(sourceError)
      else p.resolve({ value: undefined, done: true })
    }
    pendings[i] = []
  }

  async function drain(): Promise<void> {
    try {
      for await (const item of source) {
        for (let i = 0; i < count; i++) deliver(i, item)
      }
    } catch (e) {
      sourceError = e
    } finally {
      sourceDone = true
      for (let i = 0; i < count; i++) close(i)
    }
  }

  void drain()

  return Array.from({ length: count }, (_, i) => ({
    [Symbol.asyncIterator](): AsyncIterator<T, undefined> {
      return {
        next(): Promise<IteratorResult<T, undefined>> {
          // La cola manda sobre el estado de la fuente: lo ya emitido se
          // entrega aunque la fuente haya terminado o fallado despues.
          const queued = queues[i].shift()
          if (queued !== undefined) return Promise.resolve({ value: queued, done: false })
          if (sourceDone) {
            if (sourceError !== undefined) return Promise.reject(sourceError)
            return Promise.resolve({ value: undefined, done: true })
          }
          return new Promise<IteratorResult<T, undefined>>((resolve, reject) => {
            pendings[i].push({ resolve, reject })
          })
        },
      }
    },
  }))
}
