/**
 * Punto de entrada de los traductores de formato Mensajes ⇄ OpenAI, portados
 * de `omniroute: open-sse/translator/`. Ver el docstring de cada módulo
 * para su procedencia y sus divergencias declaradas.
 */

export { messagesToOpenAIRequest } from './requestMessagesToOpenAI.js'
export { openaiToMessagesRequest, CLAUDE_OAUTH_TOOL_PREFIX, stripEmptyTextBlocks, normalizeContentToString } from './requestOpenAIToMessages.js'
export {
  messagesToOpenAIResponse,
  messagesApiMessageToOpenAIResponse,
  createMessagesToOpenAIState,
  type MessagesToOpenAIState,
} from './responseMessagesToOpenAI.js'
export {
  openaiToMessagesResponse,
  openaiMessageToMessagesApiMessage,
  createOpenAIToMessagesState,
  type OpenAIToMessagesState,
} from './responseOpenAIToMessages.js'
export { sanitizeToolId, normalizeMessagesToolInputSchema, createDefaultMessagesCacheControl } from './schemaUtils.js'
export {
  openAiImagePartToMessagesBlock,
  normalizeToolResultImages,
  sanitizeToolResultId,
} from './messagesImageBlocks.js'
export { enforceToolResultAdjacency } from './toolResultAdjacency.js'
