/**
 * Truncado inteligente -- porte nativo de
 * `open-sse/services/compression/engines/rtk/smartTruncate.ts` (OmniRoute,
 * MIT). Conserva cabeza y cola completas; de en medio, conserva las lineas
 * que matchean un patron de prioridad (tipicamente errores/fallos) y
 * descarta el resto con un marcador de cuantas se omitieron.
 */
export function smartTruncate(
  texto: string,
  opts: { maxLines: number; headLines: number; tailLines: number; priorityPatterns: RegExp[] },
): { texto: string; truncado: boolean } {
  const lineas = texto.split(/\r?\n/)
  if (lineas.length <= opts.maxLines) return { texto, truncado: false }

  const head = lineas.slice(0, opts.headLines)
  const tail = opts.tailLines > 0 ? lineas.slice(-opts.tailLines) : []
  const medioInicio = opts.headLines
  const medioFin = opts.tailLines > 0 ? lineas.length - opts.tailLines : lineas.length
  const medio = lineas.slice(medioInicio, Math.max(medioInicio, medioFin))

  const prioritarias = medio.filter((l) => opts.priorityPatterns.some((p) => p.test(l)))
  const omitidas = medio.length - prioritarias.length

  const partes = [...head]
  if (prioritarias.length > 0) partes.push(...prioritarias)
  if (omitidas > 0) partes.push(`... (${omitidas} linea(s) omitida(s))`)
  partes.push(...tail)

  return { texto: partes.join('\n'), truncado: true }
}
