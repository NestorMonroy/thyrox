/** Porte nativo de `filters/git-status.json` (OmniRoute, MIT). */
import type { RtkFilter } from '../types.ts'

export const gitStatus: RtkFilter = {
  id: 'git-status',
  label: 'Git Status',
  category: 'git',
  priority: 95,
  match: {
    commands: [/^git\s+status\b/],
    patterns: [/^On branch /m, /^Changes (?:not staged|to be committed)/m, /^Untracked files:/m],
  },
  includePatterns: [
    /^On branch /,
    /^Your branch /,
    /^Changes /,
    /^Untracked files:/,
    /^\s*(modified|new file|deleted|renamed|both modified):/,
    /^\s*[MADRCU?!]{1,2}\s+/,
  ],
  dropPatterns: [/^\s*$/, /^\s*\(use .*\)$/],
  collapsePatterns: [],
  deduplicate: false,
  maxLines: 80,
  headLines: 12,
  tailLines: 20,
  errorPatterns: [/^Changes /, /^Untracked files:/],
  tests: [
    {
      name: 'quita branch y "(use ...)"',
      command: 'git status',
      input: 'On branch main\nChanges not staged for commit:\n  (use "git add" to update)\n\tmodified: src/app.ts\nnothing added to commit\n',
      expected: 'On branch main\nChanges not staged for commit:\n\tmodified: src/app.ts',
    },
  ],
}
