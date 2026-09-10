/**
 * Barrel de la capa de mensajes: re-exporta lo que `coreMessages.ts` declara,
 * para que `core/AgentCore.ts` y `core/AgentLoop.ts` importen de un solo
 * sitio, como en la fuente (`ccnmt: packages/agent/types/messages.ts`, que es
 * un módulo único).
 *
 * Antes este archivo DECLARABA `Usage` y `CoreUserMessage` porque
 * `coreMessages.ts` era un porte mínimo que los dejaba fuera. Al reconciliar
 * aquél con la fuente, las dos declaraciones quedaron duplicadas; se retiran
 * de aquí y el barrel deja de tener forma propia.
 */
export type {
  TextContent,
  ToolUseContent,
  ToolResultContent,
  ThinkingContent,
  CoreContentBlock,
  Usage,
  CoreUserMessage,
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreMessage,
} from './coreMessages.ts'
