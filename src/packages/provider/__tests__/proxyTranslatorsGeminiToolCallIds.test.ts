/**
 * El emparejamiento de `functionResponse` con su `functionCall` cuando Gemini
 * no trae ids: la más antigua de las llamadas abiertas cuyo id se generó,
 * dentro de la ronda en curso.
 */
import { expect, test } from 'bun:test'

import { createGeminiToolCallIdPairing } from '../src/proxy/translators/geminiToolCallIds.ts'

function pairing() {
  let next = 0
  return createGeminiToolCallIdPairing(() => `gen_${++next}`)
}

const callContent = { role: 'model', parts: [{ functionCall: { name: 'read' } }] }
const responseContent = { role: 'user', parts: [{ functionResponse: { name: 'read' } }] }

test('an id-less response takes the oldest generated call, not the one the client named', () => {
  const ids = pairing()
  ids.beginContent(callContent)
  expect(ids.callId({ name: 'read', id: 'client_1' })).toBe('client_1')
  expect(ids.callId({ name: 'read' })).toBe('gen_1')
  expect(ids.callId({ name: 'read' })).toBe('gen_2')
  ids.beginContent(responseContent)
  expect(ids.responseId({ name: 'read' })).toBe('gen_1')
  expect(ids.responseId({ name: 'read', id: 'client_1' })).toBe('client_1')
  expect(ids.responseId({ name: 'read' })).toBe('gen_2')
})

test('a call left unanswered in an earlier round does not take a later response', () => {
  const ids = pairing()
  ids.beginContent(callContent)
  ids.callId({ name: 'read' })
  ids.beginContent({ role: 'user', parts: [{ text: 'never mind' }] })
  ids.beginContent(callContent)
  const later = ids.callId({ name: 'read' })
  ids.beginContent(responseContent)
  expect(ids.responseId({ name: 'read' })).toBe(later)
})

test('the model thinking between two calls keeps the round open', () => {
  const ids = pairing()
  ids.beginContent(callContent)
  const first = ids.callId({ name: 'read' })
  ids.beginContent({ role: 'model', parts: [{ text: 'thinking', thought: true }] })
  ids.beginContent(callContent)
  ids.callId({ name: 'read' })
  ids.beginContent(responseContent)
  expect(ids.responseId({ name: 'read' })).toBe(first)
})

test('a response with nothing open falls back to the function name', () => {
  expect(pairing().responseId({ name: 'read' })).toBe('read')
})
