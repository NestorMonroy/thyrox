/**
 * Puerto FIEL y COMPLETO de `ccnmt: packages/tool-registry/src/utils/array.ts`
 * (TASK #232, porte de `tool-registry`). Sin dependencias — tres utilidades
 * puras de arreglo.
 */
export function intersperse<A>(as: A[], separator: (index: number) => A): A[] {
  return as.flatMap((a, i) => (i ? [separator(i), a] : [a]))
}

export function count<T>(arr: readonly T[], pred: (x: T) => unknown): number {
  let n = 0
  for (const x of arr) n += +!!pred(x)
  return n
}

export function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)]
}
