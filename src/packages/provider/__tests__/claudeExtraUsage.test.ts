/**
 * Porte de OmniRoute `tests/unit/claude-extra-usage.test.ts` (MIT), contra
 * el porte nativo en `../src/claudeExtraUsage.ts` (superficie completa),
 * `../src/claudeExtraUsageNormalization.ts` y `../src/claudeExtraUsageSchema.ts`
 * -- estos dos últimos son un RECORTE deliberado de sus fuentes, no su
 * superficie completa; ver el docstring de cada uno para el alcance exacto.
 *
 * Las tres primeras pruebas son el porte fiel de la fuente (node:test ->
 * bun:test). Las siguientes cubren las cuatro funciones del primer módulo
 * que la fuente NO ejercita directamente -- se portan las ocho, así que las
 * ocho llevan cobertura propia.
 */
import { describe, expect, test } from 'bun:test'
import {
  CLAUDE_EXTRA_USAGE_ERROR_MESSAGE,
  CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
  buildClaudeExtraUsageConnectionUpdate,
  buildClaudeExtraUsageStateClearUpdate,
  isClaudeExtraUsageAllowed,
  isClaudeExtraUsageBlockEnabled,
  isClaudeExtraUsageQueued,
  isClaudeExtraUsageState,
  resolveClaudeExtraUsageResetAt,
} from '../src/claudeExtraUsage.ts'
import { normalizeProviderSpecificData } from '../src/claudeExtraUsageNormalization.ts'
import { updateProviderConnectionSchema } from '../src/claudeExtraUsageSchema.ts'

function futureIso(ms = 60_000): string {
  return new Date(Date.now() + ms).toISOString()
}

function pastIso(ms = 60_000): string {
  return new Date(Date.now() - ms).toISOString()
}

describe('claude extra-usage blocking (porte fiel de la fuente)', () => {
  test('el bloqueo esta activado por defecto y valida los payloads del proveedor', () => {
    expect(isClaudeExtraUsageBlockEnabled('claude', {})).toBe(true)
    expect(isClaudeExtraUsageBlockEnabled('claude', { blockExtraUsage: false })).toBe(false)
    expect(isClaudeExtraUsageBlockEnabled('openai', { blockExtraUsage: false })).toBe(false)
    expect(isClaudeExtraUsageAllowed('claude', { blockExtraUsage: false })).toBe(true)
    expect(isClaudeExtraUsageAllowed('claude', {})).toBe(false)
    expect(isClaudeExtraUsageAllowed('claude', { blockExtraUsage: true })).toBe(false)
    expect(isClaudeExtraUsageAllowed('openai', { blockExtraUsage: false })).toBe(false)

    expect(normalizeProviderSpecificData('claude', { blockExtraUsage: 'nope', tag: 'x' })).toEqual({
      tag: 'x',
    })

    const valid = updateProviderConnectionSchema.safeParse({
      providerSpecificData: { blockExtraUsage: false },
    })
    const invalid = updateProviderConnectionSchema.safeParse({
      providerSpecificData: { blockExtraUsage: 'false' },
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
  })

  test('construye una actualizacion de enfriamiento "unavailable" desde uso en cola', () => {
    const sessionReset = futureIso(180_000)
    const weeklyReset = futureIso(360_000)

    const update = buildClaudeExtraUsageConnectionUpdate(
      {
        provider: 'claude',
        providerSpecificData: { blockExtraUsage: true },
        backoffLevel: 0,
      },
      {
        extraUsage: { queued: true, billingAmount: 0.5 },
        quotas: {
          'session (5h)': { remainingPercentage: 0, resetAt: sessionReset },
          'weekly (7d)': { remainingPercentage: 62, resetAt: weeklyReset },
        },
      },
    )

    expect(update?.testStatus).toBe('unavailable')
    expect(update?.lastErrorType).toBe('quota_exhausted')
    expect(update?.lastErrorSource).toBe(CLAUDE_EXTRA_USAGE_ERROR_SOURCE)
    expect(update?.errorCode).toBe(429)
    expect(update?.rateLimitedUntil).toBe(sessionReset)
    expect(update?.backoffLevel).toBe(1)
  })

  test('limpia el estado solo cuando un snapshot confiable dice que el uso en cola termino', () => {
    const currentState = {
      provider: 'claude',
      providerSpecificData: { blockExtraUsage: true },
      testStatus: 'unavailable',
      lastError: CLAUDE_EXTRA_USAGE_ERROR_MESSAGE,
      lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
      lastErrorType: 'quota_exhausted',
      rateLimitedUntil: futureIso(180_000),
      backoffLevel: 1,
    }

    const cleared = buildClaudeExtraUsageConnectionUpdate(currentState, {
      extraUsage: null,
      quotas: {
        'session (5h)': { remainingPercentage: 42, resetAt: futureIso(120_000) },
      },
    })
    const unchanged = buildClaudeExtraUsageConnectionUpdate(currentState, {
      message: 'Claude connected. Unable to fetch usage: timeout',
    })

    expect(cleared?.testStatus).toBe('active')
    expect(cleared?.lastError).toBe(null)
    expect(cleared?.lastErrorSource).toBe(null)
    expect(cleared?.rateLimitedUntil).toBe(null)
    expect(cleared?.backoffLevel).toBe(0)
    expect(unchanged).toBe(null)
  })
})

describe('claude extra-usage blocking (cobertura propia, funciones sin ejercitar en la fuente)', () => {
  test('isClaudeExtraUsageQueued lee extraUsage.queued, no cualquier verdad', () => {
    expect(isClaudeExtraUsageQueued({ extraUsage: { queued: true } })).toBe(true)
    expect(isClaudeExtraUsageQueued({ extraUsage: { queued: false } })).toBe(false)
    expect(isClaudeExtraUsageQueued({ extraUsage: { queued: 1 } })).toBe(false)
    expect(isClaudeExtraUsageQueued({})).toBe(false)
    expect(isClaudeExtraUsageQueued(null)).toBe(false)
  })

  test('isClaudeExtraUsageState distingue el origen del ultimo error', () => {
    expect(isClaudeExtraUsageState({ lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE })).toBe(true)
    expect(isClaudeExtraUsageState({ lastErrorSource: 'rate_limit' })).toBe(false)
    expect(isClaudeExtraUsageState({})).toBe(false)
    // Control de anulacion del guard de string vacia: un lastErrorSource en
    // blanco no debe leerse como si coincidiera con la fuente esperada.
    expect(isClaudeExtraUsageState({ lastErrorSource: '   ' })).toBe(false)
  })

  test('resolveClaudeExtraUsageResetAt prioriza las ventanas de sesion sobre el resto', () => {
    const sessionReset = futureIso(60_000)
    const weeklyReset = futureIso(10_000) // mas cercana, pero NO es una ventana de sesion
    const resolved = resolveClaudeExtraUsageResetAt({
      quotas: {
        'weekly (7d)': { resetAt: weeklyReset },
        session: { resetAt: sessionReset },
      },
    })
    expect(resolved).toBe(sessionReset)
  })

  test('resolveClaudeExtraUsageResetAt cae a la mas proxima cuando ninguna cuota es de sesion', () => {
    const nearReset = futureIso(30_000)
    const farReset = futureIso(300_000)
    const resolved = resolveClaudeExtraUsageResetAt({
      quotas: {
        monthly: { resetAt: farReset },
        daily: { resetAt: nearReset },
      },
    })
    expect(resolved).toBe(nearReset)
  })

  test('resolveClaudeExtraUsageResetAt descarta fechas ya pasadas', () => {
    // Control de anulacion de toFutureIso: sin el filtro de "en el futuro",
    // esta cuota vencida se devolveria como si aun aplicara.
    const resolved = resolveClaudeExtraUsageResetAt({
      quotas: { session: { resetAt: pastIso(60_000) } },
    })
    expect(resolved).toBe(null)
  })

  test('resolveClaudeExtraUsageResetAt sin cuotas resueltas es null', () => {
    expect(resolveClaudeExtraUsageResetAt({})).toBe(null)
    expect(resolveClaudeExtraUsageResetAt(null)).toBe(null)
  })

  test('buildClaudeExtraUsageStateClearUpdate solo limpia si el estado actual ES de extra-usage', () => {
    const clearUpdate = buildClaudeExtraUsageStateClearUpdate({
      lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
    })
    expect(clearUpdate?.testStatus).toBe('active')
    expect(clearUpdate?.backoffLevel).toBe(0)

    expect(buildClaudeExtraUsageStateClearUpdate({ lastErrorSource: 'rate_limit' })).toBe(null)
    expect(buildClaudeExtraUsageStateClearUpdate({})).toBe(null)
  })

  test('buildClaudeExtraUsageConnectionUpdate es null para un proveedor que no es claude', () => {
    const update = buildClaudeExtraUsageConnectionUpdate(
      { provider: 'openai', backoffLevel: 0 },
      { extraUsage: { queued: true }, quotas: {} },
    )
    expect(update).toBe(null)
  })

  test('buildClaudeExtraUsageConnectionUpdate limpia el estado cuando el operador desactivo el bloqueo', () => {
    const update = buildClaudeExtraUsageConnectionUpdate(
      {
        provider: 'claude',
        providerSpecificData: { blockExtraUsage: false },
        testStatus: 'unavailable',
        lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
        backoffLevel: 2,
      },
      { extraUsage: { queued: true }, quotas: {} },
    )
    expect(update?.testStatus).toBe('active')
    expect(update?.backoffLevel).toBe(0)
  })

  test('buildClaudeExtraUsageConnectionUpdate es idempotente: el mismo estado exacto no produce una segunda escritura', () => {
    const rateLimitedUntil = futureIso(180_000)
    const currentState = {
      provider: 'claude',
      providerSpecificData: { blockExtraUsage: true },
      testStatus: 'unavailable',
      lastErrorSource: CLAUDE_EXTRA_USAGE_ERROR_SOURCE,
      lastErrorType: 'quota_exhausted',
      rateLimitedUntil,
      backoffLevel: 3,
    }
    // Control de anulacion del guard de idempotencia (linea 149-156 de la
    // fuente): sin el, cada snapshot en cola con la MISMA fecha de reset
    // produciria una escritura nueva -- y este backoffLevel volveria a 1.
    const update = buildClaudeExtraUsageConnectionUpdate(currentState, {
      extraUsage: { queued: true },
      quotas: { session: { resetAt: rateLimitedUntil } },
    })
    expect(update).toBe(null)
  })
})
