/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/structuredEvents.behavior.test.ts`
 * (431 líneas fuente, 100 % portado).
 *
 * Mismo ajuste que `logAuthEvent.behavior.test.ts`/`logOTelEvent.behavior.test.ts`:
 * `setEventLogger` de `@claude-code-how-works/app-host/bootstrap/state.js`
 * se sustituye por `setGetEventLoggerFn` (punto de inyección, Categoría 2)
 * de `internal/pendingCrossPackageDeps.ts`.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  __resetOTelEventStateForTest,
} from '../telemetry/events.ts'
import {
  logApiRetriesExhaustedEvent,
  logAtMentionEvent,
  logCompactionEvent,
  logFeedbackSurveyEvent,
  logInternalErrorEvent,
  logMcpServerConnectionEvent,
  logPermissionModeChangeEvent,
  logPluginInstalledEvent,
  logSkillActivatedEvent,
  logSystemPromptEvent,
} from '../telemetry/structuredEvents.ts'
import {
  getEventLogger,
  setGetEventLoggerFn,
  type EventLoggerLike,
} from '../internal/pendingCrossPackageDeps.ts'

/**
 * Puerto pin de los helpers tipados de eventos OTel de ant 2642.js /
 * 2643.js / 2822.js / 2911.js / 2914.js / 4054.js / 5059.js. Cada helper
 * envuelve logOTelEvent con la forma exacta de metadata que emite ant.
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

describe('logCompactionEvent (ant ZzH 2642.js)', () => {
  test('body=claude_code.compaction, success serializado como string', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logCompactionEvent({
      trigger: 'manual',
      success: true,
      durationMs: 1234,
      preTokens: 100_000,
      postTokens: 8_000,
    })
    expect(fake.emitted[0]!.body).toBe('claude_code.compaction')
    const a = fake.emitted[0]!.attributes
    expect(a['trigger']).toBe('manual')
    expect(a['success']).toBe('true')
    expect(a['duration_ms']).toBe('1234')
    expect(a['pre_tokens']).toBe('100000')
    expect(a['post_tokens']).toBe('8000')
  })

  test('duration_ms es Math.round de durationMs (coincide con ant)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logCompactionEvent({
      trigger: 'auto',
      success: true,
      durationMs: 1234.7,
    })
    expect(fake.emitted[0]!.attributes['duration_ms']).toBe('1235')
  })

  test('pre/post tokens opcionales → ausentes de attributes cuando undefined', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logCompactionEvent({
      trigger: 'auto',
      success: false,
      durationMs: 0,
      error: 'rate_limited',
    })
    const a = fake.emitted[0]!.attributes
    expect('pre_tokens' in a).toBe(false)
    expect('post_tokens' in a).toBe(false)
    expect(a['error']).toBe('rate_limited')
  })
})

describe('logInternalErrorEvent (ant LF9 2642.js)', () => {
  test('emite con error_name desde el constructor cuando el Error es genérico', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    class CustomError extends Error {
      override name = 'Error' // genérico a propósito, para probar el fallback
    }
    logInternalErrorEvent(new CustomError('boom'))
    await new Promise(r => setTimeout(r, 20))
    expect(fake.emitted[0]?.attributes['error_name']).toBe('CustomError')
  })

  test('error_code pasa cuando coincide /^[A-Z][A-Z0-9_]*$/', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    const e = Object.assign(new Error('x'), { code: 'ENOENT' })
    logInternalErrorEvent(e)
    await new Promise(r => setTimeout(r, 20))
    expect(fake.emitted[0]?.attributes['error_code']).toBe('ENOENT')
  })

  test('error_code queda undefined cuando no coincide con la regex estricta', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    const e = Object.assign(new Error('x'), { code: 'lowercase' })
    logInternalErrorEvent(e)
    await new Promise(r => setTimeout(r, 20))
    expect(fake.emitted[0]?.attributes['error_code']).toBeUndefined()
  })

  test('el guard de reentrancia previene recursión infinita', () => {
    let depth = 0
    setGetEventLoggerFn(() => ({
      emit: () => {
        depth++
        if (depth > 5) throw new Error('hard stop — guard failed')
        // simula que el propio emit lanza, lo que el código llamador
        // podría atrapar y volver a llamar al reportador de errores
        throw new Error('emit failed')
      },
    }))
    // Si el guard funciona, no hay recursión infinita; debe retornar rápido.
    expect(() => {
      logInternalErrorEvent(new Error('outer'))
    }).not.toThrow()
  })
})

describe('logAtMentionEvent (ant Ak 2642.js)', () => {
  test('mention_type + success (cast a string)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAtMentionEvent({ mentionType: 'file', success: true })
    expect(fake.emitted[0]!.body).toBe('claude_code.at_mention')
    expect(fake.emitted[0]!.attributes['mention_type']).toBe('file')
    expect(fake.emitted[0]!.attributes['success']).toBe('true')
  })

  test('success=false serializado como "false"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logAtMentionEvent({ mentionType: 'directory', success: false })
    expect(fake.emitted[0]!.attributes['success']).toBe('false')
  })
})

describe('logPermissionModeChangeEvent (ant Ts 2642.js)', () => {
  test('emite con from_mode + to_mode + trigger opcional', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPermissionModeChangeEvent({
      from: 'default',
      to: 'plan',
      trigger: 'shift+tab',
    })
    const a = fake.emitted[0]!.attributes
    expect(a['from_mode']).toBe('default')
    expect(a['to_mode']).toBe('plan')
    expect(a['trigger']).toBe('shift+tab')
  })

  test('from === to → no se emite evento (transición no-op)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPermissionModeChangeEvent({ from: 'plan', to: 'plan' })
    expect(fake.emitted.length).toBe(0)
  })

  test('trigger se omite cuando es undefined', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPermissionModeChangeEvent({ from: 'default', to: 'plan' })
    expect('trigger' in fake.emitted[0]!.attributes).toBe(false)
  })
})

describe('logMcpServerConnectionEvent (ant QN8 4054.js)', () => {
  test('campos PII gateados por includeIdentifyingFields=false (default)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logMcpServerConnectionEvent({
      serverName: 'my-server',
      transportType: 'stdio',
      serverScope: 'user',
      status: 'success',
      durationMs: 250,
      errorDetail: 'connection error',
    })
    const a = fake.emitted[0]!.attributes
    expect('server_name' in a).toBe(false)
    expect('error' in a).toBe(false)
    expect(a['transport_type']).toBe('stdio')
    expect(a['server_scope']).toBe('user')
    expect(a['duration_ms']).toBe('250')
  })

  test('campos PII fluyen cuando includeIdentifyingFields=true', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logMcpServerConnectionEvent({
      serverName: 'my-server',
      transportType: 'stdio',
      serverScope: 'user',
      status: 'failure',
      durationMs: 30,
      errorCode: 'ETIMEDOUT',
      errorDetail: 'connect timeout',
      includeIdentifyingFields: true,
    })
    const a = fake.emitted[0]!.attributes
    expect(a['server_name']).toBe('my-server')
    expect(a['error']).toBe('connect timeout')
    expect(a['error_code']).toBe('ETIMEDOUT')
  })

  test('transport_type usa "stdio" por defecto cuando no se provee', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logMcpServerConnectionEvent({
      serverName: 's',
      serverScope: 'user',
      status: 'success',
      durationMs: 0,
    })
    expect(fake.emitted[0]!.attributes['transport_type']).toBe('stdio')
  })
})

describe('logSystemPromptEvent (ant 2911.js)', () => {
  test('el flag truncated se emite como string "true" cuando es true', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logSystemPromptEvent({
      hash: 'abc123',
      content: 'You are Claude...',
      length: 12345,
      truncated: true,
    })
    const a = fake.emitted[0]!.attributes
    expect(a['system_prompt_hash']).toBe('abc123')
    expect(a['system_prompt']).toBe('You are Claude...')
    expect(a['system_prompt_length']).toBe('12345')
    expect(a['system_prompt_truncated']).toBe('true')
  })

  test('truncated=false → campo omitido (coincide con el ternario de ant)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logSystemPromptEvent({
      hash: 'x',
      content: 'y',
      length: 1,
      truncated: false,
    })
    expect('system_prompt_truncated' in fake.emitted[0]!.attributes).toBe(false)
  })
})

describe('logApiRetriesExhaustedEvent (ant 2914.js)', () => {
  test('el payload completo hace roundtrip con los totales convertidos a string', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logApiRetriesExhaustedEvent({
      model: 'claude-opus-4-7',
      error: 'rate_limit',
      statusCode: '429',
      totalAttempts: 5,
      totalRetryDurationMs: 35_000,
      speed: 'fast',
      querySource: 'user',
      effort: 'high',
    })
    const a = fake.emitted[0]!.attributes
    expect(a['model']).toBe('claude-opus-4-7')
    expect(a['total_attempts']).toBe('5')
    expect(a['total_retry_duration_ms']).toBe('35000')
    expect(a['speed']).toBe('fast')
    expect(a['query_source']).toBe('user')
    expect(a['effort']).toBe('high')
  })

  test('campos opcionales omitidos cuando son undefined', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logApiRetriesExhaustedEvent({
      model: 'claude-opus-4-7',
      error: 'network',
      totalAttempts: 3,
      totalRetryDurationMs: 1000,
      speed: 'normal',
    })
    const a = fake.emitted[0]!.attributes
    expect('status_code' in a).toBe(false)
    expect('query_source' in a).toBe(false)
    expect('effort' in a).toBe(false)
  })
})

describe('logSkillActivatedEvent (ant 2643.js)', () => {
  test('el nombre de un skill oficial fluye verbatim', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logSkillActivatedEvent({
      skillName: 'pdf-skill',
      invocationTrigger: 'autonomous',
      skillSource: 'bundled',
      skillKind: 'tool',
      isOfficial: true,
    })
    expect(fake.emitted[0]!.attributes['skill.name']).toBe('pdf-skill')
  })

  test('el nombre de un skill NO-oficial se redacta como "custom_skill"', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logSkillActivatedEvent({
      skillName: 'my-secret-skill',
      invocationTrigger: 'autonomous',
      isOfficial: false,
    })
    expect(fake.emitted[0]!.attributes['skill.name']).toBe('custom_skill')
  })

  test('plugin.name + marketplace.name sólo cuando es oficial', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logSkillActivatedEvent({
      skillName: 'x',
      invocationTrigger: 'autonomous',
      isOfficial: false,
      pluginName: 'p',
      marketplaceName: 'm',
    })
    const a = fake.emitted[0]!.attributes
    expect('plugin.name' in a).toBe(false)
    expect('marketplace.name' in a).toBe(false)
  })
})

describe('logPluginInstalledEvent (ant 2822.js)', () => {
  test('marketplace.is_official siempre presente (cast a string)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPluginInstalledEvent({
      pluginName: 'x',
      isOfficialMarketplace: true,
    })
    expect(fake.emitted[0]!.attributes['marketplace.is_official']).toBe('true')
  })

  test('la identidad del plugin se gatea con includeIdentifyingFields', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPluginInstalledEvent({
      pluginName: 'x',
      pluginVersion: '1.0',
      marketplaceName: 'm',
      isOfficialMarketplace: false,
      includeIdentifyingFields: true,
    })
    const a = fake.emitted[0]!.attributes
    expect(a['plugin.name']).toBe('x')
    expect(a['plugin.version']).toBe('1.0')
    expect(a['marketplace.name']).toBe('m')
  })

  test('PII suprimida por defecto', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logPluginInstalledEvent({
      pluginName: 'x',
      isOfficialMarketplace: false,
    })
    const a = fake.emitted[0]!.attributes
    expect('plugin.name' in a).toBe(false)
  })
})

describe('logFeedbackSurveyEvent (ant 5059.js)', () => {
  test('evento appeared con el payload completo', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logFeedbackSurveyEvent({
      eventType: 'appeared',
      appearanceId: 'a1',
      surveyType: 'nps',
      enabledViaOverride: true,
    })
    const a = fake.emitted[0]!.attributes
    expect(a['event_type']).toBe('appeared')
    expect(a['appearance_id']).toBe('a1')
    expect(a['survey_type']).toBe('nps')
    expect(a['enabled_via_override']).toBe('true')
  })

  test('enabled_via_override omitido cuando no se provee', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logFeedbackSurveyEvent({
      eventType: 'submitted',
      appearanceId: 'a1',
      surveyType: 'nps',
    })
    expect('enabled_via_override' in fake.emitted[0]!.attributes).toBe(false)
  })
})
