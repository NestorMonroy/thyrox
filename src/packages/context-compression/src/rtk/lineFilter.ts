/**
 * Motor de filtrado por lineas -- porte nativo de
 * `open-sse/services/compression/engines/rtk/lineFilter.ts` (OmniRoute,
 * MIT), recortado al subconjunto de `RtkFilter` que este pase declara
 * completo (ver `types.ts`). El orden de las etapas es el de la fuente:
 * ANSI -> drop -> include -> collapse -> dedupe -> truncado inteligente.
 */
import type { RtkFilter, LineFilterResult } from './types.ts'
import { smartTruncate } from './smartTruncate.ts'

const ANSI_PATTERN = new RegExp('\\x1b\\[[0-?]*[ -/]*[@-~]', 'g')

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

export function applyLineFilter(text: string, filter: RtkFilter): LineFilterResult {
  const rulesApplied: string[] = []
  let lines = stripAnsi(text).split(/\r?\n/)
  // Un texto que termina en salto de linea produce un ultimo elemento vacio
  // al partir -- artefacto del split, no una linea real del contenido. Se
  // quita UNA sola vez (no es lo mismo que "sin lineas en blanco": esas
  // siguen filtrables por `dropPatterns`/`collapsePatterns` como cualquier
  // otra).
  if (lines.length > 1 && lines.at(-1) === '') lines = lines.slice(0, -1)
  const originalLineCount = lines.length

  if (filter.dropPatterns.length > 0) {
    const before = lines.length
    lines = lines.filter((l) => !filter.dropPatterns.some((p) => p.test(l)))
    if (lines.length !== before) rulesApplied.push(`${filter.id}:drop`)
  }

  if (filter.includePatterns.length > 0) {
    const kept = lines.filter((l) => filter.includePatterns.some((p) => p.test(l)))
    if (kept.length > 0) {
      lines = kept
      rulesApplied.push(`${filter.id}:include`)
    }
  }

  if (filter.collapsePatterns.length > 0) {
    const seen = new Set<string>()
    lines = lines.filter((l) => {
      if (!filter.collapsePatterns.some((p) => p.test(l))) return true
      const key = l.trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    rulesApplied.push(`${filter.id}:collapse`)
  }

  if (filter.deduplicate) {
    const withoutConsecutiveRepeats: string[] = []
    for (const l of lines) {
      if (withoutConsecutiveRepeats.at(-1) !== l) withoutConsecutiveRepeats.push(l)
    }
    if (withoutConsecutiveRepeats.length !== lines.length) rulesApplied.push(`${filter.id}:deduplicate`)
    lines = withoutConsecutiveRepeats
  }

  const joined = lines.join('\n')
  if (lines.length <= filter.maxLines) {
    const output = joined.trim().length === 0 && filter.onEmpty ? filter.onEmpty : joined
    return { text: output, linesRemoved: Math.max(0, originalLineCount - lines.length), rulesApplied }
  }

  const result = smartTruncate(joined, {
    maxLines: filter.maxLines,
    headLines: filter.headLines,
    tailLines: filter.tailLines,
    priorityPatterns: filter.errorPatterns,
  })
  if (result.truncated) rulesApplied.push(`${filter.id}:truncate`)
  const output = result.text.trim().length === 0 && filter.onEmpty ? filter.onEmpty : result.text
  return {
    text: output,
    linesRemoved: Math.max(0, originalLineCount - output.split(/\r?\n/).length),
    rulesApplied,
  }
}
