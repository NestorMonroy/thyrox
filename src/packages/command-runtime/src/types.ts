import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'

export type LocalCommandResult =
  | { type: 'text'; value: string }
  | {
      type: 'compact'
      compactionResult: unknown
      displayText?: string
    }
  | { type: 'skip' }
  /**
   * `'query'` — visible system stdout (`value`) PLUS an invisible meta-message
   * (`prompt`) that drives the agent. Used by `/goal` so the user sees
   * "Goal set: ..." and the agent silently receives the directive prompt.
   * Mirrors ant v2.1.136 4689.js OZ3 + 3753.js qm5 'query' branch.
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

// El contrato de un comando local-jsx vive en `@thyrox/agent/command.js`,
// que es la forma que la fuente declara (`context: ToolUseContext &
// LocalJSXCommandContext`, resultado `Promise<ReactNode>`). Esta copia local
// lo había reducido a campos `unknown` y un índice abierto, y los comandos,
// escritos contra el contrato completo, no le asignaban: 23 diagnósticos de
// `LocalJSXCommandModule` con una sola causa. Se re-exporta en vez de
// duplicarlo; el import es de tipos, así que la dependencia mutua entre los
// dos paquetes no crea ciclo en tiempo de ejecución.
import type {
  CommandResultDisplay,
  LocalJSXCommandCall,
  LocalJSXCommandContext,
  LocalJSXCommandModule,
  LocalJSXCommandOnDone,
  ResumeEntrypoint,
} from '@thyrox/agent/command.js'

export type {
  CommandResultDisplay,
  LocalJSXCommandCall,
  LocalJSXCommandContext,
  LocalJSXCommandModule,
  LocalJSXCommandOnDone,
  ResumeEntrypoint,
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
