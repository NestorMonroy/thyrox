/**
 * Puerto de `ccnmt: packages/config/stream.ts` (68 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * `AsyncIterator` de un solo uso respaldado por una cola interna: `enqueue`
 * añade valores, `done`/`error` cierran el stream, y quien consuma con
 * `for await` recibe cada valor en orden — bloqueando en `next()` cuando la
 * cola está vacía hasta que llegue el próximo valor, el cierre, o el error.
 */
export class Stream<T> implements AsyncIterator<T> {
  private readonly queue: T[] = []
  private readResolve?: (value: IteratorResult<T>) => void
  private readReject?: (error: unknown) => void
  private isDone: boolean = false
  private hasError: unknown | undefined
  private started = false

  constructor(private readonly returned?: () => void) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    if (this.started) {
      throw new Error('Stream can only be iterated once')
    }
    this.started = true
    return this
  }

  next(): Promise<IteratorResult<T, unknown>> {
    if (this.queue.length > 0) {
      return Promise.resolve({
        done: false,
        value: this.queue.shift()!,
      })
    }
    if (this.isDone) {
      return Promise.resolve({ done: true, value: undefined })
    }
    if (this.hasError) {
      return Promise.reject(this.hasError)
    }
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.readResolve = resolve
      this.readReject = reject
    })
  }

  enqueue(value: T): void {
    if (this.readResolve) {
      const resolve = this.readResolve
      this.readResolve = undefined
      this.readReject = undefined
      resolve({ done: false, value })
    } else {
      this.queue.push(value)
    }
  }

  done() {
    this.isDone = true
    if (this.readResolve) {
      const resolve = this.readResolve
      this.readResolve = undefined
      this.readReject = undefined
      resolve({ done: true, value: undefined })
    }
  }

  error(error: unknown) {
    this.hasError = error
    if (this.readReject) {
      const reject = this.readReject
      this.readResolve = undefined
      this.readReject = undefined
      reject(error)
    }
  }

  return(): Promise<IteratorResult<T, unknown>> {
    this.isDone = true
    if (this.returned) {
      this.returned()
    }
    return Promise.resolve({ done: true, value: undefined })
  }
}
