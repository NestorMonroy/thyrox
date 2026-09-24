/**
 * Los tres tipos SDK core que no tienen schema Zod en `coreSchemas.ts`, y
 * por eso no los puede derivar `bin/generateCoreTypes.ts`. Se escriben a
 * mano, con la forma que ya tenían en el stub, y `coreTypes.generated.ts`
 * los re-exporta: la superficie pública no cambia.
 *
 * pendiente: la fuente declara el schema de cada uno; cuando se porte, el
 * tipo sale de aquí y el generador lo deriva como los demás.
 */
import type { HookInput } from './coreTypes.generated.ts'

export type PostToolBatchHookInput = HookInput & {
  tool_calls: Array<{
    tool_name: string
    tool_input: unknown
    tool_use_id: string
    tool_response?: unknown
  }>
}

export type UserPromptExpansionHookInput = HookInput & {
  expansion_type: 'slash_command' | 'mcp_prompt'
  command_name: string
  command_args: string
  command_source?: string
  prompt: string
}

export type SDKAssistantErrorMessage = { type: "assistant_error"; error: unknown; [key: string]: unknown }
