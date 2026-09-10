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
