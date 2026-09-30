/**
 * De una petición `/v1/messages` a lo que `claude -p` entiende: su línea de
 * comando, el mensaje de usuario por stdin y las tools como servidor MCP.
 *
 * Formas medidas en el ejecutable 2.1.283 (banco
 * `task-thyrox-0498-claude-cli-upstream-*`): el nombre de una tool MCP es
 * `mcp__<servidor>__<tool>` (`chunk-s31bcshf.js`); `--mcp-config` acepta una
 * cadena JSON y `--strict-mcp-config` deja fuera cualquier otro servidor;
 * `--tools ""` apaga las tools nativas; `--output-format stream-json` exige
 * `--verbose` (`chunk-ycnq45th.js`); `--bare` NO va: medido con el binario
 * 2.1.285, con `--bare` la misma línea responde «Authentication error» y sin
 * él autentica (la credencial de este entorno llega por las settings que
 * `--bare` salta); la propia referencia lanza un hijo con
 * `--input-format stream-json` y le escribe el mensaje por stdin
 * (`chunk-n94xvwy3.js`, `ie`).
 *
 * Divergencias declaradas:
 * - `claude -p` no admite inyectar turnos de asistente: una conversación
 *   nueva que ya trae historia la pliega como texto delante del último
 *   mensaje de usuario (`foldedUserInput`). Una conversación conocida no lo
 *   necesita: se reanuda por su sesión.
 * - `max_tokens`, `temperature` y `stop_sequences` no tienen bandera en
 *   `claude -p`; no se traducen.
 */
import { createHash } from 'node:crypto'

/** El nombre con el que claude ve el puente, ya en la forma que `vn` sanea. */
export const BRIDGE_SERVER_NAME = 'thyrox_bridge'
const BRIDGE_TOOL_PREFIX = `mcp__${BRIDGE_SERVER_NAME}__`
const OUTPUT_FORMAT = 'stream-json'
const INPUT_FORMAT = 'stream-json'
const FOLDED_TURN_SEPARATOR = '\n\n'

export type ContentBlock = Record<string, unknown> & { type: string }
export type ConversationMessage = { role: string; content: string | ContentBlock[] }

export type CliSession =
  | { kind: 'new'; sessionId: string }
  | { kind: 'resume'; sessionId: string }

export type CliArgvOptions = {
  session: CliSession
  model: string
  toolNames: readonly string[]
  bridgeUrl: string
  systemPrompt?: string
}

export type BridgeToolDefinition = { name: string; description?: string; inputSchema: unknown }

export function bridgeToolName(clientName: string): string {
  return `${BRIDGE_TOOL_PREFIX}${clientName}`
}

/** El nombre del cliente detrás de un nombre MCP del puente; otro nombre no es del puente. */
export function clientToolName(mcpName: string): string | undefined {
  if (!mcpName.startsWith(BRIDGE_TOOL_PREFIX)) return undefined
  return mcpName.slice(BRIDGE_TOOL_PREFIX.length)
}

/** Las tools de la petición como las publica `tools/list` del puente. */
export function bridgeToolDefinitions(tools: readonly Record<string, unknown>[]): BridgeToolDefinition[] {
  return tools.map(tool => ({
    name: String(tool.name),
    ...(typeof tool.description === 'string' && { description: tool.description }),
    inputSchema: tool.input_schema ?? { type: 'object', properties: {} },
  }))
}

function isContentBlock(value: unknown): value is ContentBlock {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

/** El contenido de un mensaje siempre como lista de bloques. */
export function contentBlocksOf(content: unknown): ContentBlock[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }]
  if (!Array.isArray(content)) return []
  return content.filter(isContentBlock)
}

/** El `system` de la petición como un solo texto, o nada. */
export function systemPromptOf(system: unknown): string | undefined {
  if (typeof system === 'string') return system
  const texts = contentBlocksOf(system).filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text as string)
  return texts.length > 0 ? texts.join(FOLDED_TURN_SEPARATOR) : undefined
}

/** La línea `stream-json` de entrada con el contenido dado como mensaje de usuario. */
export function userInputLineOf(content: ContentBlock[]): string {
  return JSON.stringify({ type: 'user', message: { role: 'user', content } })
}

export function userInputLine(message: ConversationMessage): string {
  return userInputLineOf(contentBlocksOf(message.content))
}

/** El texto de un bloque tal como se pliega en la historia: texto propio, o su forma JSON. */
function foldedBlockText(block: ContentBlock): string {
  if (block.type === 'text' && typeof block.text === 'string') return block.text
  return JSON.stringify(block)
}

/**
 * El contenido de usuario para una conversación nueva: los turnos anteriores
 * plegados como texto, seguidos de los bloques del último mensaje.
 */
export function foldedUserInput(messages: readonly ConversationMessage[]): ContentBlock[] {
  const last = messages[messages.length - 1]
  if (!last) return []
  const previous = messages.slice(0, -1)
  const lastBlocks = contentBlocksOf(last.content)
  if (previous.length === 0) return lastBlocks
  const history = previous
    .map(message => `[${message.role}]\n${contentBlocksOf(message.content).map(foldedBlockText).join('\n')}`)
    .join(FOLDED_TURN_SEPARATOR)
  return [{ type: 'text', text: history }, ...lastBlocks]
}

/** Lo que identifica un bloque en la historia; los campos de transporte (`cache_control`…) no cuentan. */
function canonicalBlock(block: ContentBlock): Record<string, unknown> {
  switch (block.type) {
    case 'text': return { type: 'text', text: block.text }
    case 'tool_use': return { type: 'tool_use', id: block.id, name: block.name, input: block.input }
    case 'tool_result': return { type: 'tool_result', tool_use_id: block.tool_use_id, content: block.content, is_error: block.is_error }
    default: return { ...block, cache_control: undefined }
  }
}

/** La clave de prefijo de una historia: SHA-256 de sus turnos canónicos. */
export function conversationPrefixKey(messages: readonly ConversationMessage[]): string {
  const canonical = messages.map(message => ({ role: message.role, content: contentBlocksOf(message.content).map(canonicalBlock) }))
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

/** Los `tool_use_id` de los `tool_result` de un mensaje. */
export function toolResultIdsOf(message: ConversationMessage): string[] {
  return contentBlocksOf(message.content)
    .filter(block => block.type === 'tool_result' && typeof block.tool_use_id === 'string')
    .map(block => block.tool_use_id as string)
}

function sessionArgs(session: CliSession): string[] {
  return session.kind === 'resume' ? ['--resume', session.sessionId] : ['--session-id', session.sessionId]
}

function bridgeArgs(toolNames: readonly string[], bridgeUrl: string): string[] {
  if (toolNames.length === 0) return []
  const mcpConfig = { mcpServers: { [BRIDGE_SERVER_NAME]: { type: 'http', url: bridgeUrl } } }
  return ['--mcp-config', JSON.stringify(mcpConfig), '--strict-mcp-config', '--allowedTools', ...toolNames.map(bridgeToolName)]
}

/** La línea de comando de `claude -p` para un turno. */
export function claudeArgv(options: CliArgvOptions): string[] {
  return [
    '-p',
    '--verbose',
    ...sessionArgs(options.session),
    '--output-format', OUTPUT_FORMAT,
    '--input-format', INPUT_FORMAT,
    '--model', options.model,
    '--tools', '',
    ...(options.systemPrompt !== undefined ? ['--system-prompt', options.systemPrompt] : []),
    ...bridgeArgs(options.toolNames, options.bridgeUrl),
  ]
}
