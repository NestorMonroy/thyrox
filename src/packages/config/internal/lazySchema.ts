/**
 * Puerto de `ccnmt: packages/config/internal/lazySchema.ts` (11 líneas
 * fuente). No es uno de los 15 módulos del alcance — es la dependencia
 * de hoja que `mcpConfigSchema.ts` necesita: sin dependencias propias, se
 * porta en el sitio en vez de bloquearse con un `require` diferido.
 *
 * Devuelve una función factory memoizada que construye el valor en su
 * primera llamada. Sirve para diferir la construcción de un esquema Zod
 * del momento de inicializar el módulo al momento del primer acceso.
 *
 * La fuente deja este helper de 8 líneas duplicado por cada paquete que lo
 * necesita, en vez de centralizarlo en un paquete de utilidades compartido
 * — el costo de la duplicación es menor que el de que ese paquete
 * compartido se vuelva la próxima dependencia-Dios.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
