// Contrato de `statusLine` en 2.1.282: `type`, `command`, `padding`,
// `refreshInterval` (>= 1; un valor inválido se descarta, no rompe el
// archivo) y `hideVimModeIndicator`. `StatusLine.tsx` lee `padding`.
import { describe, expect, test } from 'bun:test'
import { SettingsSchema } from '../settings/types.ts'

describe('statusLine', () => {
  test('acepta padding, refreshInterval y hideVimModeIndicator', () => {
    const statusLine = { type: 'command', command: 'echo hi', padding: 2, refreshInterval: 5, hideVimModeIndicator: true } as const
    const parsed = SettingsSchema().safeParse({ statusLine })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.statusLine).toEqual(statusLine)
  })
  test('un refreshInterval menor que 1 se descarta sin invalidar el resto', () => {
    const parsed = SettingsSchema().safeParse({ statusLine: { type: 'command', command: 'x', refreshInterval: 0 } })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.statusLine?.refreshInterval).toBeUndefined()
  })
})
