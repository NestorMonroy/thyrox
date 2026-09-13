/** Porte nativo de `filters/git-log.json` (OmniRoute, MIT). */
import type { RtkFilter } from '../types.ts'

export const gitLog: RtkFilter = {
  id: 'git-log',
  label: 'Git Log',
  category: 'git',
  priority: 70,
  match: {
    commands: [/^git\s+log\b/],
    patterns: [/^commit [0-9a-f]{7,40}/m, /^Author: /m],
  },
  includePatterns: [/^commit [0-9a-f]{7,40}/, /^\s{4}\S/],
  dropPatterns: [/^Author: /, /^Date: /, /^\s*$/],
  collapsePatterns: [],
  deduplicate: false,
  maxLines: 120,
  headLines: 40,
  tailLines: 20,
  errorPatterns: [/^commit /],
  tests: [
    {
      name: 'conserva commit y subject, quita Author/Date',
      command: 'git log',
      input: 'commit abcdef1234567890\nAuthor: Dev <dev@example.com>\nDate: today\n\n    feat: add rtk\n',
      expected: 'commit abcdef1234567890\n    feat: add rtk',
    },
  ],
}
