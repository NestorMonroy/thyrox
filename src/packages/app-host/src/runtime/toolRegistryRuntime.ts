/**
 * Adaptación de @claude-code-how-works/app-host: src/runtime/toolRegistryRuntime.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * La fuente instala los host bindings del paquete `tool-registry`
 * (descubrimiento de herramientas builtin, reglas de deny por permiso,
 * el conjunto de herramientas dependiente del modo — REPL / simple /
 * completo) y reexporta un puñado de constantes y funciones de ese
 * mismo paquete (`TOOL_PRESETS`, `parseToolPreset`, `getToolRegistry`,
 * `getAllBaseTools`, `filterToolsByDenyRules`, `getTools`,
 * `assembleToolPool`, `getMergedTools`).
 *
 * NINGUNO de sus tres paquetes hermanos existe hoy en este árbol:
 *
 *   - `@claude-code-how-works/tool-registry` (paquete completo, 12
 *     imports distintos: el índice, `Tool.js`, `toolConstants`, seis
 *     archivos de herramientas concretas — `AgentTool`, `BashTool`,
 *     `FileEditTool`, `FileReadTool`, `REPLTool` × 2,
 *     `ReadMcpResourceTool`, `SendMessageTool`, `SyntheticOutputTool`,
 *     `TaskStopTool` — y `BuiltInToolsProvider`) — ausente por completo.
 *   - `@claude-code-how-works/permission/permissions`
 *     (`getDenyRuleForTool`) — el paquete `permission` no existe.
 *   - `@claude-code-how-works/config/env/utils` (`isEnvTruthy`) —
 *     `@thyrox/config` SÍ existe, pero no expone ese subpath.
 *   - `@claude-code-how-works/agent/coordinatorMode.js` — `@thyrox/agent`
 *     SÍ existe, pero `coordinatorMode.ts` no está portado ahí ni
 *     expuesto en su `package.json` (`exports`).
 *
 * Ninguno se stubea localmente; los seis imports se conservan literales
 * — mismo criterio que `installPluginBindings.ts` (hermano en este
 * directorio) y `agent/internal/macroFallback.ts`.
 *
 * El auto-run `installToolRegistryRuntimeBindings()` al final del
 * módulo (igual que la fuente) es irrelevante aquí: el PRIMER import de
 * valor (`@claude-code-how-works/tool-registry`) ya agota la resolución
 * de módulos antes de que corra cualquier código del archivo.
 *
 * Sin test: ninguno de los tres paquetes hermanos resuelve hoy. Mismo
 * estado que `installPluginBindings.ts`/`packageHostSetup.ts`
 * (hermanos en este mismo pase).
 */
// biome-ignore-all assist/source/organizeImports: los marcadores de import SOLO-ANT no se reordenan
import { feature } from 'bun:bundle'
import {
  TOOL_PRESETS as PACKAGE_TOOL_PRESETS,
  assembleToolPool as assembleToolPoolFromPackage,
  filterToolsByDenyRules as filterToolsByDenyRulesFromPackage,
  getAllBaseTools as getAllBaseToolsFromPackage,
  getMergedTools as getMergedToolsFromPackage,
  getToolRegistry as getToolRegistryFromPackage,
  getTools as getToolsFromPackage,
  getToolsForDefaultPreset as getToolsForDefaultPresetFromPackage,
  installToolRegistryHostBindings,
  parseToolPreset as parseToolPresetFromPackage,
} from '@claude-code-how-works/tool-registry'
import { toolMatchesName, type Tool, type ToolPermissionContext, type Tools } from '@claude-code-how-works/tool-registry/Tool.js'
import {
  ALL_AGENT_DISALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
} from '@claude-code-how-works/tool-registry/toolConstants'
import { AgentTool } from '@claude-code-how-works/tool-registry/tools/AgentTool/AgentTool.js'
import { BashTool } from '@claude-code-how-works/tool-registry/tools/BashTool/BashTool.js'
import { FileEditTool } from '@claude-code-how-works/tool-registry/tools/FileEditTool/FileEditTool.js'
import { FileReadTool } from '@claude-code-how-works/tool-registry/tools/FileReadTool/FileReadTool.js'
import {
  REPL_TOOL_NAME,
  REPL_ONLY_TOOLS,
  isReplModeEnabled,
} from '@claude-code-how-works/tool-registry/tools/REPLTool/constants.js'
import { BuiltInToolsProvider } from '@claude-code-how-works/tool-registry/tools/registry/providers/BuiltInToolsProvider.js'
import { ReadMcpResourceTool } from '@claude-code-how-works/tool-registry/tools/ReadMcpResourceTool/ReadMcpResourceTool.js'
import { SendMessageTool } from '@claude-code-how-works/tool-registry/tools/SendMessageTool/SendMessageTool.js'
import { SYNTHETIC_OUTPUT_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/SyntheticOutputTool/SyntheticOutputTool.js'
import { TaskStopTool } from '@claude-code-how-works/tool-registry/tools/TaskStopTool/TaskStopTool.js'
import { ListMcpResourcesTool } from '@claude-code-how-works/tool-registry/tools/ListMcpResourcesTool/ListMcpResourcesTool.js'
import { isEnvTruthy } from '@claude-code-how-works/config/env/utils'
import { getDenyRuleForTool } from '@claude-code-how-works/permission/permissions'

/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
const REPLTool =
  process.env.USER_TYPE === 'ant'
    ? require('@claude-code-how-works/tool-registry/tools/REPLTool/REPLTool.js').REPLTool
    : null
const coordinatorModeModule = feature('COORDINATOR_MODE')
  ? (require('@claude-code-how-works/agent/coordinatorMode.js') as typeof import('@claude-code-how-works/agent/coordinatorMode.js'))
  : null
/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */

let registryHostBindingsInstalled = false

export function installToolRegistryRuntimeBindings(): void {
  if (registryHostBindingsInstalled) return

  installToolRegistryHostBindings({
    discoverBuiltInTools: () => BuiltInToolsProvider.discover() as Tool[],
    getDenyRuleForTool: (permissionContext, tool) =>
      getDenyRuleForTool(permissionContext as ToolPermissionContext, tool as any),
    getModeAwareTools: ({
      permissionContext,
      baseTools,
      filterToolsByDenyRules,
    }) => {
      const permissionCtx = permissionContext as ToolPermissionContext
      const allTools = baseTools as Tool[]
      const filterByDeny = (tools: readonly Tool[]): Tool[] =>
        filterToolsByDenyRules(tools as Tool[], permissionCtx) as Tool[]

      if (isEnvTruthy(process.env.CLAUDE_CODE_SIMPLE)) {
        if (isReplModeEnabled() && REPLTool) {
          const replSimple: Tool[] = [REPLTool]
          if (
            feature('COORDINATOR_MODE') &&
            coordinatorModeModule?.isCoordinatorMode()
          ) {
            replSimple.push(TaskStopTool, SendMessageTool)
          }
          return filterByDeny(replSimple)
        }

        const simpleTools: Tool[] = [BashTool, FileReadTool, FileEditTool]
        if (
          feature('COORDINATOR_MODE') &&
          coordinatorModeModule?.isCoordinatorMode()
        ) {
          simpleTools.push(AgentTool, TaskStopTool, SendMessageTool)
        }
        return filterByDeny(simpleTools)
      }

      const specialTools = new Set([
        ListMcpResourcesTool.name,
        ReadMcpResourceTool.name,
        SYNTHETIC_OUTPUT_TOOL_NAME,
      ])
      const filtered = allTools.filter(tool => !specialTools.has(tool.name))
      let allowedTools = filterByDeny(filtered)

      if (isReplModeEnabled()) {
        const replEnabled = allowedTools.some(tool =>
          toolMatchesName(tool, REPL_TOOL_NAME),
        )
        if (replEnabled) {
          allowedTools = allowedTools.filter(
            tool => !REPL_ONLY_TOOLS.has(tool.name),
          )
        }
      }

      return allowedTools.filter(tool => tool.isEnabled())
    },
    replOnlyToolNames: () => REPL_ONLY_TOOLS,
  })

  registryHostBindingsInstalled = true
}

// Instala los host bindings al cargar el módulo, para que cualquier
// llamador directo de @claude-code-how-works/tool-registry pueda confiar
// en un runtime ya inicializado.
installToolRegistryRuntimeBindings()

export {
  ALL_AGENT_DISALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
  REPL_ONLY_TOOLS,
}

export const TOOL_PRESETS = PACKAGE_TOOL_PRESETS
export type ToolPreset = (typeof TOOL_PRESETS)[number]

export function parseToolPreset(preset: string): ToolPreset | null {
  installToolRegistryRuntimeBindings()
  return parseToolPresetFromPackage(preset) as ToolPreset | null
}

export function getToolsForDefaultPreset(): string[] {
  installToolRegistryRuntimeBindings()
  return getToolsForDefaultPresetFromPackage()
}

export function getToolRegistry() {
  installToolRegistryRuntimeBindings()
  return getToolRegistryFromPackage()
}

export function getAllBaseTools(): Tools {
  installToolRegistryRuntimeBindings()
  return getAllBaseToolsFromPackage() as unknown as Tools
}

export function filterToolsByDenyRules<
  T extends {
    name: string
    mcpInfo?: { serverName: string; toolName: string }
  },
>(tools: readonly T[], permissionContext: ToolPermissionContext): T[] {
  installToolRegistryRuntimeBindings()
  return filterToolsByDenyRulesFromPackage(
    tools,
    permissionContext as any,
  ) as T[]
}

export function getTools(permissionContext: ToolPermissionContext): Tools {
  installToolRegistryRuntimeBindings()
  return getToolsFromPackage(permissionContext as any) as unknown as Tools
}

export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  installToolRegistryRuntimeBindings()
  return assembleToolPoolFromPackage(
    permissionContext as any,
    mcpTools as any,
  ) as unknown as Tools
}

export function getMergedTools(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  installToolRegistryRuntimeBindings()
  return getMergedToolsFromPackage(
    permissionContext as any,
    mcpTools as any,
  ) as unknown as Tools
}
