/**
 * Agrupa por clave, con la semántica de `Object.groupBy` de TC39.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/utils/objectGroupBy.ts`
 * (18 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se reimplementa y no se copia — aquí el algoritmo ES la especificación
 * (https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.groupby),
 * así que la reimplementación coincide por obligación, no por copia.
 *
 * Dos propiedades que la especificación fija y que la firma sola no dice:
 *
 * - El objeto resultante tiene prototipo **nulo**. Así una clave llamada
 *   `toString` o `constructor` es una clave y no un método heredado, que es
 *   la trampa de agrupar sobre datos que vienen del modelo.
 * - El selector recibe el **índice** además del elemento, base 0, y el orden
 *   dentro de cada grupo es el de la entrada.
 *
 * DIVERGENCIA DECLARADA: la acumulación pasa por una variable local en vez de
 * `result[key].push(...)`. Con `noUncheckedIndexedAccess` —que este árbol sí
 * activa— el acceso indexado sobre un `Partial<Record<…>>` es `T[] |
 * undefined` y `.push` no typechecks. La conducta es la misma.
 */
export function objectGroupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  keySelector: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  const result = Object.create(null) as Partial<Record<K, T[]>>
  let index = 0
  for (const item of items) {
    const key = keySelector(item, index++)
    const group = result[key]
    if (group === undefined) {
      result[key] = [item]
    } else {
      group.push(item)
    }
  }
  return result
}
