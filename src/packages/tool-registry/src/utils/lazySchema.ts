/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/utils/lazySchema.ts` (TASK #232, porte
 * de `tool-registry`). Sin dependencias.
 *
 * Devuelve una factory memoizada que construye el valor en la primera
 * llamada. Se usa para diferir la construcción de esquemas Zod desde el
 * momento de inicialización del módulo hasta el primer acceso.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
