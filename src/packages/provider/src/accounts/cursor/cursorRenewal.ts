/**
 * La renovación de una conexión de Cursor, que no tiene refresh token. Se
 * empuja a `cursor-agent` a refrescar su sesión con una llamada autenticada
 * (`--list-models`, nunca `login`) y se vuelven a leer las dos credenciales
 * del anfitrión; renueva la primera que traiga un token distinto del guardado.
 *
 * Porte de `omniroute: src/lib/cursor/renewal.ts` (MIT).
 */
import { homedir } from 'node:os'

import { sanitizeErrorMessage } from '../../sanitize/errorSanitization.ts'
import { type CursorAgentLookup, type CursorAgentRun, resolveCursorAgentBinary, runCursorAgent } from './cursorAgent.ts'
import { type CursorCredentialLookup, type IdeAuthOptions, tryAgentAuth, tryIdeAuth } from './cursorTokenExtractor.ts'

const NUDGE_TIMEOUT_MS = 10_000
const STATUS_TIMEOUT_MS = 5_000
const AVAILABILITY_CACHE_TTL_MS = 5 * 60 * 1000
const IDE_AUTH_DEDUP_TTL_MS = 5_000
const NOT_AUTHENTICATED = /Authentication required|Not logged in/i

/** La vida del token importado de Cursor, en segundos. */
export const CURSOR_TOKEN_LIFETIME_S = 86400
/**
 * La espera al candado de SQLite cuando lee el barrido: comparte el bucle de
 * eventos con el servidor, así que falla rápido y reintenta en otra pasada.
 */
export const BACKGROUND_IDE_AUTH_TIMEOUT_MS = 250

export interface CursorAgentAvailability {
  available: boolean
  binaryPath: string | null
}

type CommandKind = 'nudge' | 'status'
type AgentRunner = (binary: string, args: string[], timeoutMs: number, options?: { sigkillFollowupMs?: number }) => Promise<CursorAgentRun>

export interface CursorAgentProbeDeps {
  resolveBinary?: (lookup: CursorAgentLookup) => string | null
  run?: AgentRunner
  now?: () => number
}

/**
 * La disponibilidad y el empujón de `cursor-agent`. Hay una sola sesión del
 * CLI por anfitrión: como mucho un proceso vivo por orden, y una llamada
 * concurrente de la misma orden comparte su resultado.
 */
export function createCursorAgentProbe(deps: CursorAgentProbeDeps = {}) {
  const resolveBinary = deps.resolveBinary ?? resolveCursorAgentBinary
  const run = deps.run ?? runCursorAgent
  const now = deps.now ?? Date.now
  const inFlight = new Map<CommandKind, Promise<CursorAgentRun>>()
  let cached: { result: CursorAgentAvailability; expiresAt: number } | null = null

  async function locked(kind: CommandKind, spawn: () => Promise<CursorAgentRun>): Promise<CursorAgentRun> {
    const existing = inFlight.get(kind)
    if (existing) return existing
    const promise = spawn()
    inFlight.set(kind, promise)
    try {
      return await promise
    } finally {
      if (inFlight.get(kind) === promise) inFlight.delete(kind)
    }
  }

  const withFollowup = (timeoutMs: number) => ({ sigkillFollowupMs: Math.max(1, Math.floor(timeoutMs / 2)) })

  /** El empujón: la única orden que se lanza sin atención. Los argumentos no se aceptan. */
  function nudge(binary: string): Promise<CursorAgentRun> {
    return locked('nudge', () => run(binary, ['--list-models'], NUDGE_TIMEOUT_MS, withFollowup(NUDGE_TIMEOUT_MS)))
  }

  /** Sin efecto observable y sin buscar en el PATH: una ejecución sin atención no confía en él. */
  async function checkAvailability(): Promise<CursorAgentAvailability> {
    const binary = resolveBinary({ allowPathFallback: false })
    if (!binary) return { available: false, binaryPath: null }
    let result: CursorAgentRun
    try {
      result = await locked('status', () => run(binary, ['status', '--format', 'json'], STATUS_TIMEOUT_MS, withFollowup(STATUS_TIMEOUT_MS)))
    } catch {
      return { available: false, binaryPath: binary }
    }
    try {
      const parsed = JSON.parse(result.stdout) as { isAuthenticated?: unknown }
      return { available: parsed.isAuthenticated === true, binaryPath: binary }
    } catch {
      // Una versión sin `--format json`: disponible salvo que diga lo contrario.
      return { available: !NOT_AUTHENTICATED.test(`${result.stdout}\n${result.stderr}`), binaryPath: binary }
    }
  }

  /** Para quien sólo informa: cinco minutos de caché. El barrido pregunta sin caché. */
  async function cachedAvailability(): Promise<CursorAgentAvailability> {
    const at = now()
    if (cached && cached.expiresAt > at) return cached.result
    const result = await checkAvailability()
    cached = { result, expiresAt: at + AVAILABILITY_CACHE_TTL_MS }
    return result
  }

  return { nudge, checkAvailability, cachedAvailability }
}

/**
 * Varias conexiones de Cursor vencen en la misma pasada y todas leerían la
 * misma base del anfitrión: la lectura se comparte cinco segundos por `home`.
 */
export function createDedupedIdeAuth(deps: { tryIdeAuth?: (options?: IdeAuthOptions) => Promise<CursorCredentialLookup>; now?: () => number; home?: () => string } = {}) {
  const read = deps.tryIdeAuth ?? tryIdeAuth
  const now = deps.now ?? Date.now
  const home = deps.home ?? homedir
  let cached: { home: string; promise: Promise<CursorCredentialLookup>; expiresAt: number } | null = null
  return function dedupedIdeAuth(): Promise<CursorCredentialLookup> {
    const at = now()
    const currentHome = home()
    if (cached && cached.home === currentHome && cached.expiresAt > at) return cached.promise
    const promise = read({ timeoutMs: BACKGROUND_IDE_AUTH_TIMEOUT_MS })
    cached = { home: currentHome, promise, expiresAt: at + IDE_AUTH_DEDUP_TTL_MS }
    return promise
  }
}

export type CursorRenewalResult = { status: 'renewed'; accessToken: string; machineId?: string; source: 'cursor-ide' | 'cursor-agent' } | { status: 'unchanged' } | { status: 'error'; error: string }

export interface CursorRenewalDeps {
  ideAuth: () => Promise<CursorCredentialLookup>
  agentAuth: () => Promise<CursorCredentialLookup>
  availability: () => Promise<CursorAgentAvailability>
  nudge: (binary: string) => Promise<unknown>
}

/** Las dependencias reales: la lectura compartida del IDE y la sonda del agente. */
export function defaultCursorRenewalDeps(): CursorRenewalDeps {
  const agent = createCursorAgentProbe()
  return { ideAuth: createDedupedIdeAuth(), agentAuth: () => tryAgentAuth(), availability: agent.checkAvailability, nudge: agent.nudge }
}

export async function renewCursorConnection(current: { accessToken: string; machineId?: string | null }, deps: CursorRenewalDeps): Promise<CursorRenewalResult> {
  try {
    const availability = await deps.availability()
    if (availability.available && availability.binaryPath) {
      try {
        await deps.nudge(availability.binaryPath)
      } catch {
        // Un agente caído no anula la renovación: el IDE puede tener su propio token nuevo.
      }
    }
    const [ide, agent] = await Promise.all([deps.ideAuth(), deps.agentAuth()])
    if (ide.found && ide.accessToken && ide.accessToken !== current.accessToken) return { status: 'renewed', accessToken: ide.accessToken, machineId: ide.machineId, source: 'cursor-ide' }
    if (agent.found && agent.accessToken && agent.accessToken !== current.accessToken) return { status: 'renewed', accessToken: agent.accessToken, source: 'cursor-agent' }
    return { status: 'unchanged' }
  } catch (error) {
    return { status: 'error', error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) }
  }
}

/** Lo que se guarda tras renovar: el token por un día, el estado de error limpio y sin circuito. */
export function buildCursorRenewedUpdate(current: { providerSpecificData?: Record<string, unknown> | null }, result: Extract<CursorRenewalResult, { status: 'renewed' }>, now: string): Record<string, unknown> {
  const { refreshCircuit: _circuit, ...providerSpecificData } = current.providerSpecificData ?? {}
  if (result.machineId) providerSpecificData.machineId = result.machineId
  const expiresAt = new Date(Date.parse(now) + CURSOR_TOKEN_LIFETIME_S * 1000).toISOString()
  return {
    accessToken: result.accessToken,
    expiresAt,
    tokenExpiresAt: expiresAt,
    testStatus: 'active',
    lastHealthCheckAt: now,
    lastError: null,
    lastErrorAt: null,
    lastErrorType: null,
    lastErrorSource: null,
    errorCode: null,
    expiredRetryCount: null,
    expiredRetryAt: null,
    providerSpecificData,
  }
}
