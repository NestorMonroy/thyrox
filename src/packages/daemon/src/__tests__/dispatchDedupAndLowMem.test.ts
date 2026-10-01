import { describe, expect, test } from 'bun:test'

import {
  DUPLICATE_DISPATCH_MAX_ATTEMPTS,
  DUPLICATE_DISPATCH_SIGKILL_ESCALATION_ATTEMPT,
  decideDuplicateDispatchOutcome,
  retireNonPinnedSettledWorkers,
  retirePinnedSettledWorkers,
} from '../bgDaemon.js'

// Porte de la porción de dedup-dispatch y de la eviction por baja memoria
// de `Dt` (`chunk-92tvramn.js`, referencia 2.1.283), resuelta con
// `bin/binary symbol`.

function makeWorker(canRetire: boolean) {
  const calls: number[] = []
  return {
    retireIfSettled: () => {
      calls.push(calls.length)
      return canRetire
    },
    calls,
  }
}

describe('retireNonPinnedSettledWorkers', () => {
  test('retira sólo los settled que NO están pinned', () => {
    const workers = new Map([
      ['a', makeWorker(true)],
      ['b', makeWorker(true)],
    ])
    const retired = retireNonPinnedSettledWorkers(workers, new Set(['b']))
    expect(retired).toEqual(['a'])
    expect(workers.get('b')!.calls).toEqual([]) // pinned: ni se llama
  })

  test('no retira uno cuyo retireIfSettled devuelve false', () => {
    const workers = new Map([['a', makeWorker(false)]])
    expect(retireNonPinnedSettledWorkers(workers, new Set())).toEqual([])
  })

  test('un worker sin retireIfSettled se salta sin lanzar', () => {
    const workers = new Map([['a', {}]])
    expect(retireNonPinnedSettledWorkers(workers, new Set())).toEqual([])
  })
})

describe('retirePinnedSettledWorkers', () => {
  test('retira sólo los settled que SÍ están pinned', () => {
    const workers = new Map([
      ['a', makeWorker(true)],
      ['b', makeWorker(true)],
    ])
    const retired = retirePinnedSettledWorkers(workers, new Set(['b']))
    expect(retired).toEqual(['b'])
    expect(workers.get('a')!.calls).toEqual([]) // no pinned: ni se llama
  })
})

describe('decideDuplicateDispatchOutcome', () => {
  test('settling y dentro del presupuesto: retry, sin escalar', () => {
    expect(decideDuplicateDispatchOutcome({ isSettling: true, attempt: 0 })).toEqual({
      action: 'retry',
      escalateToSigkill: false,
    })
  })

  test('settling en el intento de escalación exacto: retry Y escala a SIGKILL', () => {
    expect(
      decideDuplicateDispatchOutcome({
        isSettling: true,
        attempt: DUPLICATE_DISPATCH_SIGKILL_ESCALATION_ATTEMPT,
      }),
    ).toEqual({ action: 'retry', escalateToSigkill: true })
  })

  test('settling y presupuesto agotado: dropped', () => {
    expect(
      decideDuplicateDispatchOutcome({
        isSettling: true,
        attempt: DUPLICATE_DISPATCH_MAX_ATTEMPTS,
      }),
    ).toEqual({ action: 'dropped', escalateToSigkill: false })
  })

  test('no settling (handle genuinamente vivo): dup-live sin importar el intento', () => {
    expect(decideDuplicateDispatchOutcome({ isSettling: false, attempt: 0 })).toEqual({
      action: 'dup-live',
      escalateToSigkill: false,
    })
  })
})
