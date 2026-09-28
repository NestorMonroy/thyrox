/**
 * El estado de nombre y correspondientes de la sesión y la decisión de
 * colisión de nombres: `b`, `q`, `wS`, `Wkr`, `zFn`, `He`, `P`, `L`, `D`,
 * `O`, `B`, `A`, `C`, `U` y `fDe` (`chunk-bhsyyycy.js`, `chunk-nvht7ckf.js`,
 * `chunk-2j44ssk9.js`) y `Cr` (`chunk-5mcqvwzx.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  MAX_CORRESPONDENTS,
  PerHost,
  SessionNameState,
  createSignal,
  decideNameCollision,
  keptYieldName,
  normalizeSessionName,
  retainedSlugName,
  splitSlugSuffix,
  type LiveSession,
} from '../src/uds/sessionNameState.ts'

const isSlug = (text: string) => /^(brave|calm)-(otter|fox)$/.test(text)

describe('normalizeSessionName (Cr)', () => {
  test('NFKC, sin controles salvo espacios, en minúsculas y con guiones', () => {
    expect(normalizeSessionName('  Mi​  SesiＯn\t2 ')).toBe('mi-sesion-2')
    expect(normalizeSessionName('A\u0007B')).toBe('ab')
    expect(normalizeSessionName('')).toBe('')
  })
})

describe('createSignal (He)', () => {
  test('emite a cada suscriptor, desuscribe y agrega los fallos', () => {
    const signal = createSignal<[string]>()
    const seen: string[] = []
    const stop = signal.subscribe(value => void seen.push(`a:${value}`))
    signal.subscribe(value => void seen.push(`b:${value}`))
    signal.emit('x')
    stop()
    signal.emit('y')
    expect(seen).toEqual(['a:x', 'b:x', 'b:y'])
    signal.subscribe(() => {
      throw new Error('uno')
    })
    expect(() => signal.emit('z')).toThrow('uno')
    signal.subscribe(() => {
      throw new Error('dos')
    })
    expect(() => signal.emit('z')).toThrow(AggregateError)
    signal.clear()
    signal.emit('w')
    expect(seen.at(-1)).toBe('b:z')
  })
})

describe('SessionNameState (b)', () => {
  test('noteCorrespondent guarda sólo direcciones uds, en orden de uso, hasta 64', () => {
    const state = new SessionNameState()
    state.noteCorrespondent('bridge:x', 1, undefined)
    state.noteCorrespondent('', 1, undefined)
    expect(state.correspondents.size).toBe(0)
    for (let index = 0; index <= MAX_CORRESPONDENTS; index++) state.noteCorrespondent(`uds:/s/${index}.sock`, index, `t${index}`)
    expect(state.correspondents.size).toBe(MAX_CORRESPONDENTS)
    expect(state.correspondents.has('uds:/s/0.sock')).toBe(false)
    state.noteCorrespondent('uds:/s/1.sock', 99, undefined)
    state.noteCorrespondent('uds:/s/new.sock', 5, undefined)
    expect(state.correspondents.has('uds:/s/1.sock')).toBe(true)
    expect(state.correspondents.get('uds:/s/1.sock')).toEqual({ pid: 99, procStart: undefined })
    expect(state.correspondents.has('uds:/s/2.sock')).toBe(false)
  })

  test('announceYield deja el cambio pendiente y lo emite; takePendingYield lo consume', () => {
    const state = new SessionNameState()
    const seen: string[] = []
    state.yielded.subscribe((next, previous) => void seen.push(`${previous}->${next}`))
    state.announceYield('b', 'a')
    expect(seen).toEqual(['a->b'])
    expect(state.takePendingYield()).toEqual(['b', 'a'])
    expect(state.takePendingYield()).toBeUndefined()
  })

  test('reset lo vacía todo', () => {
    const state = new SessionNameState()
    state.noteCorrespondent('uds:/a.sock', 1, undefined)
    state.userTypedName = 'x'
    state.hasAdopter = true
    state.lastYield = { base: 'a', name: 'b' }
    state.senderMode = () => 'bypass'
    state.announceYield('b', 'a')
    state.reset()
    expect(state.correspondents.size).toBe(0)
    expect([state.userTypedName, state.hasAdopter, state.lastYield, state.senderMode, state.takePendingYield()]).toEqual([undefined, false, undefined, null, undefined])
  })

  test('PerHost (q) crea uno por anfitrión y lo reutiliza', () => {
    const perHost = new PerHost(() => new SessionNameState())
    const host = {}
    expect(perHost.of(host)).toBe(perHost.of(host))
    expect(perHost.of({})).not.toBe(perHost.of(host))
  })
})

const self: LiveSession = { pid: 10, name: 'work', procStart: 's10', startedAt: 200 }
const older: LiveSession = { pid: 11, name: 'Work', procStart: 's11', startedAt: 100 }
const newer: LiveSession = { pid: 12, name: 'work', procStart: 's12', startedAt: 300 }

describe('decideNameCollision (B)', () => {
  const slugs = ['calm-fox', 'brave-otter']
  const nextSlug = () => {
    const slug = slugs.shift() ?? 'calm-otter'
    return slug
  }

  test('sin rival se conserva; un nombre vacío tras normalizar, también', () => {
    expect(decideNameCollision({ desiredName: 'solo', self, live: [self], moment: 'startup', slug: nextSlug })).toEqual({ kind: 'keep' })
    expect(decideNameCollision({ desiredName: '​', self, live: [self, older], moment: 'rename', slug: nextSlug })).toEqual({ kind: 'keep' })
  })

  test('al arrancar cede sólo ante una sesión más antigua', () => {
    const decision = decideNameCollision({ desiredName: 'work', self, live: [self, older, newer], moment: 'startup', slug: () => 'calm-fox' })
    expect(decision).toEqual({ kind: 'yield', newName: 'work-calm-fox', holders: [older] })
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, newer], moment: 'startup', slug: () => 'calm-fox' })).toEqual({ kind: 'keep' })
  })

  test('al renombrar cede ante cualquiera; al revisar, por la antigüedad del nombre', () => {
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, newer], moment: 'rename', slug: () => 'calm-fox' }).kind).toBe('yield')
    const renamedLate: LiveSession = { ...older, nameSince: 400 }
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, renamedLate], moment: 'recheck', slug: () => 'calm-fox' })).toEqual({ kind: 'keep' })
  })

  test('un rival sin procStart o sin nombre no cuenta; el desempate es inicio, procStart y pid', () => {
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, { ...older, procStart: undefined }], moment: 'rename', slug: () => 'x-y' })).toEqual({ kind: 'keep' })
    const tie: LiveSession = { pid: 9, name: 'work', procStart: 's10', startedAt: 200 }
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, tie], moment: 'startup', slug: () => 'x-y' }).kind).toBe('yield')
    const tieLaterStart: LiveSession = { pid: 9, name: 'work', procStart: 's11', startedAt: 200 }
    expect(decideNameCollision({ desiredName: 'work', self, live: [self, tieLaterStart], moment: 'startup', slug: () => 'x-y' }).kind).toBe('keep')
  })

  test('el nombre nuevo evita los ocupados: 16 intentos con slug, luego con número', () => {
    const taken: LiveSession = { pid: 13, name: 'work-calm-fox', procStart: 's13', startedAt: 50 }
    const decision = decideNameCollision({ desiredName: 'work', self, live: [self, older, taken], moment: 'rename', slug: () => 'calm-fox' })
    expect(decision).toMatchObject({ kind: 'yield', newName: 'work-calm-fox-2' })
    const base = decideNameCollision({ desiredName: 'work', suffixBase: 'base', self, live: [self, older], moment: 'rename', slug: () => 'calm-fox' })
    expect(base).toMatchObject({ newName: 'base-calm-fox' })
  })

  test('la base se recorta para que el nombre quepa en 200', () => {
    const long = 'n'.repeat(300)
    const rival: LiveSession = { ...older, name: long }
    const decision = decideNameCollision({ desiredName: long, self, live: [self, rival], moment: 'rename', slug: () => 'calm-fox' })
    expect(decision.kind === 'yield' && decision.newName.length).toBe(200)
  })
})

describe('sufijos de slug (A/C/U/fDe)', () => {
  test('splitSlugSuffix reconoce base-adjetivo-sustantivo con número opcional', () => {
    expect(splitSlugSuffix('work-calm-fox', isSlug)).toEqual({ base: 'work', suffix: 'calm-fox' })
    expect(splitSlugSuffix('work-Calm-Fox-12', isSlug)).toEqual({ base: 'work', suffix: 'Calm-Fox-12' })
    expect(splitSlugSuffix('work-green-fox', isSlug)).toBeUndefined()
    expect(splitSlugSuffix('calm-fox', isSlug)).toBeUndefined()
  })

  test('retainedSlugName conserva el nombre con sufijo propio si su base es el nombre pedido', () => {
    const state = new SessionNameState()
    expect(retainedSlugName('work', { ...self, name: 'work-calm-fox' }, state, isSlug)).toBe('work-calm-fox')
    expect(retainedSlugName('Work-brave-otter', { ...self, name: 'work-calm-fox' }, state, isSlug)).toBe('work-calm-fox')
    expect(retainedSlugName('other', { ...self, name: 'work-calm-fox' }, state, isSlug)).toBeUndefined()
    expect(retainedSlugName('work', { ...self, name: undefined }, state, isSlug)).toBeUndefined()
  })

  test('keptYieldName (fDe) reconoce el último cambio cedido por su base', () => {
    const state = new SessionNameState()
    state.lastYield = { base: 'work', name: 'work-calm-fox' }
    expect(keptYieldName('work', 'Work-Calm-Fox', state, isSlug)).toBe('Work-Calm-Fox')
    expect(keptYieldName('work-brave-otter', 'work-calm-fox', state, isSlug)).toBe('work-calm-fox')
    expect(keptYieldName('other', 'work-calm-fox', state, isSlug)).toBeUndefined()
    expect(keptYieldName('work', 'work-calm-fox', state, isSlug, false)).toBeUndefined()
    expect(keptYieldName('work', undefined, state, isSlug)).toBeUndefined()
  })
})
