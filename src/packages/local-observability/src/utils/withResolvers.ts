/**
 * Puerto de `ccnmt: packages/local-observability/src/utils/withResolvers.ts`
 * (13 líneas fuente, 100 % portado). Polyfill de `Promise.withResolvers()`
 * (ES2024, Node 22+) — el `package.json` de la fuente declara
 * `"engines": {"node": ">=18.0.0"}`, así que no puede usar el nativo.
 */
export function withResolvers<T>(): PromiseWithResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
