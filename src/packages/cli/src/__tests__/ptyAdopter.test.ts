/**
 * `ptyAdopter.ts` reconnect backoff — chunk-ygx717jg.js `ae`'s table is
 * `Ie=[50,100,250,500,1000,2000]`, NOT the rv/control client's `Me`
 * (`=[100,250,500,1000,2000]`, one entry shorter and starting 50ms later).
 * The two tables share four of six/five values, which is exactly what let
 * the wrong one hide here undetected until measured against the reference.
 *
 * No timing-based reconnect test here: under this runtime (Bun 1.3.11),
 * `net.connect()` against a missing/non-socket Unix path throws
 * SYNCHRONOUSLY instead of emitting `'error'` (measured — differs from
 * Node, where the same setup yields an async ECONNREFUSED/ENOENT event).
 * That makes every reconnect-inducing fixture crash the test process
 * instead of exercising the retry loop, orthogonal to the backoff table
 * itself; a value-equality check against the reference array is the
 * direct, non-flaky way to pin the exact defect (a wrong entry, not
 * "no backoff at all").
 */

import { describe, expect, test } from 'bun:test'

import { RECONNECT_BACKOFF_MS } from '../bg/ptyAdopter.js'

describe('ptyAdopter — reconnect backoff table', () => {
  test('matches chunk-ygx717jg.js Ie verbatim, not Me', () => {
    expect(RECONNECT_BACKOFF_MS).toEqual([50, 100, 250, 500, 1000, 2000])
  })
})
