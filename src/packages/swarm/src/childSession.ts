/**
 * Si esta sesión es hija de otra y qué superficie la conduce: porte de `kFe`,
 * `nUr`, `cFt`, `dF`, `sYo`, `F2o` y `C` (`chunk-jzycvw5e.js`) de 2.1.283.
 *
 * Una sesión hija la lanza otra sesión con `THYROX_CODE_CHILD_SESSION`. Si
 * esa variable además está en el entorno GLOBAL de tmux, la hereda cualquier
 * shell nueva del servidor tmux —el marcador es «ambiente»— y deja de probar
 * que un modelo lanzó esta sesión: la sonda lo distingue.
 */
import { spawnSync } from 'node:child_process'

import { getIsInteractive } from '@thyrox/app-host/bootstrap/state.js'
import { isTruthyFlag, spawnedByAttendedSession } from '@thyrox/config/entrypoint'
import { subprocessEnv } from '@thyrox/shell/subprocessEnv.js'
import { whichSync } from '@thyrox/shell/which.js'

import { getAgentId, isTeammate } from './teammateState.js'

type Env = Record<string, string | undefined>

/** Lo que las comprobaciones leen del proceso, reunido para poder sustituirlo. */
export type ChildSessionHost = {
  env: Env
  stdinIsTTY: boolean
  stdoutIsTTY: boolean
  /** `_u`: la sesión corre contra una terminal. */
  isInteractive: boolean
  /** `MUo`: la lanzó una sesión con una persona delante. */
  spawnedByAttendedSession: boolean
}

export const processChildSessionHost: ChildSessionHost = {
  get env() {
    return process.env
  },
  get stdinIsTTY() {
    return process.stdin.isTTY === true
  },
  get stdoutIsTTY() {
    return process.stdout.isTTY === true
  },
  get isInteractive() {
    return getIsInteractive()
  },
  get spawnedByAttendedSession() {
    return spawnedByAttendedSession()
  },
}

export type AmbientMarkerState = 'ambient' | 'absent' | 'unknown'

/** La línea que `tmux show-environment -g` imprime cuando el marcador es global. */
export const CHILD_SESSION_MARKER = 'THYROX_CODE_CHILD_SESSION='
/** `C`: cuánto se espera a tmux antes de no saber. */
const TMUX_PROBE_TIMEOUT_MS = 250

/** `F2o`. */
export function hasChildSessionMarker(environment: string): boolean {
  return environment.split('\n').some(line => line.startsWith(CHILD_SESSION_MARKER))
}

export type TmuxProbeDeps = {
  env: Env
  which: (command: string) => string | null
  run: (command: string, args: string[]) => { status: number | null; stdout: string }
}

const processTmuxProbeDeps: TmuxProbeDeps = {
  get env() {
    return process.env
  },
  which: whichSync,
  run: (command, args) => {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: TMUX_PROBE_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
      cwd: undefined,
      env: subprocessEnv(),
      windowsHide: true,
    })
    return { status: result.status, stdout: result.stdout ?? '' }
  },
}

/** `C`: fuera de tmux no hay marcador ambiente; dentro, se pregunta al servidor. */
export function probeTmuxChildSessionMarker(deps: TmuxProbeDeps = processTmuxProbeDeps): AmbientMarkerState {
  if (!deps.env.TMUX) return 'absent'
  const tmux = deps.which('tmux')
  if (tmux === null) return 'unknown'
  let result: ReturnType<TmuxProbeDeps['run']>
  try {
    result = deps.run(tmux, ['show-environment', '-g'])
  } catch {
    return 'unknown'
  }
  if (result.status !== 0) return 'unknown'
  return hasChildSessionMarker(result.stdout) ? 'ambient' : 'absent'
}

/** `f`: la sonda corre una vez; si lanza, el estado es `unknown`. */
function memoize(probe: () => AmbientMarkerState): () => AmbientMarkerState {
  let state: AmbientMarkerState | null = null
  return () => {
    if (state === null) {
      try {
        state = probe()
      } catch {
        state = 'unknown'
      }
    }
    return state
  }
}

let ambientMarkerProbe = memoize(() => probeTmuxChildSessionMarker())

/** `sYo`: sustituye la sonda; `null` vuelve a la de tmux. */
export function setAmbientMarkerProbe(probe: (() => boolean | AmbientMarkerState) | null): void {
  ambientMarkerProbe = memoize(
    probe === null
      ? () => probeTmuxChildSessionMarker()
      : () => {
          const answer = probe()
          return answer === true ? 'ambient' : answer === false ? 'absent' : answer
        },
  )
}

function isChildSession(host: ChildSessionHost): boolean {
  return isTruthyFlag(host.env.THYROX_CODE_CHILD_SESSION)
}

/**
 * `kFe`: una sesión hija interactiva que no es teammate, cuyo marcador no
 * viene del entorno global de tmux. Forzar la persistencia la apaga.
 */
export function isNestedInteractiveSession(host: ChildSessionHost = processChildSessionHost): boolean {
  if (isTruthyFlag(host.env.THYROX_CODE_FORCE_SESSION_PERSISTENCE)) return false
  if (!(isChildSession(host) && host.isInteractive && !isTeammate())) return false
  return ambientMarkerProbe() !== 'ambient'
}

/**
 * `nUr`: una hija sin terminal en ninguna punta, lanzada por una sesión con
 * una persona delante, y con la sonda segura de que el marcador no es
 * ambiente: la invocó una herramienta de esa sesión.
 */
export function isHeadlessToolCallOfAgentSession(host: ChildSessionHost = processChildSessionHost): boolean {
  if (!isChildSession(host)) return false
  if (host.stdinIsTTY || host.stdoutIsTTY) return false
  if (!host.spawnedByAttendedSession) return false
  return ambientMarkerProbe() === 'absent'
}

/**
 * `cFt`: la sesión corre bajo la superficie de otra sesión del agente. Una
 * hija lo está siempre; dentro de su shell (`CLAUDECODE`, nombre que leen
 * herramientas externas), cuando se pidió no guardar historial o no hay
 * terminal en ninguna punta.
 */
export function isOnAgentSessionSurface(host: ChildSessionHost = processChildSessionHost): boolean {
  if (isChildSession(host)) return true
  if (!isTruthyFlag(host.env.CLAUDECODE)) return false
  return isTruthyFlag(host.env.THYROX_CODE_SKIP_PROMPT_HISTORY) || (!host.stdinIsTTY && !host.stdoutIsTTY)
}

/** `dF`: un modelo conduce la sesión si hay padre declarado, si es teammate o si es hija. */
export function isModelDrivenSession(parentSessionId: string | undefined, host: ChildSessionHost = processChildSessionHost): boolean {
  return parentSessionId !== undefined || isTeammate() || isChildSession(host)
}

/**
 * `ud`: la sesión es dueña de su fila del registro de sesiones si no es un
 * teammate y no es una hija interactiva anidada. Es la sonda que
 * `setRegistryOwnershipProbe` de `@thyrox/local-observability` espera.
 */
export function ownsSessionRegistryRecord(host: ChildSessionHost = processChildSessionHost): boolean {
  return getAgentId() == null && !isNestedInteractiveSession(host)
}
