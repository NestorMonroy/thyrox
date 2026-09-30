/**
 * Los flujos que ceden un nombre de sesión ocupado por otra sesión viva: al
 * arrancar, al revisar y al restaurar. `tPt`, `Gkr`, `Vtn`, `VFn`, `sae`,
 * `jkr`, `y` y `T` (`chunk-bhsyyycy.js`) y `li`/`AY` (`chunk-1ay853f5.js`) de
 * 2.1.283.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import { SessionNameState, type LiveSession } from '../src/uds/sessionNameState.ts'
import {
  NAME_RECHECK_DELAY_MS,
  conflictingExplicitName,
  isCurrentName,
  resolveUniqueName,
  restoreSessionName,
  runStartupNaming,
  sanitizeSessionName,
  scheduleNameRecheck,
  userTypedCurrentName,
  type RegisteredName,
  type RenameContext,
} from '../src/uds/sessionRename.ts'

const SELF = 100
const isShortWordSlug = (text: string) => /^[a-z]+-[a-z]+$/.test(text) && text !== 'not-slug'

let live: LiveSession[]
let registered: RegisteredName | undefined
let writes: Array<[string, unknown, string | undefined]>
let logs: Array<[string, string]>
let events: Array<[string, Record<string, unknown>]>
let scheduled: Array<() => void>
let context: RenameContext
let registration: { adoptions: number; restores: number }

beforeEach(() => {
  live = [{ pid: SELF, startedAt: 20, name: 'foo' }]
  registered = { name: 'foo', source: 'user' }
  writes = []
  logs = []
  events = []
  scheduled = []
  registration = { adoptions: 0, restores: 0 }
  context = {
    state: new SessionNameState(),
    registry: { whenRegistered: async () => true, listLive: async () => live },
    registeredName: () => registered,
    registration: () => registration,
    writeName: async (name, target, source) => {
      writes.push([name, target, source])
      registered = { name, source: source ?? 'user' }
      return true
    },
    isShortWordSlug,
    slug: () => 'brave-otter',
    uniquenessEnabled: () => true,
    pid: SELF,
    log: (message, level) => logs.push([level, message]),
    sink: (name, metadata) => events.push([name, metadata]),
    scheduleRecheck: callback => scheduled.push(callback),
  }
})

const holder = (name: string, startedAt = 10): LiveSession => ({ pid: 7, startedAt, name, procStart: 'p7' })
const settle = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve()
}

describe('nombres', () => {
  test('sanitizeSessionName (li): sin controles, 200 puntos de código, sin espacios en los bordes', () => {
    expect(sanitizeSessionName('  a\u0007b​c  ')).toBe('a b c')
    expect(sanitizeSessionName('😀'.repeat(201))).toBe('😀'.repeat(200))
  })

  test('isCurrentName (y) y userTypedCurrentName (jkr)', () => {
    expect(isCurrentName('FOO', context)).toBe(true)
    expect(isCurrentName('bar', context)).toBe(false)
    expect(userTypedCurrentName(context)).toBeUndefined()
    context.state.userTypedName = 'foo'
    expect(userTypedCurrentName(context)).toBe('foo')
    registered = { name: 'foo', source: 'auto' }
    expect(userTypedCurrentName(context)).toBeUndefined()
  })
})

describe('resolveUniqueName (tPt)', () => {
  test('conserva el nombre si la unicidad está apagada, sin registro, sin fila propia o sin rival', async () => {
    live.push(holder('foo'))
    expect(await resolveUniqueName('foo', 'startup', { ...context, uniquenessEnabled: () => false })).toEqual({ name: 'foo', yielded: false })
    expect(await resolveUniqueName('foo', 'startup', { ...context, registry: { ...context.registry, whenRegistered: async () => false } })).toEqual({ name: 'foo', yielded: false })
    expect(await resolveUniqueName('foo', 'startup', { ...context, pid: 999 })).toEqual({ name: 'foo', yielded: false })
    live.pop()
    expect(await resolveUniqueName('foo', 'startup', context)).toEqual({ name: 'foo', yielded: false })
  })

  test('cede ante una sesión más antigua con el mismo nombre', async () => {
    live.push(holder('foo'))
    expect(await resolveUniqueName('foo', 'startup', context)).toEqual({ name: 'foo-brave-otter', yielded: true })
    expect(logs).toEqual([['info', '[session-name] "foo" is held by live pid 7; this session takes "foo-brave-otter"']])
    expect(events).toEqual([['tengu_feature_ok', { feature_name: 'session_name_collision' }]])
    expect(context.state.lastYield).toEqual({ base: 'foo', name: 'foo-brave-otter' })
  })

  test('conserva el sufijo que ya lleva y usa la base del sufijo', async () => {
    live[0] = { pid: SELF, startedAt: 20, name: 'foo-calm-heron' }
    live.push(holder('foo'))
    expect(await resolveUniqueName('foo', 'startup', context)).toEqual({ name: 'foo-calm-heron', yielded: true })
    live[0] = { pid: SELF, startedAt: 20, name: 'foo-brave-otter' }
    live.push(holder('foo-brave-otter', 5))
    const result = await resolveUniqueName('foo-brave-otter', 'recheck', { ...context, slug: () => 'quick-fox' }, 'foo-brave-otter')
    expect(result).toEqual({ name: 'foo-quick-fox', yielded: true })
    expect(context.state.lastYield).toEqual({ base: 'foo', name: 'foo-quick-fox' })
  })

  test('si el registro falla, conserva el nombre y lo reporta', async () => {
    const failing = { ...context, registry: { ...context.registry, listLive: async () => Promise.reject(new Error('roto')) } }
    expect(await resolveUniqueName('foo', 'startup', failing)).toEqual({ name: 'foo', yielded: false })
    expect(logs).toEqual([['warn', '[session-name] uniqueness check failed, keeping "foo": roto']])
    expect(events).toEqual([['tengu_feature_bad', { feature_name: 'session_name_collision', error_code: 'check_failed' }]])
  })
})

describe('runStartupNaming (Gkr) y scheduleNameRecheck (Vtn)', () => {
  test('escribe el nombre pedido, cede si está ocupado, avisa y programa una revisión', async () => {
    registered = undefined
    live.push(holder('foo'))
    const renamed: Array<[string, string]> = []
    await runStartupNaming({ sessionNameArg: 'foo', interactive: true, writeName: (name, source) => context.writeName(name, 'sess', source), onRenamed: (name, before) => renamed.push([name, before]) }, context)
    expect(writes).toEqual([['foo', 'sess', 'user'], ['foo-brave-otter', 'sess', 'collision']])
    expect(renamed).toEqual([['foo-brave-otter', 'foo']])
    expect(context.state.userTypedName).toBe('foo-brave-otter')
    expect(context.state.takePendingYield()).toEqual(['foo-brave-otter', 'foo'])
    expect(scheduled.length).toBe(1)
  })

  test('sin sesión interactiva, o con nombre derivado, sólo escribe', async () => {
    await runStartupNaming({ sessionNameArg: 'foo', interactive: false, writeName: (name, source) => context.writeName(name, 'sess', source) }, context)
    registered = { name: 'foo', source: 'derived' }
    await runStartupNaming({ interactive: true, writeName: (name, source) => context.writeName(name, 'sess', source) }, context)
    expect(writes).toEqual([['foo', 'sess', 'user']])
    expect(scheduled.length).toBe(0)
  })

  test('sin ceder al arrancar, la revisión posterior cede si otra sesión tomó el nombre antes', async () => {
    await runStartupNaming({ interactive: true, writeName: (name, source) => context.writeName(name, 'sess', source) }, context)
    expect(scheduled.length).toBe(1)
    live[0] = { pid: SELF, startedAt: 20, name: 'foo', nameSince: 30 }
    live.push({ pid: 7, startedAt: 40, name: 'foo', nameSince: 25, procStart: 'p7' })
    scheduled[0]!()
    await settle()
    await settle()
    expect(writes.at(-1)).toEqual(['foo-brave-otter', 'sess', 'collision'])
  })

  test('scheduleNameRecheck cede en la revisión y llama a onYield', async () => {
    live[0] = { pid: SELF, startedAt: 20, name: 'foo', nameSince: 30 }
    live.push({ pid: 7, startedAt: 40, name: 'foo', nameSince: 25, procStart: 'p7' })
    context.state.userTypedName = 'foo'
    const yields: Array<[string, string]> = []
    scheduleNameRecheck({ name: 'foo', onYield: async (name, before) => void yields.push([name, before]) }, context)
    expect(scheduled.length).toBe(1)
    scheduled[0]!()
    await settle()
    await settle()
    expect(yields).toEqual([['foo-brave-otter', 'foo']])
    expect(context.state.userTypedName).toBe('foo-brave-otter')
  })

  test('la revisión no hace nada si el nombre ya cambió', async () => {
    live.push(holder('foo'))
    const yields: string[] = []
    let queries = 0
    const counting = { ...context, registry: { ...context.registry, listLive: async () => (queries++, live) } }
    scheduleNameRecheck({ name: 'otro', onYield: async name => void yields.push(name) }, counting)
    scheduled[0]!()
    await settle()
    expect(yields).toEqual([])
    expect(queries).toBe(0)
  })

  test('NAME_RECHECK_DELAY_MS es el de la referencia', () => {
    expect(NAME_RECHECK_DELAY_MS).toBe(3000)
  })
})

describe('conflictingExplicitName (VFn)', () => {
  test('el nombre explícito actual gana sobre la restauración, salvo que sea uno de los implicados', () => {
    registered = { name: 'mio', source: 'user' }
    expect(conflictingExplicitName(undefined, 'foo', 'foo', context)).toEqual({ name: 'mio', source: 'user' })
    expect(conflictingExplicitName({ name: 'MIO', source: 'user' }, 'foo', 'foo', context)).toBeUndefined()
    expect(conflictingExplicitName(undefined, 'mio', 'x', context)).toBeUndefined()
    expect(conflictingExplicitName(undefined, 'x', 'mio', context)).toBeUndefined()
    registered = { name: 'mio', source: 'auto' }
    expect(conflictingExplicitName(undefined, 'foo', 'foo', context)).toBeUndefined()
    registered = undefined
    expect(conflictingExplicitName(undefined, 'foo', 'foo', context)).toBeUndefined()
  })

  test('un nombre cedido que esta sesión conserva no cuenta como conflicto', () => {
    registered = { name: 'foo-brave-otter', source: 'collision' }
    context.state.lastYield = { base: 'foo', name: 'foo-brave-otter' }
    expect(conflictingExplicitName(undefined, 'foo', 'x', context)).toBeUndefined()
    context.state.lastYield = undefined
    expect(conflictingExplicitName(undefined, 'foo', 'x', context)).toEqual({ name: 'foo-brave-otter', source: 'collision' })
  })
})

describe('restoreSessionName (sae)', () => {
  test('un nombre vacío o sin registro no hace nada', async () => {
    await restoreSessionName('  ', 'sess', {}, context)
    await restoreSessionName('bar', 'sess', {}, { ...context, registry: { ...context.registry, whenRegistered: async () => false } })
    expect(writes).toEqual([])
    expect(registration.restores).toBe(1)
  })

  test('autoOnly escribe el nombre como automático', async () => {
    await restoreSessionName('bar', 'sess', { autoOnly: true }, context)
    expect(writes).toEqual([['bar', 'sess', 'auto']])
  })

  test('el mismo nombre ya explícito no se reescribe', async () => {
    await restoreSessionName('FOO', 'sess', {}, context)
    expect(writes).toEqual([])
  })

  test('sin rival escribe con su fuente y programa la revisión', async () => {
    registered = { name: 'viejo', source: 'auto' }
    await restoreSessionName('bar', 'sess', { source: 'user' }, context)
    expect(writes).toEqual([['bar', 'sess', 'user']])
    expect(scheduled.length).toBe(1)
  })

  test('con rival cede, escribe como colisión, avisa y programa la revisión con la base', async () => {
    registered = { name: 'viejo', source: 'auto' }
    live.push(holder('bar'))
    context.state.userTypedName = 'bar'
    await restoreSessionName('bar', 'sess', {}, context)
    expect(writes).toEqual([['bar-brave-otter', 'sess', 'collision']])
    expect(context.state.userTypedName).toBe('bar-brave-otter')
    expect(context.state.takePendingYield()).toEqual(['bar-brave-otter', 'bar'])
    expect(scheduled.length).toBe(1)
  })

  test('una adopción durante la espera deja obsoleta la restauración', async () => {
    registered = { name: 'viejo', source: 'auto' }
    const adopting = { ...context, registry: { ...context.registry, whenRegistered: async () => (registration.adoptions++, true) } }
    await restoreSessionName('bar', 'sess', {}, adopting)
    expect(writes).toEqual([])
  })

  test('yieldToLaterRestore cede ante una restauración posterior', async () => {
    registered = { name: 'viejo', source: 'auto' }
    const later = { ...context, registry: { ...context.registry, whenRegistered: async () => (registration.restores++, true) } }
    await restoreSessionName('bar', 'sess', { yieldToLaterRestore: true }, later)
    expect(writes).toEqual([])
    await restoreSessionName('bar', 'sess', {}, later)
    expect(writes).toEqual([['bar', 'sess', undefined]])
  })

  test('un nombre explícito puesto mientras tanto gana', async () => {
    registered = { name: 'viejo', source: 'auto' }
    const racing = { ...context, registry: { ...context.registry, listLive: async () => ((registered = { name: 'mio', source: 'user' }), live) } }
    await restoreSessionName('bar', 'sess', {}, racing)
    expect(writes).toEqual([])
  })
})
