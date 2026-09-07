/**
 * Tipos de backend de teammate — porte de
 * `ccnmt: packages/swarm/src/backends/types.ts`.
 *
 * Porte VERBATIM: el archivo fuente no tiene ninguna dependencia externa.
 * Los TRES backends que describe (`tmux`, `iterm2`, `in-process`) siguen
 * siendo el vocabulario correcto — es el contrato de tipos, no la
 * implementación de cada uno (ésas viven en `src/backends/{ITermBackend,
 * TmuxBackend,InProcessBackend,PaneBackendExecutor}.ts`, BLOQUEADAS en este
 * pase: dependen enteras de `adapters/appRuntime.ts`, la fachada de host
 * bindings de ccnmt, ausente en este árbol — ver el hallazgo de este
 * archivo).
 */

/**
 * Tipos de backend disponibles para la ejecución de un teammate.
 * - 'tmux': usa tmux para gestión de panes
 * - 'iterm2': usa splits nativos de iTerm2 vía el CLI `it2`
 * - 'in-process': corre el teammate en el mismo proceso con contexto aislado
 */
export type BackendType = 'tmux' | 'iterm2' | 'in-process'

/** Subconjunto de `BackendType` — sólo los backends basados en panes. */
export type PaneBackendType = 'tmux' | 'iterm2'

/** Identificador opaco de un pane gestionado por un backend. */
export type PaneId = string

/** Resultado de crear un nuevo pane de teammate. */
export type CreatePaneResult = {
  paneId: PaneId
  isFirstTeammate: boolean
}

/** Discrimina si un tipo de backend usa panes de terminal. */
export function isPaneBackend(type: BackendType): type is PaneBackendType {
  return type === 'tmux' || type === 'iterm2'
}

/** Interfaz para los backends de gestión de panes. */
export type PaneBackend = {
  readonly type: BackendType
  readonly displayName: string
  readonly supportsHideShow: boolean
  isAvailable(): Promise<boolean>
  isRunningInside(): Promise<boolean>
  createTeammatePaneInSwarmView(
    name: string,
    color: string,
  ): Promise<CreatePaneResult>
  sendCommandToPane(
    paneId: PaneId,
    command: string,
    useExternalSession?: boolean,
  ): Promise<void>
  setPaneBorderColor(
    paneId: PaneId,
    color: string,
    useExternalSession?: boolean,
  ): Promise<void>
  setPaneTitle(
    paneId: PaneId,
    name: string,
    color: string,
    useExternalSession?: boolean,
  ): Promise<void>
  enablePaneBorderStatus(
    windowTarget?: string,
    useExternalSession?: boolean,
  ): Promise<void>
  rebalancePanes(windowTarget: string, hasLeader: boolean): Promise<void>
  killPane(paneId: PaneId, useExternalSession?: boolean): Promise<boolean>
  hidePane(paneId: PaneId, useExternalSession?: boolean): Promise<boolean>
  showPane(
    paneId: PaneId,
    targetWindowOrPane: string,
    useExternalSession?: boolean,
  ): Promise<boolean>
}

export type BackendDetectionResult = {
  backend: PaneBackend
  isNative: boolean
  needsIt2Setup?: boolean
}

export type TeammateIdentity = {
  name: string
  teamName: string
  color?: string
  planModeRequired?: boolean
}

export type TeammateSpawnConfig = TeammateIdentity & {
  prompt: string
  cwd: string
  model?: string
  systemPrompt?: string
  systemPromptMode?: 'default' | 'replace' | 'append'
  worktreePath?: string
  parentSessionId: string
  permissions?: string[]
  allowPermissionPrompts?: boolean
}

export type TeammateSpawnResult = {
  success: boolean
  agentId: string
  error?: string
  abortController?: AbortController
  taskId?: string
  paneId?: PaneId
}

export type TeammateMessage = {
  text: string
  from: string
  color?: string
  timestamp?: string
  summary?: string
}

export type TeammateExecutor = {
  readonly type: BackendType
  isAvailable(): Promise<boolean>
  spawn(config: TeammateSpawnConfig): Promise<TeammateSpawnResult>
  sendMessage(agentId: string, message: TeammateMessage): Promise<void>
  terminate(agentId: string, reason?: string): Promise<boolean>
  kill(agentId: string): Promise<boolean>
  isActive(agentId: string): Promise<boolean>
}
