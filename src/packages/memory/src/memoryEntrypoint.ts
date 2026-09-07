/**
 * Puerto de `ccnmt: packages/memory/src/memoryEntrypoint.ts` (verbatim,
 * salvo `getFeatureValue_CACHED_MAY_BE_STALE` — ver
 * `./internal/pendingCrossPackageDeps.js`).
 *
 * Módulo hoja: contiene las constantes de entrypoint y el constructor del
 * prompt de contexto de búsqueda, compartidos entre `memdir.ts` y
 * `teamMemPrompts.ts`. Se extrajo para romper el ciclo memdir ↔
 * teamMemPrompts: memdir usaba `require` perezoso de teamMemPrompts (guarda
 * TEAMMEM), así que teamMemPrompts no debía importar de vuelta desde
 * memdir. Ambos dependen ahora de esta hoja en su lugar.
 */

import { getMemoryHostBindings } from './host.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from './internal/pendingCrossPackageDeps.js'

export const ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 200

export const DIRS_EXIST_GUIDANCE =
  'Both directories already exist — write to them directly with the Write tool (do not run mkdir or check for their existence).'

export function buildSearchingPastContextSection(autoMemDir: string): string[] {
  if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_coral_fern', false)) {
    return []
  }
  const bindings = getMemoryHostBindings()
  const originalCwd = bindings.getOriginalCwd?.() ?? process.cwd()
  const projectDir = bindings.getProjectDir?.(originalCwd) ?? originalCwd
  const embedded =
    (bindings.hasEmbeddedSearchTools?.() ?? false) ||
    (bindings.isReplModeEnabled?.() ?? false)
  const grepToolName = bindings.grepToolName ?? 'Grep'
  const memSearch = embedded
    ? `grep -rn "<search term>" ${autoMemDir} --include="*.md"`
    : `${grepToolName} with pattern="<search term>" path="${autoMemDir}" glob="*.md"`
  const transcriptSearch = embedded
    ? `grep -rn "<search term>" ${projectDir}/ --include="*.jsonl"`
    : `${grepToolName} with pattern="<search term>" path="${projectDir}/" glob="*.jsonl"`
  return [
    '## Searching past context',
    '',
    'When looking for past context:',
    '1. Search topic files in your memory directory:',
    '```',
    memSearch,
    '```',
    '2. Session transcript logs (last resort — large files, slow):',
    '```',
    transcriptSearch,
    '```',
    'Use narrow search terms (error messages, file paths, function names) rather than broad keywords.',
    '',
  ]
}
