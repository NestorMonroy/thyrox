import { describe, expect, test } from 'bun:test'

import {
  buildWorkerCrashEventMetadata,
  computeWorkerBackoffMs,
  formatWorkerExitLogLine,
  isHealthyWorkerExit,
  reportDaemonStartupCrash,
} from '../main.js'

// Porte de `wa` (catch de `run`), `Ue.onExit` y `Ar` — `chunk-92tvramn.js`,
// referencia 2.1.283, resueltos con `bin/binary symbol`.

describe('computeWorkerBackoffMs', () => {
  // Ar(r) = At(min(1000*2**r, Er)); At(r) = round(r*(0.5+random()))
  test('sin jitter (random=0), la base es 1000*2**consecutiveCrashes', () => {
    expect(computeWorkerBackoffMs(1, () => 0)).toBe(1000)
    expect(computeWorkerBackoffMs(2, () => 0)).toBe(2000)
    expect(computeWorkerBackoffMs(3, () => 0)).toBe(4000)
  })

  test('con random=1 el jitter multiplica por 1.5', () => {
    expect(computeWorkerBackoffMs(1, () => 1)).toBe(3000)
  })

  test('la base se topa en Er=300000 antes del jitter', () => {
    // 1000*2**10 = 1024000 > 300000 -> tope 300000; con random=0, jitter=0.5
    expect(computeWorkerBackoffMs(10, () => 0)).toBe(150000)
  })

  test('retirado el tope, un consecutiveCrashes alto excede 300000 con jitter alto', () => {
    // Control de anulación (mental, no de código): sin el `Math.min` de Er,
    // computeWorkerBackoffMs(10, () => 1) daría 1024000*1.5, muy por encima
    // de lo que el tope permite. Con el tope puesto, el resultado real es
    // 300000*1.5 = 450000 como máximo posible.
    expect(computeWorkerBackoffMs(10, () => 1)).toBe(450000)
  })
})

describe('isHealthyWorkerExit', () => {
  test('codigo 0 y uptime >= 60000ms es sano', () => {
    expect(isHealthyWorkerExit(0, 60_000)).toBe(true)
    expect(isHealthyWorkerExit(0, 120_000)).toBe(true)
  })

  test('codigo 0 pero uptime corto NO es sano (cuenta como crash)', () => {
    expect(isHealthyWorkerExit(0, 59_999)).toBe(false)
  })

  test('codigo distinto de 0 nunca es sano, sin importar el uptime', () => {
    expect(isHealthyWorkerExit(1, 999_999)).toBe(false)
  })

  test('señal sin código (null) no es sana', () => {
    expect(isHealthyWorkerExit(null, 999_999)).toBe(false)
  })
})

describe('formatWorkerExitLogLine', () => {
  test('sigue el formato exacto de la referencia', () => {
    expect(
      formatWorkerExitLogLine({
        code: 1,
        signal: null,
        uptimeMs: 500,
        consecutive: 3,
        backoffMs: 4000,
      }),
    ).toBe('exited code=1 sig=null uptime=500ms consecutive=3 backoff=4000ms')
  })

  test('conserva la señal cuando el worker murió por señal', () => {
    expect(
      formatWorkerExitLogLine({
        code: null,
        signal: 'SIGKILL',
        uptimeMs: 10,
        consecutive: 1,
        backoffMs: 1000,
      }),
    ).toBe('exited code=null sig=SIGKILL uptime=10ms consecutive=1 backoff=1000ms')
  })
})

describe('buildWorkerCrashEventMetadata', () => {
  test('emite exactamente los cuatro campos de la referencia', () => {
    expect(
      buildWorkerCrashEventMetadata({
        consecutive: 2,
        exitCode: 1,
        uptimeMs: 500,
        workerKind: 'remoteControl',
      }),
    ).toEqual({
      consecutive: 2,
      exit_code: 1,
      uptime_ms: 500,
      worker_kind: 'remoteControl',
    })
  })

  test('exit_code es undefined cuando el worker murio por señal (code=null)', () => {
    expect(
      buildWorkerCrashEventMetadata({
        consecutive: 1,
        exitCode: null,
        uptimeMs: 10,
        workerKind: 'remoteControl',
      }).exit_code,
    ).toBeUndefined()
  })
})

describe('reportDaemonStartupCrash', () => {
  test('registra el error, marca daemon_start como feature_bad y conserva tengu_daemon_startup_crash', () => {
    const loggedErrors: unknown[] = []
    const loggedEvents: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    reportDaemonStartupCrash(
      new Error('boom'),
      {},
      {
        logErrorFn: e => loggedErrors.push(e),
        logEventFn: (name, metadata) => loggedEvents.push({ name, metadata }),
      },
    )
    expect(loggedErrors).toHaveLength(1)
    expect(loggedEvents).toEqual([
      { name: 'tengu_feature_bad', metadata: { feature_name: 'daemon_start', error_code: 'daemon_start_crash' } },
      { name: 'tengu_daemon_startup_crash', metadata: { error: 'boom' } },
    ])
  })

  test('el contexto (p.ej. sub="bg") se agrega al evento de arranque', () => {
    const loggedEvents: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    reportDaemonStartupCrash(
      new Error('boom'),
      { sub: 'bg' },
      {
        logErrorFn: () => {},
        logEventFn: (name, metadata) => loggedEvents.push({ name, metadata }),
      },
    )
    expect(loggedEvents[1]).toEqual({
      name: 'tengu_daemon_startup_crash',
      metadata: { error: 'boom', sub: 'bg' },
    })
  })

  test('trunca el mensaje de error a 200 caracteres, como la referencia', () => {
    const loggedEvents: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    reportDaemonStartupCrash(
      new Error('x'.repeat(500)),
      {},
      {
        logErrorFn: () => {},
        logEventFn: (name, metadata) => loggedEvents.push({ name, metadata }),
      },
    )
    expect((loggedEvents[1]!.metadata!.error as string).length).toBe(200)
  })
})
