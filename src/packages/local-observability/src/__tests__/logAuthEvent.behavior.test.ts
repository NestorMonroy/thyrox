/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/logAuthEvent.behavior.test.ts`
 * (214 líneas fuente, 100 % portado).
 *
 * La fuente inyecta el logger vía `getEventLogger`/`setEventLogger` de
 * `@claude-code-how-works/app-host/bootstrap/state.js`. Ese subpath no
 * existe en `@thyrox/app-host` (paquete concurrente en esta misma
 * ejecución), así que el sustituto en `internal/pendingCrossPackageDeps.ts`
 * usa la forma "punto de inyección" (Categoría 2): en vez de un setter
 * directo del logger, expone `setGetEventLoggerFn(fn)` que fija la
 * FUNCIÓN captadora — el test se adapta a esa forma, sin tocar la lógica
 * de clasificación de errores que es lo que realmente se está probando.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { logAuthEvent } from '../telemetry/authEvent.ts'
import { __resetOTelEventStateForTest } from '../telemetry/events.ts'
import {
  getEventLogger,
  setGetEventLoggerFn,
  type EventLoggerLike,
} from '../internal/pendingCrossPackageDeps.ts'

/**
 * Puerto pin de ant v2.1.136 vBH (2642.js) — wrapper tipado sobre el
 * evento estructurado OTel `claude_code.auth`.
 *
 * Forma en el binario:
 *   k5("auth", {
 *     action,
 *     success: String(success),
 *     auth_method,
 *     ...(error && { error_category, ...(status && { status_code }) }),
 *   })
 *
 * El cubo de error_category viene de ant VV (0191.js):
 *   - { isAxiosError: true } + response.status 401|403  → 'auth'
 *   - code === 'ECONNABORTED'                          → 'timeout'
 *   - code === 'ECONNREFUSED' | 'ENOTFOUND'             → 'network'
 *   - otro error axios                                  → 'http'
 *   - cualquier otra cosa                                → 'other'
 */

type EmittedLog = {
  timestamp: Date
  observedTimestamp: Date
  body: string
  attributes: Record<string, unknown>
}

function makeFakeLogger(): EventLoggerLike & { emitted: EmittedLog[] } {
  const emitted: EmittedLog[] = []
  return {
    emitted,
    emit(l) {
      emitted.push(l)
    },
  }
}

const originalLogger = getEventLogger()

beforeEach(() => {
  __resetOTelEventStateForTest()
})

afterEach(() => {
  setGetEventLoggerFn(() => originalLogger)
})

describe('logAuthEvent — camino feliz', () => {
  test('success=true login → body claude_code.auth + 3 campos obligatorios', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({ action: 'login', success: true, authMethod: 'oauth' })
    expect(fake.emitted.length).toBe(1)
    expect(fake.emitted[0]!.body).toBe('claude_code.auth')
    const attrs = fake.emitted[0]!.attributes
    expect(attrs['action']).toBe('login')
    expect(attrs['success']).toBe('true')
    expect(attrs['auth_method']).toBe('oauth')
    // Sin error → sin error_category / status_code.
    expect('error_category' in attrs).toBe(false)
    expect('status_code' in attrs).toBe(false)
  })

  test('success=false → string "false" (coincide con String(H.success) del binario)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
    })
    expect(fake.emitted[0]!.attributes['success']).toBe('false')
  })

  test('auth_method=api_key fluye hasta el evento', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: true,
      authMethod: 'api_key',
    })
    expect(fake.emitted[0]!.attributes['auth_method']).toBe('api_key')
  })
})

describe('logAuthEvent — clasificación de error (puerto de ant VV)', () => {
  test('Error no-axios → error_category="other", sin status_code', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: new Error('boom'),
    })
    const attrs = fake.emitted[0]!.attributes
    expect(attrs['error_category']).toBe('other')
    expect('status_code' in attrs).toBe(false)
  })

  test('axios 401 → error_category="auth", status_code="401"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    const err = { isAxiosError: true, response: { status: 401 } }
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: err,
    })
    const attrs = fake.emitted[0]!.attributes
    expect(attrs['error_category']).toBe('auth')
    expect(attrs['status_code']).toBe('401')
  })

  test('axios 403 → error_category="auth", status_code="403"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: true, response: { status: 403 } },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('auth')
    expect(fake.emitted[0]!.attributes['status_code']).toBe('403')
  })

  test('axios ECONNABORTED → error_category="timeout"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: true, code: 'ECONNABORTED' },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('timeout')
  })

  test('axios ECONNREFUSED → error_category="network"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: true, code: 'ECONNREFUSED' },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('network')
  })

  test('axios ENOTFOUND → error_category="network"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: true, code: 'ENOTFOUND' },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('network')
  })

  test('axios 500 → error_category="http", status_code="500"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: true, response: { status: 500 } },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('http')
    expect(fake.emitted[0]!.attributes['status_code']).toBe('500')
  })

  test('flag isAxiosError en false → "other" (no tiene la forma isAxiosError)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAuthEvent({
      action: 'login',
      success: false,
      authMethod: 'oauth',
      error: { isAxiosError: false, response: { status: 401 } },
    })
    expect(fake.emitted[0]!.attributes['error_category']).toBe('other')
  })
})
