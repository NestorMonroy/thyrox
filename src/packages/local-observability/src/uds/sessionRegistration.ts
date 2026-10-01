/**
 * El alta de la sesión en el registro: escribe su archivo pid con lo que
 * otras sesiones necesitan para verla (pid, sesión, directorio, arranque del
 * proceso, versión y protocolo de pares, tipo, entrypoint, dominio de pids,
 * panel de tmux, socket del buzón, nombre), lo retira al salir, y desde ahí
 * sigue los cambios de sesión y de directorio para mantener el nombre y el
 * registro al día. Mientras el alta corre, toda escritura del archivo pid
 * espera detrás de ella.
 *
 * Porte de `nD`, `KNt`, `lD`, `ZM`, `QM`, `QKn`, `opn`, `xy`, `YKn`, `XKn`,
 * `JKn` y `FNr` (`chunk-t6pwageh.js`), y de `tUr` (`chunk-q8a07cv0.js`) de
 * 2.1.283. El nombre derivado (`xs`, en `@thyrox/tool-registry`) y las señales
 * de cambio de sesión y de directorio (`Zd`, `kzr`) llegan como dependencias.
 */
import { unlinkSync } from 'node:fs'
import { chmod, mkdir, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { getOriginalCwd, getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { type EntrypointContext, isInsideAgentShell, isTopLevelDesktopSession, processEntrypointContext } from '@thyrox/config/entrypoint'
import { getPlatform } from '@thyrox/config/platform'

import { errorMessage } from '../errorHelpers.ts'
import { formatStorageError } from './inboxKeys.ts'
import { pidFileKey, setSessionName, updatePidFile } from './pidFileRecord.ts'
import { currentPidDomain, spawnCommand, startTokenCache } from './processIdentity.ts'
import { type SessionKind, sessionKind } from './sessionKind.ts'
import { sanitizeSessionName } from './sessionRename.ts'
import { stableAddressEnabled } from './sessionRegistryState.ts'
import { type SpareDeps, type SpareStorage, isSpareClaimed, processSpareDeps, startSpareClaimPoll } from './spareSession.ts'

/** `YKn`. */
export const PEER_PROTOCOL_VERSION = 1
/** `XKn`. */
export const PEER_FEATURE_NOTIFY_IDLE = 'notify_idle'
/** `tUr`. */
export const PEER_FEATURE_REPLY_ACROSS_DEFAULT_DIRS = 'reply_across_default_dirs'
/** `JKn`. */
export const PEER_FEATURE_ARTIFACT_YIELD = 'artifact_yield'
/** `FNr`. */
const HOST_SESSION_ID = /^local_[0-9a-f-]{8,72}$/
/** El socket de tmux sólo se consulta con un plazo corto. */
const TMUX_QUERY_TIMEOUT_MS = 1000

export type RegistrationStorage = SpareStorage & { delete(key: ReturnType<typeof pidFileKey>): Promise<unknown> }

export type SessionSwitchListener = (sessionId: string, reason: string) => void

export type RegistrationDeps = SpareDeps & {
  /** `Y`. */
  sessionId: () => string
  /** `we`. */
  cwd: () => string
  version: string
  /** `lD`. */
  tmuxPane: () => Promise<string | undefined>
  /** `nc`. */
  processStartToken: (pid: number) => Promise<string | undefined>
  /** `HP`. */
  pidDomain: () => Promise<string>
  /** `ZM`. */
  peerFeatures: () => string[]
  /** `QKn`. */
  hostSessionId: () => string | undefined
  /** `xs`. */
  derivedName: (cwd: string, sessionId: string) => string
  /** `Nq`. */
  stableAddress: () => boolean
  /** `process.on('exit')`. */
  onExit: (listener: () => void) => void
  /** `gt`. */
  registerCleanup: (cleanup: () => Promise<void>) => void
  /** `Zd`. */
  onSessionSwitch: (listener: SessionSwitchListener) => void
  /** `kzr`. */
  onOriginalCwdChange: (listener: (cwd: string) => void) => void
}

type Env = Record<string, string | undefined>
const envOf = (deps: RegistrationDeps): Env => deps.kindHost().env

/** `str`: la variable recortada; vacía cuenta como ausente. */
function envString(env: Env, name: string): string | undefined {
  const value = env[name]?.trim()
  return value ? value : undefined
}

/** `lD`: el panel de tmux donde corre la sesión, como `sesión:ventana.panel`. */
export async function tmuxPaneTarget(
  env: Env,
  run: (command: string, args: string[], options: { timeout: number; env: Env }) => Promise<{ code: number; stdout: string }>,
): Promise<string | undefined> {
  const pane = env.TMUX_PANE
  if (!env.TMUX || !pane) return undefined
  const { code, stdout } = await run('tmux', ['display-message', '-p', '-t', pane, '#{session_name}:#{window_id}.#{pane_id}'], { timeout: TMUX_QUERY_TIMEOUT_MS, env })
  return code === 0 ? stdout.trim() : undefined
}

/** `QM`: si el runtime sabe leer el pid del par de un socket. */
export function supportsPeerPid(platform: string, runtime: { ant?: { getPeerPid?: unknown } } | undefined): boolean {
  if (platform === 'windows') return false
  return runtime !== undefined && typeof runtime.ant?.getPeerPid === 'function'
}

/** `ZM`: lo que esta sesión sabe hacer con sus pares. */
export function peerFeatures(peerPidSupported: boolean): string[] {
  return [PEER_FEATURE_NOTIFY_IDLE, ...(peerPidSupported ? [PEER_FEATURE_REPLY_ACROSS_DEFAULT_DIRS] : []), PEER_FEATURE_ARTIFACT_YIELD]
}

/** `opn`. */
export function validHostSessionId(value: unknown): string | undefined {
  return typeof value === 'string' && HOST_SESSION_ID.test(value) ? value : undefined
}

/** `QKn`: la sesión del anfitrión de escritorio, sólo en la sesión de primer nivel y fuera de un shell del agente. */
export function hostSessionId(ctx: EntrypointContext = processEntrypointContext): string | undefined {
  if (!isTopLevelDesktopSession(ctx) || isInsideAgentShell(ctx)) return undefined
  return validHostSessionId(ctx.env.THYROX_CODE_HOST_SESSION_ID)
}

/** `xy`: si el cambio de sesión adopta la conversación (y con ella su nombre). */
export function adoptsConversation(reason: string): boolean {
  switch (reason) {
    case 'resume':
    case 'remote_attach':
    case 'spare_claim':
    case 'hydrate':
    case 'startup_custom_id':
      return true
    default:
      return false
  }
}

/** `nD`: da de alta la sesión en el registro. */
export async function registerSession(storage: RegistrationStorage | undefined, deps: RegistrationDeps): Promise<boolean> {
  if (!deps.ownsRegistryRecord()) return false
  const state = deps.state()
  const settled = Promise.withResolvers<void>()
  state.setPidFileWriteChain(settled.promise)
  const env = envOf(deps)
  const kind: SessionKind | 'interactive' = sessionKind(deps.kindHost()) ?? 'interactive'
  state.bornSpare = kind === 'bg' && envString(env, 'THYROX_BG_SOURCE') === 'spare'
  const announcesSpare = state.bornSpare && !(await isSpareClaimed(storage, deps))
  const sessionName = envString(env, 'THYROX_CODE_SESSION_NAME')
  const launchName = sessionName ? sanitizeSessionName(sessionName) || undefined : undefined
  const dir = deps.sessionsDir()
  const path = join(dir, `${deps.pid}.json`)
  deps.onExit(() => {
    try {
      unlinkSync(path)
    } catch {
      // Salida de mejor esfuerzo: el barrido retira lo que quede.
    }
  })
  deps.registerCleanup(async () => {
    if (storage) {
      try {
        await storage.delete(pidFileKey(deps.pid))
      } catch {
        // Idem.
      }
      return
    }
    try {
      await unlink(path)
    } catch {
      // Idem.
    }
  })
  try {
    const tmux = await deps.tmuxPane()
    const jobDir = envString(env, 'THYROX_JOB_DIR')
    await mkdir(dir, { recursive: true, mode: 0o700 })
    await chmod(dir, 0o700)
    const initialName =
      launchName !== undefined
        ? { name: launchName, source: 'user' }
        : kind === 'interactive'
          ? { name: deps.derivedName(deps.cwd(), deps.sessionId()), source: 'derived' }
          : undefined
    const record = JSON.stringify({
      pid: deps.pid,
      sessionId: deps.sessionId(),
      cwd: deps.cwd(),
      startedAt: deps.now(),
      procStart: await deps.processStartToken(deps.pid),
      version: deps.version,
      peerProtocol: PEER_PROTOCOL_VERSION,
      peerFeatures: deps.peerFeatures(),
      kind,
      entrypoint: envString(env, 'THYROX_CODE_ENTRYPOINT'),
      hostSessionId: deps.hostSessionId(),
      pidDomain: await deps.pidDomain(),
      ...(tmux && { tmux }),
      messagingSocketPath: envString(env, 'THYROX_CODE_MESSAGING_SOCKET'),
      name: initialName?.name,
      nameSource: initialName?.source === 'derived' ? 'derived' : undefined,
      nameSince: deps.now(),
      logPath: envString(env, 'THYROX_CODE_SESSION_LOG'),
      agent: envString(env, 'THYROX_CODE_AGENT'),
      jobId: kind === 'bg' && jobDir ? basename(jobDir) : undefined,
      spare: announcesSpare ? true : undefined,
    })
    if (storage) {
      const written = await storage.write(pidFileKey(deps.pid), record, { publishDiscipline: 'inPlace' })
      if (!written.ok) {
        deps.log(`[concurrentSessions] v5 pid-file write failed: ${formatStorageError(written.error)}`)
        throw Error('v5 pid-file write failed')
      }
    } else await writeFile(path, record)
    state.registered = true
    if (announcesSpare) startSpareClaimPoll(storage, deps)
    if (initialName && state.registeredName === undefined) state.setRegisteredName(initialName.name, initialName.source, initialName.source === 'derived' ? undefined : true)
    state.liveSessionId = deps.sessionId()
    deps.onSessionSwitch((sessionId, reason) => {
      const current = deps.state()
      const { registeredName, liveSessionId } = current
      current.liveSessionId = sessionId
      if (deps.stableAddress() && adoptsConversation(reason)) {
        current.adoptions++
        const setAside = current.conversationNames.get(sessionId)
        const setsAside = registeredName !== undefined && registeredName.source !== 'derived' && !registeredName.givenAtLaunch && registeredName.sessionId !== sessionId
        if (setsAside && liveSessionId !== undefined) current.setAsideRegisteredName(liveSessionId, sessionId)
        if (registeredName?.source === 'derived' || setsAside) {
          void setSessionName(deps.derivedName(deps.cwd(), sessionId), storage, 'derived', undefined, deps)
          if (setAside !== undefined) current.restoreSetAsideName?.(setAside.name, setAside.source)
        } else if (registeredName !== undefined) current.registeredName = { ...registeredName, sessionId }
      }
      void updatePidFile({ sessionId, parkedJobId: undefined, updatedAt: deps.now() }, storage, deps)
    })
    deps.onOriginalCwdChange(cwd => {
      if (deps.stableAddress() && deps.state().registeredName?.source === 'derived') void setSessionName(deps.derivedName(cwd, deps.sessionId()), storage, 'derived', undefined, deps)
      void updatePidFile({ cwd }, storage, deps)
    })
    return true
  } catch (error) {
    deps.log(`[concurrentSessions] register failed: ${errorMessage(error)}`)
    return false
  } finally {
    settled.resolve()
  }
}

/** `KNt`: el alta, guardada como la registración en curso del estado. */
export function startSessionRegistration(storage: RegistrationStorage | undefined, deps: RegistrationDeps): Promise<boolean> {
  const state = deps.state()
  const registration = registerSession(storage, deps)
  state.registration = registration
  return registration
}

declare const MACRO: { VERSION: string } | undefined

/** Lo que el alta recibe de paquetes que dependen de éste: el nombre derivado, la limpieza al cerrar y las dos señales. */
export type RegistrationHostParts = Pick<RegistrationDeps, 'derivedName' | 'registerCleanup' | 'onSessionSwitch' | 'onOriginalCwdChange'>

/** Las dependencias del proceso, con las cuatro partes del anfitrión declaradas por quien arranca la sesión. */
export function processRegistrationDeps(parts: RegistrationHostParts): RegistrationDeps {
  return {
    ...processSpareDeps,
    get pid() {
      return process.pid
    },
    sessionId: () => getSessionId(),
    cwd: () => getOriginalCwd(),
    version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0-dev',
    tmuxPane: () => tmuxPaneTarget(process.env, spawnCommand),
    processStartToken: pid => startTokenCache.get(pid),
    pidDomain: () => currentPidDomain(getPlatform()),
    peerFeatures: () => peerFeatures(supportsPeerPid(getPlatform(), typeof Bun === 'undefined' ? undefined : (Bun as { ant?: { getPeerPid?: unknown } }))),
    hostSessionId: () => hostSessionId(),
    stableAddress: () => stableAddressEnabled(),
    onExit: listener => void process.on('exit', listener),
    ...parts,
  }
}
