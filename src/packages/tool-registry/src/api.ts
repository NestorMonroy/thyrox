/**
 * Puerto de `ccnmt: packages/tool-registry/src/api.ts` (113 líneas,
 * 12 símbolos). La superficie pública del paquete sobre un registro
 * singleton.
 *
 * El singleton se puebla PEREZOSAMENTE: la primera consulta descubre las
 * integradas por el proveedor y las indexa. Se hace así porque el
 * descubrimiento pasa por los host bindings, que el host instala al
 * arrancar — construirlo al importar el módulo obligaría a un orden de
 * carga que ningún consumidor controla.
 *
 * `__resetToolRegistryForTests` existe por eso mismo: sin ella, el primer
 * juego de bindings de una suite decidiría el contenido del registro para
 * todos los casos siguientes.
 */
import uniqBy from 'lodash-es/uniqBy.js'
import { ToolRegistry } from './ToolRegistry.ts'
import type { ToolLike, ToolPermissionContextLike } from './contracts.ts'
import { getToolRegistryHostBindings } from './host.ts'
import { BuiltInToolsProvider } from './providers/BuiltInToolsProvider.ts'

let registrySingleton: ToolRegistry<ToolLike, ToolPermissionContextLike> | null =
  null

function ensureRegistry(): ToolRegistry<ToolLike, ToolPermissionContextLike> {
  if (registrySingleton) return registrySingleton

  const registry = new ToolRegistry<ToolLike, ToolPermissionContextLike>()
  for (const tool of BuiltInToolsProvider.discover() as readonly ToolLike[]) {
    registry.register(tool, 'builtin', BuiltInToolsProvider.name)
  }
  registrySingleton = registry
  return registry
}

export function getToolRegistry(): ToolRegistry<
  ToolLike,
  ToolPermissionContextLike
> {
  return ensureRegistry()
}

export const TOOL_PRESETS = ['default'] as const
type ToolPreset = (typeof TOOL_PRESETS)[number]

export function parseToolPreset(preset: string): ToolPreset | null {
  const normalizado = preset.toLowerCase()
  return TOOL_PRESETS.includes(normalizado as ToolPreset)
    ? (normalizado as ToolPreset)
    : null
}

export function getToolsForDefaultPreset(): string[] {
  return getAllBaseTools()
    .filter(tool => tool.isEnabled())
    .map(tool => tool.name)
}

export function getAllBaseTools(): ToolLike[] {
  return getToolRegistry().getByCategory('builtin')
}

export function filterToolsByDenyRules<
  T extends { name: string; mcpInfo?: { serverName: string; toolName: string } },
>(tools: readonly T[], permissionContext: ToolPermissionContextLike): T[] {
  // `ToolPermissionContextLike` y el contexto real son estructuralmente la
  // misma superficie declarada en dos paquetes: el puente de tipo es del
  // patrón de binding en runtime, no una conversión que pierda nada.
  return getToolRegistry().filterByDenyRules(
    tools,
    permissionContext as Parameters<
      ReturnType<typeof getToolRegistry>['filterByDenyRules']
    >[1],
  )
}

export function getTools(
  permissionContext: ToolPermissionContextLike,
): ToolLike[] {
  const bindings = getToolRegistryHostBindings()
  // El gancho por el que el MODO de permiso cambia el juego de herramientas.
  // Si el host lo trae, gana: sin esta rama el modo no tendría efecto, y el
  // defecto sería invisible porque la lista base también es una lista válida.
  if (bindings.getModeAwareTools) {
    return bindings.getModeAwareTools({
      permissionContext,
      baseTools: getAllBaseTools(),
      filterToolsByDenyRules: (tools, context) =>
        filterToolsByDenyRules(tools, context),
    })
  }
  return getToolRegistry().getEnabledTools(permissionContext)
}

export function assembleToolPool(
  permissionContext: ToolPermissionContextLike,
  mcpTools: readonly ToolLike[],
): ToolLike[] {
  const integradas = getTools(permissionContext)
  const deMcp = filterToolsByDenyRules(mcpTools, permissionContext)
  const porNombre = (a: ToolLike, b: ToolLike) => a.name.localeCompare(b.name)
  return uniqBy(
    [...integradas].sort(porNombre).concat([...deMcp].sort(porNombre)),
    'name',
  )
}

export function getMergedTools(
  permissionContext: ToolPermissionContextLike,
  mcpTools: readonly ToolLike[],
): ToolLike[] {
  return [...getTools(permissionContext), ...mcpTools]
}

export function toolMatchesName(
  tool: Pick<ToolLike, 'name' | 'aliases'>,
  name: string,
): boolean {
  return tool.name === name || (tool.aliases?.includes(name) ?? false)
}

export function findToolByName<TTool extends ToolLike>(
  tools: readonly TTool[],
  name: string,
): TTool | undefined {
  return tools.find(tool => toolMatchesName(tool, name))
}

export function __resetToolRegistryForTests(): void {
  registrySingleton = null
}
