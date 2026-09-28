/**
 * La identidad de un proceso para el buzón: `b`, `Zne`, `n6`, `Hx`, `TFe`,
 * `mfn`, `Nh`, `nc` y `Pv` (`chunk-x5vr5vwm.js`, `chunk-jv3bb6yp.js`) y
 * `_Lo`/`HP` (`chunk-j2p7jgmc.js`, `chunk-t0sp7zte.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  MISS_TTL_MS,
  HIT_TTL_MS,
  StartTokenCache,
  isProcessGone,
  isValidPid,
  parseProcStatStartTime,
  pidDomainFor,
  procStartFields,
  readProcessStartToken,
  recordedStartToken,
  sameStartToken,
} from '../src/uds/processIdentity.ts'

// Un /proc/<pid>/stat real tiene 52 campos; el comando entre paréntesis puede llevar espacios y ')'.
const STAT = `123 (a (b) c) S 1 123 123 0 -1 4194560 100 0 0 0 1 2 0 0 20 0 1 0 987654 1000 200`

describe('parseProcStatStartTime (Zne) y readProcessStartToken (b)', () => {
  test('el inicio es el campo 22, contado tras el último paréntesis del comando', () => {
    expect(parseProcStatStartTime(STAT)).toBe('987654')
  })

  test('lee /proc/<pid>/stat; si no se puede leer, no hay token', async () => {
    expect(await readProcessStartToken(123, async path => (path === '/proc/123/stat' ? STAT : ''))).toBe('987654')
    expect(await readProcessStartToken(123, async () => { throw new Error('ENOENT') })).toBeUndefined()
  })

  test('el proceso propio tiene token en este sistema', async () => {
    expect(await readProcessStartToken(process.pid)).toMatch(/^\d+$/)
  })
})

describe('procStartFields (n6), recordedStartToken (Hx) y sameStartToken (TFe)', () => {
  test('fuera de Windows el token viaja en procStart', () => {
    expect(procStartFields('42')).toEqual({ procStart: '42', procStartFt: undefined })
    expect(recordedStartToken({ procStart: '42', procStartFt: 'x' })).toBe('42')
  })

  test('dos tokens coinciden sólo si son iguales', () => {
    expect(sameStartToken('42', '42')).toBe(true)
    expect(sameStartToken('42', '43')).toBe(false)
  })
})

describe('isValidPid (mfn) e isProcessGone (Nh)', () => {
  test('un pid válido es entero, mayor que 1 y cabe en 31 bits', () => {
    expect(isValidPid(2)).toBe(true)
    expect(isValidPid(1)).toBe(false)
    expect(isValidPid(2.5)).toBe(false)
    expect(isValidPid(2 ** 31)).toBe(false)
  })

  test('sólo ESRCH prueba que el proceso ya no existe', () => {
    const error = (code: string) => () => { throw Object.assign(new Error(code), { code }) }
    expect(isProcessGone(123, error('ESRCH'))).toBe(true)
    expect(isProcessGone(123, error('EPERM'))).toBe(false)
    expect(isProcessGone(123, () => true)).toBe(false)
    expect(isProcessGone(1, error('ESRCH'))).toBe(false)
  })
})

describe('pidDomainFor (_Lo)', () => {
  const readers = { readMachineId: async () => 'abc\n', readPidNamespace: async () => 'pid:[4026531836]', hostname: () => 'Host' }

  test('en Linux es la máquina y el espacio de pids', async () => {
    expect(await pidDomainFor('linux', readers)).toBe('linux:abc:pid:[4026531836]')
    expect(await pidDomainFor('wsl', readers)).toBe('linux:abc:pid:[4026531836]')
  })

  test('lo que no se puede leer queda vacío; otras plataformas usan su propia forma', async () => {
    const failing = { readMachineId: async () => { throw new Error('x') }, readPidNamespace: async () => { throw new Error('x') }, hostname: () => 'Host' }
    expect(await pidDomainFor('linux', failing)).toBe('linux::')
    expect(await pidDomainFor('macos', readers)).toBe('linux')
    expect(await pidDomainFor('windows', readers)).toBe('linux:host')
  })
})

describe('StartTokenCache (nc)', () => {
  test('un acierto dura 60 s y un fallo 5 s; skipCache siempre vuelve a leer', async () => {
    expect(HIT_TTL_MS).toBe(60000)
    expect(MISS_TTL_MS).toBe(5000)
    let now = 0
    const reads: number[] = []
    const answers = new Map<number, string | undefined>([[10, 'start-10'], [11, undefined]])
    const cache = new StartTokenCache(async pid => { reads.push(pid); return answers.get(pid) }, () => now)
    expect(await cache.get(10)).toBe('start-10')
    now = 59999
    expect(await cache.get(10)).toBe('start-10')
    now = 60000
    await cache.get(10)
    expect(reads).toEqual([10, 10])
    await cache.get(11)
    now += 4999
    await cache.get(11)
    now += 1
    await cache.get(11)
    await cache.get(11, { skipCache: true })
    expect(reads).toEqual([10, 10, 11, 11, 11])
  })
})
