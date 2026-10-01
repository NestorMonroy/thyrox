/**
 * Enriquecer la petición con su identidad — casos portados de CLIProxyAPI
 * (`sdk/cliproxy/session/identity_test.go`, los de `Enrich`, y la segunda
 * mitad de `info_duplicate_test.go`: `hasExplicitSession`).
 */
import { describe, expect, test } from 'bun:test'
import { deriveId, metadataIdentities } from '../src/proxy/session/identity.ts'
import { derivedId, enrich, hasExplicitSession } from '../src/proxy/session/enrich.ts'
import type { SessionHeaders } from '../src/proxy/session/info.ts'

const HELLO = '{"messages":[{"role":"user","content":"hello"}]}'

describe('enrich: una sesión explícita no se deriva', () => {
  const cases: [string, string, SessionHeaders, Record<string, unknown>?, Record<string, unknown>?][] = [
    ['cabecera de sesión con cuerpo que no es JSON', 'not-json', { 'X-Session-ID': 'header-session' }],
    ['cabecera de sesión de Messages', HELLO, { 'x-claude-code-Session-Id': 'claude-session' }],
    ['valor válido en segunda posición de la cabecera', HELLO, { 'X-Session-Affinity': ['', 'later-valid-session'] }],
    ['afinidad de OpenCode', HELLO, { 'X-Session-Affinity': 'opencode-session' }],
    ['conversación de Responses como objeto', '{"conversation":{"id":"conversation-session"},"messages":[{"role":"user","content":"hello"}]}', undefined],
    ['conversación de Responses como texto', '{"conversation":"conversation-session","messages":[{"role":"user","content":"hello"}]}', undefined],
    ['user_id en el metadata', '{"metadata":{"user_id":"explicit-user"},"messages":[{"role":"user","content":"hello"}]}', undefined],
    ['sesión heredada de Messages más larga que 256', `{"metadata":{"user_id":"${'x'.repeat(300)}_session_ac980658-63bd-4fb3-97ba-8da64cb1e344"},"messages":[{"role":"user","content":"hello"}]}`, undefined],
    ['user_id JSON sin sesión dentro', '{"metadata":{"user_id":"{\\"device_id\\":\\"abc123\\"}"},"messages":[{"role":"user","content":"hello"}]}', undefined],
    ['session_id en el cuerpo', '{"session_id":"body-session","messages":[{"role":"user","content":"hello"}]}', undefined],
    ['prompt_cache_key', '{"prompt_cache_key":"cache-session","input":"hello"}', undefined],
    ['sesión de ejecución en las opciones', HELLO, undefined, undefined, { execution_session_id: 'execution-session' }],
    ['sesión de ejecución en la petición', HELLO, undefined, { execution_session_id: 'execution-session' }],
    ['una cabecera explícita retira la identidad derivada vieja', HELLO, { 'x-session-id': 'header-session' }, undefined, { derived_session_id: 'ctx:v1:stale' }],
    ['sessionId en la petición anidada', '{"request":{"sessionId":"nested-session"},"messages":[{"role":"user","content":"hello"}]}', undefined],
    ['subagente en la petición anidada', '{"request":{"sessionId":"nested-session","metadata":{"agent_id":"worker"}},"messages":[{"role":"user","content":"hello"}]}', undefined],
  ]
  // Cada fila se rellena hasta cinco: con menos, bun toma el parámetro sobrante
  // por la retrollamada `done` y espera a que se invoque.
  const rows = cases.map(row => [row[0], row[1], row[2], row[3], row[4]] as const)
  test.each(rows)('%s', (name, payload, headers, requestMetadata, optionsMetadata) => {
    const result = enrich({ payload, originalRequest: payload, sourceFormat: 'openai', headers, requestMetadata, optionsMetadata })
    expect(derivedId(result.requestMetadata)).toBe('')
    expect(derivedId(result.optionsMetadata)).toBe('')
    if (name.startsWith('sesión de ejecución')) {
      expect(result.requestMetadata?.execution_session_id).toBe('execution-session')
      expect(result.optionsMetadata?.execution_session_id).toBe('execution-session')
    }
  })
})

describe('enrich: una identidad inválida no cuenta y se deriva', () => {
  const base = '"input":"hello"'
  const cases: [string, string, SessionHeaders, Record<string, unknown>?, Record<string, unknown>?][] = [
    ['prompt_cache_key de más de 256', `{"prompt_cache_key":"${'x'.repeat(257)}",${base}}`, undefined],
    ['prompt_cache_key con control al final', `{"prompt_cache_key":"tenant\\n",${base}}`, undefined],
    ['prompt_cache_key con control al principio', `{"prompt_cache_key":"\\ttenant",${base}}`, undefined],
    ['cabecera de sesión con control', `{${base}}`, { 'X-Session-Affinity': 'bad\nsession' }],
    ['sesión de ejecución de más de 256 en las opciones', '{"input":"hello"}', undefined, undefined, { execution_session_id: 'x'.repeat(257) }],
    ['sesión de ejecución con control en la petición', '{"input":"hello"}', undefined, { execution_session_id: 'bad\nsession' }],
    ['identidad derivada guardada de más de 256', '{"input":"hello"}', undefined, undefined, { derived_session_id: 'x'.repeat(257) }],
    ['identidad derivada guardada con control', '{"input":"hello"}', undefined, { derived_session_id: 'bad\nsession' }],
  ]
  const rows = cases.map(row => [row[0], row[1], row[2], row[3], row[4]] as const)
  test.each(rows)('%s', (_name, payload, headers, requestMetadata, optionsMetadata) => {
    const result = enrich({ payload, originalRequest: payload, sourceFormat: 'openai-response', headers, requestMetadata, optionsMetadata })
    const expected = deriveId('openai-response', payload, '')
    expect(derivedId(result.requestMetadata)).toBe(expected)
    expect(derivedId(result.optionsMetadata)).toBe(expected)
    expect(result.requestMetadata?.execution_session_id).toBeUndefined()
    expect(result.optionsMetadata?.execution_session_id).toBeUndefined()
  })
})

describe('enrich: resultados', () => {
  test('copia la identidad derivada a los dos mapas sin mutar el original', () => {
    const requestMetadata: Record<string, unknown> = {}
    const result = enrich({ payload: HELLO, sourceFormat: 'openai', requestMetadata, optionsMetadata: { caller_scope: 'caller-a' } })
    const requestId = derivedId(result.requestMetadata)
    expect(requestId).not.toBe('')
    expect(derivedId(result.optionsMetadata)).toBe(requestId)
    expect('derived_session_id' in requestMetadata).toBe(false)
  })

  test('la sesión explícita gana a la de ejecución, que se conserva', () => {
    const ws = enrich({ payload: '{"session_id":"explicit-ws-session"}', optionsMetadata: { execution_session_id: 'conn-ws-uuid-123' } })
    expect(ws.optionsMetadata?.canonical_session_id).toBe('session:explicit-ws-session')
    expect(ws.optionsMetadata?.execution_session_id).toBe('conn-ws-uuid-123')
    const only = enrich({ payload: '{"model":"test"}', optionsMetadata: { execution_session_id: 'conn-ws-uuid-456' } })
    expect(only.optionsMetadata?.canonical_session_id).toBe('execution:conn-ws-uuid-456')
    expect(only.optionsMetadata?.execution_session_id).toBe('conn-ws-uuid-456')
  })

  test('la sesión canónica y su padre de la metadata se conservan; un padre igual se retira', () => {
    const kept = enrich({ payload: '{"model":"gpt-5.4"}', optionsMetadata: { canonical_session_id: 'session:sdk-child-001', parent_session_id: 'session:sdk-parent-999' } })
    expect(kept.optionsMetadata?.canonical_session_id).toBe('session:sdk-child-001')
    expect(kept.optionsMetadata?.parent_session_id).toBe('session:sdk-parent-999')
    const loop = enrich({ payload: '{"model":"gpt-5.4"}', optionsMetadata: { canonical_session_id: 'session:same-loop', parent_session_id: 'session:same-loop' } })
    expect(loop.optionsMetadata && 'parent_session_id' in loop.optionsMetadata).toBe(false)
  })

  test('el cuerpo original es el mismo objeto cuando no se da otro, y se respeta el dado', () => {
    const payload = { messages: [{ role: 'user', content: 'test' }] }
    expect(enrich({ payload }).originalRequest).toBe(payload)
    const original = { messages: [{ role: 'user', content: 'original' }] }
    expect(enrich({ payload, originalRequest: original }).originalRequest).toBe(original)
  })
})

describe('metadataIdentities normaliza el agente', () => {
  test('recorta espacios y descarta controles', () => {
    const ok = metadataIdentities(JSON.stringify({ metadata: { user_id: JSON.stringify({ session_id: 'sess-123', parent_session_id: 'parent-456', agent_id: '  subagent-alpha  ' }) } }))
    expect(ok).toEqual({ sessionId: 'sess-123', parentSessionId: 'parent-456', agentId: 'subagent-alpha' })
    const bad = metadataIdentities(JSON.stringify({ metadata: { user_id: JSON.stringify({ session_id: 'sess-123', agent_id: 'bad\nagent' }) } }))
    expect(bad.agentId).toBe('')
  })
})

describe('hasExplicitSession con claves duplicadas', () => {
  test.each([
    [undefined, '{"metadata":{},"metadata":{"session_id":"child"}}'],
    [undefined, '{"request":{"metadata":{},"metadata":{"session_id":"child"}}}'],
    [{ 'X-Session-Id': 'child' }, '{"metadata":{},"metadata":{"parent_session_id":"parent"}}'],
  ] as [SessionHeaders, string][])('%#', (headers, payload) => {
    expect(hasExplicitSession(headers, payload)).toBe(true)
  })
})
