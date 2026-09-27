/**
 * Identidad de sesión del proxy — casos portados de CLIProxyAPI
 * (`sdk/cliproxy/session/identity_test.go`, leído como referencia). Los
 * casos de `Enrich` viven con la extracción de sesión, de la que depende.
 */
import { createHash } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import { goMarshal, goStruct } from '../src/proxy/session/goJson.ts'
import {
  CANONICAL_UUID_PATTERN,
  callerScope,
  deriveId,
  metadataIdentities,
  normalizeExplicitId,
  normalizeToCanonicalUuid,
} from '../src/proxy/session/identity.ts'

describe('deriveId', () => {
  const cases: [string, string, string, string][] = [
    [
      'openai chat',
      'openai',
      '{"messages":[{"role":"system","content":"system prompt"},{"role":"developer","content":"developer prompt"},{"role":"user","content":"complete first user prompt"}]}',
      '{"messages":[{"role":"system","content":"system prompt"},{"role":"developer","content":"developer prompt"},{"role":"user","content":"complete first user prompt"},{"role":"assistant","content":"answer"},{"role":"developer","content":"later instruction"},{"role":"user","content":"next"}]}',
    ],
    [
      'messages',
      'claude',
      '{"system":[{"type":"text","text":"system prompt"}],"messages":[{"role":"user","content":[{"type":"text","text":"complete first user prompt"}]}]}',
      '{"system":[{"type":"text","text":"system prompt"}],"messages":[{"role":"user","content":[{"type":"text","text":"complete first user prompt"}]},{"role":"assistant","content":"answer"},{"role":"user","content":"next"}]}',
    ],
    [
      'openai responses',
      'openai-response',
      '{"instructions":"system prompt","input":[{"type":"message","role":"developer","content":[{"type":"input_text","text":"developer prompt"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"complete first user prompt"}]}]}',
      '{"instructions":"system prompt","input":[{"type":"message","role":"developer","content":[{"type":"input_text","text":"developer prompt"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"complete first user prompt"}]},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"answer"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"next"}]}]}',
    ],
    [
      'gemini',
      'gemini',
      '{"systemInstruction":{"parts":[{"text":"system prompt"}]},"contents":[{"role":"user","parts":[{"text":"complete first user prompt"}]}]}',
      '{"systemInstruction":{"parts":[{"text":"system prompt"}]},"contents":[{"role":"user","parts":[{"text":"complete first user prompt"}]},{"role":"model","parts":[{"text":"answer"}]},{"role":"user","parts":[{"text":"next"}]}]}',
    ],
    [
      'interactions',
      'interactions',
      '{"system_instruction":"system prompt","input":[{"type":"developer_instruction","text":"developer prompt"},{"type":"user_input","content":[{"type":"text","text":"complete first user prompt"}]}]}',
      '{"system_instruction":"system prompt","input":[{"type":"developer_instruction","text":"developer prompt"},{"type":"user_input","content":[{"type":"text","text":"complete first user prompt"}]},{"type":"model_output","content":[{"type":"text","text":"answer"}]},{"type":"user_input","content":[{"type":"text","text":"next"}]}]}',
    ],
  ]
  test.each(cases)('%s: crecer la conversación no cambia la identidad', (_name, format, first, later) => {
    const firstId = deriveId(format, first, 'caller-a')
    expect(firstId).not.toBe('')
    expect(deriveId(format, later, 'caller-a')).toBe(firstId)
  })

  test('las instrucciones cuentan hasta 50 caracteres; el primer usuario, entero', () => {
    const prefix = '界'.repeat(50)
    const user = 'u'.repeat(120)
    const first = `{"messages":[{"role":"system","content":"${prefix}timestamp-a"},{"role":"user","content":"${user}a"}]}`
    const sameRoot = `{"messages":[{"role":"system","content":"${prefix}timestamp-b"},{"role":"user","content":"${user}a"}]}`
    const differentUser = `{"messages":[{"role":"system","content":"${prefix}timestamp-b"},{"role":"user","content":"${user}b"}]}`
    const firstId = deriveId('openai', first, 'caller-a')
    expect(firstId).not.toBe('')
    expect(deriveId('openai', sameRoot, 'caller-a')).toBe(firstId)
    expect(deriveId('openai', differentUser, 'caller-a')).not.toBe(firstId)
  })

  test('aísla por llamador y usa cachedContent en Gemini', () => {
    const payload = '{"messages":[{"role":"user","content":"same prompt"}]}'
    const a = deriveId('openai', payload, callerScope('api-key-a'))
    const b = deriveId('openai', payload, callerScope('api-key-b'))
    expect(a).not.toBe('')
    expect(a).not.toBe(b)
    const firstCached = '{"cachedContent":"cachedContents/abc","contents":[{"role":"user","parts":[{"text":"first"}]}]}'
    const grownCached =
      '{"cachedContent":"cachedContents/abc","contents":[{"role":"user","parts":[{"text":"first"}]},{"role":"model","parts":[{"text":"answer"}]},{"role":"user","parts":[{"text":"next"}]}]}'
    const differentCached = '{"cachedContent":"cachedContents/abc","contents":[{"role":"user","parts":[{"text":"different"}]}]}'
    const firstId = deriveId('gemini', firstCached, 'caller-a')
    expect(firstId).not.toBe('')
    expect(deriveId('gemini', grownCached, 'caller-a')).toBe(firstId)
    expect(deriveId('gemini', differentCached, 'caller-a')).not.toBe(firstId)
  })

  test('sin primer usuario no hay identidad', () => {
    expect(deriveId('openai', '{"messages":[{"role":"system","content":"shared system"}]}', 'caller-a')).toBe('')
  })

  test('Antigravity anidado y con un primer turno vacío da la misma identidad que el directo', () => {
    const nested =
      '{"project_id":"test-project","request":{"systemInstruction":{"parts":[{"text":"system prompt"}]},"contents":[{"role":"user","parts":[{"text":""}]},{"role":"user","parts":[{"text":"actual user prompt"}]}]}}'
    const direct = '{"systemInstruction":{"parts":[{"text":"system prompt"}]},"contents":[{"role":"user","parts":[{"text":"actual user prompt"}]}]}'
    const id = deriveId('antigravity', nested, 'caller-a')
    expect(id).not.toBe('')
    expect(deriveId('antigravity', direct, 'caller-a')).toBe(id)
  })
})

describe('metadataIdentities', () => {
  test('lee session_id, parent_session_id y agent_id del user_id JSON, normalizados', () => {
    const payload = JSON.stringify({
      metadata: { user_id: JSON.stringify({ session_id: 'sess-123', parent_session_id: 'parent-456', agent_id: '  subagent-alpha  ' }) },
    })
    expect(metadataIdentities(payload)).toEqual({ sessionId: 'sess-123', parentSessionId: 'parent-456', agentId: 'subagent-alpha' })
  })

  test('un agent_id con carácter de control se descarta', () => {
    const payload = JSON.stringify({ metadata: { user_id: JSON.stringify({ session_id: 'sess-123', agent_id: 'bad\nagent' }) } })
    expect(metadataIdentities(payload).agentId).toBe('')
  })
})

describe('normalizeExplicitId', () => {
  test('rechaza control, vacío y más de 256 bytes; recorta espacios', () => {
    expect(normalizeExplicitId('  abc  ')).toBe('abc')
    expect(normalizeExplicitId('a\tb')).toBe('')
    expect(normalizeExplicitId('   ')).toBe('')
    expect(normalizeExplicitId('x'.repeat(257))).toBe('')
    expect(normalizeExplicitId('x'.repeat(256))).toBe('x'.repeat(256))
  })
})

describe('normalizeToCanonicalUuid', () => {
  test('vacío, espacios y prefijos sin cuerpo dan vacío', () => {
    for (const input of [
      '', '   ', 'lcp:v1:', 'lcp:', 'ctx:v1:', 'ctx:', 'codex:', 'claude:', 'header:', 'session:', 'affinity:', 'slot:', 'task:',
      'conv:', 'thread:', 'clientreq:', 'geminicache:', 'pck:', 'user:', 'execution:', 'agy:', 'derived:', 'slot:   ', 'task:   ',
      'derived:ctx:v1:', 'derived:slot:   ',
    ]) {
      expect(normalizeToCanonicalUuid(input)).toBe('')
    }
  })

  test('un UUID nativo sale en minúsculas', () => {
    expect(normalizeToCanonicalUuid('b2839f64-668d-4dc3-a42a-64da829d1e33')).toBe('b2839f64-668d-4dc3-a42a-64da829d1e33')
    expect(normalizeToCanonicalUuid('B2839F64-668D-4DC3-A42A-64DA829D1E33')).toBe('b2839f64-668d-4dc3-a42a-64da829d1e33')
    expect(normalizeToCanonicalUuid('01a07e72-c84d-7fd3-8207-d217b41cc649')).toBe('01a07e72-c84d-7fd3-8207-d217b41cc649')
  })

  test('un prefijo conocido o genérico delante de un UUID se quita', () => {
    const cases: Record<string, string> = {
      'codex:01a07e72-c84d-7fd3-8207-d217b41cc649': '01a07e72-c84d-7fd3-8207-d217b41cc649',
      'claude:b2839f64-668d-4dc3-a42a-64da829d1e33': 'b2839f64-668d-4dc3-a42a-64da829d1e33',
      'header:7a8b9c0d-1111-2222-3333-444455556666': '7a8b9c0d-1111-2222-3333-444455556666',
      'session:b2839f64-668d-4dc3-a42a-64da829d1e33': 'b2839f64-668d-4dc3-a42a-64da829d1e33',
      'thread:01a07e72-c84d-7fd3-8207-d217b41cc649': '01a07e72-c84d-7fd3-8207-d217b41cc649',
      'custom-prefix:01a07e72-c84d-7fd3-8207-d217b41cc649': '01a07e72-c84d-7fd3-8207-d217b41cc649',
    }
    for (const [input, want] of Object.entries(cases)) expect(normalizeToCanonicalUuid(input)).toBe(want)
  })

  test('lo que no es UUID se proyecta a un UUIDv8 idempotente', () => {
    for (const input of [
      'lcp:v1:c28621bab78eacdb3ae128c0f6aaa0147842f063fda10ae9dc5473cc81d58985',
      'lcp:c28621bab78eacdb3ae128c0f6aaa0147842f063fda10ae9dc5473cc81d58985',
      'c28621bab78eacdb3ae128c0f6aaa0147842f063fda10ae9dc5473cc81d58985',
      'claude:b2839f64-668d-4dc3-a42a-64da829d1e33:agent:worker-reviewer',
      'task:task-abc-1',
      'slot:pi-slot-789',
      'ses_f8189891effeCLIq0MasUgMQsC',
      'my-custom-test-task',
    ]) {
      const got = normalizeToCanonicalUuid(input)
      expect(got).toMatch(CANONICAL_UUID_PATTERN)
      expect(got[14]).toBe('8')
      expect(['8', '9', 'a', 'b']).toContain(got[19]!)
      expect(normalizeToCanonicalUuid(got)).toBe(got)
    }
  })

  test('es determinista, distingue entradas y quita prefijos encadenados', () => {
    expect(normalizeToCanonicalUuid('lcp:v1:hash-A')).toBe(normalizeToCanonicalUuid('lcp:v1:hash-A'))
    expect(normalizeToCanonicalUuid('lcp:v1:hash-A')).not.toBe(normalizeToCanonicalUuid('lcp:v1:hash-B'))
    const bare = 'c28621bab78eacdb3ae128c0f6aaa0147842f063fda10ae9dc5473cc81d58985'
    for (const prefix of ['lcp:v1:', 'ctx:v1:', 'ctx:', 'derived:ctx:v1:']) {
      expect(normalizeToCanonicalUuid(prefix + bare)).toBe(normalizeToCanonicalUuid(bare))
    }
    expect(normalizeToCanonicalUuid('derived:ctx:v1:01a07e72-c84d-7fd3-8207-d217b41cc649')).toBe('01a07e72-c84d-7fd3-8207-d217b41cc649')
  })

  test('coincide con el valor de oro de la referencia', () => {
    expect(normalizeToCanonicalUuid('c28621bab78eacdb3ae128c0f6aaa0147842f063fda10ae9dc5473cc81d58985')).toBe(
      '2ad1939c-98ca-81da-8b69-3d084d5614c4',
    )
  })
})

// Valores de oro de `json.Marshal` de Go sobre `canonicalRoot`, producidos
// por la sonda `.claude/workbench/session-affinity-port-20260927T184048/probes/gomarshal/`.
// El hash de `deriveId` es el sha256 de estos bytes: un byte distinto parte
// la afinidad entre thyrox y cualquier proxy que derive con la referencia.
describe('goMarshal', () => {
  const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')
  const part = (kind: string, value: string, mime = '') =>
    goStruct([
      { name: 'kind', value: kind },
      { name: 'mime', value: mime, omitEmpty: true },
      { name: 'value', value },
    ])
  const root = (format: string, scope: string, instructions: string[], user: unknown[], resource = '') =>
    goStruct([
      { name: 'version', value: 'cpa-session-root-v1' },
      { name: 'format', value: format },
      { name: 'caller_scope', value: scope },
      { name: 'instructions', value: instructions, omitEmpty: true },
      { name: 'user', value: user, omitEmpty: true },
      { name: 'resource', value: resource, omitEmpty: true },
    ])

  test('orden de campos y omitempty como Go', () => {
    expect(goMarshal(root('openai', 'caller-a', ['system prompt', 'developer prompt'], [part('text', 'complete first user prompt')]))).toBe(
      '{"version":"cpa-session-root-v1","format":"openai","caller_scope":"caller-a","instructions":["system prompt","developer prompt"],"user":[{"kind":"text","value":"complete first user prompt"}]}',
    )
  })

  test('escapa <, >, &, U+2028 y U+2029 como Go', () => {
    const encoded = goMarshal(
      root('claude', '', [], [part('text', 'a<b>&c d e "q" \\ \t\n 界 \x01'), part('image', 'iVBOR', 'image/png')]),
    )
    expect(sha(encoded)).toBe('65e7a116dbb1465f82db9f8916bef9101e3c366dfcd40d7e3d519fe7fd6f924d')
  })

  test('resource al final cuando no está vacío', () => {
    expect(sha(goMarshal(root('gemini', 's', [], [part('text', 'x')], 'cachedContents/abc')))).toBe(
      'fde64c9259bd7979be96bbe46c18c0c23501b12ddb9ff67172fcefc4fe603937',
    )
  })
})
