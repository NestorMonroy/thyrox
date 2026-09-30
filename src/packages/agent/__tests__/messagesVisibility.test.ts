import { describe, expect, test } from 'bun:test'

import { shouldShowUserMessage } from '../messages.ts'
import type { Message } from '../messageShapes.ts'

// Contrato de 2.1.275 (`chunk-q2gh92k2.js`): `l3n` y el origen visible `VO`.
const user = (extra: Record<string, unknown>) =>
  ({ type: 'user', message: { content: 'x' }, ...extra }) as unknown as Message

describe('shouldShowUserMessage', () => {
  test('lo que no es del usuario se muestra', () => {
    expect(shouldShowUserMessage({ type: 'assistant' } as unknown as Message, false)).toBe(true)
  })

  test('un meta se oculta salvo que su origen sea visible', () => {
    expect(shouldShowUserMessage(user({ isMeta: true }), true)).toBe(false)
    for (const kind of ['channel', 'observer', 'observer-activity', 'slack-ping', 'peer']) {
      expect(shouldShowUserMessage(user({ isMeta: true, origin: { kind } }), false)).toBe(true)
    }
    expect(shouldShowUserMessage(user({ isMeta: true, origin: { kind: 'cron' } }), false)).toBe(false)
  })

  test('lo visible sólo en la transcripción se oculta fuera de ella', () => {
    expect(shouldShowUserMessage(user({ isVisibleInTranscriptOnly: true }), false)).toBe(false)
    expect(shouldShowUserMessage(user({ isVisibleInTranscriptOnly: true }), true)).toBe(true)
  })

  test('un mensaje de usuario corriente se muestra', () => {
    expect(shouldShowUserMessage(user({}), false)).toBe(true)
  })
})
