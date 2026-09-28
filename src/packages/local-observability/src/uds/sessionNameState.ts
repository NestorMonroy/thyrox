/**
 * El estado de nombre de la sesión frente a otras sesiones vivas de la
 * máquina: con quién se ha escrito (sus correspondientes), si cedió su nombre
 * a otra que ya lo tenía, y la decisión de ceder. Porte de `b`, `F`, `wS`,
 * `Wkr`, `zFn`, `Y`, `E`, `P`, `L`, `D`, `O`, `B`, `A`, `C`, `U` y `fDe`
 * (`chunk-bhsyyycy.js`), `q` (`chunk-nvht7ckf.js`), `He` y `Ujt`
 * (`chunk-2j44ssk9.js`) y `Cr` (`chunk-5mcqvwzx.js`) de 2.1.283.
 *
 * Lo que depende del registro de sesiones y del nombre persistido (`tPt`,
 * `Gkr`, `Vtn`, `VFn`, `sae`, `jkr`, `y`) es F4c-2f-2; el aviso de renombre
 * a los correspondientes (`zkr`) es F4c-2f-3.
 *
 * El generador de slugs (`Q5`) y su reconocedor (`ADo`) llegan como
 * parámetro: viven en `@thyrox/tool-registry: words.ts`.
 */
import { AsyncResource } from 'node:async_hooks'

import { sliceUnits } from './stringUnits.ts'
import { parseAddress } from './peerAddress.ts'

/** `pA`: largo máximo de un nombre de sesión. */
export const MAX_SESSION_NAME = 200
/** `E`. */
export const MAX_CORRESPONDENTS = 64
/** `Y`: intentos con un slug nuevo antes de pasar a numerar. */
const SLUG_ATTEMPTS = 16

/** `Cr`: la forma con que se comparan dos nombres de sesión. */
export function normalizeSessionName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, character => (/\s/.test(character) ? character : ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export type Signal<Args extends unknown[]> = {
  subscribe: (listener: (...args: Args) => void) => () => void
  emit: (...args: Args) => void
  clear: () => void
}

/**
 * `He`: una señal síncrona. Cada suscriptor conserva el contexto asíncrono
 * en que se suscribió (`Ujt`); si alguno lanza, se lanza tras avisar a todos.
 */
export function createSignal<Args extends unknown[]>(): Signal<Args> {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      const bound = AsyncResource.bind(listener)
      listeners.add(bound)
      return () => {
        listeners.delete(bound)
      }
    },
    emit(...args) {
      let failures: unknown[] | undefined
      for (const listener of listeners) {
        try {
          listener(...args)
        } catch (error) {
          ;(failures ??= []).push(error)
        }
      }
      if (failures) throw failures.length === 1 ? failures[0] : new AggregateError(failures, 'Signal listener(s) threw')
    },
    clear() {
      listeners.clear()
    },
  }
}

/** `q`: un valor por anfitrión, creado al pedirlo por primera vez. */
export class PerHost<T> {
  readonly #create: () => T
  readonly #byHost = new WeakMap<object, T>()

  constructor(create: () => T) {
    this.#create = create
  }

  of(host: object): T {
    const existing = this.#byHost.get(host)
    if (existing !== undefined) return existing
    const created = this.#create()
    this.#byHost.set(host, created)
    return created
  }
}

export type Correspondent = { pid: number; procStart: string | undefined }

/** `b`. */
export class SessionNameState {
  /** Direcciones `uds:` con las que esta sesión se ha escrito, de la menos a la más reciente. */
  correspondents = new Map<string, Correspondent>()
  senderMode: (() => string | undefined) | null = null
  userTypedName: string | undefined = undefined
  hasAdopter = false
  lastYield: { base: string; name: string } | undefined = undefined
  readonly yielded = createSignal<[newName: string, previousName: string]>()
  #pendingYield: [string, string] | undefined = undefined

  /** Anota un correspondiente; si se pasa de 64, olvida el menos reciente. */
  noteCorrespondent(address: string, pid: number, procStart: string | undefined): void {
    if (!address || parseAddress(address).scheme !== 'uds') return
    this.correspondents.delete(address)
    this.correspondents.set(address, { pid, procStart })
    if (this.correspondents.size > MAX_CORRESPONDENTS) {
      const oldest = this.correspondents.keys().next().value
      if (oldest !== undefined) this.correspondents.delete(oldest)
    }
  }

  announceYield(newName: string, previousName: string): void {
    this.#pendingYield = [newName, previousName]
    this.yielded.emit(newName, previousName)
  }

  /** `zFn`: el último cambio cedido que nadie ha leído todavía. */
  takePendingYield(): [string, string] | undefined {
    const pending = this.#pendingYield
    this.#pendingYield = undefined
    return pending
  }

  reset(): void {
    this.correspondents.clear()
    this.lastYield = undefined
    this.yielded.clear()
    this.#pendingYield = undefined
    this.senderMode = null
    this.userTypedName = undefined
    this.hasAdopter = false
  }
}

const processHost = {}
const statesPerHost = new PerHost(() => new SessionNameState())

/** `wS`: el estado del anfitrión; por omisión, el de este proceso. */
export function sessionNameState(host: object = processHost): SessionNameState {
  return statesPerHost.of(host)
}

/** `Wkr`. */
export function noteCorrespondent(address: string, pid: number, procStart: string | undefined): void {
  sessionNameState().noteCorrespondent(address, pid, procStart)
}

/** Una sesión viva del registro, con lo que la decisión de colisión necesita. */
export type LiveSession = { pid: number; name?: string; procStart?: string; startedAt: number; nameSince?: number; sock?: string }
export type CollisionMoment = 'startup' | 'rename' | 'recheck'
export type CollisionDecision = { kind: 'keep' } | { kind: 'yield'; newName: string; holders: LiveSession[] }

/** `P`: si `left` arrancó antes que `right`; empata por inicio de proceso y luego por pid. */
function startedBefore(left: LiveSession, right: LiveSession): boolean {
  if (left.startedAt !== right.startedAt) return left.startedAt < right.startedAt
  const leftStart = left.procStart ?? ''
  const rightStart = right.procStart ?? ''
  if (leftStart !== rightStart) return leftStart < rightStart
  return left.pid < right.pid
}

/** `L`: las otras sesiones verificables que llevan el mismo nombre. */
function rivals(normalized: string, live: readonly LiveSession[], selfPid: number): LiveSession[] {
  return live.filter(session => session.pid !== selfPid && session.name !== undefined && session.procStart !== undefined && normalizeSessionName(session.name) === normalized)
}

/** `D`. */
function takenNames(live: readonly LiveSession[]): Set<string> {
  return new Set(live.flatMap(session => (session.name === undefined ? [] : [normalizeSessionName(session.name)])))
}

/** `O`: `base-slug`, recortando la base para caber, sin chocar con los nombres ocupados. */
function freeName(base: string, taken: ReadonlySet<string>, slug: () => string): string {
  const compose = (suffix: string) => `${sliceUnits(base, MAX_SESSION_NAME - suffix.length - 1)}-${suffix}`
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const candidate = compose(slug())
    if (!taken.has(normalizeSessionName(candidate))) return candidate
  }
  for (let counter = 2; ; counter++) {
    const candidate = compose(`${slug()}-${counter}`)
    if (!taken.has(normalizeSessionName(candidate))) return candidate
  }
}

/**
 * `B`: si esta sesión conserva el nombre o lo cede. Al arrancar cede ante una
 * sesión más antigua; al renombrar, ante cualquiera; al revisar, ante la que
 * lleva el nombre desde antes.
 */
export function decideNameCollision(input: {
  desiredName: string
  self: LiveSession
  live: readonly LiveSession[]
  moment: CollisionMoment
  slug: () => string
  suffixBase?: string
}): CollisionDecision {
  const { desiredName, self, live, moment, slug } = input
  const normalized = normalizeSessionName(desiredName)
  if (!normalized) return { kind: 'keep' }
  const sameName = rivals(normalized, live, self.pid)
  const holders =
    moment === 'rename'
      ? sameName
      : moment === 'startup'
        ? sameName.filter(session => startedBefore(session, self))
        : sameName.filter(session =>
            startedBefore({ ...session, startedAt: session.nameSince ?? session.startedAt }, { ...self, startedAt: self.nameSince ?? self.startedAt }),
          )
  if (holders.length === 0) return { kind: 'keep' }
  return { kind: 'yield', newName: freeName(input.suffixBase ?? desiredName, takenNames(live), slug), holders }
}

/** `A`: un nombre `base-adjetivo-sustantivo[-n]` partido en su base y su sufijo. */
export function splitSlugSuffix(name: string, isShortWordSlug: (text: string) => boolean): { base: string; suffix: string } | undefined {
  const match = /-([a-z]+-[a-z]+)(-\d{1,4})?$/i.exec(name)
  if (!match || !isShortWordSlug(match[1]!.toLowerCase())) return undefined
  const base = name.slice(0, name.length - match[0].length)
  return base.length > 0 ? { base, suffix: match[0].slice(1) } : undefined
}

/** `C`. */
function slugBase(name: string, isShortWordSlug: (text: string) => boolean): string | undefined {
  return splitSlugSuffix(name, isShortWordSlug)?.base
}

/** `fDe`: el nombre actual si es el último que esta sesión tomó al ceder `name`. */
export function keptYieldName(
  name: string,
  current: string | undefined,
  state: SessionNameState,
  isShortWordSlug: (text: string) => boolean,
  uniquenessEnabled = true,
): string | undefined {
  if (!uniquenessEnabled) return undefined
  const last = state.lastYield
  const base = slugBase(name, isShortWordSlug) ?? name
  return last !== undefined && current !== undefined && normalizeSessionName(last.name) === normalizeSessionName(current) && last.base === normalizeSessionName(base) ? current : undefined
}

/** `U`: el nombre con sufijo que la sesión ya lleva, si su base es el nombre pedido. */
export function retainedSlugName(
  name: string,
  self: LiveSession,
  state: SessionNameState,
  isShortWordSlug: (text: string) => boolean,
  uniquenessEnabled = true,
): string | undefined {
  const kept = keptYieldName(name, self.name, state, isShortWordSlug, uniquenessEnabled)
  if (kept !== undefined) return kept
  const current = self.name
  const split = current === undefined ? undefined : splitSlugSuffix(current, isShortWordSlug)
  if (current === undefined || split === undefined) return undefined
  const base = sliceUnits(slugBase(name, isShortWordSlug) ?? name, MAX_SESSION_NAME - split.suffix.length - 1)
  return split.base.toLowerCase() === base.toLowerCase() ? current : undefined
}
