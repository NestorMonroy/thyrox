/** Porte nativo de `filters/test-pytest.json` (OmniRoute, MIT). */
import type { RtkFilter } from '../types.ts'

export const testPytest: RtkFilter = {
  id: 'test-pytest',
  label: 'Pytest',
  category: 'test',
  priority: 90,
  match: {
    commands: [/^(?:pytest|python3?\s+-m\s+pytest)\b/],
    patterns: [/=+\s+(?:\d+\s+)?(?:passed|failed|errors?)/, /^E\s+/m, /^FAILED /m],
  },
  includePatterns: [
    /^FAILED /,
    /^ERROR /,
    /^E\s+/,
    /Traceback \(most recent call last\):/,
    /=+ short test summary info =+/,
    /=+ .*failed/,
    /AssertionError/,
  ],
  dropPatterns: [/^\.+$/, /^\s*$/],
  collapsePatterns: [/^E\s+/],
  deduplicate: true,
  maxLines: 160,
  headLines: 28,
  tailLines: 60,
  errorPatterns: [/FAILED/, /ERROR/, /Traceback/, /AssertionError/],
  tests: [
    {
      name: 'conserva FAILED, traceback y resumen',
      command: 'pytest',
      input: 'FAILED tests/test_a.py::test_a - AssertionError\nE assert 1 == 2\n================ 1 failed, 2 passed ================\n',
      expected: 'FAILED tests/test_a.py::test_a - AssertionError\nE assert 1 == 2\n================ 1 failed, 2 passed ================',
    },
  ],
}
