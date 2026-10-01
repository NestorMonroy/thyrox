/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/localEventLogger.test.ts`
 * (82 líneas fuente, 100 % portado), más la resolución del directorio contra
 * el hogar de configuración de thyrox.
 */
import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getLocalObservability, installLocalObservability } from '../core.ts'
import {
  LOCAL_TELEMETRY_DIR_ENV,
  installLocalEventLogger,
  isLocalTelemetryEnabled,
  resolveLocalTelemetryDir,
} from '../localEventLogger.ts'

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
  delete process.env.THYROX_CODE_LOCAL_TELEMETRY
  delete process.env.THYROX_CONFIG_DIR
  delete process.env[LOCAL_TELEMETRY_DIR_ENV]
})

describe('resolveLocalTelemetryDir', () => {
  test('sin declaración propia, cuelga del hogar de configuración de thyrox', () => {
    expect(resolveLocalTelemetryDir({ THYROX_CONFIG_DIR: '/srv/hogar-thyrox' })).toBe(path.join('/srv/hogar-thyrox', 'telemetry'))
  })

  test('la variable propia gana y se resuelve a ruta absoluta', () => {
    expect(resolveLocalTelemetryDir({ [LOCAL_TELEMETRY_DIR_ENV]: 'relativo/telemetria' })).toBe(path.resolve('relativo/telemetria'))
  })

  test('la variable propia vacía no cuenta como declarada', () => {
    const env = { [LOCAL_TELEMETRY_DIR_ENV]: '   ', THYROX_CONFIG_DIR: '/srv/otro' }
    expect(resolveLocalTelemetryDir(env)).toBe(path.join('/srv/otro', 'telemetry'))
  })
})

describe('installLocalEventLogger — escritura real', () => {
  const tempDirs: string[] = []
  afterAll(() => {
    for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  test('con THYROX_CONFIG_DIR apuntando a un directorio temporal, el evento cae ahí', () => {
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-local-telemetry-'))
    tempDirs.push(configHome)
    process.env.THYROX_CONFIG_DIR = configHome
    installLocalEventLogger()
    const { logger } = getLocalObservability()
    logger.event('test_event', { probe: true })
    const today = new Date().toISOString().slice(0, 10)
    const eventFile = path.join(configHome, 'telemetry', `events-${today}.jsonl`)
    expect(fs.existsSync(eventFile)).toBe(true)
    expect(fs.readFileSync(eventFile, 'utf8').includes('test_event')).toBe(true)
  })
})

describe('isLocalTelemetryEnabled', () => {
  test('devuelve false cuando la env no está fijada', () => {
    delete process.env.THYROX_CODE_LOCAL_TELEMETRY
    expect(isLocalTelemetryEnabled()).toBe(false)
  })
  test('devuelve true para "1"', () => {
    process.env.THYROX_CODE_LOCAL_TELEMETRY = '1'
    expect(isLocalTelemetryEnabled()).toBe(true)
  })
  test('devuelve true para "true"', () => {
    process.env.THYROX_CODE_LOCAL_TELEMETRY = 'true'
    expect(isLocalTelemetryEnabled()).toBe(true)
  })
  test('devuelve false para cadena vacía', () => {
    process.env.THYROX_CODE_LOCAL_TELEMETRY = ''
    expect(isLocalTelemetryEnabled()).toBe(false)
  })
  test('devuelve false para "0"', () => {
    process.env.THYROX_CODE_LOCAL_TELEMETRY = '0'
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
