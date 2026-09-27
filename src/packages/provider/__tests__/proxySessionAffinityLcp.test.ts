/**
 * Afinidad de sesión por prefijo común (LCP) en el selector — casos
 * portados de CLIProxyAPI (`sdk/cliproxy/auth/selector_lcp_test.go` y la
 * parte LCP de `session_affinity_lookup_test.go`, leídos como referencia).
 *
 * Sin identidad de sesión explícita y con un `caller_scope` en la metadata,
 * la historia de la conversación decide la credencial.
 */
import { describe, expect, test } from 'bun:test'
import { type CredentialSelector, type PickOptions, type ProxyCredential, RoundRobinSelector, SelectorError } from '../src/proxy/credentialSelectors.ts'
import { canonicalSessionId, SessionAffinitySelector } from '../src/proxy/session/affinitySelector.ts'
import { METADATA_KEYS } from '../src/proxy/session/info.ts'

const credentials = (...ids: string[]): ProxyCredential[] => ids.map(id => ({ id }))

class LastCredentialSelector implements CredentialSelector {
  pick(_provider: string, _model: string, pool: ProxyCredential[]): ProxyCredential {
    if (pool.length === 0) throw new SelectorError('auth_not_found', 'no auth candidates')
    return pool[pool.length - 1]!
  }
}

const selectorWith = (fallback: CredentialSelector = new RoundRobinSelector()) => new SessionAffinitySelector({ fallback, cleanup: false })

const chat = (...messages: [string, string][]) => JSON.stringify({ messages: messages.map(([role, content]) => ({ role, content })) })
const scoped = (payload: string, scope: string, sourceFormat = 'openai', extra: Record<string, unknown> = {}): PickOptions =>
  ({ sourceFormat, payload, metadata: { [METADATA_KEYS.callerScope]: scope, ...extra } })

const pickId = (selector: SessionAffinitySelector, provider: string, model: string, options: PickOptions, pool: ProxyCredential[]) =>
  selector.pick(provider, model, pool, new Date(), options).id

const meta = (options: PickOptions, key: string) => options.metadata?.[key]

describe('SessionAffinitySelector: LCP', () => {
  test('la conversación que crece conserva la credencial y la sesión', () => {
    const selector = selectorWith(new LastCredentialSelector())
    const pool = credentials('auth-a', 'auth-b')
    const first = scoped(chat(['system', 'stable'], ['user', 'first']), 'caller-a', 'openai', { [METADATA_KEYS.derivedSession]: 'legacy-derived-first' })
    expect(pickId(selector, 'openai', 'model', first, pool)).toBe('auth-b')
    expect(meta(first, METADATA_KEYS.lcpAffinitySession)).toStartWith('lcp:v1:')
    expect(meta(first, METADATA_KEYS.derivedSession)).toBe('legacy-derived-first')
    expect(meta(first, METADATA_KEYS.lcpFingerprints)).toHaveLength(2)
    const grown = scoped(chat(['system', 'stable'], ['user', 'first'], ['assistant', 'answer'], ['user', 'continue']), 'caller-a', 'openai', { [METADATA_KEYS.derivedSession]: 'legacy-derived-after-growth' })
    expect(pickId(selector, 'openai', 'model', grown, pool)).toBe('auth-b')
    expect(meta(grown, METADATA_KEYS.lcpAffinitySession)).toBe(meta(first, METADATA_KEYS.lcpAffinitySession))
  })

  test('sin caller_scope no hay LCP', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first: PickOptions = { sourceFormat: 'openai', payload: chat(['user', 'first request without caller scope']), metadata: {} }
    const second: PickOptions = { sourceFormat: 'openai', payload: chat(['user', 'second request without caller scope']), metadata: {} }
    const a = pickId(selector, 'openai', 'model', first, pool)
    const b = pickId(selector, 'openai', 'model', second, pool)
    expect(meta(first, METADATA_KEYS.lcpAffinitySession)).toBeUndefined()
    expect(meta(second, METADATA_KEYS.lcpAffinitySession)).toBeUndefined()
    expect(a).not.toBe(b)
  })

  test('cada caller_scope tiene su propio espacio', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const payload = chat(['user', 'shared common prompt'])
    expect(pickId(selector, 'openai', 'model', scoped(payload, 'caller-a'), pool)).not.toBe(pickId(selector, 'openai', 'model', scoped(payload, 'caller-b'), pool))
  })

  test('un fallo retira la secuencia exacta', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const options = scoped(chat(['user', 'failure']), 'caller-a')
    expect(pickId(selector, 'openai', 'model', options, pool)).toBe('auth-a')
    selector.onResult({ authId: 'auth-a', provider: 'openai', model: 'model', success: false, options })
    expect(pickId(selector, 'openai', 'model', options, pool)).toBe('auth-b')
  })

  test('onResult usa las huellas que dejó pick, sin el cuerpo', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const options = scoped(chat(['user', 'precomputed metadata test']), 'caller-a')
    const first = pickId(selector, 'openai', 'model', options, pool)
    expect(meta(options, METADATA_KEYS.lcpFingerprints)).toHaveLength(1)
    selector.onResult({ authId: first, provider: 'openai', model: 'model', success: true, options: { sourceFormat: 'openai', metadata: options.metadata } })
    expect(pickId(selector, 'openai', 'model', options, pool)).toBe(first)
  })

  test('las huellas que dejó pick bastan para refrescar la secuencia sin el cuerpo', () => {
    let clock = 1_000_000
    const selector = new SessionAffinitySelector({ fallback: new RoundRobinSelector(), ttlMs: 60_000, now: () => clock, cleanup: false })
    const pool = credentials('auth-a', 'auth-b')
    const options = scoped(chat(['user', 'refresh without body']), 'caller-a')
    expect(pickId(selector, 'openai', 'model', options, pool)).toBe('auth-a')
    clock += 50_000
    selector.onResult({ authId: 'auth-a', provider: 'openai', model: 'model', success: true, options: { metadata: options.metadata } })
    clock += 20_000
    expect(pickId(selector, 'openai', 'model', scoped(chat(['user', 'refresh without body']), 'caller-a'), pool)).toBe('auth-a')
  })

  test('una secuencia enlazada a una credencial no disponible se reelige', () => {
    const selector = selectorWith()
    const a: ProxyCredential = { id: 'auth-a' }
    const b: ProxyCredential = { id: 'auth-b' }
    expect(pickId(selector, 'openai', 'model', scoped(chat(['user', 'bound then down']), 'caller-a'), [a, b])).toBe('auth-a')
    a.unavailable = true
    expect(pickId(selector, 'openai', 'model', scoped(chat(['user', 'bound then down']), 'caller-a'), [a, b])).toBe('auth-b')
  })

  test('el resultado de una petición LCP no toca las vinculaciones por sesión', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b', 'auth-c')
    const payload = chat(['user', 'same text, two paths'])
    const plain: PickOptions = { sourceFormat: 'openai', payload, metadata: {} }
    expect(pickId(selector, 'openai', 'model', plain, pool)).toBe('auth-a')
    const lcp = scoped(payload, 'caller-a')
    const lcpAuth = pickId(selector, 'openai', 'model', lcp, pool)
    selector.onResult({ authId: lcpAuth, provider: 'openai', model: 'model', success: false, options: lcp })
    selector.onResult({ authId: 'auth-a', provider: 'openai', model: 'model', success: false, options: lcp })
    expect(pickId(selector, 'openai', 'model', { sourceFormat: 'openai', payload, metadata: {} }, pool)).toBe('auth-a')
  })

  test('una sesión explícita manda sobre el LCP', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const payload = chat(['user', 'same prompt'])
    expect(pickId(selector, 'openai', 'model', { sourceFormat: 'openai', payload }, pool)).toBe('auth-a')
    expect(pickId(selector, 'openai', 'model', { sourceFormat: 'openai', payload, headers: { 'x-session-id': 'harness-session' } }, pool)).toBe('auth-b')
  })

  test('canonicalSessionId: explícita, LCP, y la explícita gana a una LCP vieja', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const explicit: PickOptions = { headers: { 'x-claude-code-session-id': 'claude-abc' }, payload: chat(['user', 'hello']), metadata: {} }
    selector.pick('claude', 'model', pool, new Date(), explicit)
    expect(meta(explicit, METADATA_KEYS.canonicalSession)).toBe('claude:claude-abc')
    expect(canonicalSessionId(explicit.headers, explicit.payload, explicit.metadata)).toBe('claude:claude-abc')
    const lcp = scoped(chat(['user', 'lcp unified session test']), 'caller-unified')
    selector.pick('openai', 'model', pool, new Date(), lcp)
    const lcpSession = meta(lcp, METADATA_KEYS.canonicalSession) as string
    expect(lcpSession).toStartWith('lcp:v1:')
    expect(meta(lcp, METADATA_KEYS.lcpAffinitySession)).toBe(lcpSession)
    expect(canonicalSessionId(lcp.headers, lcp.payload, lcp.metadata)).toBe(lcpSession)
    const stale = { [METADATA_KEYS.canonicalSession]: lcpSession, [METADATA_KEYS.lcpAffinitySession]: lcpSession }
    expect(canonicalSessionId({ 'x-session-id': 'current-explicit' }, undefined, stale)).toBe('header:current-explicit')
  })

  test('sin formato de origen se infiere del cuerpo', () => {
    const selector = selectorWith()
    const pool = credentials('auth-a', 'auth-b')
    const first = scoped('{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}', 'caller-gemini', '')
    const second = scoped('{"contents":[{"role":"user","parts":[{"text":"hello"}]},{"role":"model","parts":[{"text":"hi"}]}]}', 'caller-gemini', '')
    expect(pickId(selector, 'gemini', 'model', second, pool)).toBe(pickId(selector, 'gemini', 'model', first, pool))
  })

  test('una bifurcación conserva la credencial y estrena sesión con su padre', () => {
    const selector = selectorWith()
    const pool = credentials('auth-1', 'auth-2')
    const root = scoped(chat(['user', 'turn 1'], ['assistant', 'ans 1'], ['user', 'turn 2 trunk'], ['assistant', 'ans 2 trunk'], ['user', 'turn 3 trunk']), 'caller-user-1')
    const rootAuth = pickId(selector, 'openai', 'model', root, pool)
    const rootSession = meta(root, METADATA_KEYS.canonicalSession)
    expect(rootSession).toBeTruthy()
    expect(meta(root, METADATA_KEYS.parentSession)).toBeUndefined()
    const fork = scoped(chat(['user', 'turn 1'], ['assistant', 'ans 1'], ['user', 'turn 2 fork branch B']), 'caller-user-1')
    expect(pickId(selector, 'openai', 'model', fork, pool)).toBe(rootAuth)
    const forkSession = meta(fork, METADATA_KEYS.canonicalSession)
    expect(forkSession).toBeTruthy()
    expect(forkSession).not.toBe(rootSession)
    const forkParent = meta(fork, METADATA_KEYS.parentSession)
    expect(forkParent).toBeTruthy()
    expect(meta(fork, METADATA_KEYS.isFork)).toBe(true)
    expect(meta(fork, METADATA_KEYS.nodeKind)).toBe('fork')
    const continued = scoped(chat(['user', 'turn 1'], ['assistant', 'ans 1'], ['user', 'turn 2 fork branch B'], ['assistant', 'ans 2 fork branch B'], ['user', 'turn 3 fork branch B']), 'caller-user-1')
    expect(pickId(selector, 'openai', 'model', continued, pool)).toBe(rootAuth)
    expect(meta(continued, METADATA_KEYS.canonicalSession)).toBe(forkSession)
    expect(meta(continued, METADATA_KEYS.parentSession)).toBe(forkParent)
  })

  test('un fallo tras un acierto del LCP desaloja la vinculación', () => {
    const selector = selectorWith()
    const pool = credentials('auth-1', 'auth-2')
    const request = () => scoped(chat(['user', 'test failure eviction']), 'test-caller')
    const first = request()
    const bound = pickId(selector, 'openai', 'model', first, pool)
    selector.onResult({ authId: bound, provider: 'openai', model: '', success: true, options: first })
    const second = request()
    expect(pickId(selector, 'openai', 'model', second, pool)).toBe(bound)
    selector.onResult({ authId: bound, provider: 'openai', model: '', success: false, options: second })
    expect(pickId(selector, 'openai', 'model', request(), pool)).toBe('auth-2')
  })

  test('una compactación conserva la credencial y enlaza con la sesión anterior', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const pool = credentials('auth-1', 'auth-2')
    const gemini = (...turns: [string, string][]) => JSON.stringify({ contents: turns.map(([role, text]) => ({ role, parts: [{ text }] })) })
    const first = scoped(gemini(['user', 'step 1'], ['model', 'ack 1'], ['user', 'step 2'], ['model', 'ack 2'], ['user', 'step 3']), 'caller-harness-1', 'gemini')
    const firstAuth = pickId(selector, 'google', 'gemini-2.5-pro', first, pool)
    const initial = meta(first, METADATA_KEYS.lcpAffinitySession)
    expect(initial).toBeTruthy()
    selector.onResult({ authId: firstAuth, provider: 'google', model: 'gemini-2.5-pro', success: true, options: first })
    const compacted = scoped(gemini(['user', '<summary>Steps 1 and 2 completed</summary>'], ['model', 'ack 2'], ['user', 'step 3'], ['user', 'step 4']), 'caller-harness-1', 'gemini')
    expect(pickId(selector, 'google', 'gemini-2.5-pro', compacted, pool)).toBe(firstAuth)
    expect(meta(compacted, METADATA_KEYS.parentSession)).toBe(initial)
    expect(meta(compacted, METADATA_KEYS.isCompaction)).toBe(true)
    expect(meta(compacted, METADATA_KEYS.nodeKind)).toBe('compaction')
    expect(meta(compacted, METADATA_KEYS.isFork)).toBeUndefined()
    selector.onResult({ authId: firstAuth, provider: 'google', model: 'gemini-2.5-pro', success: true, options: compacted })
    const next = scoped(gemini(['user', '<summary>Steps 1 and 2 completed</summary>'], ['model', 'ack 2'], ['user', 'step 3'], ['user', 'step 4'], ['model', 'ack 4']), 'caller-harness-1', 'gemini')
    expect(pickId(selector, 'google', 'gemini-2.5-pro', next, pool)).toBe(firstAuth)
    expect(meta(next, METADATA_KEYS.lcpAffinitySession)).toBe(meta(compacted, METADATA_KEYS.lcpAffinitySession))
    expect(meta(next, METADATA_KEYS.isFork)).toBeUndefined()
  })
})

describe('SessionAffinitySelector: lookupAffinity sobre LCP', () => {
  const bound = (authId: string) => ({ authId, status: 'bound' as const })
  const unbound = { authId: '', status: 'unbound' as const }

  test('por id publicado, por hash sin prefijo, y sin refrescar mientras crece', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const pool = credentials('auth-lcp-a')
    const options = scoped(chat(['system', 'test-lcp-sys'], ['user', 'test-lcp-user']), 'scope-test')
    selector.pick('openai', 'gpt-4o', pool, new Date(), options)
    const session = meta(options, METADATA_KEYS.lcpAffinitySession) as string
    expect(selector.lookupAffinity('openai', 'gpt-4o', session)).toEqual(bound('auth-lcp-a'))
    expect(selector.lookupAffinity('openai', 'gpt-4o', session.slice('lcp:v1:'.length))).toEqual(bound('auth-lcp-a'))
    const grown = scoped(chat(['system', 'test-lcp-sys'], ['user', 'test-lcp-user'], ['assistant', 'reply'], ['user', 'turn2']), 'scope-test')
    selector.pick('openai', 'gpt-4o', pool, new Date(), grown)
    expect(meta(grown, METADATA_KEYS.lcpAffinitySession)).toBe(session)
    for (let i = 0; i < 100; i++) expect(selector.lookupAffinity('openai', 'gpt-4o', session)).toEqual(bound('auth-lcp-a'))
  })

  test('el modelo distingue mayúsculas y admite `::` dentro', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const caseOptions = scoped(chat(['system', 'sys-case'], ['user', 'user-case']), 'scope-case')
    selector.pick('openai', 'ModelA', credentials('auth-case'), new Date(), caseOptions)
    const caseSession = meta(caseOptions, METADATA_KEYS.lcpAffinitySession) as string
    expect(selector.lookupAffinity('openai', 'ModelA', caseSession)).toEqual(bound('auth-case'))
    expect(selector.lookupAffinity('openai', 'modela', caseSession)).toEqual(unbound)
    const colonOptions = scoped(chat(['system', 'sys-colons'], ['user', 'user-colons']), 'scope-colons')
    selector.pick('openai', 'team::ModelA', credentials('auth-colon-model'), new Date(), colonOptions)
    const colonSession = meta(colonOptions, METADATA_KEYS.lcpAffinitySession) as string
    expect(selector.lookupAffinity('openai', 'team::ModelA', colonSession)).toEqual(bound('auth-colon-model'))
    expect(selector.lookupAffinity('openai', 'team', colonSession)).toEqual(unbound)
  })

  test('los alias de proveedor comparten espacio LCP', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const options = scoped('{"contents":[{"role":"user","parts":[{"text":"hello lookup"}]}]}', 'caller-lookup', 'gemini')
    selector.pick('google', 'gemini-2.5-pro', credentials('auth-gemini-1'), new Date(), options)
    const session = meta(options, METADATA_KEYS.lcpAffinitySession) as string
    expect(selector.lookupAffinity('gemini', 'gemini-2.5-pro', session)).toEqual(bound('auth-gemini-1'))
    expect(selector.lookupAffinity('google', 'gemini-2.5-pro', session)).toEqual(bound('auth-gemini-1'))
  })

  test('invalidateAuth también olvida los enlaces LCP', () => {
    const selector = new SessionAffinitySelector({ cleanup: false })
    const options = scoped(chat(['user', 'to be invalidated']), 'scope-x')
    selector.pick('openai', 'm', credentials('auth-x'), new Date(), options)
    const session = meta(options, METADATA_KEYS.lcpAffinitySession) as string
    selector.invalidateAuth('auth-x')
    expect(selector.lookupAffinity('openai', 'm', session)).toEqual(unbound)
  })
})
