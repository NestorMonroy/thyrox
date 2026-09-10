/**
 * Porte de `ccnmt: packages/agent/__tests__/transcriptSearch.test.ts`,
 * acotado a `toolUseSearchText` y `toolResultSearchText` (ver docstring
 * del modulo portado para la divergencia declarada).
 */
import { describe, expect, test } from 'bun:test'
import {
  toolResultSearchText,
  toolUseSearchText,
} from '../sessionTools/transcriptSearch.js'

describe('toolUseSearchText — primary-argument extraction', () => {
  test('Bash command field captured', () => {
    expect(toolUseSearchText({ command: 'ls -la' })).toBe('ls -la')
  })

  test('Grep pattern field captured', () => {
    expect(toolUseSearchText({ pattern: 'TODO' })).toBe('TODO')
  })

  test('Read file_path captured', () => {
    expect(toolUseSearchText({ file_path: '/src/foo.ts' })).toBe('/src/foo.ts')
  })

  test('SkillTool skill field captured', () => {
    expect(toolUseSearchText({ skill: 'commit' })).toBe('commit')
  })

  test('multiple fields joined with newlines', () => {
    const r = toolUseSearchText({
      command: 'echo hi',
      description: 'say hi',
    })
    expect(r).toContain('echo hi')
    expect(r).toContain('say hi')
    expect(r.split('\n')).toHaveLength(2)
  })

  test('unknown field is NOT indexed (allowlist)', () => {
    // 'rawOutputPath' es metadata interna — nunca se renderiza.
    expect(toolUseSearchText({ rawOutputPath: '/tmp/x' })).toBe('')
  })

  test('non-object input → empty string', () => {
    expect(toolUseSearchText(null)).toBe('')
    expect(toolUseSearchText(undefined)).toBe('')
    expect(toolUseSearchText('string')).toBe('')
    expect(toolUseSearchText(42)).toBe('')
  })

  test('args array (Tmux): joined with spaces', () => {
    expect(toolUseSearchText({ args: ['ls', '-la'] })).toBe('ls -la')
  })

  test('files array (SendUserFile): joined', () => {
    expect(toolUseSearchText({ files: ['a.txt', 'b.txt'] })).toBe('a.txt b.txt')
  })

  test('mixed args (non-string) is rejected (every() guard)', () => {
    // Documentado: solo los arreglos que son 100% strings se concatenan.
    expect(toolUseSearchText({ args: ['ls', 42] })).toBe('')
  })

  test('empty object → empty string', () => {
    expect(toolUseSearchText({})).toBe('')
  })
})

describe('toolResultSearchText — known shapes', () => {
  test('Bash output: stdout only', () => {
    expect(toolResultSearchText({ stdout: 'hello\n' })).toBe('hello\n')
  })

  test('Bash output: stdout + stderr concatenated', () => {
    const r = toolResultSearchText({ stdout: 'output', stderr: 'warning' })
    expect(r).toContain('output')
    expect(r).toContain('warning')
  })

  test('Bash output: stdout + empty stderr (no extra newline)', () => {
    expect(toolResultSearchText({ stdout: 'just stdout', stderr: '' })).toBe(
      'just stdout',
    )
  })

  test('Read output: file.content captured', () => {
    expect(
      toolResultSearchText({ file: { content: 'file body text' } }),
    ).toBe('file body text')
  })

  test('Read output: file.content takes precedence over stdout (order matters)', () => {
    // Documentado: la forma stdout se comprueba PRIMERO. Si ambas
    // existen, gana stdout. Se fija aqui para evitar un reorden silencioso.
    expect(
      toolResultSearchText({
        stdout: 'std',
        file: { content: 'file' },
      }),
    ).toBe('std')
  })
})

describe('toolResultSearchText — fallback allowlist', () => {
  test('content field captured', () => {
    expect(toolResultSearchText({ content: 'hello' })).toBe('hello')
  })

  test('output field captured', () => {
    expect(toolResultSearchText({ output: 'world' })).toBe('world')
  })

  test('result, text, message all captured', () => {
    const r = toolResultSearchText({
      result: 'a',
      text: 'b',
      message: 'c',
    })
    // Concatenado con '\n' (orden de insercion en el bucle).
    expect(r.split('\n')).toEqual(['a', 'b', 'c'])
  })

  test('filenames array (Grep) joined', () => {
    expect(
      toolResultSearchText({ filenames: ['file1.ts', 'file2.ts'] }),
    ).toBe('file1.ts\nfile2.ts')
  })

  test('lines array joined', () => {
    expect(toolResultSearchText({ lines: ['a', 'b', 'c'] })).toBe('a\nb\nc')
  })

  test('results array joined (generic)', () => {
    expect(toolResultSearchText({ results: ['hit1', 'hit2'] })).toBe(
      'hit1\nhit2',
    )
  })
})

describe('toolResultSearchText — edge cases', () => {
  test('null → empty string', () => {
    expect(toolResultSearchText(null)).toBe('')
  })

  test('undefined → empty string', () => {
    expect(toolResultSearchText(undefined)).toBe('')
  })

  test('plain string → returned as-is (special case)', () => {
    // Rama documentada: si r es string, se retorna igual. Algunas
    // herramientas devuelven strings crudos.
    expect(toolResultSearchText('plain text')).toBe('plain text')
  })

  test('number → empty string', () => {
    expect(toolResultSearchText(42)).toBe('')
  })

  test('empty object → empty string', () => {
    expect(toolResultSearchText({})).toBe('')
  })

  test('unknown shape (only metadata fields) → empty', () => {
    expect(
      toolResultSearchText({
        rawOutputPath: '/tmp/x',
        backgroundTaskId: 't1',
        durationMs: 100,
      }),
    ).toBe('')
  })

  test('mixed-type array NOT joined (every() guard)', () => {
    // filenames debe ser 100% strings.
    expect(
      toolResultSearchText({ filenames: ['a.ts', 42] }),
    ).toBe('')
  })

  test('file.content with non-string content NOT picked up', () => {
    // El check es `typeof file.content === 'string'`. Un buffer u
    // objeto cae al allowlist de respaldo.
    expect(
      toolResultSearchText({ file: { content: { nested: 'x' } } }),
    ).toBe('')
  })
})
