/**
 * Un ítem de la lista unificada de «instalados» de `/plugin`: un plugin
 * cargado, uno que falló al cargar, uno retirado del marketplace, o un
 * servidor MCP suelto.
 *
 * PROCEDENCIA. Era un stub `unknown`. No está en ningún corpus de referencia
 * y el ejecutable borra los tipos, así que cada variante se deriva de su
 * constructor en `ManagePlugins.tsx`, con el tipo que el checker da a cada
 * inicializador (`.claude/workbench/derive-plugin-view-types-*`).
 *
 * CIEGO A: un campo que el original declare y ningún constructor del árbol
 * asigne.
 */
import type { LoadedPlugin, PluginError } from '@thyrox/config/plugin/types'
import type { ConfigScope, MCPServerConnection } from '@thyrox/mcp-runtime/types.js'

type InstalledPluginItem = {
  type: 'plugin'
  id: string
  name: string
  description: string | undefined
  marketplace: string
  scope: 'builtin' | 'user' | 'project' | 'local' | 'managed'
  isEnabled: boolean
  errorCount: number
  errors: PluginError[]
  plugin: LoadedPlugin
  pendingEnable: boolean | undefined
  pendingUpdate: boolean | undefined
  pendingToggle: 'will-enable' | 'will-disable' | undefined
}

type FailedPluginItem = {
  type: 'failed-plugin'
  id: string
  name: string
  marketplace: string
  // Sin `flag`: `ManagePlugins.tsx` lo pliega a `user` antes de construir.
  scope: 'user' | 'project' | 'local' | 'managed'
  errorCount: number
  errors: PluginError[]
}

type FlaggedPluginItem = {
  type: 'flagged-plugin'
  id: string
  name: string
  marketplace: string
  scope: 'flagged'
  reason: string
  text: string
  flaggedAt: string
}

type StandaloneMcpItem = {
  type: 'mcp'
  id: string
  name: string
  description: string | undefined
  scope: ConfigScope
  status: 'connected' | 'disabled' | 'pending' | 'needs-auth' | 'failed'
  client: MCPServerConnection
  indented?: boolean
}

export type UnifiedInstalledItem =
  | InstalledPluginItem
  | FailedPluginItem
  | FlaggedPluginItem
  | StandaloneMcpItem
