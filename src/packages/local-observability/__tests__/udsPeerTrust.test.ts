/**
 * Si un mensaje lo envió esta misma sesión (un proceso hijo suyo): `ye`,
 * `Le`, `Ke`, `he`, `Ne` (`chunk-yg53q7yp.js`) y `hfn` (`chunk-x5vr5vwm.js`)
 * de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  ancestryIncludes,
  createVerdictReaders,
  isSelfSent,
  peerVerdict,
  VERDICT_CACHE_LIMIT,
  VerdictCache,
  walkAncestors,
  type VerdictReaders,
} from '../src/uds/peerTrust.ts'

describe('ancestryIncludes (Le)', () => {
  test('el pid propio en la cadena; siendo init nunca', () => {
    expect(ancestryIncludes([10, 20], 20)).toBe(true)
    expect(ancestryIncludes([10, 20], 30)).toBe(false)
    expect(ancestryIncludes([1, 20], 1)).toBe(false)
    expect(ancestryIncludes('20', 20)).toBe(false)
  })
})

describe('walkAncestors (hfn)', () => {
  test('arma el guion de ps con la profundidad pedida y un plazo de 3 s', async () => {
    let seen: { command: string; args: string[]; timeout: number } | undefined
    await walkAncestors(42, 7, async (command, args, options) => ((seen = { command, args, timeout: options.timeout }), { code: 0, stdout: 'END\n' }))
    expect(seen!.command).toBe('sh')
    expect(seen!.args[0]).toBe('-c')
    expect(seen!.args[1]).toStartWith('pid=42; for i in $(seq 1 7);')
    expect(seen!.timeout).toBe(3000)
  })

  test('END: completa; FAIL o código distinto de 0: fallo; ni una ni otra: truncada', async () => {
    const run = (stdout: string, code = 0) => async () => ({ code, stdout })
    expect(await walkAncestors(9, 10, run('30\n20\nEND\n'))).toEqual({ ancestors: [30, 20], readFailed: false, truncated: false })
    expect(await walkAncestors(9, 10, run('30\nFAIL\n'))).toEqual({ ancestors: [30], readFailed: true, truncated: false })
    expect(await walkAncestors(9, 10, run('30\n', 1))).toEqual({ ancestors: [30], readFailed: true, truncated: false })
    expect(await walkAncestors(9, 2, run('30\n20\n'))).toEqual({ ancestors: [30, 20], readFailed: false, truncated: true })
  })

  test('contra el ps real, la cadena del proceso propio empieza por su padre', async () => {
    const walk = await walkAncestors(process.pid)
    expect(walk.ancestors[0]).toBe(process.ppid)
    expect(walk.readFailed).toBe(false)
  })
})

describe('VerdictCache (he)', () => {
  test('recuerda hasta el tope y expulsa el menos usado', () => {
    const cache = new VerdictCache(2)
    cache.remember('a', true)
    cache.remember('b', false)
    expect(cache.lookup('a')).toBe(true)
    cache.remember('c', true)
    expect(cache.lookup('b')).toBeUndefined()
    expect(cache.lookup('a')).toBe(true)
    expect(cache.lookup('c')).toBe(true)
  })

  test('el tope por omisión es el de la referencia', () => {
    expect(VERDICT_CACHE_LIMIT).toBe(500)
  })
})

describe('peerVerdict (Ke)', () => {
  const readers = (overrides: Partial<VerdictReaders> = {}): VerdictReaders => ({
    readStartToken: async () => 'start',
    readAncestors: async () => [4242, 1],
    ...overrides,
  })

  test('un pid inválido o sin inicio legible: no-evidence', async () => {
    const cache = new VerdictCache()
    expect(await peerVerdict(undefined, readers(), cache, 4242)).toBe('no-evidence')
    expect(await peerVerdict(0, readers(), cache, 4242)).toBe('no-evidence')
    expect(await peerVerdict(1.5, readers(), cache, 4242)).toBe('no-evidence')
    expect(await peerVerdict(9, readers({ readStartToken: async () => undefined }), cache, 4242)).toBe('no-evidence')
    expect(await peerVerdict(9, readers({ readStartToken: async () => { throw new Error('x') } }), cache, 4242)).toBe('no-evidence')
  })

  test('self si esta sesión está entre sus ancestros, not-self si no; se recuerda por pid e inicio', async () => {
    const cache = new VerdictCache()
    let walks = 0
    const counting = readers({ readAncestors: async () => (walks++, [4242, 1]) })
    expect(await peerVerdict(9, counting, cache, 4242)).toBe('self')
    expect(await peerVerdict(9, counting, cache, 4242)).toBe('self')
    expect(walks).toBe(1)
    expect(await peerVerdict(10, readers({ readAncestors: async () => [77, 1] }), cache, 4242)).toBe('not-self')
  })

  test('si el inicio cambió durante la lectura de ancestros, o la lectura falla: no-evidence y no se recuerda', async () => {
    const cache = new VerdictCache()
    let reads = 0
    const racing = readers({ readStartToken: async () => (reads++ === 0 ? 'a' : 'b') })
    expect(await peerVerdict(9, racing, cache, 4242)).toBe('no-evidence')
    expect(cache.lookup('9:a')).toBeUndefined()
    expect(await peerVerdict(9, readers({ readAncestors: async () => { throw new Error('walk') } }), cache, 4242)).toBe('no-evidence')
  })

  test('siendo init nunca es self', async () => {
    expect(await peerVerdict(9, readers({ readAncestors: async () => [1] }), new VerdictCache(), 1)).toBe('not-self')
  })
})

describe('isSelfSent (ye)', () => {
  test('con ancestría verificada decide la ancestría, salvo siendo init', async () => {
    expect(await isSelfSent({ selfSentAncestry: [10, 4242], selfPid: 4242, needsVerdict: false, childTokenPresented: false, platform: 'linux' })).toBe(true)
    expect(await isSelfSent({ selfSentAncestry: [10], selfPid: 4242, needsVerdict: true, childTokenPresented: true, platform: 'linux' })).toBe(false)
  })

  test('sin veredicto pedido no es propio', async () => {
    expect(await isSelfSent({ selfPid: 4242, needsVerdict: false, childTokenPresented: true, platform: 'windows' })).toBe(false)
  })

  test('siendo init o en Windows decide el token de hijo', async () => {
    expect(await isSelfSent({ selfPid: 1, needsVerdict: true, childTokenPresented: true, platform: 'linux' })).toBe(true)
    expect(await isSelfSent({ selfPid: 4242, needsVerdict: true, childTokenPresented: false, platform: 'windows' })).toBe(false)
  })

  test('en Linux sin ancestría verificada no es propio; en macOS decide el veredicto', async () => {
    expect(await isSelfSent({ selfPid: 4242, needsVerdict: true, childTokenPresented: true, platform: 'linux' })).toBe(false)
    const verdict = (value: 'self' | 'not-self' | 'no-evidence') => async () => value
    const macos = { selfPid: 4242, needsVerdict: true, platform: 'macos', verifiedPeerPid: 9 } as const
    expect(await isSelfSent({ ...macos, childTokenPresented: false, verdictOf: verdict('self') })).toBe(true)
    expect(await isSelfSent({ ...macos, childTokenPresented: true, verdictOf: verdict('no-evidence') })).toBe(true)
    expect(await isSelfSent({ ...macos, childTokenPresented: false, verdictOf: verdict('no-evidence') })).toBe(false)
    expect(await isSelfSent({ ...macos, childTokenPresented: true, verdictOf: verdict('not-self') })).toBe(false)
  })
})

describe('createVerdictReaders (Ne)', () => {
  const result = (ancestors: number[], readFailed = false, truncated = false) => ({ ancestors, readFailed, truncated })

  test('un recorrido que llega a esta sesión se devuelve sin otro', async () => {
    const depths: Array<number | undefined> = []
    const readers = createVerdictReaders(async (_, depth) => (depths.push(depth), result([50, 4242])), 4242)
    expect(await readers.readAncestors(9)).toEqual([50, 4242])
    expect(depths).toEqual([undefined])
  })

  test('uno cortado sin llegar se repite con profundidad 32', async () => {
    const depths: Array<number | undefined> = []
    const readers = createVerdictReaders(async (_, depth) => (depths.push(depth), depth === 32 ? result([50, 60, 4242]) : result([50], false, true)), 4242)
    expect(await readers.readAncestors(9)).toEqual([50, 60, 4242])
    expect(depths).toEqual([undefined, 32])
  })

  test('sin llegar, un recorrido fallido o cortado lanza; uno completo que no llega devuelve la cadena', async () => {
    await expect(createVerdictReaders(async () => result([50], true), 4242).readAncestors(9)).rejects.toThrow('ancestry walk failed')
    await expect(createVerdictReaders(async () => result([50], false, true), 4242).readAncestors(9)).rejects.toThrow('ancestry walk truncated')
    expect(await createVerdictReaders(async () => result([50]), 4242).readAncestors(9)).toEqual([50])
  })
})
