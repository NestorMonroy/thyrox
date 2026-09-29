import { describe, expect, test } from 'bun:test'

import {
  WORKER_BUSY_STALE_MS,
  computeWorkerStatus,
  getPinnedWorkerShorts,
  isWorkerBusy,
  safeExtractServedFolderDir,
} from '../workerRegistry.js'

// Porte de `Oe`, `Qe` y `Ue.get status()`/`isBusy()` (`chunk-92tvramn.js`,
// referencia 2.1.283), resueltos con `bin/binary symbol`.

describe('safeExtractServedFolderDir', () => {
  test('extrae dir cuando el objeto lo trae como string', () => {
    expect(safeExtractServedFolderDir({ dir: '/repo' })).toBe('/repo')
  })

  test('devuelve undefined si dir no es string', () => {
    expect(safeExtractServedFolderDir({ dir: 42 })).toBeUndefined()
  })

  test('devuelve undefined si no hay clave dir', () => {
    expect(safeExtractServedFolderDir({ other: 1 })).toBeUndefined()
  })

  test('devuelve undefined para null o no-objeto', () => {
    expect(safeExtractServedFolderDir(null)).toBeUndefined()
    expect(safeExtractServedFolderDir('x')).toBeUndefined()
    expect(safeExtractServedFolderDir(42)).toBeUndefined()
  })
})

describe('getPinnedWorkerShorts', () => {
  test('con loader exitoso, devuelve el set que resuelve', async () => {
    const result = await getPinnedWorkerShorts(async () => new Set(['abc123']))
    expect(result).toEqual(new Set(['abc123']))
  })

  test('sin loader, el default no toca disco y devuelve set vacío', async () => {
    const result = await getPinnedWorkerShorts()
    expect(result).toEqual(new Set())
  })

  test('si el loader falla, registra el error con logErrorFn y degrada a set vacío', async () => {
    const errors: unknown[] = []
    const boom = new Error('pinned store unreadable')
    const result = await getPinnedWorkerShorts(
      async () => {
        throw boom
      },
      { logErrorFn: e => errors.push(e) },
    )
    expect(result).toEqual(new Set())
    expect(errors).toEqual([boom])
  })
})

describe('isWorkerBusy', () => {
  test('ocupado cuando lastBusy=true, hay child y lastBusyAt es reciente', () => {
    const now = 1_000_000
    expect(
      isWorkerBusy({ lastBusy: true, lastBusyAt: now - 1000, hasChild: true }, now),
    ).toBe(true)
  })

  test('no ocupado si lastBusy=false', () => {
    const now = 1_000_000
    expect(isWorkerBusy({ lastBusy: false, lastBusyAt: now, hasChild: true }, now)).toBe(false)
  })

  test('no ocupado sin child vivo', () => {
    const now = 1_000_000
    expect(isWorkerBusy({ lastBusy: true, lastBusyAt: now, hasChild: false }, now)).toBe(false)
  })

  test('no ocupado si lastBusyAt es más viejo que WORKER_BUSY_STALE_MS', () => {
    const now = 1_000_000
    expect(
      isWorkerBusy(
        { lastBusy: true, lastBusyAt: now - WORKER_BUSY_STALE_MS, hasChild: true },
        now,
      ),
    ).toBe(false)
    expect(
      isWorkerBusy(
        { lastBusy: true, lastBusyAt: now - (WORKER_BUSY_STALE_MS - 1), hasChild: true },
        now,
      ),
    ).toBe(true)
  })
})

describe('computeWorkerStatus', () => {
  test('null cuando no hay pid (worker no corriendo)', () => {
    expect(
      computeWorkerStatus({ pid: undefined, startedAt: 0, config: {}, servedSessionsCount: 0 }),
    ).toBeNull()
  })

  test('sin servedFolder cuando servedSessionsCount es 0', () => {
    expect(
      computeWorkerStatus({
        pid: 123,
        startedAt: 456,
        config: { dir: '/repo' },
        servedSessionsCount: 0,
      }),
    ).toEqual({ pid: 123, startedAt: 456 })
  })

  test('sin servedFolder cuando la config no trae dir', () => {
    expect(
      computeWorkerStatus({
        pid: 123,
        startedAt: 456,
        config: {},
        servedSessionsCount: 3,
      }),
    ).toEqual({ pid: 123, startedAt: 456 })
  })

  test('con servedFolder cuando hay sesiones servidas Y dir válido', () => {
    expect(
      computeWorkerStatus({
        pid: 123,
        startedAt: 456,
        config: { dir: '/repo' },
        servedSessionsCount: 3,
      }),
    ).toEqual({ pid: 123, startedAt: 456, servedFolder: { dir: '/repo', sessions: 3 } })
  })
})
