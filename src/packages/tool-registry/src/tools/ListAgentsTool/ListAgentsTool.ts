/**
 * `ListAgents` (alias `ListPeers`): la lista de agentes a los que se puede
 * mandar un `SendMessage`. Porte de `x` (`chunk-8xzbdmg9.js`, 2.1.283).
 * `backgrounding: "never"` no tiene campo en el `ToolDef` de este árbol y no
 * se escribe; `renderToolUseMessage(){return null}` sí, porque aquí es
 * obligatorio (medido: `buildTool` no lo da por omisión, TS2345).
 *
 * El núcleo (`listAllPeers`, `buildSubagentExtras`, `formatForModel`) vive en
 * `listAllPeers.ts` de `@thyrox/local-observability`, cuyo subpath NO está
 * en los `exports` de ese paquete y cuyo `package.json` queda fuera del
 * alcance de TASK-THYROX-0600: llega por `uds/peerFiles.js`, el subpath
 * exportado que hace de barrel (el papel de `chunk-1csd5fav.js`), hasta que
 * `./uds/listAllPeers.js` entre en `exports`. Medido antes: el import
 * relativo entre paquetes rompe el typecheck (`rootDir`, 50 × TS6059).
 */
import { z } from 'zod/v4'

import { isSessionMessagingEnabled, listAgentsForModel, processListAgentsDeps, type TeamDeps } from '@thyrox/local-observability/uds/peerFiles.js'
import { readTeamFileAsync } from '@thyrox/swarm'
import { getAgentId, getTeamName } from '@thyrox/swarm/teammateState.js'

import type { Tool } from '../../Tool.js'
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { SEND_MESSAGE_TOOL_NAME } from '../SendMessageTool/constants.js'
import { LIST_AGENTS_TOOL_NAME, LIST_PEERS_TOOL_ALIAS, getPrompt } from './prompt.js'

/** `p`. */
const MAX_RESULT_SIZE_CHARS = 10_000
/** El `.max(256)` de `channel` y `q`. */
const MAX_FILTER_LENGTH = 256
const UNAVAILABLE_FILTER_NOTE = 'Not available in this build; leave unset.'

/** `d`. */
const inputSchema = lazySchema(() =>
  z.strictObject({
    channel: z.string().max(MAX_FILTER_LENGTH).optional().describe(UNAVAILABLE_FILTER_NOTE),
    q: z.string().max(MAX_FILTER_LENGTH).optional().describe(UNAVAILABLE_FILTER_NOTE),
  }),
)
/** `S`. */
const outputSchema = lazySchema(() => z.object({ listing: z.string().describe('Formatted list of reachable agents') }))

type InputSchema = ReturnType<typeof inputSchema>
export type Output = z.infer<ReturnType<typeof outputSchema>>

/** `da`, `iy` y el id de agente propio viven en `@thyrox/swarm`, que local-observability no importa. */
const swarmTeamDeps: TeamDeps = {
  teamName: teamContext => getTeamName(teamContext?.teamName === undefined ? undefined : { teamName: teamContext.teamName }),
  readTeamFile: readTeamFileAsync,
  ownAgentId: getAgentId,
}

/** `eC`: el llamador es un subagente cuando el contexto lleva `agentId`, que sólo se fija para ellos. */
function isSubagentCaller(context: { readonly agentId?: string }): boolean {
  return context.agentId !== undefined
}

export const ListAgentsTool: Tool<InputSchema, Output> = buildTool({
  name: LIST_AGENTS_TOOL_NAME,
  aliases: [LIST_PEERS_TOOL_ALIAS],
  searchHint: `list agents you can ${SEND_MESSAGE_TOOL_NAME} to`,
  maxResultSizeChars: MAX_RESULT_SIZE_CHARS,

  toAutoClassifierInput() {
    return 'list agents'
  },

  async description() {
    return getPrompt()
  },

  userFacingName() {
    return LIST_AGENTS_TOOL_NAME
  },

  isEnabled() {
    return isSessionMessagingEnabled()
  },

  get inputSchema(): InputSchema {
    return inputSchema()
  },

  get outputSchema() {
    return outputSchema()
  },

  isConcurrencySafe() {
    return true
  },

  isReadOnly() {
    return true
  },

  async prompt() {
    return getPrompt()
  },

  renderToolUseMessage() {
    return null
  },

  async call(_input, context) {
    const listing = await listAgentsForModel(context.getAppState(), isSubagentCaller(context), processListAgentsDeps(swarmTeamDeps))
    return { data: { listing } }
  },

  mapToolResultToToolResultBlockParam(data, toolUseID) {
    return { tool_use_id: toolUseID, type: 'tool_result' as const, content: data.listing }
  },
})
