/**
 * Puerto de `ccnmt: packages/output/src/setUtils.ts` (verbatim — sin
 * imports en la fuente). Operaciones de conjunto usadas por el resto del
 * paquete (y por quien compare dos `Set` de IDs de herramienta/mensaje en
 * caliente); cada una anota en la fuente que esta optimizada por velocidad,
 * no por brevedad.
 */

/**
 * Nota: este codigo es caliente, esta optimizado por velocidad.
 */
export function difference<A>(a: Set<A>, b: Set<A>): Set<A> {
  const result = new Set<A>()
  for (const item of a) {
    if (!b.has(item)) {
      result.add(item)
    }
  }
  return result
}

/**
 * Nota: este codigo es caliente, esta optimizado por velocidad.
 */
export function intersects<A>(a: Set<A>, b: Set<A>): boolean {
  if (a.size === 0 || b.size === 0) {
    return false
  }
  for (const item of a) {
    if (b.has(item)) {
      return true
    }
  }
  return false
}

/**
 * Nota: este codigo es caliente, esta optimizado por velocidad.
 */
export function every<A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean {
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}

/**
 * Nota: este codigo es caliente, esta optimizado por velocidad.
 */
export function union<A>(a: Set<A>, b: Set<A>): Set<A> {
  const result = new Set<A>()
  for (const item of a) {
    result.add(item)
  }
  for (const item of b) {
    result.add(item)
  }
  return result
}
