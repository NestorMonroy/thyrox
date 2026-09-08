/**
 * Una fábrica memoizada que construye su valor en la PRIMERA llamada.
 *
 * Difiere la construcción de un esquema desde el arranque del módulo hasta su
 * primer uso: sin esto, importar el paquete construiría todos sus esquemas se
 * usen o no, y ese coste lo paga cada arranque.
 *
 * Procedencia: `ccnmt: packages/permission/internal/lazySchema.ts` (11 líneas,
 * 1 símbolo). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo se
 * **reimplementa** y no se copia. Su propio comentario razona por qué vive
 * dentro del paquete y no en una utilidad compartida: cada dueño que necesite
 * este ayudante lo duplica, porque el coste de la duplicación es despreciable
 * frente al de que una utilidad compartida se vuelva la siguiente dependencia
 * de la que todo cuelga.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  // `??=` y no `||=`: con el segundo, un valor falsy —un 0, una cadena
  // vacía— se reconstruiría en cada llamada, y la memoización sería un
  // adorno que nadie notaría.
  return () => (cached ??= factory())
}
