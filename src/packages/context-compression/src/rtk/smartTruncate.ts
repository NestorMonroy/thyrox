/**
 * Truncado inteligente -- porte nativo de
 * `open-sse/services/compression/engines/rtk/smartTruncate.ts` (OmniRoute,
 * MIT). Conserva cabeza y cola completas; de en medio, conserva las lineas
 * que matchean un patron de prioridad (tipicamente errores/fallos) y
 * descarta el resto con un marcador de cuantas se omitieron.
 */
export function smartTruncate(
  text: string,
  opts: { maxLines: number; headLines: number; tailLines: number; priorityPatterns: RegExp[] },
): { text: string; truncated: boolean } {
  const lines = text.split(/\r?\n/)
  if (lines.length <= opts.maxLines) return { text, truncated: false }

  const head = lines.slice(0, opts.headLines)
  const tail = opts.tailLines > 0 ? lines.slice(-opts.tailLines) : []
  const middleStart = opts.headLines
  const middleEnd = opts.tailLines > 0 ? lines.length - opts.tailLines : lines.length
  const middle = lines.slice(middleStart, Math.max(middleStart, middleEnd))

  const priorityLines = middle.filter((l) => opts.priorityPatterns.some((p) => p.test(l)))
  const omitted = middle.length - priorityLines.length

  const parts = [...head]
  if (priorityLines.length > 0) parts.push(...priorityLines)
  if (omitted > 0) parts.push(`... (${omitted} linea(s) omitida(s))`)
  parts.push(...tail)

  return { text: parts.join('\n'), truncated: true }
}
