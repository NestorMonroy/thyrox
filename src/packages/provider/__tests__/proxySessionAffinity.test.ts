/**
 * Afinidad de sesión del selector de credenciales — casos portados de
 * CLIProxyAPI (`sdk/cliproxy/auth/selector_test.go`,
 * `selector_subagent_affinity_test.go`, `selector_antigravity_subagent_test.go`,
 * `session_affinity_lookup_test.go`, `session_affinity_metadata_test.go` y
 * `session_affinity_priority_test.go`, leídos como referencia).
 *
 * Los casos que en Go tocan los campos internos de la caché (`expiresAt`)
 * se escriben aquí con el reloj inyectado. Los del comparador LCP y los del
 * `Manager` quedan para las fases que los portan.
 *
 * Los hashes `msg:` se comparan contra vectores de prueba conocidos que
 * produjo el código de Go copiado verbatim
 * (`outputs/msghash-known-answers.tsv` del banco `session-affinity-port`).
 */
import { describe, expect, test } from 'bun:test'
import {
  type CredentialSelector,
  FillFirstSelector,
  type ProxyCredential,
  RoundRobinSelector,
  SelectorError,
  WeightedRoundRobinSelector,
} from '../src/proxy/credentialSelectors.ts'
import {
  canonicalSessionId,
  computeSessionHash,
  extractExplicitSessionIds,
  extractSessionId,
  extractSessionIds,
  isHierarchyParent,
  isSubagentSession,
  type PickOptions,
  SessionAffinitySelector,
} from '../src/proxy/session/affinitySelector.ts'
import { enrich } from '../src/proxy/session/enrich.ts'
import { METADATA_KEYS } from '../src/proxy/session/info.ts'

const MINUTE = 60_000
const credentials = (...ids: string[]): ProxyCredential[] => ids.map(id => ({ id }))

type Clock = { now: () => number; advance: (ms: number) => void }
const manualClock = (): Clock => {
  let t = 1_000_000
  return { now: () => t, advance: ms => { t += ms } }
}

const selectorWith = (fallback: CredentialSelector = new RoundRobinSelector(), extra: { subagentAffinity?: boolean; clock?: Clock; ttlMs?: number } = {}) =>
  new SessionAffinitySelector({ fallback, ttlMs: extra.ttlMs ?? MINUTE, subagentAffinity: extra.subagentAffinity, now: extra.clock?.now, cleanup: false })

const pickId = (selector: SessionAffinitySelector, provider: string, model: string, options: PickOptions, pool: ProxyCredential[]) =>
  selector.pick(provider, model, pool, new Date(), options).id

const userIdPayload = (session: string) => `{"metadata":{"user_id":"user_xxx_account__session_${session}"}}`

describe('extractSessionId', () => {
  test.each([
    ['formato del cliente de Messages', '{"metadata":{"user_id":"user_3f221fe75652cf9a89a31647f16274bb8036a9b85ac4dc226a4df0efec8dc04d_account__session_ac980658-63bd-4fb3-97ba-8da64cb1e344"}}', 'claude:ac980658-63bd-4fb3-97ba-8da64cb1e344'],
    ['user_id JSON con sesión', '{"metadata":{"user_id":"{\\"device_id\\":\\"be82c3aee1e0c2d74535bacc85f9f559228f02dd8a17298cf522b71e6c375714\\",\\"account_uuid\\":\\"\\",\\"session_id\\":\\"e26d4046-0f88-4b09-bb5b-f863ab5fb24e\\"}"}}', 'claude:e26d4046-0f88-4b09-bb5b-f863ab5fb24e'],
    ['user_id JSON sin sesión', '{"metadata":{"user_id":"{\\"device_id\\":\\"abc123\\"}"}}', 'user:{"device_id":"abc123"}'],
    ['user_id sin sesión', '{"metadata":{"user_id":"user_abc123"}}', 'user:user_abc123'],
    ['conversation_id', '{"conversation_id":"conv-12345"}', 'conv:conv-12345'],
    ['sin metadata', '{"model":"claude-3"}', ''],
    ['cuerpo vacío', '', ''],
  ])('%s', (_name, payload, want) => {
    expect(extractSessionId(undefined, payload, undefined)).toBe(want)
  })

  test('petición anidada con agente: la sesión del agente y su padre', () => {
    const agent = '{"request":{"sessionId":"root","metadata":{"agent_id":"worker"}}}'
    expect(extractSessionId(undefined, agent, undefined)).toBe('session:root:agent:worker')
    expect(extractExplicitSessionIds(undefined, agent, undefined)).toEqual(['session:root:agent:worker', 'session:root'])
    const subagent = '{"request":{"sessionId":"root","metadata":{"subagent_id":"worker"}}}'
    expect(extractExplicitSessionIds(undefined, subagent, undefined)).toEqual(['session:root:agent:worker', 'session:root'])
    const parent = '{"request":{"sessionId":"root","parentSessionId":"parent-root","metadata":{"agent_id":"worker"}}}'
    expect(extractExplicitSessionIds(undefined, parent, undefined)).toEqual(['session:root:agent:worker', 'session:parent-root'])
    expect(extractSessionId(undefined, '{"prompt_cache_key":"","request":{"promptCacheKey":"nested-pck-valid"}}', undefined)).toBe('pck:nested-pck-valid')
  })

  test('la sesión derivada sólo cuando no hay una explícita', () => {
    const metadata = { [METADATA_KEYS.derivedSession]: 'ctx:v1:derived-root' }
    const payload = '{"messages":[{"role":"user","content":"hello"}]}'
    expect(extractSessionId(undefined, payload, metadata)).toBe('derived:ctx:v1:derived-root')
    expect(extractSessionId(undefined, payload, { [METADATA_KEYS.executionSession]: 'execution-session', ...metadata })).toBe('execution:execution-session')
    const explicit = '{"session_id":"explicit-session","prompt_cache_key":"explicit-cache","messages":[{"role":"user","content":"hello"}]}'
    expect(extractSessionId(undefined, explicit, metadata)).toBe('session:explicit-session')
    const user = '{"metadata":{"user_id":"explicit-user"},"conversation_id":"explicit-conversation","messages":[{"role":"user","content":"hello"}]}'
    expect(extractSessionId(undefined, user, metadata)).toBe('user:explicit-user')
    expect(extractSessionId({ 'x-session-id': ' lowercase-session ' }, payload, metadata)).toBe('header:lowercase-session')
    expect(extractSessionId({ 'x-session-id': 'header-session' }, explicit, metadata)).toBe('header:header-session')
  })

  test('prompt_cache_key primario con la conversación de respaldo', () => {
    expect(extractSessionIds(undefined, '{"conversation":{"id":"conversation-session"},"prompt_cache_key":"shared-cache-bucket"}', undefined))
      .toEqual(['pck:shared-cache-bucket', 'conv:conversation-session'])
  })
})

describe('hash de mensajes: vectores de prueba conocidos de Go', () => {
  test.each([
    ['sólo usuario', '', 'Hello world', '', 'msg:6f3af82650710693'],
    ['usuario y asistente', '', 'Hello world', 'Hi! How can I help?', 'msg:0964de51a03c0514'],
    ['sistema y usuario', 'You are helpful', 'Hello', '', 'msg:db09d768eef0153d'],
    ['sistema, usuario y asistente', 'You are helpful', 'Hello', 'Hi there!', 'msg:46d2b383fc6205a1'],
  ])('computeSessionHash: %s', (_name, system, user, assistant, want) => {
    expect(computeSessionHash(system, user, assistant)).toBe(want)
  })

  test('primer turno: hash corto; con respuesta: completo y el corto de respaldo', () => {
    expect(extractSessionIds(undefined, '{"messages":[{"role":"user","content":"Hello world"}]}', undefined)).toEqual(['msg:6f3af82650710693', ''])
    const multi = '{"messages":[{"role":"user","content":"Hello world"},{"role":"assistant","content":"Hi! How can I help?"},{"role":"user","content":"Tell me a joke"}]}'
    expect(extractSessionIds(undefined, multi, undefined)).toEqual(['msg:0964de51a03c0514', 'msg:6f3af82650710693'])
  })

  test('el mismo turno en los cuatro formatos da el mismo hash', () => {
    const want = 'msg:46d2b383fc6205a1'
    const formats = [
      '{"messages":[{"role":"system","content":"You are helpful"},{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi there!"}]}',
      '{"system":[{"type":"text","text":"You are helpful"}],"messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]},{"role":"assistant","content":"Hi there!"}]}',
      '{"systemInstruction":{"parts":[{"text":"You are helpful"}]},"contents":[{"role":"user","parts":[{"text":"Hello"}]},{"role":"model","parts":[{"text":"Hi there!"}]}]}',
      '{"instructions":"You are helpful","input":[{"type":"reasoning","summary":[]},{"type":"message","role":"user","content":[{"type":"input_text","text":"Hello"}]},{"type":"function_call","name":"x"},{"role":"assistant","content":"Hi there!"}]}',
    ]
    for (const payload of formats) expect(extractSessionId(undefined, payload, undefined)).toBe(want)
    expect(extractSessionId(undefined, '{"system":"You are helpful","messages":[{"role":"user","content":"Hello"}]}', undefined)).toBe('msg:db09d768eef0153d')
  })

  test('el corte a 100 es por bytes, también a mitad de una runa', () => {
    const even = JSON.stringify({ messages: [{ role: 'user', content: 'ñ'.repeat(60) }] })
    expect(extractSessionId(undefined, even, undefined)).toBe('msg:ec37f93164f44889')
    const odd = JSON.stringify({ messages: [{ role: 'user', content: `a${'é'.repeat(60)}` }] })
    expect(extractSessionId(undefined, odd, undefined)).toBe('msg:016f6818ea38d8e9')
  })

  test('Responses: el segundo y el tercer turno comparten el primer asistente', () => {
    const turn = (extra: string) => `{"instructions":"You are Codex, based on GPT-5.","input":[{"type":"message","role":"developer","content":[{"type":"input_text","text":"system instructions"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"hi"}]},{"type":"reasoning","summary":[{"type":"summary_text","text":"thinking..."}],"encrypted_content":"xxx"},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hello!"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"what can you do"}]}${extra}]}`
    const second = extractSessionId(undefined, turn(''), undefined)
    const third = extractSessionId(undefined, turn(',{"type":"message","role":"assistant","content":[{"type":"output_text","text":"I can help with..."}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"thanks"}]}'), undefined)
    expect(second).toStartWith('msg:')
    expect(third).toBe(second)
  })

  test('contenido multimodal: sólo las partes de texto', () => {
    const first = extractSessionId(undefined, '{"messages":[{"role":"user","content":[{"type":"text","text":"Hello world"},{"type":"image","source":{"data":"..."}}]}]}', undefined)
    expect(first).toBe('msg:6f3af82650710693')
  })
})

describe('jerarquía de sesiones', () => {
  test.each([
    ['claude:a:agent:b', 'claude:a', true],
    ['msg:full', 'msg:short', true],
    ['session:a', 'conv:b', false],
    ['plain-a', 'plain-b', true],
    ['session:a', 'session:a', false],
    ['session:a', '', false],
  ])('isHierarchyParent(%p, %p) = %p', (primary, fallback, want) => {
    expect(isHierarchyParent(primary, fallback)).toBe(want)
  })

  test('un agente es subagente aunque no traiga respaldo', () => {
    expect(isSubagentSession('claude:a:agent:b', '')).toBe(true)
    expect(isSubagentSession('pck:x', 'conv:y')).toBe(false)
  })
})

describe('SessionAffinitySelector: vinculación', () => {
  test('la misma sesión elige siempre la misma credencial', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const options = { payload: userIdPayload('ac980658-63bd-4fb3-97ba-8da64cb1e344') }
    const first = pickId(selector, 'claude', 'claude-3', options, pool)
    for (let i = 0; i < 10; i++) expect(pickId(selector, 'claude', 'claude-3', options, pool)).toBe(first)
  })

  test('las variantes con sufijo de razonamiento comparten la vinculación y la liberan', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const options = { payload: userIdPayload('ac980658-63bd-4fb3-97ba-8da64cb1e344') }
    const first = pickId(selector, 'anthropic', 'claude-sonnet-4-5', options, pool)
    expect(pickId(selector, 'anthropic', 'claude-sonnet-4-5(high)', options, pool)).toBe(first)
    expect(pickId(selector, 'anthropic', 'claude-sonnet-4-5(medium)', options, pool)).toBe(first)
    selector.onResult({
      authId: first, provider: 'anthropic', model: 'claude-sonnet-4-5(high)', success: false,
      options: { payload: options.payload, metadata: { [METADATA_KEYS.sessionAffinityProvider]: 'anthropic', [METADATA_KEYS.sessionAffinityModel]: 'claude-sonnet-4-5(high)' } },
    })
    expect(pickId(selector, 'anthropic', 'claude-sonnet-4-5', options, pool)).not.toBe(first)
  })

  test('ponderado: con peso 0 se revincula, y la nueva vinculación se mantiene', () => {
    const selector = selectorWith(new WeightedRoundRobinSelector())
    const a: ProxyCredential = { id: 'auth-a', attributes: { weight: '1' } }
    const b: ProxyCredential = { id: 'auth-b', attributes: { weight: '1' } }
    const options = { payload: userIdPayload('weight-change') }
    expect(pickId(selector, 'claude', 'claude-3', options, [a, b])).toBe('auth-a')
    a.attributes!.weight = '0'
    expect(pickId(selector, 'claude', 'claude-3', options, [a, b])).toBe('auth-b')
    a.attributes!.weight = '10'
    expect(pickId(selector, 'claude', 'claude-3', options, [a, b])).toBe('auth-b')
  })

  test('ponderado: las sesiones nuevas reparten según el peso nuevo', () => {
    const selector = selectorWith(new WeightedRoundRobinSelector())
    const a: ProxyCredential = { id: 'auth-a', attributes: { weight: '1000000' } }
    const b: ProxyCredential = { id: 'auth-b', attributes: { weight: '1' } }
    const pickSession = (i: number) => pickId(selector, 'claude', 'claude-3', { payload: `{"session_id":"session-${i}"}` }, [a, b])
    for (let i = 0; i < 1000; i++) pickSession(i)
    a.attributes!.weight = '1'
    const counts: Record<string, number> = {}
    for (let i = 1000; i < 1020; i++) {
      const id = pickSession(i)
      counts[id] = (counts[id] ?? 0) + 1
    }
    expect(counts).toEqual({ 'auth-a': 10, 'auth-b': 10 })
  })

  test('sin sesión, decide el selector de respaldo', () => {
    const selector = selectorWith(new FillFirstSelector())
    expect(pickId(selector, 'claude', 'claude-3', { payload: '{"model":"claude-3"}' }, credentials('auth-b', 'auth-a', 'auth-c'))).toBe('auth-a')
  })

  test('cada sesión conserva la suya', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const one = { payload: userIdPayload('11111111-1111-1111-1111-111111111111') }
    const two = { payload: userIdPayload('22222222-2222-2222-2222-222222222222') }
    const first = pickId(selector, 'claude', 'claude-3', one, pool)
    const second = pickId(selector, 'claude', 'claude-3', two, pool)
    for (let i = 0; i < 5; i++) {
      expect(pickId(selector, 'claude', 'claude-3', one, pool)).toBe(first)
      expect(pickId(selector, 'claude', 'claude-3', two, pool)).toBe(second)
    }
  })

  test('si la credencial vinculada deja de estar, se revincula y se mantiene', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const options = { payload: userIdPayload('failover-test-uuid') }
    const first = pickId(selector, 'claude', 'claude-3', options, pool)
    const rest = pool.filter(c => c.id !== first)
    const second = pickId(selector, 'claude', 'claude-3', options, rest)
    expect(second).not.toBe(first)
    for (let i = 0; i < 5; i++) expect(pickId(selector, 'claude', 'claude-3', options, rest)).toBe(second)
  })

  test('el segundo turno hereda al primero, y el tercero al segundo', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const s2 = '{"messages":[{"role":"system","content":"Stable test"},{"role":"user","content":"First msg"},{"role":"assistant","content":"Response"},{"role":"user","content":"Second"}]}'
    const s3 = '{"messages":[{"role":"system","content":"Stable test"},{"role":"user","content":"First msg"},{"role":"assistant","content":"Response"},{"role":"user","content":"Second"},{"role":"assistant","content":"More"},{"role":"user","content":"Third"}]}'
    expect(pickId(selector, 'test', 'model', { payload: s3 }, pool)).toBe(pickId(selector, 'test', 'model', { payload: s2 }, pool))
    const i1 = '{"messages":[{"role":"system","content":"Inherit test"},{"role":"user","content":"Initial"}]}'
    const i2 = '{"messages":[{"role":"system","content":"Inherit test"},{"role":"user","content":"Initial"},{"role":"assistant","content":"Reply"},{"role":"user","content":"Continue"}]}'
    const first = pickId(selector, 'inherit', 'model', { payload: i1 }, pool)
    expect(pickId(selector, 'inherit', 'model', { payload: i2 }, pool)).toBe(first)
  })

  test.each([
    ['prompt_cache_key primero', '{"prompt_cache_key":"shared-cache-bucket"}'],
    ['conversación primero', '{"conversation":{"id":"conversation-session"}}'],
  ])('pasar a los dos identificadores conserva la vinculación: %s', (_name, firstPayload) => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first = pickId(selector, 'responses', 'gpt-test', { payload: firstPayload }, pool)
    expect(pickId(selector, 'responses', 'gpt-test', { payload: '{"conversation":{"id":"conversation-session"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)).toBe(first)
  })

  test('los dos identificadores vinculan también la conversación sola', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first = pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-session"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-session"}}' }, pool)).toBe(first)
  })

  test('el tráfico del primario mantiene vivo el alias de la conversación', () => {
    const clock = manualClock()
    const selector = selectorWith(new RoundRobinSelector(), { clock })
    const pool = credentials('auth-a', 'auth-b')
    const first = pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-session"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)
    clock.advance(50_000)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"prompt_cache_key":"shared-cache-bucket"}' }, pool)).toBe(first)
    clock.advance(50_000)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-session"}}' }, pool)).toBe(first)
  })

  test('un prompt_cache_key compartido conserva los alias de cada conversación', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first = pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-a"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-b"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)).toBe(first)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-a"}}' }, pool)).toBe(first)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"conversation-b"}}' }, pool)).toBe(first)
  })

  test('una conversación cuyo id contiene la marca del prompt sigue estable', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first = pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"a::pck:b"},"prompt_cache_key":"shared-cache-bucket"}' }, pool)
    expect(pickId(selector, 'p', 'gpt-test', { payload: '{"conversation":{"id":"a::pck:b"}}' }, pool)).toBe(first)
  })

  test('una vinculación por modelo y por proveedor', () => {
    const selector = selectorWith()
    const options = { payload: userIdPayload('multi-model-test') }
    for (let i = 0; i < 3; i++) {
      expect(pickId(selector, 'provider', 'model-a', options, credentials('auth-a'))).toBe('auth-a')
      expect(pickId(selector, 'provider', 'model-b', options, credentials('auth-b'))).toBe('auth-b')
      expect(pickId(selector, 'claude', 'claude-3', options, credentials('auth-claude'))).toBe('auth-claude')
      expect(pickId(selector, 'gemini', 'gemini-2.5-pro', options, credentials('auth-gemini'))).toBe('auth-gemini')
    }
  })

  test('las sesiones nuevas se reparten por turno', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const counts: Record<string, number> = {}
    for (let i = 0; i < 12; i++) {
      const id = pickId(selector, 'provider', 'model', { payload: userIdPayload(`${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`) }, pool)
      counts[id] = (counts[id] ?? 0) + 1
    }
    expect(counts).toEqual({ 'auth-a': 4, 'auth-b': 4, 'auth-c': 4 })
  })

  test('toma el cuerpo de la petición cuando Enrich no trae el original', () => {
    const selector = selectorWith()
    const enriched = enrich({ payload: '{"conversation":{"id":"request-only-conversation"},"input":"hello"}', sourceFormat: 'openai-response' })
    const options = { payload: enriched.originalRequest, metadata: enriched.optionsMetadata }
    const pool = credentials('auth-a', 'auth-b')
    expect(pickId(selector, 'openai', 'gpt-test', options, pool)).toBe(pickId(selector, 'openai', 'gpt-test', options, pool))
  })
})

describe('SessionAffinitySelector: identidad acotada en la metadata', () => {
  test('un id compuesto largo se acota igual en la metadata y en canonicalSessionId', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const options: PickOptions = { headers: { 'x-claude-code-session-id': 's'.repeat(200), 'x-claude-code-agent-id': 'a'.repeat(100) }, metadata: {} }
    selector.pick('claude', 'claude-3-7-sonnet', credentials('auth-1'), new Date(), options)
    const canonical = options.metadata![METADATA_KEYS.canonicalSession]
    expect(typeof canonical).toBe('string')
    expect((canonical as string).length).toBeLessThanOrEqual(256)
    expect(canonical as string).toContain('#')
    expect(canonicalSessionId(options.headers, options.payload, options.metadata)).toBe(canonical as string)
    expect(options.metadata![METADATA_KEYS.sessionAffinityProvider]).toBe('claude')
    expect(options.metadata![METADATA_KEYS.sessionAffinityModel]).toBe('claude-3-7-sonnet')
  })

  test('onResult usa la misma clave acotada que pick para una derivada larga', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const options: PickOptions = { metadata: { [METADATA_KEYS.derivedSession]: 'd'.repeat(250) } }
    const picked = selector.pick('openai', 'gpt-5.4', credentials('auth-a', 'auth-b'), new Date(), options).id
    selector.onResult({ authId: picked, provider: 'openai', model: 'gpt-5.4', success: true, options })
    expect(selector.pick('openai', 'gpt-5.4', credentials('auth-b', 'auth-a'), new Date(), options).id).toBe(picked)
  })
})

/** El último candidato: prueba que el respaldo sólo recibe el nivel más alto. */
class LastCredentialSelector implements CredentialSelector {
  pick(_provider: string, _model: string, pool: ProxyCredential[]): ProxyCredential {
    if (pool.length === 0) throw new SelectorError('auth_not_found', 'no auth candidates')
    return pool[pool.length - 1]!
  }
}

describe('SessionAffinitySelector: prioridad', () => {
  test('el respaldo sólo recibe el nivel de prioridad más alto disponible', () => {
    const selector = new SessionAffinitySelector({ fallback: new LastCredentialSelector(), cleanup: false })
    const high: ProxyCredential = { id: 'a-high', attributes: { priority: '1' } }
    const low: ProxyCredential = { id: 'z-low', attributes: { priority: '0' } }
    const options = { metadata: { [METADATA_KEYS.derivedSession]: 'stable-session' } }
    expect(pickId(selector, 'test', 'model', options, [high, low])).toBe('a-high')
    expect(pickId(selector, 'test', 'model', {}, [high, low])).toBe('a-high')
    high.unavailable = true
    expect(pickId(selector, 'test', 'model', options, [high, low])).toBe('z-low')
  })

  test('una vinculación viva gana a una credencial de más prioridad que se recupera', () => {
    const selector = new SessionAffinitySelector({ fallback: new RoundRobinSelector(), cleanup: false })
    const high: ProxyCredential = { id: 'p-high', attributes: { priority: '1' } }
    const low: ProxyCredential = { id: 'p-low', attributes: { priority: '0' } }
    const session = { metadata: { [METADATA_KEYS.derivedSession]: 'stable-session' } }
    expect(pickId(selector, 'p', 'm', session, [high, low])).toBe('p-high')
    high.unavailable = true
    expect(pickId(selector, 'p', 'm', session, [high, low])).toBe('p-low')
    high.unavailable = false
    expect(pickId(selector, 'p', 'm', session, [high, low])).toBe('p-low')
    expect(pickId(selector, 'p', 'm', { metadata: { [METADATA_KEYS.derivedSession]: 'new-session' } }, [high, low])).toBe('p-high')
    low.unavailable = true
    expect(pickId(selector, 'p', 'm', session, [high, low])).toBe('p-high')
  })
})

const parentOptions = (session: string, content = 'parent task'): PickOptions => ({
  headers: { 'x-claude-code-session-id': session },
  payload: `{"messages":[{"role":"user","content":"${content}"}]}`,
  metadata: {},
})
const subagentOptions = (session: string, agent: string, content = 'subagent task'): PickOptions => ({
  headers: { 'x-claude-code-session-id': session, 'x-claude-code-agent-id': agent },
  payload: `{"messages":[{"role":"user","content":"${content}"}]}`,
  metadata: {},
})

describe('SessionAffinitySelector: subagentes', () => {
  test.each([
    ['por defecto', undefined],
    ['declarada', true],
  ])('el subagente hereda la credencial del padre (%s)', (_name, subagentAffinity) => {
    const selector = selectorWith(new RoundRobinSelector(), { subagentAffinity })
    const pool = credentials('auth-ag-1', 'auth-ag-2')
    expect(pickId(selector, 'antigravity', 'gemini-3.7-flash-high', parentOptions('claude-root-100'), pool)).toBe('auth-ag-1')
    const sub = subagentOptions('claude-root-100', 'subagent-001')
    expect(pickId(selector, 'antigravity', 'gemini-3.7-flash-high', sub, pool)).toBe('auth-ag-1')
    expect(pickId(selector, 'antigravity', 'gemini-3.7-flash-high', sub, pool)).toBe('auth-ag-1')
  })

  test('con la afinidad de subagentes apagada, cada subagente reparte y se mantiene', () => {
    const selector = selectorWith(new RoundRobinSelector(), { subagentAffinity: false })
    const pool = credentials('auth-ag-1', 'auth-ag-2')
    const model = 'gemini-3.7-flash-high'
    expect(pickId(selector, 'antigravity', model, parentOptions('claude-root-100'), pool)).toBe('auth-ag-1')
    expect(pickId(selector, 'antigravity', model, subagentOptions('claude-root-100', 'subagent-001'), pool)).toBe('auth-ag-2')
    expect(pickId(selector, 'antigravity', model, subagentOptions('claude-root-100', 'subagent-001', 'second turn'), pool)).toBe('auth-ag-2')
    expect(pickId(selector, 'antigravity', model, subagentOptions('claude-root-100', 'subagent-002'), pool)).toBe('auth-ag-1')
    expect(pickId(selector, 'antigravity', model, parentOptions('claude-root-100', 'parent follow-up'), pool)).toBe('auth-ag-1')
  })

  test('subagentes anidados en el cuerpo: aislados, con su id canónico', () => {
    const selector = selectorWith(new RoundRobinSelector(), { subagentAffinity: false })
    const pool = credentials('auth-ag-1', 'auth-ag-2')
    const model = 'gemini-3.7-flash-high'
    const nested = (metadata = ''): PickOptions => ({ payload: `{"request":{"sessionId":"root-task"${metadata}}}`, metadata: {} })
    const parent = nested()
    expect(pickId(selector, 'antigravity', model, parent, pool)).toBe('auth-ag-1')
    expect(parent.metadata![METADATA_KEYS.canonicalSession]).toBe('session:root-task')
    const worker = nested(',"metadata":{"agent_id":"worker-1"}')
    expect(pickId(selector, 'antigravity', model, worker, pool)).toBe('auth-ag-2')
    expect(worker.metadata![METADATA_KEYS.canonicalSession]).toBe('session:root-task:agent:worker-1')
    expect(pickId(selector, 'antigravity', model, nested(',"metadata":{"agent_id":"worker-1"}'), pool)).toBe('auth-ag-2')
    expect(pickId(selector, 'antigravity', model, nested(',"metadata":{"subagent_id":"worker-2"}'), pool)).toBe('auth-ag-1')
    expect(pickId(selector, 'antigravity', model, nested(), pool)).toBe('auth-ag-1')
  })

  test('el fallo de un subagente borra sólo su vinculación, no la del padre', () => {
    const selector = selectorWith()
    const pool = credentials('auth-1', 'auth-2')
    const model = 'gemini-3.7-flash-high'
    expect(pickId(selector, 'antigravity', model, parentOptions('sess-fail-400'), pool)).toBe('auth-1')
    const parentKey = `antigravity::claude:sess-fail-400::${model}`
    expect(selector.cache.get(parentKey)).toBe('auth-1')
    const sub = subagentOptions('sess-fail-400', 'sub-fail-001')
    expect(pickId(selector, 'antigravity', model, sub, pool)).toBe('auth-1')
    const subKey = `antigravity::claude:sess-fail-400:agent:sub-fail-001::${model}`
    expect(selector.cache.get(subKey)).toBe('auth-1')
    selector.onResult({ authId: 'auth-1', provider: '', model: '', success: false, options: sub })
    expect(selector.cache.get(subKey)).toBeUndefined()
    expect(selector.cache.get(parentKey)).toBe('auth-1')
    expect(pickId(selector, 'antigravity', model, parentOptions('sess-fail-400'), pool)).toBe('auth-1')
    selector.onResult({ authId: 'auth-1', provider: '', model: '', success: true, options: sub })
    expect(selector.cache.get(parentKey)).toBe('auth-1')
  })
})

describe('SessionAffinitySelector: el subagente no es alias del padre', () => {
  test('revincular al padre no arrastra la vinculación del subagente', () => {
    const selector = selectorWith()
    const model = 'gemini-3.7-flash-high'
    const [one, two] = credentials('auth-1', 'auth-2')
    expect(pickId(selector, 'antigravity', model, parentOptions('sess-alias-500'), [one!, two!])).toBe('auth-1')
    expect(pickId(selector, 'antigravity', model, subagentOptions('sess-alias-500', 'sub-alias-001'), [one!, two!])).toBe('auth-1')
    expect(pickId(selector, 'antigravity', model, parentOptions('sess-alias-500'), [two!])).toBe('auth-2')
    expect(selector.cache.get(`antigravity::claude:sess-alias-500:agent:sub-alias-001::${model}`)).toBe('auth-1')
  })
})

describe('SessionAffinitySelector: onResult', () => {
  const namespaced = (session: string, provider: string, model: string): PickOptions => ({
    headers: { 'x-session-id': session },
    metadata: { [METADATA_KEYS.sessionAffinityProvider]: provider, [METADATA_KEYS.sessionAffinityModel]: model },
  })

  test('un éxito tardío de la credencial anterior no pisa la revinculación', () => {
    const selector = selectorWith()
    const key = 'mixed::header:sess-delay-success::model-x'
    selector.cache.set(key, 'auth-A')
    selector.cache.set(key, 'auth-B')
    selector.onResult({ authId: 'auth-A', provider: 'provider-a', model: 'model-x', success: true, options: namespaced('sess-delay-success', 'mixed', 'model-x') })
    expect(selector.cache.get(key)).toBe('auth-B')
  })

  test('el espacio de nombres de la metadata manda sobre el proveedor del resultado', () => {
    const selector = selectorWith()
    const key = 'mixed::header:sess-ns-1::test-model'
    selector.cache.set(key, 'auth-1')
    selector.onResult({ authId: 'auth-1', provider: 'gemini', model: 'test-model', success: false, options: namespaced('sess-ns-1', 'mixed', 'test-model') })
    expect(selector.cache.get(key)).toBeUndefined()
  })

  test('un fallo de la petición, no de la credencial, conserva la vinculación', () => {
    const selector = selectorWith()
    const key = 'mixed::header:sess-scope::m'
    selector.cache.set(key, 'auth-1')
    selector.onResult({ authId: 'auth-1', provider: 'p', model: 'm', success: false, skipCooldown: true, options: namespaced('sess-scope', 'mixed', 'm') })
    expect(selector.cache.get(key)).toBe('auth-1')
  })
})

describe('SessionAffinitySelector: lookupAffinity', () => {
  test('observa sin refrescar: las lecturas no alargan la vida de la vinculación', () => {
    const clock = manualClock()
    const selector = new SessionAffinitySelector({ ttlMs: MINUTE, now: clock.now, cleanup: false })
    const options: PickOptions = { headers: { 'x-claude-code-session-id': 'sess-alpha' }, metadata: {} }
    expect(pickId(selector, 'anthropic', 'claude-3-7-sonnet', options, credentials('auth-a'))).toBe('auth-a')
    clock.advance(50_000)
    for (let i = 0; i < 10; i++) expect(selector.lookupAffinity('anthropic', 'claude-3-7-sonnet', 'sess-alpha')).toEqual({ authId: 'auth-a', status: 'bound' })
    clock.advance(11_000)
    expect(selector.lookupAffinity('anthropic', 'claude-3-7-sonnet', 'sess-alpha')).toEqual({ authId: '', status: 'unbound' })
  })

  test('el filtro deja fuera la credencial de otro proveedor en el espacio mixto', () => {
    const selector = selectorWith()
    selector.cache.set('openai::header:cross-prov-session::gpt-4o', 'auth-openai-1')
    selector.cache.set('mixed::header:cross-prov-session::gpt-4o', 'auth-anthropic-1')
    expect(selector.lookupAffinity('openai', 'gpt-4o', 'cross-prov-session')).toEqual({ authId: '', status: 'ambiguous' })
    expect(selector.lookupAffinity('openai', 'gpt-4o', 'cross-prov-session', id => id === 'auth-openai-1')).toEqual({ authId: 'auth-openai-1', status: 'bound' })
  })

  test('un id con prefijo conocido se busca tal cual', () => {
    const selector = selectorWith()
    selector.cache.set('p::header:x::m', 'auth-1')
    expect(selector.lookupAffinity('p', 'm', 'header:x')).toEqual({ authId: 'auth-1', status: 'bound' })
    expect(selector.lookupAffinity('p', 'm(high)', 'x')).toEqual({ authId: 'auth-1', status: 'bound' })
  })

  test('entradas vacías: sin vincular', () => {
    const selector = selectorWith()
    expect(selector.lookupAffinity('', 'm', 's')).toEqual({ authId: '', status: 'unbound' })
    expect(selector.lookupAffinity('p', '', 's')).toEqual({ authId: '', status: 'unbound' })
    expect(selector.lookupAffinity('p', 'm', ' ')).toEqual({ authId: '', status: 'unbound' })
  })

  test('invalidateAuth retira todas las vinculaciones de la credencial', () => {
    const selector = selectorWith()
    selector.cache.set('p::header:x::m', 'auth-1')
    selector.cache.set('p::header:y::m', 'auth-1')
    selector.invalidateAuth('auth-1')
    expect(selector.cache.size).toBe(0)
  })
})
