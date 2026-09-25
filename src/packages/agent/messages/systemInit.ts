import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import { getSettings } from '@thyrox/config/settings/core/settings.js'
import { DEFAULT_OUTPUT_STYLE_NAME } from '@thyrox/config/outputStyles.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { getAnthropicApiKeyWithSource } from '@thyrox/provider/authAlias.js'
import type { ApiKeySource } from '@thyrox/headless-sdk/agentSdkTypes.js'
import { getSdkBetas } from '@thyrox/app-host/bootstrap/state.js'
import { randomUUID } from 'crypto'
import { feature } from 'bun:bundle'
import { getFastModeState } from '@thyrox/provider/fastMode.js'
import type { PermissionMode } from '@thyrox/headless-sdk/agentSdkTypes.js'
/**
 * Mensaje `system/init` del SDK — porte PARCIAL de
 * `ccnmt: packages/agent/messages/systemInit.ts` (96 líneas).
 *
 * La fuente exporta 3 símbolos: la función `sdkCompatToolName`, la
 * función `buildSystemInitMessage` y el tipo `SystemInitInputs`. Este
 * módulo porta **sólo** `sdkCompatToolName` — el único que el porte de
 * test (`__tests__/sdkCompatToolName.test.ts`) ejercita.
 *
 * `buildSystemInitMessage` queda fuera, DECLARADO: arma el mensaje
 * `system/init` completo (cwd, tools, modelo, comandos, agentes, skills,
 * plugins, `fast_mode_state`…) y para eso importa siete símbolos de seis
 * paquetes hermanos ausentes en este árbol —
 * `feature` de `bun:bundle`,
 * `getSdkBetas`/`getSessionId` de `@claude-code-how-works/app-host/bootstrap/state.js`,
 * `DEFAULT_OUTPUT_STYLE_NAME` de `@claude-code-how-works/config/outputStyles.js`,
 * los tipos `ApiKeySource`/`PermissionMode`/`SDKMessage` de
 * `@claude-code-how-works/headless-sdk/agentSdkTypes.js`,
 * `getAnthropicApiKeyWithSource` de `@claude-code-how-works/provider/authAlias.js`,
 * `getCwd` de `@claude-code-how-works/app-host/bootstrap/cwd.js`,
 * `getFastModeState` de `@claude-code-how-works/provider/fastMode.js`, y
 * `getSettings` de `@claude-code-how-works/config/settings/core/settings.js`
 * — ninguno portado aún, y el mismo test tampoco los necesita.
 *
 * `sdkCompatToolName` sí depende de dos constantes: `AGENT_TOOL_NAME` y
 * `LEGACY_AGENT_TOOL_NAME`, que la fuente trae de
 * `@claude-code-how-works/tool-registry/tools/AgentTool/constants.js`
 * (`packages/tool-registry/src/tools/AgentTool/constants.ts`, 4 símbolos:
 * las dos citadas más `VERIFICATION_AGENT_TYPE` y
 * `ONE_SHOT_BUILTIN_AGENT_TYPES`, ninguno de los dos consumido aquí). Ese
 * paquete tampoco existe en este árbol, así que las dos constantes que sí
 * hacen falta se reproducen aquí con el valor literal exacto que la
 * fuente declara — el valor ES el comportamiento que el test fija.
 */

/** Nombre de wire actual de la herramienta de subagentes. */
export const AGENT_TOOL_NAME = 'Agent'

/** Nombre de wire legado (compat hacia atrás: reglas de permiso, hooks, sesiones resumidas). */
export const LEGACY_AGENT_TOOL_NAME = 'Task'

// TODO(next-minor): retirar esta traducción cuando los consumidores del SDK
// hayan migrado al nombre de herramienta 'Agent'. El nombre de wire se
// renombró de Task → Agent en #19647, pero emitir el nombre nuevo en los
// eventos init/result rompió consumidores del SDK en un release de patch.
// Se sigue emitiendo 'Task' hasta el próximo minor.
export function sdkCompatToolName(name: string): string {
  return name === AGENT_TOOL_NAME ? LEGACY_AGENT_TOOL_NAME : name
}

type CommandLike = { name: string; userInvocable?: boolean }
export type SystemInitInputs = {
  tools: ReadonlyArray<{ name: string }>
  mcpClients: ReadonlyArray<{ name: string; type: string }>
  model: string
  permissionMode: PermissionMode
  commands: ReadonlyArray<CommandLike>
  agents: ReadonlyArray<{ agentType: string }>
  skills: ReadonlyArray<CommandLike>
  plugins: ReadonlyArray<{ name: string; path: string; source: string }>
  fastMode: boolean | undefined
}
/**
 * Build the `system/init` SDKMessage — the first message on the SDK stream
 * carrying session metadata (cwd, tools, model, commands, etc.) that remote
 * clients use to render pickers and gate UI.
 *
 * Called from two paths that must produce identical shapes:
 *   - QueryEngine (spawn-bridge / print-mode / SDK) — yielded as the first
 *     stream message per query turn
 *   - useReplBridge (REPL Remote Control) — sent via writeSdkMessages() on
 *     bridge connect, since REPL uses query() directly and never hits the
 *     QueryEngine SDKMessage layer
 */
export function buildSystemInitMessage(inputs: SystemInitInputs): SDKMessage {
  const settings = getSettings()
  const outputStyle = settings?.outputStyle ?? DEFAULT_OUTPUT_STYLE_NAME

  const initMessage: SDKMessage = {
    type: 'system',
    subtype: 'init',
    cwd: getCwd(),
    session_id: getSessionId(),
    tools: inputs.tools.map(tool => sdkCompatToolName(tool.name)),
    mcp_servers: inputs.mcpClients.map(client => ({
      name: client.name,
      status: client.type,
    })),
    model: inputs.model,
    permissionMode: inputs.permissionMode,
    slash_commands: inputs.commands
      .filter(c => c.userInvocable !== false)
      .map(c => c.name),
    apiKeySource: getAnthropicApiKeyWithSource().source as ApiKeySource,
    betas: getSdkBetas(),
    claude_code_version: MACRO.VERSION,
    output_style: outputStyle,
    agents: inputs.agents.map(agent => agent.agentType),
    skills: inputs.skills
      .filter(s => s.userInvocable !== false)
      .map(skill => skill.name),
    plugins: inputs.plugins.map(plugin => ({
      name: plugin.name,
      path: plugin.path,
      source: plugin.source,
    })),
    uuid: randomUUID(),
  }
  // Hidden from public SDK types — ant-only UDS messaging socket path
  if (feature('UDS_INBOX')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    ;(initMessage as Record<string, unknown>).messaging_socket_path =
      require('@thyrox/local-observability/uds/udsMessaging.js').getUdsMessagingSocketPath()
    /* eslint-enable @typescript-eslint/no-require-imports */
  }
  initMessage.fast_mode_state = getFastModeState(inputs.model, inputs.fastMode)
  return initMessage
}
