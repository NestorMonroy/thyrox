import { beforeEach, describe, expect, test } from 'bun:test'

/**
 * Tests for fileUtilities.ts's pure helpers — high-traffic Read/Edit
 * formatting logic (line numbering) and cross-platform path comparison.
 *
 * Porte a `../fileUtilities.js`, no `../file.js`: `file.ts` ya existe en
 * este árbol (porte parcial previo, sólo `atomicWriteFile`) y no es mío —
 * no se toca. Estos símbolos viven en un módulo nuevo propio.
 *
 * La fuente inyecta el flag/plataforma con `mock.module()` sobre
 * `@claude-code-how-works/config/{feature-flags,platform}` — ninguno de
 * los dos paquetes existe en este árbol. Se sustituye por el patrón de
 * inyección por setter que ya usa este mismo paquete en otros módulos
 * (`internal/pendingCrossPackageDeps.ts: setGetCwdFn`): `fileUtilities.ts`
 * expone `setPlatformForTests`/`setCompactLinePrefixKillswitchForTests`, y
 * el `beforeEach` los reinicia igual que la fuente reinicia sus mocks.
 */
const {
  addLineNumbers,
  stripLineNumberPrefix,
  convertLeadingTabsToSpaces,
  pathsEqual,
  normalizePathForComparison,
  setPlatformForTests,
  setCompactLinePrefixKillswitchForTests,
} = await import('../fileUtilities.js')

beforeEach(() => {
  setCompactLinePrefixKillswitchForTests(null)
  setPlatformForTests('macos')
})

describe('convertLeadingTabsToSpaces', () => {
  test('no tabs → return reference unchanged (fast-path)', () => {
    const input = 'no tabs here\nor here'
    expect(convertLeadingTabsToSpaces(input)).toBe(input)
  })

  test('single leading tab → 2 spaces', () => {
    expect(convertLeadingTabsToSpaces('\thello')).toBe('  hello')
  })

  test('two leading tabs → 4 spaces', () => {
    expect(convertLeadingTabsToSpaces('\t\thello')).toBe('    hello')
  })

  test('mid-line tabs preserved', () => {
    // Only LEADING tabs convert. Tabs in the middle of a line stay.
    expect(convertLeadingTabsToSpaces('hello\tworld')).toBe('hello\tworld')
  })

  test('multi-line — each line independently converted', () => {
    expect(convertLeadingTabsToSpaces('\tline1\n\t\tline2\nno-tab')).toBe(
      '  line1\n    line2\nno-tab',
    )
  })

  test('empty string passes through', () => {
    expect(convertLeadingTabsToSpaces('')).toBe('')
  })

  test('only-tabs line → all converted', () => {
    expect(convertLeadingTabsToSpaces('\t\t\t')).toBe('      ')
  })

  test('mixed tabs/spaces leading — only the leading tab run converts', () => {
    // The regex is `^\t+`, anchored. Once a non-tab char appears,
    // the match ends. Trailing spaces before content stay literal.
    expect(convertLeadingTabsToSpaces('\t  hello')).toBe('    hello')
  })
})

describe('addLineNumbers — compact format (default)', () => {
  beforeEach(() => {
    setCompactLinePrefixKillswitchForTests(false) // killswitch off → compact ON
  })

  test('empty content → empty string', () => {
    expect(addLineNumbers({ content: '', startLine: 1 })).toBe('')
  })

  test('single line → "1\\tline"', () => {
    expect(addLineNumbers({ content: 'hello', startLine: 1 })).toBe('1\thello')
  })

  test('multi-line — each line numbered with TAB separator', () => {
    expect(
      addLineNumbers({ content: 'a\nb\nc', startLine: 1 }),
    ).toBe('1\ta\n2\tb\n3\tc')
  })

  test('startLine other than 1 — offset applied', () => {
    expect(
      addLineNumbers({ content: 'x\ny', startLine: 100 }),
    ).toBe('100\tx\n101\ty')
  })

  test('CRLF line endings split correctly', () => {
    // The function uses /\r?\n/ for splitting.
    expect(
      addLineNumbers({ content: 'a\r\nb', startLine: 1 }),
    ).toBe('1\ta\n2\tb')
  })
})

describe('addLineNumbers — legacy padded format (killswitch on)', () => {
  beforeEach(() => {
    setCompactLinePrefixKillswitchForTests(true) // killswitch ON → compact OFF
  })

  test('numbers padded to 6 chars + Unicode arrow', () => {
    // Pre-compact format: `     1→hello`. The arrow is U+2192 (→).
    expect(
      addLineNumbers({ content: 'hello', startLine: 1 }),
    ).toBe('     1\u2192hello')
  })

  test('6-digit number — no padding (length already >= 6)', () => {
    expect(
      addLineNumbers({ content: 'x', startLine: 100000 }),
    ).toBe('100000\u2192x')
  })

  test('7-digit number — also no padding (>= 6)', () => {
    expect(
      addLineNumbers({ content: 'x', startLine: 1234567 }),
    ).toBe('1234567\u2192x')
  })
})

describe('stripLineNumberPrefix — inverse of addLineNumbers', () => {
  test('strips compact "N\\t" prefix', () => {
    expect(stripLineNumberPrefix('1\thello')).toBe('hello')
  })

  test('strips legacy "    N→" prefix', () => {
    expect(stripLineNumberPrefix('     1\u2192hello')).toBe('hello')
  })

  test('strips with 6-digit number + arrow', () => {
    expect(stripLineNumberPrefix('100000\u2192x')).toBe('x')
  })

  test('returns line unchanged when no prefix matches', () => {
    expect(stripLineNumberPrefix('plain text')).toBe('plain text')
  })

  test('returns line unchanged for empty string', () => {
    expect(stripLineNumberPrefix('')).toBe('')
  })

  test('round-trip: addLineNumbers + stripLineNumberPrefix recovers content', () => {
    // The two functions must invert. If they ever drift, edits would
    // round-trip incorrectly.
    const lines = ['hello world', '  indented', 'last']
    const numbered = addLineNumbers({ content: lines.join('\n'), startLine: 5 })
    const recovered = numbered.split('\n').map(stripLineNumberPrefix)
    expect(recovered).toEqual(lines)
  })

  test('arrow without leading whitespace + tab matches too', () => {
    // The regex is /^\s*\d+[→\t](.*)$/. With \s* (zero or more), no
    // padding still matches.
    expect(stripLineNumberPrefix('1\u2192hi')).toBe('hi')
  })
})

describe('normalizePathForComparison — platform sensitivity', () => {
  test('macos: forward slashes preserved, case preserved', () => {
    setPlatformForTests('macos')
    expect(normalizePathForComparison('/Users/Me/Project')).toBe(
      '/Users/Me/Project',
    )
  })

  test('macos: relative-path . and .. resolved', () => {
    setPlatformForTests('macos')
    expect(normalizePathForComparison('a/./b/../c')).toBe('a/c')
  })

  test('windows: forward slashes converted to backslashes', () => {
    setPlatformForTests('windows')
    expect(normalizePathForComparison('C:/Users/Me')).toBe(
      'c:\\users\\me',
    )
  })

  test('windows: case lowercased (Windows paths are case-insensitive)', () => {
    setPlatformForTests('windows')
    expect(normalizePathForComparison('C:\\Users\\Me')).toBe(
      'c:\\users\\me',
    )
  })

  test('linux: same as macos (Unix-style)', () => {
    setPlatformForTests('linux')
    expect(normalizePathForComparison('/home/User/X')).toBe('/home/User/X')
  })
})

describe('pathsEqual — platform-aware comparison', () => {
  test('macos: case-sensitive — different case → not equal', () => {
    setPlatformForTests('macos')
    expect(pathsEqual('/foo/Bar', '/foo/bar')).toBe(false)
  })

  test('macos: same path → equal', () => {
    setPlatformForTests('macos')
    expect(pathsEqual('/foo/bar', '/foo/bar')).toBe(true)
  })

  test('macos: redundant separators normalized', () => {
    setPlatformForTests('macos')
    expect(pathsEqual('/foo//bar', '/foo/bar')).toBe(true)
  })

  test('macos: . and .. resolved', () => {
    setPlatformForTests('macos')
    expect(pathsEqual('/foo/./bar', '/foo/bar')).toBe(true)
    expect(pathsEqual('/foo/baz/../bar', '/foo/bar')).toBe(true)
  })

  test('windows: case-insensitive — different case → equal', () => {
    setPlatformForTests('windows')
    expect(pathsEqual('C:\\Users\\me', 'c:\\users\\ME')).toBe(true)
  })

  test('windows: forward and backslash both work', () => {
    setPlatformForTests('windows')
    expect(pathsEqual('C:/Users/me', 'c:\\users\\me')).toBe(true)
  })

  test('linux: case-sensitive', () => {
    setPlatformForTests('linux')
    expect(pathsEqual('/etc/Hosts', '/etc/hosts')).toBe(false)
  })
})
