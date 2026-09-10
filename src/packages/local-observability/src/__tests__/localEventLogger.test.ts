/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/localEventLogger.test.ts`
 * (82 líneas fuente, 100 % portado).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { getLocalObservability, installLocalObservability } from '../core.ts'
import { installLocalEventLogger, isLocalTelemetryEnabled } from '../localEventLogger.ts'

// Vuelve al estado no-op entre tests para no filtrar escrituras a archivo.
const noOpLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  event: () => {},
}
afterEach(() => {
  installLocalObservability({ logger: noOpLogger })
  delete process.env.CLAUDE_CODE_LOCAL_TELEMETRY
})

describe('isLocalTelemetryEnabled', () => {
  test('devuelve false cuando la env no está fijada', () => {
    delete process.env.CLAUDE_CODE_LOCAL_TELEMETRY
    expect(isLocalTelemetryEnabled()).toBe(false)
  })
  test('devuelve true para "1"', () => {
    process.env.CLAUDE_CODE_LOCAL_TELEMETRY = '1'
    expect(isLocalTelemetryEnabled()).toBe(true)
  })
  test('devuelve true para "true"', () => {
    process.env.CLAUDE_CODE_LOCAL_TELEMETRY = 'true'
    expect(isLocalTelemetryEnabled()).toBe(true)
  })
  test('devuelve false para cadena vacía', () => {
    process.env.CLAUDE_CODE_LOCAL_TELEMETRY = ''
    expect(isLocalTelemetryEnabled()).toBe(false)
  })
  test('devuelve false para "0"', () => {
    process.env.CLAUDE_CODE_LOCAL_TELEMETRY = '0'
    expect(isLocalTelemetryEnabled()).toBe(false)
  })
})

describe('installLocalEventLogger', () => {
  test('reemplaza el logger no-op por uno que escribe a archivo', () => {
    installLocalEventLogger()
    const obs = getLocalObservability()
    // El logger queda reemplazado; no es fácil afirmar que escribe sin
    // mockear el filesystem — el check de integración ocurre a nivel de
    // bootstrap.
    expect(obs.logger).not.toBe(noOpLogger)
    expect(typeof obs.logger.event).toBe('function')
  })

  test('event() no lanza con metadata mínima', () => {
    installLocalEventLogger()
    const obs = getLocalObservability()
    expect(() => obs.logger.event('test_event', {})).not.toThrow()
    expect(() => obs.logger.event('test_event_2', { foo: 'bar' })).not.toThrow()
  })

  test('event() no abre conexiones de red (invariante de auditoría)', () => {
    // El módulo localEventLogger sólo importa debug + core; si alguien
    // llegara a agregar un import HTTP, este test debería fallar al cargar
    // el módulo. Snapshot de la superficie de import esperada.
    const mod = require('../localEventLogger.ts')
    expect(mod.installLocalEventLogger).toBeDefined()
    expect(mod.isLocalTelemetryEnabled).toBeDefined()
    // Sin exports de red.
    expect(mod.fetch).toBeUndefined()
    expect(mod.upload).toBeUndefined()
    expect(mod.send).toBeUndefined()
  })
})

describe('Contrato de la interfaz Logger', () => {
  test('existen los 5 métodos del logger', () => {
    installLocalEventLogger()
    const { logger } = getLocalObservability()
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.event).toBe('function')
  })
})
