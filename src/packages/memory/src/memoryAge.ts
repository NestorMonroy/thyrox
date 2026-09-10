/**
 * Puerto de `ccnmt: packages/memory/src/memoryAge.ts` (verbatim — sin
 * dependencias).
 */

/**
 * Días transcurridos desde `mtime`. Redondeo hacia abajo: 0 para hoy,
 * 1 para ayer. Los timestamps futuros se acotan a 0.
 */
export function memoryAgeDays(mtimeMs: number): number {
  return Math.max(0, Math.floor((Date.now() - mtimeMs) / 86_400_000))
}

/**
 * Cadena de edad legible para quien consume el prompt.
 */
export function memoryAge(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/**
 * Advertencia de frescura en texto plano para memorias más antiguas.
 */
export function memoryFreshnessText(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d <= 1) return ''
  return (
    `This memory is ${d} days old. ` +
    `Memories are point-in-time observations, not live state — ` +
    `claims about code behavior or file:line citations may be outdated. ` +
    `Verify against current code before asserting as fact.`
  )
}

/**
 * Nota de frescura envuelta en system-reminder para consumidores que no
 * agregan una por su cuenta.
 */
export function memoryFreshnessNote(mtimeMs: number): string {
  const text = memoryFreshnessText(mtimeMs)
  if (!text) return ''
  return `<system-reminder>${text}</system-reminder>\n`
}
