/**
 * `SendMessage` y `ListAgents` para el bucle de `thyrox -p`.
 *
 * El bucle de `-p` arma sus herramientas con el contrato `Tool` de
 * `@thyrox/agent/loop/types`, no con el `BuiltInToolsProvider` de
 * `@thyrox/tool-registry` donde viven las dos herramientas de mensajería. En
 * la referencia 2.1.285 la sesión `-p` ve la misma colección que la
 * interactiva; aquí estos adaptadores son el puente, y no reimplementan
 * nada: el envío es `SendMessageTool.validateInput`/`call` (que llega a
 * `sendToUdsSocket`, o a la entrega por `bridge:`), la clasificación de la
 * dirección es `parseAddress`, y el listado es `listAgentsForModel`, el mismo
 * núcleo que `ListAgentsTool.call`.
 *
 * Sólo texto plano entre sesiones, como la referencia: una dirección de
 * compañero de equipo o un mensaje estructurado se rechazan antes de enviar,
 * porque en `-p` no hay equipo ni estado de aplicación que los resuelva.
 *
 * Se ofrecen sólo si el buzón de esta sesión arrancó, y la señal es la que el
 * propio buzón exporta al enlazar su socket (`THYROX_CODE_MESSAGING_SOCKET`):
 * la compilación (`feature('UDS_INBOX')`), `--bare` y
 * `THYROX_CODE_HARBOR_KITE` ya decidieron antes si arrancaba.
 */
import type { Tool, ToolContext, ToolResult } from '@thyrox/agent/loop/types'
import { parseAddress } from '@thyrox/local-observability/uds/peerAddress.js'
import { listAgentsForModel, processListAgentsDeps, type ListAgentsAppState, type TeamDeps } from '@thyrox/local-observability/uds/peerFiles.js'
import { readTeamFileAsync } from '@thyrox/swarm'
import { getAgentId, getTeamName } from '@thyrox/swarm/teammateState.js'
import { SEND_MESSAGE_TOOL_NAME } from '@thyrox/tool-registry/tools/SendMessageTool/constants.js'
import { SendMessageTool } from '@thyrox/tool-registry/tools/SendMessageTool/SendMessageTool.js'

export { SEND_MESSAGE_TOOL_NAME }

/** El nombre de `ListAgents` en la referencia (`Dl`, `chunk-g3tnnx4p.js`). */
export const LIST_AGENTS_TOOL_NAME = 'ListAgents'

type Env = Record<string, string | undefined>

/**
 * La variable que el buzón exporta al enlazar su socket (`MESSAGING_SOCKET_ENV`
 * de `@thyrox/local-observability: uds/bind.ts`, subpath que el paquete no
 * exporta).
 */
const MESSAGING_SOCKET_ENV = 'THYROX_CODE_MESSAGING_SOCKET'

/** La entrada de `SendMessage` que `-p` admite: una dirección de otra sesión y texto. */
type PlainTextSend = { to: string; message: string; summary?: string }

type SendVerdict = { result: boolean; message?: string }
type SendOutcome = { data: { success: boolean; message: string } }
type ValidateSend = (input: PlainTextSend, context: object) => Promise<SendVerdict>
type CallSend = (input: PlainTextSend, context: object, canUseTool: unknown, assistantMessage: unknown) => Promise<SendOutcome>

const validateSend = SendMessageTool.validateInput as unknown as ValidateSend
const callSend = SendMessageTool.call as unknown as CallSend

/**
 * El contexto que el ramal entre sesiones de `SendMessageTool` recibe. Ese
 * ramal no lo lee; el resto de ramas (equipo, subagentes) sí, y por eso la
 * dirección se clasifica antes de llegar aquí.
 */
const CROSS_SESSION_CONTEXT = {}

/** El permiso ya lo decidió la puerta del bucle antes de `run`. */
const ALREADY_PERMITTED = () => Promise.resolve({ behavior: 'allow' as const })

/** El estado de aplicación de `-p`: sin subagentes en proceso ni equipo. */
const HEADLESS_APP_STATE: ListAgentsAppState = { tasks: {}, agentNameRegistry: new Map() }

const NOT_CROSS_SESSION_ADDRESS =
  'In this session SendMessage only reaches other sessions: use an explicit uds:<socket> or bridge:<session id> address (ListAgents shows the reachable ones).'
const NOT_PLAIN_TEXT = 'Cross-session messages must be plain text.'

const SEND_MESSAGE_DESCRIPTION =
  'Send a plain-text message to another session on this machine (uds:<socket>) or a Remote Control ' +
  'session (bridge:<session id>). The message arrives as a new user turn in that session. Use ' +
  `${LIST_AGENTS_TOOL_NAME} to discover the reachable sessions and their addresses.`

const LIST_AGENTS_DESCRIPTION =
  `List the sessions you can ${SEND_MESSAGE_TOOL_NAME} to: other local sessions on this machine and, ` +
  'when Remote Control is connected, your remote sessions. Names are the address.'

/** `eC` de la referencia: el bucle principal de `-p` no es un subagente. */
const MAIN_LOOP_CALLER_IS_SUBAGENT = false

/** `da`, `iy` y el id propio, desde `@thyrox/swarm`, como en `ListAgentsTool`. */
const swarmTeamDeps: TeamDeps = {
  teamName: teamContext => getTeamName(teamContext?.teamName === undefined ? undefined : { teamName: teamContext.teamName }),
  readTeamFile: readTeamFileAsync,
  ownAgentId: getAgentId,
}

/** Las herramientas de mensajería si el buzón de esta sesión arrancó; si no, ninguna. */
export function peerMessagingTools(env: Env = process.env): Tool[] {
  if (!hasLiveInbox(env)) return []
  return [sendMessageTool(), listAgentsTool()]
}

function hasLiveInbox(env: Env): boolean {
  return (env[MESSAGING_SOCKET_ENV] ?? '') !== ''
}

function isCrossSessionAddress(to: string): boolean {
  const { scheme } = parseAddress(to)
  return scheme === 'uds' || scheme === 'bridge'
}

function failure(content: string): ToolResult {
  return { content, isError: true }
}

function sendMessageTool(): Tool {
  return {
    name: SEND_MESSAGE_TOOL_NAME,
    description: SEND_MESSAGE_DESCRIPTION,
    permission: 'execute',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient: an explicit uds:<socket> or bridge:<session id> address' },
        message: { type: 'string', description: 'Plain-text message content' },
        summary: { type: 'string', description: 'Optional 5-10 word preview of the message' },
      },
      required: ['to', 'message'],
    },
    run: sendPlainText,
  }
}

async function sendPlainText(input: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
  const { to, message, summary } = input
  if (typeof to !== 'string' || !isCrossSessionAddress(to)) return failure(NOT_CROSS_SESSION_ADDRESS)
  if (typeof message !== 'string') return failure(NOT_PLAIN_TEXT)
  const send: PlainTextSend = { to, message, ...(typeof summary === 'string' && { summary }) }
  const verdict = await validateSend(send, CROSS_SESSION_CONTEXT)
  if (!verdict.result) return failure(verdict.message ?? `cannot send to ${to}`)
  const outcome = await callSend(send, CROSS_SESSION_CONTEXT, ALREADY_PERMITTED, undefined)
  return { content: outcome.data.message, isError: !outcome.data.success }
}

function listAgentsTool(): Tool {
  return {
    name: LIST_AGENTS_TOOL_NAME,
    description: LIST_AGENTS_DESCRIPTION,
    permission: 'read',
    input_schema: { type: 'object', properties: {} },
    run: listReachableAgents,
  }
}

async function listReachableAgents(): Promise<ToolResult> {
  const listing = await listAgentsForModel(HEADLESS_APP_STATE, MAIN_LOOP_CALLER_IS_SUBAGENT, processListAgentsDeps(swarmTeamDeps))
  return { content: listing, isError: false }
}
