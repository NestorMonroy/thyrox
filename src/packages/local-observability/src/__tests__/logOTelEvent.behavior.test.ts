/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/logOTelEvent.behavior.test.ts`
 * (200 líneas fuente, 100 % portado).
 *
 * Mismo ajuste que `logAuthEvent.behavior.test.ts`: la fuente inyecta el
 * logger vía `getEventLogger`/`setEventLogger` de
 * `@claude-code-how-works/app-host/bootstrap/state.js`, subpath no
 * exportado por `@thyrox/app-host`. Se usa el punto de inyección
 * `setGetEventLoggerFn` de `internal/pendingCrossPackageDeps.ts`.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  __resetOTelEventStateForTest,
  logOTelEvent,
  redactIfDisabled,
} from '../telemetry/events.ts'
import {
  getEventLogger,
  setGetEventLoggerFn,
  type EventLoggerLike,
} from '../internal/pendingCrossPackageDeps.ts'

/**
 * Fija el contrato de emisión de eventos OTel V7 §8.12 — puerto de ant
 * v2.1.136 k5() (2642.js). Antes del fix esto era un stub vacío; ~10
 * sitios de llamada en ccb (tool_decision, tool_result, user_prompt,
 * api_*, hook_*, mcp_*) escribían al vacío, así que los clientes con OTEL
 * cableado no recibían ningún evento.
 *
 * Invariantes bajo prueba:
 *   1. Sin logger de eventos instalado → se descarta en silencio (sin
 *      lanzar) y loguea un warning de debug de una sola vez.
 *   2. Con logger instalado → emite el body `claude_code.${eventName}`
 *      con el conjunto completo de atributos: getTelemetryAttributes() ∪
 *      event.name ∪ event.timestamp ∪ event.sequence ∪ (prompt.id?) ∪
 *      metadata del llamador.
 *   3. El número de secuencia es monótono.
 *   4. Los valores de metadata undefined se descartan (NO se serializan
 *      como "undefined").
 *   5. CLAUDE_CODE_WORKSPACE_HOST_PATHS se parte por '|' y se envía como
 *      arreglo de strings en workspace.host_paths.
 *   6. redactIfDisabled devuelve "<REDACTED>" salvo que
 *      OTEL_LOG_USER_PROMPTS sea truthy. Fija la cadena del gate.
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

describe('logOTelEvent — se descarta sin logger', () => {
  test('sin logger instalado → sin lanzar, sin emitir', async () => {
    setGetEventLoggerFn(() => null)
    await expect(logOTelEvent('test_event', { foo: 'bar' })).resolves
      .toBeUndefined()
  })

  test('sin logger → llamadas repetidas NO saturan (warning de una sola vez)', async () => {
    setGetEventLoggerFn(() => null)
    // Sólo verifica que no lance a través de muchas llamadas.
    for (let i = 0; i < 100; i++) {
      await logOTelEvent('test_event', { i: String(i) })
    }
  })
})

describe('logOTelEvent — emite vía el logger instalado', () => {
  test('body es `claude_code.${eventName}` (coincide con ant k5)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logOTelEvent('login', { auth_method: 'oauth' })
    expect(fake.emitted.length).toBe(1)
    expect(fake.emitted[0]!.body).toBe('claude_code.login')
  })

  test('los atributos incluyen event.name + event.timestamp + event.sequence', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logOTelEvent('auth', {
      action: 'login',
      success: 'true',
      auth_method: 'oauth',
    })
    const attrs = fake.emitted[0]!.attributes
    expect(attrs['event.name']).toBe('auth')
    expect(typeof attrs['event.timestamp']).toBe('string')
    expect(attrs['event.sequence']).toBe(0)
    expect(attrs['action']).toBe('login')
    expect(attrs['success']).toBe('true')
    expect(attrs['auth_method']).toBe('oauth')
  })

  test('event.sequence es monótono entre llamadas', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logOTelEvent('a')
    await logOTelEvent('b')
    await logOTelEvent('c')
    expect(fake.emitted[0]!.attributes['event.sequence']).toBe(0)
    expect(fake.emitted[1]!.attributes['event.sequence']).toBe(1)
    expect(fake.emitted[2]!.attributes['event.sequence']).toBe(2)
  })

  test('los valores undefined de metadata se despojan (NO se serializan como undefined)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logOTelEvent('auth', {
      action: 'login',
      // estos NO deben aparecer en attributes
      status_code: undefined,
      error_category: undefined,
    })
    const attrs = fake.emitted[0]!.attributes
    expect(attrs['action']).toBe('login')
    expect('status_code' in attrs).toBe(false)
    expect('error_category' in attrs).toBe(false)
  })

  test('CLAUDE_CODE_WORKSPACE_HOST_PATHS se parte por "|" en un arreglo de strings', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    const orig = process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS
    process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS = '/a|/b|/c'
    try {
      await logOTelEvent('test_event')
      const attrs = fake.emitted[0]!.attributes
      expect(attrs['workspace.host_paths']).toEqual(['/a', '/b', '/c'])
    } finally {
      if (orig === undefined) {
        delete process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS
      } else {
        process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS = orig
      }
    }
  })

  test('observedTimestamp === timestamp (un solo instante)', async () => {
    const fake = makeFakeLogger()
    setGetEventLoggerFn(() => fake)
    await logOTelEvent('test_event')
    expect(fake.emitted[0]!.timestamp).toBe(fake.emitted[0]!.observedTimestamp)
  })
})

describe('redactIfDisabled', () => {
  test('default → "<REDACTED>" (OTEL_LOG_USER_PROMPTS sin fijar)', () => {
    const orig = process.env.OTEL_LOG_USER_PROMPTS
    delete process.env.OTEL_LOG_USER_PROMPTS
    try {
      expect(redactIfDisabled('hello world')).toBe('<REDACTED>')
    } finally {
      if (orig !== undefined) process.env.OTEL_LOG_USER_PROMPTS = orig
    }
  })

  test('OTEL_LOG_USER_PROMPTS=1 → devuelve el contenido sin cambios', () => {
    const orig = process.env.OTEL_LOG_USER_PROMPTS
    process.env.OTEL_LOG_USER_PROMPTS = '1'
    try {
      expect(redactIfDisabled('hello world')).toBe('hello world')
    } finally {
      if (orig === undefined) {
        delete process.env.OTEL_LOG_USER_PROMPTS
      } else {
        process.env.OTEL_LOG_USER_PROMPTS = orig
      }
    }
  })

  test('OTEL_LOG_USER_PROMPTS=false → "<REDACTED>" (semántica truthy)', () => {
    const orig = process.env.OTEL_LOG_USER_PROMPTS
    process.env.OTEL_LOG_USER_PROMPTS = 'false'
    try {
      expect(redactIfDisabled('hello world')).toBe('<REDACTED>')
    } finally {
      if (orig === undefined) {
        delete process.env.OTEL_LOG_USER_PROMPTS
      } else {
        process.env.OTEL_LOG_USER_PROMPTS = orig
      }
    }
  })
})
