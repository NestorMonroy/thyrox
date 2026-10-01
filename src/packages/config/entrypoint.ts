/**
 * Desde dónde se lanzó la sesión (su entrypoint) y qué anfitrión la aloja:
 * la línea de comandos, un SDK, la extensión del editor, la app de escritorio,
 * un entorno remoto, un canal de chat. Cada predicado combina la variable que
 * el anfitrión declara con el estado que el arranque fija una vez.
 *
 * Porte completo de `chunk-jwddn0q9.js` de 2.1.283. Las variables del
 * cliente de referencia `CLAUDE_CODE_*` se leen como `THYROX_CODE_*`, con el
 * mismo intérprete por variable (`str`: recortada y vacía como ausente;
 * `bool`: sólo 1/true/yes/on; `triBool`: además 0/false/no/off como falso
 * declarado). `CLAUDECODE` conserva su nombre: la fija el shell que la sesión
 * abre, y las herramientas externas la leen con ese nombre. Los nombres de
 * anfitrión que la referencia muestra con su marca se muestran con el del
 * producto.
 */
import { PRODUCT_NAME } from './product.ts'

type Env = Record<string, string | undefined>

/** `str`. */
function envString(env: Env, name: string): string | undefined {
  const value = env[name]?.trim()
  return value ? value : undefined
}

/** `Le`. */
export function isTruthyFlag(value: unknown): boolean {
  if (!value) return false
  if (typeof value === 'boolean') return value
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase().trim())
}

/** `Wo`. */
export function isFalsyFlag(value: unknown): boolean {
  if (value === undefined) return false
  if (typeof value === 'boolean') return !value
  return ['0', 'false', 'no', 'off'].includes(String(value).toLowerCase().trim())
}

/** `bool`. */
function envBool(env: Env, name: string): boolean {
  return isTruthyFlag(env[name])
}

/** `triBool`. */
function envTriBool(env: Env, name: string): boolean | undefined {
  const value = env[name]
  if (isTruthyFlag(value)) return true
  if (isFalsyFlag(value)) return false
  return undefined
}

/** `vYn`: los entrypoints que la sesión reconoce. */
export const KNOWN_ENTRYPOINTS: Readonly<Record<string, true>> = {
  cli: true,
  mcp: true,
  'sdk-cli': true,
  'sdk-ts': true,
  'sdk-py': true,
  bench: true,
  'claude-vscode': true,
  'claude-code-github-action': true,
  'local-agent': true,
  local_agent: true,
  'claude-desktop': true,
  remote: true,
  remote_baku: true,
  remote_cowork: true,
  remote_trigger: true,
  remote_cowork_trigger: true,
  remote_desktop: true,
  remote_mobile: true,
  remote_projects: true,
  claude_in_slack: true,
  'claude-in-slack': true,
  'claude-in-teams': true,
  'claude-desktop-3p': true,
  'claude-security': true,
  'ssh-remote': true,
  'claude-coworker': true,
  'claude-coworker-terminal': true,
}
/** `u`. */
const KNOWN_ENTRYPOINT_SET = new Set(Object.keys(KNOWN_ENTRYPOINTS))
/** `r`. */
const DESKTOP_ENTRYPOINTS = new Set(['claude-desktop', 'claude-desktop-3p', 'local-agent'])
/** `p`. */
const THIRD_PARTY_DESKTOP_ENTRYPOINTS = new Set(['claude-desktop-3p', 'local-agent'])
/** `EYn`. */
export const DESKTOP_APP_ENTRYPOINTS: ReadonlySet<string> = new Set(['claude-desktop', 'claude-desktop-3p'])
/** `IUo`. */
export const THIRD_PARTY_DESKTOP_ENTRYPOINT = 'claude-desktop-3p'
/** `s`. */
const COWORK_ENTRYPOINTS = new Set(['remote_cowork', 'remote_cowork_trigger'])
/** `c`. */
const SLACK_ENTRYPOINTS = new Set(['claude_in_slack', 'claude-in-slack'])
/** `_`. */
const REMOTE_HOSTED_ENTRYPOINTS = new Set([
  'remote',
  'remote_baku',
  'remote_cowork',
  'remote_trigger',
  'remote_cowork_trigger',
  'remote_desktop',
  'remote_mobile',
  'remote_projects',
  'claude_in_slack',
  'claude-in-slack',
  'claude-in-teams',
])
/** `S`. */
const REMOTE_CONTROL_ENTRYPOINTS = new Set(['remote', 'remote_desktop', 'remote_mobile', 'remote_projects', 'remote_trigger'])
/** `f`. */
const SETTINGS_HINT_HIDDEN_ENTRYPOINTS = new Set(['claude_in_slack', 'claude-in-slack', 'claude-in-teams', 'remote_trigger', 'remote_cowork_trigger', 'remote_cowork', 'remote_baku'])
/** `O`. */
const ATTENDED_HOST_ENTRYPOINTS = new Set([
  'claude-vscode',
  'claude-desktop',
  'claude-desktop-3p',
  'local-agent',
  'local_agent',
  'remote',
  'remote_desktop',
  'remote_mobile',
  'remote_projects',
  'remote_cowork',
  'ssh-remote',
  'claude-in-slack',
  'claude_in_slack',
  'claude-in-teams',
  'claude-coworker',
  'claude-coworker-terminal',
])
/** `C`. */
const REMOTE_SESSION_ENTRYPOINTS = new Set(['remote', 'remote_projects', 'remote_desktop', 'remote_mobile', 'ssh-remote'])

/** `d`: lo que el arranque fija una vez sobre el anfitrión. */
export class EntrypointHostState {
  entrypoint: string | undefined = undefined
  interactive = false
  spawnedByAttendedSession: boolean | undefined = undefined
  childSession = false
  insideAgentShell = false
  coworkFrameArtifacts = false
  hostScheduledRun = false
  setEntrypoint(entrypoint: string | undefined): void {
    this.entrypoint = entrypoint
  }
  setInteractive(interactive: boolean): void {
    this.interactive = interactive
  }
  setSpawnedByAttendedSession(value: boolean | undefined): void {
    this.spawnedByAttendedSession = value
  }
  setChildSession(value: boolean): void {
    this.childSession = value
  }
  setInsideAgentShell(value: boolean): void {
    this.insideAgentShell = value
  }
  setCoworkFrameArtifacts(value: boolean): void {
    this.coworkFrameArtifacts = value
  }
  setHostScheduledRun(value: boolean): void {
    this.hostScheduledRun = value
  }
}

export type EntrypointContext = {
  env: Env
  state: EntrypointHostState
  /** `dR`: el agente teammate que una extensión declara. */
  teammateAgentId: () => string | undefined
  /** `Te`. */
  isNonInteractive: () => boolean
  argv: () => readonly string[]
}

export const processEntrypointContext: EntrypointContext = {
  get env() {
    return process.env as Env
  },
  state: new EntrypointHostState(),
  teammateAgentId: () => undefined,
  isNonInteractive: () => false,
  argv: () => process.argv,
}

/** Instala lo que otros paquetes aportan: el teammate por extensión y la interactividad. */
export function configureEntrypointContext(parts: Partial<Pick<EntrypointContext, 'teammateAgentId' | 'isNonInteractive'>>): void {
  Object.assign(processEntrypointContext, parts)
}

const entrypointVariable = (ctx: EntrypointContext) => envString(ctx.env, 'THYROX_CODE_ENTRYPOINT')

/** `l`. */
export function isKnownEntrypoint(entrypoint: string): boolean {
  return KNOWN_ENTRYPOINT_SET.has(entrypoint)
}

/** `Nd`: el entrypoint declarado, si es uno conocido. */
export function declaredEntrypoint(ctx: EntrypointContext = processEntrypointContext): string | undefined {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint && isKnownEntrypoint(entrypoint) ? entrypoint : undefined
}

/** `RUo`: el nombre del anfitrión, para mostrarlo. */
export function hostDisplayName(ctx: EntrypointContext = processEntrypointContext): string | undefined {
  switch (declaredEntrypoint(ctx)) {
    case 'claude-desktop':
    case 'claude-desktop-3p':
    case 'remote_desktop':
      return `${PRODUCT_NAME} Desktop`
    case 'remote_mobile':
      return 'Mobile'
    case 'local-agent':
    case 'remote_cowork':
      return 'Cowork'
    case 'claude_in_slack':
    case 'claude-in-slack':
      return `${PRODUCT_NAME} Tag in Slack`
    case 'claude-in-teams':
      return `${PRODUCT_NAME} Tag in Teams`
    case 'claude-code-github-action':
      return 'GitHub Actions'
    default:
      return undefined
  }
}

/** `Gc`. */
export function isDesktopEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint !== undefined && DESKTOP_ENTRYPOINTS.has(entrypoint)
}

/** `Shn`. */
export function desktopAppVersion(ctx: EntrypointContext = processEntrypointContext): string | undefined {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint === 'claude-desktop' || entrypoint === 'local-agent' ? envString(ctx.env, 'THYROX_CODE_DESKTOP_APP_VERSION') : undefined
}

/** `ixe`. */
export function isThirdPartyDesktopEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint !== undefined && THIRD_PARTY_DESKTOP_ENTRYPOINTS.has(entrypoint)
}

/** `i1t`: acepta la forma antigua con guion bajo. */
export function isDesktopEntrypointName(entrypoint: string): boolean {
  return DESKTOP_ENTRYPOINTS.has(entrypoint === 'local_agent' ? 'local-agent' : entrypoint)
}

/** `xUo`: un entrypoint embebido en otra aplicación. */
export function isEmbeddedEntrypoint(entrypoint: string | undefined): boolean {
  return entrypoint !== undefined && (DESKTOP_ENTRYPOINTS.has(entrypoint) || entrypoint === 'claude-vscode' || entrypoint.startsWith('sdk-'))
}

/** `nN`. */
export function hostEntrypoint(ctx: EntrypointContext = processEntrypointContext): string | undefined {
  return ctx.state.entrypoint
}

/** `ere`: la app de escritorio, en la sesión de primer nivel. */
export function isTopLevelDesktopAppSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = hostEntrypoint(ctx)
  return entrypoint !== undefined && DESKTOP_APP_ENTRYPOINTS.has(entrypoint) && !ctx.state.childSession
}

/** `E`. */
export function isDesktopSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = hostEntrypoint(ctx)
  return entrypoint !== undefined && DESKTOP_ENTRYPOINTS.has(entrypoint)
}

/** `k_e`. */
export function isRemoteTriggerEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint === 'remote_trigger' || entrypoint === 'remote_cowork_trigger'
}

/** `i`. */
function hasHostGatewayLineage(ctx: EntrypointContext): boolean {
  return envBool(ctx.env, 'THYROX_CODE_HOST_GATEWAY_LINEAGE') && !!envString(ctx.env, 'THYROX_CODE_HOST_CREDS_FILE')
}

/** `Rz`: el anfitrión gestiona el proveedor a través de su gateway. */
export function isHostManagedGateway(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return (
    envBool(ctx.env, 'THYROX_CODE_PROVIDER_MANAGED_BY_HOST') &&
    envBool(ctx.env, 'THYROX_CODE_USE_GATEWAY') &&
    ((entrypoint !== undefined && DESKTOP_APP_ENTRYPOINTS.has(entrypoint)) || hasHostGatewayLineage(ctx))
  )
}

/** `kYn`. */
export function isHostGatewayLineageManaged(ctx: EntrypointContext = processEntrypointContext): boolean {
  return isHostManagedGateway(ctx) && hasHostGatewayLineage(ctx)
}

/** `xz`. */
export function isRemoteCoworkEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  return entrypointVariable(ctx) === 'remote_cowork'
}

/** `Iz`. */
export function isCoworkEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint !== undefined && COWORK_ENTRYPOINTS.has(entrypoint)
}

/** `Q8e`. */
export function isCoworkSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = hostEntrypoint(ctx)
  return entrypoint !== undefined && COWORK_ENTRYPOINTS.has(entrypoint)
}

/** `TA`. */
export function isSlackEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint !== undefined && SLACK_ENTRYPOINTS.has(entrypoint)
}

/** `PUo`. */
export function isSlackSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = hostEntrypoint(ctx)
  return entrypoint !== undefined && SLACK_ENTRYPOINTS.has(entrypoint)
}

/** `nBe`. */
export function isTeamsEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  return entrypointVariable(ctx) === 'claude-in-teams'
}

/** `whn`. */
export function isChatAppEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  return isSlackEntrypoint(ctx) || isTeamsEntrypoint(ctx)
}

/** `vhn`. */
export function isRemoteHostedEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint !== undefined && REMOTE_HOSTED_ENTRYPOINTS.has(entrypoint)
}

/** `TGr`. */
export function isRemotePrefixedEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  return entrypointVariable(ctx)?.startsWith('remote') === true
}

/** `OUo`. */
export function isRemoteControlSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return Boolean(envBool(ctx.env, 'THYROX_CODE_REMOTE')) && entrypoint !== undefined && REMOTE_CONTROL_ENTRYPOINTS.has(entrypoint)
}

/** `HUo`: si mostrar la pista de settings. */
export function showsSettingsHint(ctx: EntrypointContext = processEntrypointContext): boolean {
  if (isTruthyFlag(envString(ctx.env, 'THYROX_CODE_HIDE_SETTINGS_HINT'))) return false
  const entrypoint = entrypointVariable(ctx)
  return entrypoint === undefined || !SETTINGS_HINT_HIDDEN_ENTRYPOINTS.has(entrypoint)
}

/** `tN`. */
export function isSdkEntrypoint(ctx: EntrypointContext = processEntrypointContext): boolean {
  const entrypoint = entrypointVariable(ctx)
  return entrypoint === 'sdk-ts' || entrypoint === 'sdk-py' || entrypoint === 'sdk-cli'
}

/** `vde`: alguien atiende la sesión. */
export function isAttendedSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const kind = envString(ctx.env, 'THYROX_CODE_SESSION_KIND')
  if (kind === 'bg' || kind === 'daemon' || kind === 'daemon-worker' || ctx.teammateAgentId() !== undefined) return false
  const state = ctx.state
  if (state.interactive) return true
  return !state.childSession && state.entrypoint !== undefined && ATTENDED_HOST_ENTRYPOINTS.has(state.entrypoint)
}

/** `MUo`. */
export function spawnedByAttendedSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  return ctx.state.spawnedByAttendedSession === true
}

/** `Ehn`. */
export function isChildSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  return ctx.state.childSession
}

/** `yu`. */
export function isTopLevelDesktopSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  return isDesktopSession(ctx) && !ctx.state.childSession
}

/** `Z8e`. */
export function isTopLevelCoworkOrLocalAgentSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const { entrypoint, childSession } = ctx.state
  return entrypoint !== undefined && (COWORK_ENTRYPOINTS.has(entrypoint) || entrypoint === 'local-agent' || entrypoint === 'local_agent') && !childSession
}

/** `DUo`. */
export function isTopLevelRemoteSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const { entrypoint, childSession, insideAgentShell } = ctx.state
  return entrypoint !== undefined && REMOTE_SESSION_ENTRYPOINTS.has(entrypoint) && !childSession && !insideAgentShell
}

/** `Ww`. */
export function isTopLevelVsCodeSession(ctx: EntrypointContext = processEntrypointContext): boolean {
  const { entrypoint, childSession, insideAgentShell } = ctx.state
  return entrypoint === 'claude-vscode' && !childSession && !insideAgentShell
}

/** `P6`: sin interacción, y fuera de un anfitrión que la atienda por su cuenta. */
export function isUnhostedNonInteractive(nonInteractive?: boolean, ctx: EntrypointContext = processEntrypointContext): boolean {
  const value = nonInteractive ?? ctx.isNonInteractive()
  const desktopHosted = isTopLevelDesktopSession(ctx) && !ctx.state.insideAgentShell
  return value && !desktopHosted && !isTopLevelVsCodeSession(ctx)
}

/** `Jx`: la sesión corre dentro de un shell que otra sesión abrió. */
export function isInsideAgentShell(ctx: EntrypointContext = processEntrypointContext): boolean {
  return ctx.state.insideAgentShell
}

/** `AGr`. */
export function coworkFrameArtifacts(ctx: EntrypointContext = processEntrypointContext): boolean {
  return ctx.state.coworkFrameArtifacts
}

/** `LUo`. */
export function isHostScheduledRun(ctx: EntrypointContext = processEntrypointContext): boolean {
  return ctx.state.hostScheduledRun
}

/** `D`: fija el entrypoint si nadie lo declaró, y normaliza dos formas. */
export function resolveEntrypoint(nonInteractive: boolean, ctx: EntrypointContext = processEntrypointContext): void {
  const env = ctx.env
  const current = entrypointVariable(ctx)
  if (current) {
    if (current === 'local_agent') env.THYROX_CODE_ENTRYPOINT = 'local-agent'
    if (current === 'cli' && nonInteractive) env.THYROX_CODE_ENTRYPOINT = 'sdk-cli'
    return
  }
  const args = ctx.argv().slice(2)
  const mcp = args.indexOf('mcp')
  if (mcp !== -1 && args[mcp + 1] === 'serve') {
    env.THYROX_CODE_ENTRYPOINT = 'mcp'
    return
  }
  if (isTruthyFlag(envString(env, 'THYROX_CODE_ACTION'))) {
    env.THYROX_CODE_ENTRYPOINT = 'claude-code-github-action'
    return
  }
  env.THYROX_CODE_ENTRYPOINT = nonInteractive ? 'sdk-cli' : 'cli'
}

/** `NUo`: resuelve el entrypoint y fija el estado del anfitrión. */
export function initializeEntrypointHostState(nonInteractive: boolean, ctx: EntrypointContext = processEntrypointContext): void {
  resolveEntrypoint(nonInteractive, ctx)
  const state = ctx.state
  const env = ctx.env
  state.setInteractive(!nonInteractive)
  state.setSpawnedByAttendedSession(envTriBool(env, 'THYROX_CODE_SESSION_ATTENDED'))
  state.setEntrypoint(entrypointVariable(ctx))
  state.setChildSession(envBool(env, 'THYROX_CODE_CHILD_SESSION'))
  state.setInsideAgentShell(envBool(env, 'CLAUDECODE'))
  state.setCoworkFrameArtifacts(envBool(env, 'THYROX_CODE_COWORK_FRAME_ARTIFACTS'))
  state.setHostScheduledRun(envBool(env, 'THYROX_CODE_HOST_SCHEDULED_RUN'))
}

/** `N`: los argumentos antes de `--`. */
function argsBeforeDoubleDash(args: readonly string[]): readonly string[] {
  const separator = args.indexOf('--')
  return separator === -1 ? args : args.slice(0, separator)
}

/** `$Uo`: si la sesión se lanzó para reanudar, continuar, o de cero. */
export function launchResumeMode(args: readonly string[]): 'resume' | 'continue' | 'fresh' {
  const options = argsBeforeDoubleDash(args)
  if (
    options.includes('-r') ||
    options.includes('--resume') ||
    options.includes('--from-pr') ||
    options.some(option => option.startsWith('--resume=') || option.startsWith('--from-pr='))
  )
    return 'resume'
  if (options.includes('-c') || options.includes('--continue')) return 'continue'
  return 'fresh'
}
