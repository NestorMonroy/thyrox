/**
 * Barrel del porte de `@claude-code-how-works/swarm` (ccnmt) a thyrox.
 *
 * NO es un porte literal de `ccnmt: packages/swarm/src/index.ts` — ese
 * archivo reexporta ~30 símbolos de módulos BLOQUEADOS en este pase
 * (backends de pane, mailbox de E/S, runtime de spawn, adapters de host,
 * etc.). Reexportarlos igual habría producido un barrel que falla al
 * importarse. Este archivo reexporta ÚNICAMENTE lo que este pase portó
 * de verdad — ver el `alcance-*` de la iniciativa para el mapa completo
 * porte/bloqueo por archivo.
 *
 * Dos módulos NO se reexportan aquí a propósito, por la MISMA razón que
 * el `src/index.ts` real tampoco lo hace: `teammateContext.ts` (=
 * `teammateContextAlias.ts`) y `teammateState.ts`. Sus consumidores los
 * importan directo (`./teammateContext.js`, `./teammateState.js`) — el
 * barrel real de la fuente hace exactamente lo mismo.
 */

export * from './errors.js'

export type {
  SwarmHostDeps,
  HostApiProvider,
  HostToolRegistry,
  HostPermissionGate,
  HostCompaction,
  HostContextProvider,
  HostSessionManager,
  HostEventSink,
  HostHookCallbacks,
  HostFileSystem,
  HostTerminalBackend,
  TerminalEnvironment,
  PaneCreateOptions,
  PaneHandle,
  HostTaskSystem,
  HostTask,
  HostUIState,
  HostWorktreeManager,
  HostEnvironment,
} from './types/deps.js'

export type {
  BackendType,
  PaneBackendType,
  PaneId,
  CreatePaneResult,
  PaneBackend,
  BackendDetectionResult,
  TeammateSpawnConfig as BackendTeammateSpawnConfig,
  TeammateSpawnResult as BackendTeammateSpawnResult,
  TeammateMessage as BackendTeammateMessage,
  TeammateExecutor,
} from './backends/types.js'
export { isPaneBackend } from './backends/types.js'

export {
  MAILBOX_POLL_INTERVAL_MS,
  PERMISSION_POLL_INTERVAL_MS,
  TEAMMATE_MESSAGES_UI_CAP,
  LOCK_OPTIONS,
  ENV,
} from './types/constants.js'

export {
  TEAM_LEAD_NAME,
  SWARM_SESSION_NAME,
  SWARM_VIEW_WINDOW_NAME,
  TMUX_COMMAND,
  HIDDEN_SESSION_NAME,
  getSwarmSocketName,
  TEAMMATE_COMMAND_ENV_VAR,
  TEAMMATE_COLOR_ENV_VAR,
  PLAN_MODE_REQUIRED_ENV_VAR,
} from './core/constants.js'

export { TEAMMATE_SYSTEM_PROMPT_ADDENDUM } from './core/teammatePromptAddendum.js'

export type { AgentColorName } from './core/teammateColors.js'
export {
  AGENT_COLORS,
  assignTeammateColor,
  getTeammateColor,
  clearTeammateColors,
} from './core/teammateColors.js'

export {
  sanitizeName,
  sanitizeAgentName,
  inputSchema,
  getTeamDir,
  getTeamFilePath,
  readTeamFile,
  readTeamFileAsync,
  writeTeamFileAsync,
  updateTeamFileAsync,
  removeTeammateFromTeamFile,
  addHiddenPaneId,
  removeHiddenPaneId,
  removeMemberFromTeam,
  removeMemberByAgentId,
  setMemberMode,
  syncTeammateMode,
  setMultipleMemberModes,
  setMemberActive,
  registerTeamForSessionCleanup,
  unregisterTeamForSessionCleanup,
  cleanupSessionTeams,
  cleanupTeamDirectories,
} from './core/teamHelpers.js'
export type {
  SpawnTeamOutput,
  CleanupOutput,
  TeamAllowedPath,
  TeamFile,
  Input as TeamHelpersInput,
  Output as TeamHelpersOutput,
} from './core/teamHelpers.js'

export * from './mailbox/protocolMessages.js'

export type {
  TeammateIdentity as TaskTeammateIdentity,
  InProcessTeammateTaskState,
} from './tasks/types.js'
export { isInProcessTeammateTask, appendCappedMessage } from './tasks/types.js'

export { unlinkWindowsReparsePoints } from './worktree/safeRemoval.js'
export { safelyIgnored } from './worktree/safeIgnore.js'
export { installPrepareCommitMsgHook } from './worktree/postCommitAttribution.js'

export type { TeamSummary, TeammateStatus } from './teamDiscovery.js'
export { getTeammateStatuses } from './teamDiscovery.js'

export {
  PaneBackendExecutor,
  createPaneBackendExecutor,
} from './backends/PaneBackendExecutor.js'

export type {
  It2InstallResult,
  It2VerifyResult,
  PythonPackageManager,
} from './backends/it2Setup.js'
export {
  detectPythonPackageManager,
  getPreferTmuxOverIterm2,
  getPythonApiInstructions,
  installIt2,
  markIt2SetupComplete,
  setPreferTmuxOverIterm2,
  verifyIt2Setup,
} from './backends/it2Setup.js'

export {
  detectAndGetBackend,
  ensureBackendsRegistered,
  getBackendByType,
  getCachedBackend,
  getCachedDetectionResult,
  getInProcessBackend,
  getResolvedTeammateMode,
  getTeammateExecutor,
  isInProcessEnabled,
  markInProcessFallback,
  registerITermBackend,
  registerTmuxBackend,
  resetBackendDetection,
} from './backends/registry.js'
export { TmuxBackend } from './backends/TmuxBackend.js'
export { ITermBackend } from './backends/ITermBackend.js'

export {
  tryClaimNextTask,
  waitForNextPromptOrShutdown,
} from './runtime/pollForPromptOrShutdown.js'
