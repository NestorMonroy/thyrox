/** Porte nativo de `filters/git-diff.json` (OmniRoute, MIT). */
import type { RtkFilter } from '../types.ts'

export const gitDiff: RtkFilter = {
  id: 'git-diff',
  label: 'Git Diff',
  category: 'git',
  priority: 94,
  match: {
    commands: [/^git\s+(?:diff|show)\b/],
    patterns: [/^diff --git /m, /^@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@/m],
  },
  includePatterns: [],
  dropPatterns: [/^index [0-9a-f]+\.\.[0-9a-f]+/, /^--- a\//, /^\+\+\+ b\//],
  collapsePatterns: [/^\s*$/],
  deduplicate: false,
  maxLines: 180,
  headLines: 40,
  tailLines: 50,
  errorPatterns: [/^diff --git /, /^@@ /, /^[+-](?![+-]{2})/],
  tests: [
    {
      name: 'quita metadata de indice, conserva hunks y lineas cambiadas',
      command: 'git diff',
      input: 'diff --git a/a.ts b/a.ts\nindex abc123..def456 100644\n--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,2 @@\n-console.log("old")\n+console.log("new")\n',
      expected: 'diff --git a/a.ts b/a.ts\n@@ -1,2 +1,2 @@\n-console.log("old")\n+console.log("new")',
    },
  ],
}
