/**
 * Filtro de reserva -- porte nativo de `filters/generic-output.json`
 * (OmniRoute, MIT). Prioridad minima: sólo se elige cuando ningún filtro
 * específico matcheó.
 */
import type { RtkFilter } from '../types.ts'

export const genericOutput: RtkFilter = {
  id: 'generic-output',
  label: 'Generic Output',
  category: 'generic',
  priority: 10,
  match: {
    commands: [],
    patterns: [/Error:/, /Exception:/, /Traceback \(most recent call last\):/],
  },
  includePatterns: [],
  dropPatterns: [/^\s*$/],
  collapsePatterns: [],
  deduplicate: false,
  maxLines: 120,
  headLines: 35,
  tailLines: 45,
  errorPatterns: [/error/i, /failed/i, /exception/i, /traceback/i],
  tests: [
    {
      name: 'quita lineas en blanco, conserva error y traceback',
      input: '\nError: boom\n\nTraceback (most recent call last):\n  file.py:1\n',
      expected: 'Error: boom\nTraceback (most recent call last):\n  file.py:1',
    },
  ],
}
