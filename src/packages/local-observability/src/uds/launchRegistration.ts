/**
 * El alta de la sesión en el registro al arrancar: el bloque de arranque de
 * 2.1.283 (`chunk-bdv29443.js`) que instala `HH().restoreSetAsideName`,
 * registra con `KNt` salvo que la sesión de reserva esté aparcada (`OA`) y,
 * sólo si quedó registrada, fija el nombre de `--name` con `Gkr` y cuenta las
 * sesiones vivas con `xut`.
 *
 * Las piezas ya portadas llegan inyectadas: esto sólo las compone en el orden
 * de la referencia, para que el arranque real las llame.
 */
import { normalizeSessionName } from './sessionNameState.ts'
import { sanitizeSessionName, type RegisteredName, type RestoreOptions, type StartupNamingOptions } from './sessionRename.ts'

/** Umbral a partir del cual el arranque informa de sesiones concurrentes. */
const CONCURRENT_SESSIONS_THRESHOLD = 2

export type LaunchRegistrationDeps = {
  /** `OA`: la sesión de reserva está aparcada y no se registra todavía. */
  isSpareParked: () => boolean
  /** Asigna `HH().restoreSetAsideName`. */
  installRestoreSetAsideName: (restore: (name: string, source: string) => void) => void
  /** `sae`, ya ligado al almacenamiento de la sesión. */
  restoreSessionName: (name: string, options: RestoreOptions) => void
  /** `KNt`: el alta en el registro; `true` si quedó registrada. */
  register: () => Promise<boolean>
  /** `Y`. */
  currentSessionId: () => string
  /** `Xt`: el nombre de `--name`, ya saneado. */
  sessionNameArg?: string
  /** `oJ`: el tipo de sesión que declara quien la lanzó; `undefined` si la lanzó una persona. */
  peerSessionKind: () => unknown
  /** `Te`: la sesión no es interactiva. */
  nonInteractive: () => boolean
  /** `Gkr`, ya ligado a su contexto de renombre. */
  runStartupNaming: (options: StartupNamingOptions) => Promise<void>
  /** `eF`, ya ligado al almacenamiento de la sesión. */
  writeRegisteredName: (name: string, source: string, givenAtLaunch: boolean | undefined) => Promise<unknown>
  /** `kv`. */
  registeredName: () => RegisteredName | undefined
  /** `Sp`: el título actual de la sesión dada. */
  currentTitle: (sessionId: string) => string | undefined
  /** `xM`. */
  setTitle: (title: string) => void
  /** `Jve`. */
  setAgentName: (name: string) => void
  /** `xut`: las sesiones vivas de la máquina. */
  countLiveSessions: () => Promise<number>
  emit: (event: string, data: Record<string, unknown>) => void
}

/**
 * `jrt`: el título puede seguir al nombre si no hay título, o si el título es
 * el nombre anterior o el nuevo. Un título distinto lo puso alguien aparte.
 */
export function titleIsReplaceable(title: string | undefined, previousName: string, newName: string | undefined): boolean {
  const sanitized = title && sanitizeSessionName(title)
  if (!sanitized) return true
  const key = normalizeSessionName(sanitized)
  return key === normalizeSessionName(previousName) || (newName !== undefined && key === normalizeSessionName(newName))
}

export async function registerAtLaunch(deps: LaunchRegistrationDeps): Promise<void> {
  deps.installRestoreSetAsideName((name, source) => {
    deps.restoreSessionName(name, { autoOnly: source === 'auto', source, yieldToLaterRestore: true })
  })
  if (deps.isSpareParked() || !(await deps.register())) return

  const launchSessionId = deps.currentSessionId()
  const launchedByPeer = deps.peerSessionKind() !== undefined
  // La referencia no espera al nombre para contar: las dos van a la vez.
  const naming = deps.runStartupNaming({
    sessionNameArg: deps.sessionNameArg,
    sessionNameArgSource: launchedByPeer ? 'peer' : 'user',
    interactive: !launchedByPeer && !deps.nonInteractive(),
    writeName: (name, source) =>
      deps.writeRegisteredName(name, source, source === 'collision' ? deps.registeredName()?.givenAtLaunch : true),
    onRenamed: (name, previousName) => {
      const title = sanitizeSessionName(name)
      if (deps.currentSessionId() !== launchSessionId) return
      if (title && titleIsReplaceable(deps.currentTitle(launchSessionId), previousName, title)) {
        deps.setTitle(title)
        deps.setAgentName(title)
      }
    },
  })
  const counting = deps.countLiveSessions().then(live => {
    if (live >= CONCURRENT_SESSIONS_THRESHOLD) deps.emit('tengu_concurrent_sessions', { num_sessions: live })
  })
  await Promise.all([naming, counting])
}
