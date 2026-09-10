/**
 * Puerto de `ccnmt: packages/tool-registry/src/runtime.ts` (126 líneas,
 * 17 símbolos). La puerta pública del paquete.
 *
 * QUÉ AÑADE sobre `api.ts`, que ya expone lo mismo: cada puerta INSTALA el
 * respaldo antes de responder. Sin eso, el primer llamador tendría que
 * acordarse de instalarlo y el que se olvidara recibiría el error de host
 * ausente en vez de una respuesta. El módulo existe para que ese olvido no
 * sea posible.
 *
 * EL PROXY DE `REPL_ONLY_TOOLS` es la pieza que menos se explica sola. El
 * conjunto se exporta como VALOR —hay llamadores que lo capturan al
 * importar— pero su contenido sale de un host que quizá aún no existe.
 * Poblarlo al importar haría que el orden de import decidiera el resultado;
 * el proxy lo puebla al primer acceso, que es cuando alguien lo necesita de
 * verdad.
 *
 * Los cuatro conjuntos de `constants.ts` se REEXPORTAN, no se redeclaran:
 * un llamador de `runtime` no tiene por qué saber que existe `constants`,
 * pero dos declaraciones serían dos fuentes de verdad y sólo una se
 * actualizaría.
 *
 * Los puentes de tipo son del patrón de binding en runtime, no desajustes
 * escondidos: el contexto de permiso es una superficie estructural que dos
 * paquetes declaran por separado.
 */
import {
  TOOL_PRESETS as PACKAGE_TOOL_PRESETS,
  assembleToolPool as assembleToolPoolFromPackage,
  filterToolsByDenyRules as filterToolsByDenyRulesFromPackage,
  getAllBaseTools as getAllBaseToolsFromPackage,
  getMergedTools as getMergedToolsFromPackage,
  getToolRegistry as getToolRegistryFromPackage,
  getTools as getToolsFromPackage,
  getToolsForDefaultPreset as getToolsForDefaultPresetFromPackage,
  parseToolPreset as parseToolPresetFromPackage,
} from './api.ts'
import {
  ALL_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
} from './constants.ts'
import type { ToolLike, ToolPermissionContextLike } from './contracts.ts'
import { getToolRegistryHostBindings } from './host.ts'
import { ensureToolRegistryRuntimeInstalled } from './toolRuntimeInstaller.ts'

export type Tool = ToolLike
export type ToolPermissionContext = ToolPermissionContextLike
export type Tools = readonly Tool[]

const REPL_ONLY_TOOLS_TARGET = new Set<string>()
let replOnlyToolsInitialized = false

function ensureReplOnlyToolsInitialized(): void {
  if (replOnlyToolsInitialized) return
  ensureToolRegistryRuntimeInstalled()
  REPL_ONLY_TOOLS_TARGET.clear()
  for (const name of getToolRegistryHostBindings().replOnlyToolNames()) {
    REPL_ONLY_TOOLS_TARGET.add(name)
  }
  replOnlyToolsInitialized = true
}

export const REPL_ONLY_TOOLS = new Proxy(REPL_ONLY_TOOLS_TARGET, {
  get(target, prop) {
    ensureReplOnlyToolsInitialized()
    // DIVERGENCIA DECLARADA, y corrige un defecto de la fuente. Su handler
    // reenvía el `receiver` del proxy a `Reflect.get`, y con eso `size`
    // —que es un GETTER de `Set.prototype`— se invoca con `this` puesto al
    // proxy y lanza `Set operation called on non-Set object`. Los métodos
    // no lo delatan porque van ligados abajo; sólo el accesor cae, así que
    // el defecto es invisible hasta que alguien lee `.size`.
    //
    // Se resuelve el acceso contra el `Set` real y se ligan los métodos:
    // sin ligar, `proxy.has(x)` correría con `this` puesto al proxy y
    // lanzaría igual. Las dos mitades hacen falta.
    const value = Reflect.get(target, prop, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
}) as Set<string>

export {
  ALL_AGENT_DISALLOWED_TOOLS,
  ASYNC_AGENT_ALLOWED_TOOLS,
  COORDINATOR_MODE_ALLOWED_TOOLS,
  CUSTOM_AGENT_DISALLOWED_TOOLS,
}

export const TOOL_PRESETS = PACKAGE_TOOL_PRESETS
export type ToolPreset = (typeof TOOL_PRESETS)[number]

export function installToolRegistryRuntimeBindings(): void {
  ensureToolRegistryRuntimeInstalled()
}

/** No instala nada: analizar una cadena no consulta el registro. */
export function parseToolPreset(preset: string): ToolPreset | null {
  return parseToolPresetFromPackage(preset) as ToolPreset | null
}

export function getToolsForDefaultPreset(): string[] {
  ensureToolRegistryRuntimeInstalled()
  return getToolsForDefaultPresetFromPackage()
}

export function getToolRegistry() {
  ensureToolRegistryRuntimeInstalled()
  return getToolRegistryFromPackage()
}

export function getAllBaseTools(): Tools {
  ensureToolRegistryRuntimeInstalled()
  return getAllBaseToolsFromPackage() as unknown as Tools
}

export function filterToolsByDenyRules<
  T extends {
    name: string
    mcpInfo?: { serverName: string; toolName: string }
  },
>(tools: readonly T[], permissionContext: ToolPermissionContext): T[] {
  ensureToolRegistryRuntimeInstalled()
  return filterToolsByDenyRulesFromPackage(
    tools,
    permissionContext as ToolPermissionContextLike,
  ) as T[]
}

export function getTools(permissionContext: ToolPermissionContext): Tools {
  ensureToolRegistryRuntimeInstalled()
  return getToolsFromPackage(
    permissionContext as ToolPermissionContextLike,
  ) as unknown as Tools
}

export function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  ensureToolRegistryRuntimeInstalled()
  return assembleToolPoolFromPackage(
    permissionContext as ToolPermissionContextLike,
    mcpTools as readonly ToolLike[],
  ) as unknown as Tools
}

export function getMergedTools(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  ensureToolRegistryRuntimeInstalled()
  return getMergedToolsFromPackage(
    permissionContext as ToolPermissionContextLike,
    mcpTools as readonly ToolLike[],
  ) as unknown as Tools
}
