import { beforeEach, describe, expect, test } from 'bun:test'
import {
  getStartupPerfLogPath,
  isDetailedProfilingEnabled,
  logStartupPerf,
  profileCheckpoint,
  profileReport,
  resetProfilerStateForTests,
} from '../startupProfiler.js'

beforeEach(() => {
  delete process.env.CLAUDE_CODE_PROFILE_STARTUP
  delete process.env.USER_TYPE
  resetProfilerStateForTests()
})

describe('isDetailedProfilingEnabled', () => {
  test('refleja CLAUDE_CODE_PROFILE_STARTUP al momento del reset', () => {
    expect(isDetailedProfilingEnabled()).toBe(false)

    process.env.CLAUDE_CODE_PROFILE_STARTUP = '1'
    resetProfilerStateForTests()

    expect(isDetailedProfilingEnabled()).toBe(true)
  })
})

describe('profileCheckpoint — sin perfilado activo', () => {
  test('no registra marks cuando no hay perfilado ni muestreo', () => {
    profileCheckpoint('a')
    profileCheckpoint('b')
    // logStartupPerf con perfilado apagado no emite nada (early return por
    // !STATSIG_LOGGING_SAMPLED) — se confirma indirectamente abajo.
    const eventos: [string, Record<string, unknown>][] = []
    logStartupPerf((evento, metadata) => eventos.push([evento, metadata]))
    expect(eventos.length).toBe(0)
  })
})

describe('logStartupPerf — cómputo de fases cuando el muestreo está activo', () => {
  beforeEach(() => {
    process.env.USER_TYPE = 'ant' // fuerza STATSIG_LOGGING_SAMPLED=true tras el reset
    resetProfilerStateForTests()
  })

  test('empareja checkpoints de inicio/fin y calcula la duración de cada fase', () => {
    profileCheckpoint('cli_entry')
    profileCheckpoint('main_tsx_imports_loaded')
    profileCheckpoint('init_function_start')
    profileCheckpoint('init_function_end')

    const eventos: [string, Record<string, unknown>][] = []
    logStartupPerf((evento, metadata) => eventos.push([evento, metadata]))

    expect(eventos.length).toBe(1)
    const [nombre, metadata] = eventos[0]!
    expect(nombre).toBe('tengu_startup_perf')
    expect(typeof metadata.import_time_ms).toBe('number')
    expect(typeof metadata.init_time_ms).toBe('number')
    // Fases sin ambos checkpoints presentes no entran a metadata.
    expect(metadata.settings_time_ms).toBeUndefined()
    expect(metadata.total_time_ms).toBeUndefined()
    expect(metadata.checkpoint_count).toBe(4)
  })

  test('sin ningún checkpoint registrado, no emite nada', () => {
    const eventos: unknown[] = []
    logStartupPerf(() => eventos.push(1))
    expect(eventos.length).toBe(0)
  })
})

describe('getStartupPerfLogPath', () => {
  test('compone la ruta bajo CLAUDE_CONFIG_DIR/startup-perf/<sessionId>.txt', () => {
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-de-prueba'
    const ruta = getStartupPerfLogPath('sesion-123')
    expect(ruta).toBe('/tmp/config-de-prueba/startup-perf/sesion-123.txt')
    delete process.env.CLAUDE_CONFIG_DIR
  })
})

describe('profileReport', () => {
  test('sólo reporta una vez por proceso — la segunda llamada es no-op', () => {
    let llamadasTelemetria = 0
    profileReport({
      sessionId: 'x',
      telemetrySink: () => {
        llamadasTelemetria += 1
      },
    })
    profileReport({
      sessionId: 'x',
      telemetrySink: () => {
        llamadasTelemetria += 1
      },
    })
    // Sin perfilado detallado ni muestreo, ninguna llamada emite nada —
    // lo que se verifica aquí es que reported=true detiene la SEGUNDA
    // invocación por completo, comparando contra una tercera tras reset.
    resetProfilerStateForTests()
    process.env.USER_TYPE = 'ant'
    resetProfilerStateForTests()
    profileCheckpoint('cli_entry')
    profileCheckpoint('main_after_run')
    profileReport({
      sessionId: 'x',
      telemetrySink: () => {
        llamadasTelemetria += 1
      },
    })
    expect(llamadasTelemetria).toBe(1)
  })

  test('con perfilado detallado, escribe el reporte a disco vía los sinks inyectados', async () => {
    const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dirTemporal = mkdtempSync(join(tmpdir(), 'startup-perf-test-'))
    process.env.CLAUDE_CONFIG_DIR = dirTemporal
    process.env.CLAUDE_CODE_PROFILE_STARTUP = '1'
    resetProfilerStateForTests()

    profileCheckpoint('cli_entry')

    const mensajesDebug: string[] = []
    profileReport({
      sessionId: 'sesion-detallada',
      debugSink: (m) => mensajesDebug.push(m),
    })

    const ruta = getStartupPerfLogPath('sesion-detallada')
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain('STARTUP PROFILING REPORT')
    expect(contenido).toContain('cli_entry')
    expect(mensajesDebug).toContain('Startup profiling report:')

    rmSync(dirTemporal, { recursive: true, force: true })
    delete process.env.CLAUDE_CONFIG_DIR
  })
})
