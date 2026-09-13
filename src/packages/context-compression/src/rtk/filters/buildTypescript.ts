/** Porte nativo de `filters/build-typescript.json` (OmniRoute, MIT). */
import type { RtkFilter } from '../types.ts'

export const buildTypescript: RtkFilter = {
  id: 'build-typescript',
  label: 'TypeScript',
  category: 'build',
  priority: 93,
  match: {
    commands: [/^(?:tsc|bun\s+run\s+typecheck|npm\s+run\s+typecheck)\b/],
    patterns: [/TS\d{4}:/, /error TS\d{4}/],
  },
  includePatterns: [/TS\d{4}:/, /error TS\d{4}/, /^Found \d+ errors?/],
  dropPatterns: [/^\s*$/],
  collapsePatterns: [],
  deduplicate: false,
  maxLines: 120,
  headLines: 20,
  tailLines: 40,
  errorPatterns: [/TS\d{4}/, /Found \d+/],
  tests: [
    {
      name: 'conserva el error TSxxxx y el resumen final',
      command: 'tsc',
      input: 'src/a.ts:1:1 - error TS2322: Type string is not assignable\nFound 1 error.\n',
      expected: 'src/a.ts:1:1 - error TS2322: Type string is not assignable\nFound 1 error.',
    },
  ],
}
