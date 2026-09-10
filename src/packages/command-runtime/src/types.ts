/**
 * Porte COMPLETO de `ccnmt: packages/command-runtime/src/types.ts` — sus 15
 * exportaciones, ninguna omitida, mas los dos tipos internos (`LocalCommand`,
 * `LocalJSXCommand`, sin exportar en la fuente) de los que depende `Command`.
 *
 * Divergencia declarada: `ContentBlockParam` se importa como TYPE-ONLY desde
 * `@anthropic-ai/sdk/resources/index.mjs`, igual que en la fuente. El paquete
 * `@anthropic-ai/sdk` no esta instalado en este arbol — pero un `import type`
 * se elide por completo al compilar/transpilar (verificado: `bun test` corre
 * limpio sin el paquete presente, porque el import nunca sobrevive a tiempo
 * de ejecucion). Lo unico que fallaria sin el paquete es `tsc --noEmit`
 * sobre este archivo en particular, que queda fuera del alcance de este pase
 * (TDD con `bun test` como gate).
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { UUID } from 'crypto'

export type LocalCommandResult =
  | { type: 'text'; value: string }
  | {
      type: 'compact'
      compactionResult: unknown
      displayText?: string
    }
  | { type: 'skip' }
  /**
   * `'query'` — stdout visible del sistema (`value`) MAS un meta-mensaje
   * invisible (`prompt`) que dirige al agente. Lo usa `/goal` para que la
   * persona vea "Goal set: ..." y el agente reciba en silencio el prompt
   * directivo. Espeja ant v2.1.136 4689.js OZ3 + 3753.js qm5, rama 'query'.
   */
  | { type: 'query'; value: string; prompt: string }

export type PromptCommand = {
  type: 'prompt'
  progressMessage: string
  contentLength: number
  argNames?: string[]
  allowedTools?: string[]
  model?: string
  source: string
  pluginInfo?: {
    pluginManifest: { name?: string; [key: string]: unknown }
    repository: string
  }
  disableNonInteractive?: boolean
  hooks?: unknown
  skillRoot?: string
  context?: 'inline' | 'fork'
  agent?: string
  effort?: unknown
  paths?: string[]
  getPromptForCommand(
    args: string,
    context: unknown,
  ): Promise<ContentBlockParam[]>
}

export type LocalCommandCall = (
  args: string,
  context: LocalJSXCommandContext,
) => Promise<LocalCommandResult>

export type LocalCommandModule = {
  call: LocalCommandCall
}

type LocalCommand = {
  type: 'local'
  supportsNonInteractive: boolean
  load: () => Promise<LocalCommandModule>
}

export type ResumeEntrypoint =
  | 'cli_flag'
  | 'slash_command_picker'
  | 'slash_command_session_id'
  | 'slash_command_title'
  | 'fork'

export type CommandResultDisplay = 'skip' | 'system' | 'user'

export type LocalJSXCommandContext = {
  canUseTool?: unknown
  setMessages: (updater: (prev: unknown[]) => unknown[]) => void
  options: {
    dynamicMcpConfig?: Record<string, unknown>
    ideInstallationStatus: unknown
    theme: unknown
  }
  onChangeAPIKey: () => void
  onChangeDynamicMcpConfig?: (config: Record<string, unknown>) => void
  onInstallIDEExtension?: (ide: unknown) => void
  resume?: (
    sessionId: UUID,
    log: unknown,
    entrypoint: ResumeEntrypoint,
  ) => Promise<void>
  [key: string]: unknown
}

export type LocalJSXCommandOnDone = (
  result?: string,
  options?: {
    display?: CommandResultDisplay
    shouldQuery?: boolean
    metaMessages?: string[]
    nextInput?: string
    submitNextInput?: boolean
  },
) => void

export type LocalJSXCommandCall = (
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
) => Promise<unknown>

export type LocalJSXCommandModule = {
  call: LocalJSXCommandCall
}

type LocalJSXCommand = {
  type: 'local-jsx'
  load: () => Promise<LocalJSXCommandModule>
}

export type CommandAvailability = 'claude-ai' | 'console'

export type CommandBase = {
  availability?: CommandAvailability[]
  description: string
  hasUserSpecifiedDescription?: boolean
  isEnabled?: () => boolean
  isHidden?: boolean
  name: string
  aliases?: string[]
  isMcp?: boolean
  argumentHint?: string
  whenToUse?: string
  version?: string
  disableModelInvocation?: boolean
  userInvocable?: boolean
  loadedFrom?:
    | 'commands_DEPRECATED'
    | 'skills'
    | 'plugin'
    | 'managed'
    | 'bundled'
    | 'mcp'
  kind?: 'workflow'
  immediate?: boolean
  isSensitive?: boolean
  userFacingName?: () => string
  source?: string
}

export type Command = CommandBase &
  (PromptCommand | LocalCommand | LocalJSXCommand)

export function getCommandName(cmd: CommandBase): string {
  return cmd.userFacingName?.() ?? cmd.name
}

export function isCommandEnabled(cmd: CommandBase): boolean {
  return cmd.isEnabled?.() ?? true
}
