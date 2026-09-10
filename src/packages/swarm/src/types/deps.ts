/**
 * Contrato de dependencias inyectadas del host para el dominio swarm —
 * porte de `ccnmt: packages/swarm/src/types/deps.ts`.
 *
 * NO confundir con `ccnmt: packages/agent/types/deps.ts`
 * (`thyrox: src/packages/agent/agentDeps.ts`, ya portado bajo el nombre
 * `AgentDeps`): son dos archivos DISTINTOS con estructura superficialmente
 * parecida (ambos agregan sub-interfaces `Host*`/`*Dep`), medido con
 * `diff` estructural [PROVEN] — ninguno de los dos reemplaza al otro.
 * `AgentDeps` son las dependencias del BUCLE de un agente (provider,
 * tools, permission, hooks, compaction, context, session — un `swarm?`
 * opcional para mensajería de teammate). `SwarmHostDeps`, este archivo,
 * es la interfaz completa que el HOST (la app REPL de ccnmt) implementa
 * para que el paquete `swarm` opere: API del modelo, registro de
 * herramientas, permisos, compactación, contexto, sesión, eventos,
 * hooks, sistema de archivos, backend de terminal (panes), sistema de
 * tareas, estado de UI, gestor de worktree y entorno — 14 campos, sin
 * relación de sub-conjunto con los 9 de `AgentDeps`. Ver H-DOCS-1170.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `CoreTool`,
 * `ToolResult`, `ToolExecContext` y `CoreMessage` de
 * `@claude-code-how-works/agent` (la superficie pública del paquete
 * hermano). `@thyrox/agent` exporta `CoreTool`/`ToolResult` desde su
 * `index.ts`, pero NO `ToolExecContext` ni `CoreMessage` (viven en
 * `coreTools.ts`/`coreMessages.ts`, sin re-exportar en el barrel público
 * — medido con `grep -n "ToolExecContext\|CoreMessage" index.ts` → sin
 * resultados). Acoplar este paquete a `@thyrox/agent` sólo para los dos
 * símbolos ausentes, sin poder editar su `index.ts` (paquete ajeno, otro
 * agente puede estar trabajándolo en paralelo), se reemplaza por
 * stand-ins locales `unknown`-tipados — igual que `adapters/appRuntime.ts`
 * de la PROPIA fuente hace con la mayoría de sus tipos (`AgentDefinition`,
 * `AgentToolResult`, `AgentProgress` son los tres `unknown` declarados
 * ahí; sólo `Message` re-exporta un tipo real). Ninguna interfaz pierde
 * campos por esta divergencia — sólo la precisión de esos cuatro tipos
 * de dato.
 */

/** Stand-in local de `CoreTool` (ver la divergencia declarada arriba). */
type CoreTool = unknown

/** Stand-in local de `ToolResult` (ver la divergencia declarada arriba). */
type ToolResult = unknown

/** Stand-in local de `ToolExecContext` (ver la divergencia declarada arriba). */
type ToolExecContext = unknown

/** Stand-in local de `CoreMessage` (ver la divergencia declarada arriba). */
type CoreMessage = unknown

export interface HostApiProvider {
  stream(params: {
    systemPrompt: unknown
    messages: CoreMessage[]
    tools: CoreTool[]
    model: string
    abortSignal?: AbortSignal
    [key: string]: unknown
  }): AsyncIterable<unknown>
  getModel(): string
}

export interface HostToolRegistry {
  find(name: string): CoreTool | undefined
  list(): CoreTool[]
  execute(tool: CoreTool, input: unknown, context: ToolExecContext): Promise<ToolResult>
}

export interface HostPermissionGate {
  canUseTool(
    tool: CoreTool,
    input: unknown,
    context: { mode: string; input: unknown; [key: string]: unknown },
  ): Promise<{ allowed: boolean; reason?: string }>
}

export interface HostCompaction {
  maybeCompact(
    messages: CoreMessage[],
    tokenCount: number,
  ): Promise<{
    compacted: boolean
    messages: CoreMessage[]
    tokensSaved?: number
  }>
}

export interface HostContextProvider {
  getSystemPrompt(): Promise<unknown[]>
  getUserContext(): Record<string, string>
  getSystemContext(): Record<string, string>
}

export interface HostSessionManager {
  recordTranscript(messages: CoreMessage[]): Promise<void>
  getSessionId(): string
}

export interface HostEventSink {
  emit(event: unknown): void
}

export interface HostHookCallbacks {
  onTurnStart(state: unknown): Promise<void>
  onTurnEnd(state: unknown): Promise<void>
  /** Stop hook */
  onStop(
    messages: CoreMessage[],
    context: { [key: string]: unknown },
  ): Promise<{
    blockingErrors: string[]
    preventContinuation: boolean
  }>
}

export interface HostFileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  exists(path: string): Promise<boolean>
  rm(path: string, options?: { recursive?: boolean }): Promise<void>
  readdir(path: string): Promise<string[]>
}

export interface HostTerminalBackend {
  detect(): Promise<TerminalEnvironment>
  createPane(options: PaneCreateOptions): Promise<PaneHandle>
  destroyPane(handle: PaneHandle): Promise<void>
  sendToPane(handle: PaneHandle, text: string): Promise<void>
  setPaneVisible(handle: PaneHandle, visible: boolean): Promise<void>
}

export type TerminalEnvironment = {
  type: 'tmux-internal' | 'tmux-external' | 'iterm2' | 'in-process' | 'none'
  hasTmux: boolean
  hasITerm2: boolean
  hasIT2: boolean
}

export type PaneCreateOptions = {
  command: string
  name?: string
  color?: string
  cwd?: string
  env?: Record<string, string>
}

export type PaneHandle = {
  id: string
  type: 'tmux' | 'iterm2'
}

export interface HostTaskSystem {
  listTasks(listId: string): Promise<HostTask[]>
  claimTask(listId: string, taskId: string, agentName: string): Promise<{ success: boolean; reason?: string }>
  updateTask(listId: string, taskId: string, updates: Partial<HostTask>): Promise<void>
}

export type HostTask = {
  id: string
  subject: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  owner?: string
  blockedBy: string[]
}

export interface HostUIState {
  updateTask(taskId: string, updater: (task: unknown) => unknown): void
  getAppState(): unknown
}

export interface HostWorktreeManager {
  create(options: { branch: string; path: string; slug: string }): Promise<string>
  remove(path: string): Promise<void>
  validate(path: string): Promise<boolean>
}

export interface HostEnvironment {
  getTeamsDir(): string
  getTeamName(): string | undefined
  getAgentName(): string | undefined
  getAgentColor(): string | undefined
  getSessionId(): string
  isEnabled(feature: string): boolean
}

export interface SwarmHostDeps {
  api: HostApiProvider
  tools: HostToolRegistry
  permissions: HostPermissionGate
  compaction: HostCompaction
  context: HostContextProvider
  session: HostSessionManager
  events: HostEventSink
  hooks: HostHookCallbacks
  fs: HostFileSystem
  terminal?: HostTerminalBackend
  tasks: HostTaskSystem
  ui: HostUIState
  worktree: HostWorktreeManager
  env: HostEnvironment
}
