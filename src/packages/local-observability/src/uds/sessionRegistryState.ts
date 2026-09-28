/**
 * El estado que el registro de sesiones guarda por anfitrión: el nombre
 * registrado y desde cuándo, los nombres que la sesión tuvo antes, los que
 * aparta al cambiar de conversación, los contadores con que una restauración
 * sabe si quedó obsoleta, y la cadena de escrituras del archivo pid.
 *
 * Porte de `By`, `eD`, `HH`, `Y5o`, `kv` y `Cut`, con `JM`, `KKn` y `XM`
 * (`chunk-t6pwageh.js`), y de `Nq` (`chunk-5mcqvwzx.js`) de 2.1.283. El
 * sondeo de permiso de barrido llega como dependencia.
 */
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'

import { PerHost, createSignal, normalizeSessionName, processHost } from './sessionNameState.ts'

/** `JM`: lo que un nombre tiene que haberse llevado para recordarse como anterior. */
export const FORMER_NAME_MIN_HOLD_MS = 1e4
/** `KKn`. */
export const MAX_FORMER_NAMES = 3
/** `XM`. */
export const MAX_CONVERSATION_NAMES = 8

export type RegistryName = { name: string; source: string; since: number; sessionId: string; givenAtLaunch?: boolean }
export type FormerName = { name: string; until: number; sessionId: string }
export type ConversationName = { name: string; source: string }

export type SessionRegistryDeps = {
  now: () => number
  /** `Y`. */
  sessionId: () => string
  /** `Nq`: la bandera `tengu_session_stable_address`. */
  stableAddress: () => boolean
  probeRegistrySweep?: () => Promise<boolean>
}

/** `Nq`. */
export function stableAddressEnabled(): boolean {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE('tengu_session_stable_address', false)
  } catch {
    return false
  }
}

const processDeps: SessionRegistryDeps = { now: () => Date.now(), sessionId: () => getSessionId(), stableAddress: stableAddressEnabled }

/** `By`. */
export class SessionRegistryState {
  uncleanExitsScanned = false
  reportedUncleanExitPaths = new Set<string>()
  watchedCache: { at: number; value: boolean } | undefined = undefined
  pidFileWriteChain: Promise<void> = Promise.resolve()
  registeredName: RegistryName | undefined = undefined
  formerNames: FormerName[] = []
  conversationNames = new Map<string, ConversationName>()
  adoptions = 0
  restores = 0
  liveSessionId: string | undefined = undefined
  restoreSetAsideName: ((name: string, source: string) => void) | undefined = undefined
  heldNames = new Map<string, string>()
  registered = false
  bornSpare = false
  spareClaimPoll: ReturnType<typeof setInterval> | undefined = undefined
  registration: Promise<boolean> | undefined = undefined
  registrySweepPermitted: Promise<boolean> | undefined = undefined
  readonly registeredNameChanged = createSignal<[]>()

  constructor(private readonly deps: SessionRegistryDeps = processDeps) {}

  setRegisteredName(name: string, source: string, givenAtLaunch?: boolean): void {
    const previous = this.registeredName
    const now = this.deps.now()
    const normalized = normalizeSessionName(name)
    const sessionId = this.deps.sessionId()
    const launched = givenAtLaunch ?? previous?.givenAtLaunch
    if (previous && normalizeSessionName(previous.name) === normalized) {
      this.registeredName = { name, source, since: previous.since, sessionId, ...(launched && { givenAtLaunch: launched }) }
      if (previous.name !== name || previous.source !== source) this.registeredNameChanged.emit()
      return
    }
    if (previous) this.heldNames.set(normalizeSessionName(previous.name), previous.source)
    this.heldNames.delete(normalized)
    this.formerNames = this.formerNames.filter(former => normalizeSessionName(former.name) !== normalized)
    if (previous && (previous.source !== 'derived' || this.deps.stableAddress()) && now - previous.since >= FORMER_NAME_MIN_HOLD_MS) {
      const previousNormalized = normalizeSessionName(previous.name)
      this.formerNames = [
        { name: previous.name, until: now, sessionId: previous.sessionId },
        ...this.formerNames.filter(former => normalizeSessionName(former.name) !== previousNormalized),
      ].slice(0, MAX_FORMER_NAMES)
    }
    this.registeredName = { name, source, since: now, sessionId, ...(givenAtLaunch && { givenAtLaunch }) }
    if (source !== 'derived' && this.liveSessionId !== undefined) this.conversationNames.delete(this.liveSessionId)
    this.registeredNameChanged.emit()
  }

  /** Aparta el nombre en `conversationId`; al pasar de ocho olvida la más antigua que no sea `keepId`. */
  setAsideRegisteredName(conversationId: string, keepId: string): void {
    const current = this.registeredName
    if (current === undefined) return
    this.heldNames.set(normalizeSessionName(current.name), current.source)
    this.conversationNames.delete(conversationId)
    this.conversationNames.set(conversationId, { name: current.name, source: current.source })
    if (this.conversationNames.size > MAX_CONVERSATION_NAMES) {
      for (const key of this.conversationNames.keys()) {
        if (key !== keepId) {
          this.conversationNames.delete(key)
          break
        }
      }
    }
    this.registeredName = undefined
  }

  setUncleanExitsScanned(scanned: boolean): void {
    this.uncleanExitsScanned = scanned
  }

  markUncleanExitReported(path: string): void {
    this.reportedUncleanExitPaths.add(path)
  }

  setWatchedCache(cache: { at: number; value: boolean }): void {
    this.watchedCache = cache
  }

  setPidFileWriteChain(chain: Promise<void>): void {
    this.pidFileWriteChain = chain
  }

  isRegistrySweepPermitted(): Promise<boolean> {
    this.registrySweepPermitted ??= this.deps.probeRegistrySweep?.() ?? Promise.resolve(false)
    return this.registrySweepPermitted
  }
}

/** `eD`. */
const statesPerHost = new PerHost(() => new SessionRegistryState())

/** `HH`. */
export function sessionRegistryState(host: object = processHost): SessionRegistryState {
  return statesPerHost.of(host)
}

/** `Y5o`. */
export function heldSessionNames(host: object = processHost): Map<string, string> {
  return sessionRegistryState(host).heldNames
}

/** `kv`. */
export function registeredSessionName(host: object = processHost): RegistryName | undefined {
  return sessionRegistryState(host).registeredName
}

/** `Cut`: si la sesión quedó registrada, esperando al alta si está en curso. */
export function whenSessionRegistered(host: object = processHost): Promise<boolean> {
  const state = sessionRegistryState(host)
  return state.registration ?? Promise.resolve(state.registered)
}
