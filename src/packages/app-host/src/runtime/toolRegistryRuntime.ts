/**
 * toolRegistryRuntime — wires tool registry host bindings (tools, MCP
 * servers, agents) into the runtime. Host-binding adapter: every
 * `as any/unknown` cast is by-design type-system bypass for the
 * runtime-binding pattern, not a hidden mismatch.
 */
// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
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
} from '@thyrox/tool-registry'
import { toolMatchesName, type Tool, type ToolPermissionContext, type Tools } from '@thyrox/tool-registry/Tool.js'
import {
  ALL_AGENT_DISALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
} from '@thyrox/tool-registry/toolConstants'
import { AgentTool } from '@thyrox/tool-registry/tools/AgentTool/AgentTool.js'
import { BashTool } from '@thyrox/tool-registry/tools/BashTool/BashTool.js'
import { FileEditTool } from '@thyrox/tool-registry/tools/FileEditTool/FileEditTool.js'
import { FileReadTool } from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import {
  REPL_TOOL_NAME,
  REPL_ONLY_TOOLS,
  isReplModeEnabled,
} from '@thyrox/tool-registry/tools/REPLTool/constants.js'
import { BuiltInToolsProvider } from '@thyrox/tool-registry/tools/registry/providers/BuiltInToolsProvider.js'
import { ReadMcpResourceTool } from '@thyrox/tool-registry/tools/ReadMcpResourceTool/ReadMcpResourceTool.js'
import { SendMessageTool } from '@thyrox/tool-registry/tools/SendMessageTool/SendMessageTool.js'
import { SYNTHETIC_OUTPUT_TOOL_NAME } from '@thyrox/tool-registry/tools/SyntheticOutputTool/SyntheticOutputTool.js'
import { TaskStopTool } from '@thyrox/tool-registry/tools/TaskStopTool/TaskStopTool.js'
import { ListMcpResourcesTool } from '@thyrox/tool-registry/tools/ListMcpResourcesTool/ListMcpResourcesTool.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { getDenyRuleForTool } from '@thyrox/permission/permissions'

/* eslint-disable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */
const REPLTool =
  process.env.USER_TYPE === 'ant'
    ? require('@thyrox/tool-registry/tools/REPLTool/REPLTool.js').REPLTool
    : null
const coordinatorModeModule = feature('COORDINATOR_MODE')
  ? (require('@thyrox/agent/coordinatorMode.js') as typeof import('@thyrox/agent/coordinatorMode.js'))
  : null
/* eslint-enable custom-rules/no-process-env-top-level, @typescript-eslint/no-require-imports */

let registryHostBindingsInstalled = false

// REPL_ONLY_TOOLS es Set<unión de literales> en el paquete de origen; se
// ensancha una vez a Set<string> porque tool.name es string en este árbol.
const replOnlyToolNameSet: ReadonlySet<string> = new Set<string>(
  REPL_ONLY_TOOLS,
)

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
            tool => !replOnlyToolNameSet.has(tool.name),
          )
        }
      }

      return allowedTools.filter(tool => tool.isEnabled())
    },
    replOnlyToolNames: () => REPL_ONLY_TOOLS,
  })

  registryHostBindingsInstalled = true
}

// Install host bindings on module load so any direct
// @thyrox/tool-registry caller can rely on an initialized runtime.
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
