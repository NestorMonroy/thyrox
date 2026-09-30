/**
 * El progreso por hook de 2.1.281: antes de lanzar los hooks que casan, el
 * motor emite un mensaje `progress` por cada uno (`chunk-4n4g22z6.js`, el
 * `for(let{hook:Eo}of Ft)yield{message:{type:"progress",\u2026}}`). El texto
 * pasa por `wm` (`H9` + saltos y tabuladores visibles), y el comando sale de
 * `tR`: el `statusMessage` si hay, si no `ML` según el tipo de hook.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  buildHookProgressMessage,
  displayText,
  hookDisplayText,
  hookProgressCommand,
  sanitizeForDisplay,
  truncateCodeUnits,
} from '../hooks/hookProgress.ts'
import { executePreToolHooks } from '../hooks.ts'
import { resetHooksConfigSnapshot, setHooksConfigSnapshot } from '../hooksConfigSnapshot.ts'

describe('sanitizeForDisplay (H9)', () => {
  test('texto sin caracteres de control sale igual', () => {
    expect(sanitizeForDisplay('ls -la')).toBe('ls -la')
  })
  test('ESC, controles C0 y DEL se vuelven su símbolo visible', () => {
    expect(sanitizeForDisplay('a\x1b[31mb\x01\x7f')).toBe('a\u241B[31mb\u2401\u2421')
  })
  test('salto de línea y tabulador se conservan', () => {
    expect(sanitizeForDisplay('a\nb\tc\u200B')).toBe('a\nb\tc\\u{200B}')
  })
  test('el ZWJ dentro de un emoji compuesto se conserva', () => {
    const family = '\u{1F468}\u200D\u{1F469}'
    expect(sanitizeForDisplay(family)).toBe(family)
  })
})

describe('displayText (wm)', () => {
  test('saltos y tabuladores se hacen visibles', () => {
    expect(displayText('a\nb\tc')).toBe('a\u2424b\u2409c')
  })
})

describe('truncateCodeUnits (re)', () => {
  test('no parte un par sustituto', () => {
    expect(truncateCodeUnits('ab\u{1F600}', 3)).toBe('ab')
    expect(truncateCodeUnits('abc', 5)).toBe('abc')
    expect(truncateCodeUnits('abc', 0)).toBe('')
  })
})

describe('hookDisplayText (ML) y hookProgressCommand (tR)', () => {
  test('cada tipo de hook da su texto', () => {
    expect(hookDisplayText({ type: 'command', command: 'lint', args: ['--fix', 'a'] })).toBe('lint --fix a')
    expect(hookDisplayText({ type: 'prompt', prompt: 'verifica' })).toBe('verifica')
    expect(hookDisplayText({ type: 'agent', prompt: 'revisa' })).toBe('revisa')
    expect(hookDisplayText({ type: 'http', url: 'https://h/x' })).toBe('https://h/x')
    expect(hookDisplayText({ type: 'mcp_tool', server: 's', tool: 't' })).toBe('s/t')
    expect(hookDisplayText({ type: 'script', script: '\n  first line\nsecond' })).toBe('script: first line\u2026')
  })
  test('el statusMessage gana al texto del hook, y se sanea', () => {
    expect(hookProgressCommand({ type: 'command', command: 'x', statusMessage: 'Lint\tando' })).toBe('Lint\u2409ando')
    expect(hookProgressCommand({ type: 'command', command: 'a\nb' })).toBe('a\u2424b')
  })
})

describe('buildHookProgressMessage', () => {
  test('forma del binario, con promptText sólo en hooks prompt', () => {
    const m = buildHookProgressMessage({ type: 'prompt', prompt: 'p1', statusMessage: 's' }, 'Stop', 'Stop', 'tu9')
    expect(m).toMatchObject({
      type: 'progress',
      data: { type: 'hook_progress', hookEvent: 'Stop', hookName: 'Stop', command: 's', promptText: 'p1', statusMessage: 's' },
      parentToolUseID: 'tu9',
      toolUseID: 'tu9',
    })
    expect(typeof m.uuid).toBe('string')
    expect(typeof m.timestamp).toBe('string')
    const c = buildHookProgressMessage({ type: 'command', command: 'ls' }, 'PreToolUse', 'PreToolUse:Bash', 't')
    expect('promptText' in c.data || 'statusMessage' in c.data).toBe(false)
  })
})

describe('executeHooks emite el progreso antes de los resultados', () => {
  beforeEach(() => resetHooksConfigSnapshot())
  afterEach(() => resetHooksConfigSnapshot())
  test('un progreso por hook que casa, primero, y después el resultado', async () => {
    setHooksConfigSnapshot({ PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'true' }, { type: 'command', command: 'true', statusMessage: 'dos' }] }] })
    const out: any[] = []
    const ctx = { abortController: new AbortController(), getAppState: () => ({ toolPermissionContext: { mode: 'default' } }) }
    for await (const r of executePreToolHooks('Bash', 'tu1', { command: 'ls' }, ctx, 'default')) out.push(r)
    const kinds = out.map(r => r.message?.type ?? 'result')
    expect(kinds.slice(0, 2)).toEqual(['progress', 'progress'])
    expect(out.slice(0, 2).map(r => r.message.data.command)).toEqual(['true', 'dos'])
    expect(out.slice(0, 2).map(r => r.message.data.hookName)).toEqual(['PreToolUse:Bash', 'PreToolUse:Bash'])
    expect(out.length).toBe(4)
  })
})
