/**
 * Filtro PROPIO (no viene de OmniRoute, que no cubre `bun test`) --
 * diseñado sobre el formato real observado en este mismo árbol durante
 * esta sesión: bloques de advertencia de consola repetidos EXACTOS
 * (p. ej. "Invalid hook call" x3 en `hooks/__tests__/appState.test.ts`)
 * son la mayor fuente de bulto, no el veredicto. `deduplicate` colapsa las
 * lineas consecutivas repetidas; el truncado inteligente prioriza `(fail)`,
 * `error:`, el puntero `^` de bun y las lineas `file:line`.
 */
import type { RtkFilter } from '../types.ts'

export const testBun: RtkFilter = {
  id: 'test-bun',
  label: 'Bun test',
  category: 'test',
  priority: 90,
  match: {
    commands: [/^bun\s+test\b/],
    patterns: [/^bun test v\d/m, /^\(fail\)/m, /^Ran \d+ tests? across/m],
  },
  includePatterns: [],
  dropPatterns: [],
  collapsePatterns: [],
  deduplicate: true,
  maxLines: 150,
  headLines: 20,
  tailLines: 40,
  errorPatterns: [/^\(fail\)/, /^error:/, /^\s*\^\s*$/, /^\s*at\s+/, /:\d+:\d+\)?$/],
  tests: [
    {
      name: 'colapsa una advertencia de consola repetida exacta',
      command: 'bun test',
      input:
        'Invalid hook call. Hooks can only be called inside of the body of a function component.\n' +
        'Invalid hook call. Hooks can only be called inside of the body of a function component.\n' +
        'Invalid hook call. Hooks can only be called inside of the body of a function component.\n' +
        ' 4 pass\n 0 fail\nRan 4 tests across 1 file. [10.00ms]\n',
      expected:
        'Invalid hook call. Hooks can only be called inside of the body of a function component.\n' +
        ' 4 pass\n 0 fail\nRan 4 tests across 1 file. [10.00ms]',
    },
  ],
}
