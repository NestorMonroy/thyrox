import { describe, expect, test } from 'bun:test'

import {
  MAIN_THREAD_SOURCES,
  isMainThreadSource,
  matchesSource,
  resolveExplicitPromptCacheTtl,
  resolvePromptCacheTtl,
  type PromptCacheTtlContext,
} from '../promptCacheTtl.ts'

// Porte de la cadena de 2.1.282, extraída con `bin/binary symbol
// chunk-c9jscxk0.js EPt QCt pxe yyo fxe`: el orden de las reglas es el del
// ejecutable, y cada caso fija una regla ganando sobre las de debajo.
const subscriber: PromptCacheTtlContext = { env: {}, isSubscriber: true, isUsingOverage: false }

describe('orígenes de la conversación principal (fxe, pxe, yyo)', () => {
  test('la lista es la del ejecutable', () => {
    expect([...MAIN_THREAD_SOURCES]).toEqual(['repl_main_thread*', 'sdk', 'auto_mode', 'memdir_relevance'])
  })
  test('un patrón con * casa por prefijo; sin él, exacto', () => {
    expect(matchesSource('repl_main_thread:outputStyle', ['repl_main_thread*'])).toBe(true)
    expect(matchesSource('sdk:x', ['sdk'])).toBe(false)
    expect(matchesSource(undefined, ['sdk'])).toBe(false)
  })
  test('un subagente no es conversación principal', () => {
    expect(isMainThreadSource('agent:custom')).toBe(false)
    expect(isMainThreadSource('sdk')).toBe(true)
  })
})

describe('resolvePromptCacheTtl — el orden de QCt y EPt', () => {
  test('1. forzar 5m gana a todo', () => {
    const ctx = { ...subscriber, env: { THYROX_FORCE_PROMPT_CACHING_5M: '1', THYROX_CODE_PROMPT_CACHE_TTL: '1h' } }
    expect(resolvePromptCacheTtl('sdk', {}, ctx)).toEqual({ ttl: '5m', reason: 'force_5m_env' })
  })
  test('2. la variable del origen: principal lee una, subagente la otra', () => {
    const env = { THYROX_CODE_PROMPT_CACHE_TTL: '5m', THYROX_CODE_SUBAGENT_PROMPT_CACHE_TTL: '1h' }
    const ctx = { ...subscriber, env, settings: { promptCacheTtl: '1h' as const } }
    expect(resolvePromptCacheTtl('sdk', {}, ctx)).toEqual({ ttl: '5m', reason: 'env' })
    expect(resolvePromptCacheTtl('agent:custom', {}, { ...ctx, isSubscriber: false })).toEqual({ ttl: '1h', reason: 'env' })
  })
  test('3. el setting del origen, por debajo del entorno', () => {
    const ctx = { ...subscriber, settings: { promptCacheTtl: '5m' as const, subagentPromptCacheTtl: '1h' as const } }
    expect(resolvePromptCacheTtl('sdk', {}, ctx)).toEqual({ ttl: '5m', reason: 'setting' })
    expect(resolvePromptCacheTtl('agent:custom', {}, ctx)).toEqual({ ttl: '1h', reason: 'setting' })
  })
  test('4. el frontmatter del agente, salvo 1h en excedente', () => {
    expect(resolvePromptCacheTtl('agent:custom', { agentCacheTtlOverride: '1h' }, subscriber))
      .toEqual({ ttl: '1h', reason: 'agent_frontmatter' })
    const overage = { ...subscriber, isUsingOverage: true }
    expect(resolvePromptCacheTtl('agent:custom', { agentCacheTtlOverride: '1h' }, overage))
      .toEqual({ ttl: '5m', reason: 'default' })
    expect(resolvePromptCacheTtl('agent:custom', { agentCacheTtlOverride: '5m' }, overage))
      .toEqual({ ttl: '5m', reason: 'agent_frontmatter' })
  })
  test('ignoreOverage: el excedente no cuenta y el 1h del frontmatter pasa', () => {
    const overage = { ...subscriber, isUsingOverage: true }
    expect(resolvePromptCacheTtl('agent:custom', { agentCacheTtlOverride: '1h', ignoreOverage: true }, overage))
      .toEqual({ ttl: '1h', reason: 'agent_frontmatter' })
  })
  test('5. activar 1h por entorno, o en Bedrock con su variable', () => {
    const api = { env: { THYROX_ENABLE_PROMPT_CACHING_1H: '1' }, isSubscriber: false, isUsingOverage: false }
    expect(resolvePromptCacheTtl('agent:custom', {}, api)).toEqual({ ttl: '1h', reason: 'enable_1h_env' })
    const bedrock = { env: { THYROX_ENABLE_PROMPT_CACHING_1H_BEDROCK: '1' }, isSubscriber: false,
                      isUsingOverage: false, provider: 'bedrock' }
    expect(resolvePromptCacheTtl('sdk', {}, bedrock)).toEqual({ ttl: '1h', reason: 'enable_1h_env' })
    expect(resolvePromptCacheTtl('sdk', {}, { ...bedrock, provider: 'firstParty' })).toEqual({ ttl: '5m', reason: 'default' })
  })
  test('6. sin suscripción o en excedente: 5m', () => {
    expect(resolvePromptCacheTtl('sdk', {}, { ...subscriber, isSubscriber: false })).toEqual({ ttl: '5m', reason: 'default' })
    expect(resolvePromptCacheTtl('sdk', {}, { ...subscriber, isUsingOverage: true })).toEqual({ ttl: '5m', reason: 'default' })
  })
  test('7. suscriptor: 1h sólo si el origen está en la lista permitida', () => {
    expect(resolvePromptCacheTtl('repl_main_thread:x', {}, subscriber)).toEqual({ ttl: '1h', reason: 'subscriber' })
    expect(resolvePromptCacheTtl('agent:custom', {}, subscriber)).toEqual({ ttl: '5m', reason: 'default' })
    expect(resolvePromptCacheTtl('agent:custom', {}, { ...subscriber, allowlist: ['agent:*'] }))
      .toEqual({ ttl: '1h', reason: 'subscriber' })
  })
  test('un valor que no es 5m ni 1h no decide: se declara, no cae en silencio', () => {
    const ctx = { ...subscriber, env: { THYROX_CODE_PROMPT_CACHE_TTL: '2h' } }
    expect(() => resolvePromptCacheTtl('sdk', {}, ctx)).toThrow('THYROX_CODE_PROMPT_CACHE_TTL')
  })
})

describe('resolveExplicitPromptCacheTtl — QCt', () => {
  test('sin declaración que aplique no decide: el TTL queda a la suscripción', () => {
    expect(resolveExplicitPromptCacheTtl('sdk', undefined, false, { env: {} })).toBeUndefined()
    expect(resolveExplicitPromptCacheTtl('sdk', '5m', false, { env: {} })).toEqual({ ttl: '5m', reason: 'agent_frontmatter' })
  })
})
