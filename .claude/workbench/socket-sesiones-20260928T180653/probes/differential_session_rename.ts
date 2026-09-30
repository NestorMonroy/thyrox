/**
 * Oráculo diferencial por escenarios: corre `tPt`, `sae` y `Gkr` de
 * `chunk-bhsyyycy.js` de 2.1.283 y su porte sobre el mismo registro falso
 * (sesiones vivas, nombre registrado, contadores, bandera y slugs) y compara
 * el nombre resultante, las escrituras al registro, el aviso de cesión, el
 * nombre tecleado, los registros y los eventos.
 */
import { SessionNameState, type LiveSession } from '../../../../src/packages/local-observability/src/uds/sessionNameState.ts'
import { resolveUniqueName, restoreSessionName, runStartupNaming, type RenameContext } from '../../../../src/packages/local-observability/src/uds/sessionRename.ts'
import { sliceUnits } from '../../../../src/packages/local-observability/src/uds/stringUnits.ts'

const root = '_references/claude-code-bin/2.1.283/bunfs-root'
const strip = (text: string, exports: string) => text.replace(/import\{[^}]*\}from"[^"]*";/g, '').replace(/export\{[^}]*\};?\s*$/, `return {${exports}};`)
const chunk = strip(await Bun.file(`${root}/chunk-bhsyyycy.js`).text(), 'wS,tPt,sae,Gkr,zFn')
const sanitizers = new Function('re', 'Mz', 'fr', strip(await Bun.file(`${root}/chunk-pbnxt79v.js`).text(), 'Tn'))(sliceUnits, (x: string) => x, (x: string) => x) as { Tn: (text: string) => string }
const normalize = (e: string) => e.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, n => (/\s/.test(n) ? n : '')).trim().toLowerCase().replace(/\s+/g, '-')
const referenceSanitize = (e: string) => [...sanitizers.Tn(e.trim()).replace(/[\x00-\x1f\x7f-\x9f]/g, '')].slice(0, 200).join('').trim()
const isShortWordSlug = (text: string) => ['brave-otter', 'quick-fox', 'calm-heron'].includes(text)

let seed = 20260928
const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const names = ['foo', 'Foo', 'foo-brave-otter', 'foo-quick-fox', 'bar', ' foo\u0007', 'foo-calm-heron-2']
const sources = ['user', 'collision', 'auto', 'derived', 'peer']

type World = {
  live: LiveSession[]
  registered: { name: string; source: string } | undefined
  enabled: boolean
  registeredOk: boolean
  listThrows: boolean
  bumpAdoptions: boolean
  bumpRestores: boolean
  lastYield: { base: string; name: string } | undefined
  userTyped: string | undefined
}
const makeWorld = (): World => {
  const live: LiveSession[] = [{ pid: process.pid, startedAt: 20, name: random() < 0.8 ? pick(names) : undefined, procStart: 'self', nameSince: random() < 0.5 ? 30 : undefined }]
  const others = Math.floor(random() * 4)
  for (let index = 0; index < others; index++) live.push({ pid: 1000 + index, startedAt: pick([5, 20, 40]), name: random() < 0.9 ? pick(names) : undefined, procStart: random() < 0.85 ? `p${index}` : undefined, nameSince: random() < 0.5 ? pick([10, 25, 50]) : undefined })
  return {
    live,
    registered: random() < 0.8 ? { name: pick(names), source: pick(sources) } : undefined,
    enabled: random() < 0.9,
    registeredOk: random() < 0.9,
    listThrows: random() < 0.08,
    bumpAdoptions: random() < 0.08,
    bumpRestores: random() < 0.08,
    lastYield: random() < 0.3 ? { base: 'foo', name: pick(names) } : undefined,
    userTyped: random() < 0.4 ? pick(names) : undefined,
  }
}

type Trace = { writes: unknown[][]; logs: unknown[][]; events: unknown[][]; scheduled: Array<() => void> }
const slugger = () => {
  let index = 0
  const cycle = ['brave-otter', 'quick-fox', 'calm-heron']
  return () => cycle[index++ % cycle.length]!
}
const fakeRegistry = (world: World, trace: Trace) => {
  const counters = { adoptions: 0, restores: 0 }
  let registered = world.registered === undefined ? undefined : { ...world.registered }
  return {
    counters,
    registeredName: () => registered,
    whenRegistered: async () => {
      if (world.bumpAdoptions) counters.adoptions++
      if (world.bumpRestores) counters.restores++
      return world.registeredOk
    },
    listLive: async () => {
      if (world.listThrows) throw new Error('registro ilegible')
      return world.live.map(session => ({ ...session }))
    },
    writeName: async (name: string, target: unknown, source: string | undefined) => {
      trace.writes.push([name, target, source])
      registered = { name, source: source ?? 'user' }
      return true
    },
  }
}

const runReference = (world: World) => {
  const trace: Trace = { writes: [], logs: [], events: [], scheduled: [] }
  const registry = fakeRegistry(world, trace)
  class PerHost<T> {
    #make: () => T
    #values = new WeakMap<object, T>()
    constructor(make: () => T) {
      this.#make = make
    }
    of(host: object): T {
      const found = this.#values.get(host)
      if (found !== undefined) return found
      const made = this.#make()
      this.#values.set(host, made)
      return made
    }
  }
  const host = {}
  const signal = () => {
    const listeners = new Set<(...args: unknown[]) => void>()
    return { subscribe: (fn: (...args: unknown[]) => void) => (listeners.add(fn), () => listeners.delete(fn)), emit: (...args: unknown[]) => listeners.forEach(fn => fn(...args)), clear: () => listeners.clear() }
  }
  const api = new Function('l', 'v', 'He', 'q', 'j', '_', 'm', 'HH', 'kv', 'Cut', 'eF', 'x', 't', 're', 'Q5', 'ADo', 'li', 'pA', 'lh', 'mJ', 'Cr', 'Ws', 'Bf', 'VOt', 'D3', 'DV', chunk)(
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
    () => undefined,
    signal,
    PerHost,
    () => ({ host }),
    (feature: string) => trace.events.push(['tengu_feature_ok', { feature_name: feature }]),
    (feature: string, code: string) => trace.events.push(['tengu_feature_bad', { feature_name: feature, error_code: code }]),
    () => registry.counters,
    registry.registeredName,
    registry.whenRegistered,
    registry.writeName,
    () => world.enabled,
    (message: string, options?: { level?: string }) => trace.logs.push([options?.level, message]),
    sliceUnits,
    slugger(),
    isShortWordSlug,
    referenceSanitize,
    200,
    () => ({}),
    () => false,
    normalize,
    () => false,
    (x: string) => x,
    async () => {},
    registry.listLive,
    () => undefined,
  ) as Record<string, any>
  const state = api.wS()
  state.lastYield = world.lastYield
  state.userTypedName = world.userTyped
  const deps = { whenRegistered: registry.whenRegistered, listLive: registry.listLive }
  return { api, state, trace, deps, registry }
}

const runPort = (world: World) => {
  const trace: Trace = { writes: [], logs: [], events: [], scheduled: [] }
  const registry = fakeRegistry(world, trace)
  const state = new SessionNameState()
  state.lastYield = world.lastYield
  state.userTypedName = world.userTyped
  const context: RenameContext = {
    state,
    registry: { whenRegistered: registry.whenRegistered, listLive: registry.listLive },
    registeredName: registry.registeredName,
    registration: () => registry.counters,
    writeName: registry.writeName,
    isShortWordSlug,
    slug: slugger(),
    uniquenessEnabled: () => world.enabled,
    pid: process.pid,
    log: (message, level) => trace.logs.push([level, message]),
    sink: (name, metadata) => trace.events.push([name, metadata]),
    scheduleRecheck: callback => trace.scheduled.push(callback),
  }
  return { context, state, trace, registry }
}

const mismatches: string[] = []
const compare = (label: string, left: unknown, right: unknown) => {
  const a = JSON.stringify(left)
  const b = JSON.stringify(right)
  if (a !== b) mismatches.push(`${label}: ours=${a} ref=${b}`)
}
const total = 3000
for (let index = 0; index < total; index++) {
  const world = makeWorld()
  const desired = pick(names)
  const moment = pick(['startup', 'rename', 'recheck'] as const)
  const suffixBase = random() < 0.5 ? pick(names) : undefined

  const ref = runReference(world)
  const port = runPort(world)
  const refResult = await ref.api.tPt(desired, moment, ref.deps, suffixBase ?? desired)
  const portResult = await resolveUniqueName(desired, moment, port.context, suffixBase)
  compare(`tPt#${index}`, [portResult, port.trace.logs, port.trace.events, port.state.lastYield], [refResult, ref.trace.logs, ref.trace.events, ref.state.lastYield])

  const options = { autoOnly: random() < 0.15, source: random() < 0.5 ? pick(sources) : undefined, yieldToLaterRestore: random() < 0.3 }
  const restoreName = random() < 0.1 ? '  ' : pick(names)
  const ref2 = runReference(world)
  const port2 = runPort(world)
  await ref2.api.sae(restoreName, 'sess', { ...options, deps: ref2.deps })
  await restoreSessionName(restoreName, 'sess', options, port2.context)
  compare(`sae#${index}`, [port2.trace.writes, port2.state.takePendingYield(), port2.state.userTypedName, port2.trace.logs, port2.trace.events, port2.registry.counters], [ref2.trace.writes, ref2.api.zFn(), ref2.state.userTypedName, ref2.trace.logs, ref2.trace.events, ref2.registry.counters])

  const startup = { sessionNameArg: random() < 0.5 ? pick(names) : undefined, interactive: random() < 0.8 }
  const ref3 = runReference(world)
  const port3 = runPort(world)
  const refRenamed: unknown[] = []
  const portRenamed: unknown[] = []
  await ref3.api.Gkr({ ...startup, deps: ref3.deps, writeName: (name: string, source: string) => ref3.registry.writeName(name, 'sess', source), onRenamed: (...args: unknown[]) => refRenamed.push(args), scheduleRecheck: (callback: () => void) => ref3.trace.scheduled.push(callback) })
  await runStartupNaming({ ...startup, writeName: (name, source) => port3.registry.writeName(name, 'sess', source), onRenamed: (...args) => portRenamed.push(args) }, port3.context)
  const snapshot = (side: { trace: Trace; state: { userTypedName: unknown } }, renamed: unknown[], pending: unknown) => [side.trace.writes, renamed, pending, side.state.userTypedName, side.trace.logs, side.trace.events, side.trace.scheduled.length]
  compare(`Gkr#${index}`, snapshot(port3, portRenamed, port3.state.takePendingYield()), snapshot(ref3, refRenamed, ref3.api.zFn()))
  if (ref3.trace.scheduled.length > 0 && port3.trace.scheduled.length > 0) {
    world.live.push({ pid: 5000, startedAt: 1, name: port3.registry.registeredName()?.name, procStart: 'late', nameSince: 1 })
    ref3.trace.scheduled[0]!()
    port3.trace.scheduled[0]!()
    for (let tick = 0; tick < 20; tick++) await Promise.resolve()
    compare(`Gkr-recheck#${index}`, snapshot(port3, portRenamed, port3.state.takePendingYield()), snapshot(ref3, refRenamed, ref3.api.zFn()))
  }
}
console.log(`escenarios=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 8)) console.log(line.slice(0, 600))
process.exit(mismatches.length === 0 ? 0 : 1)
