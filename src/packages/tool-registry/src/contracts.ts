/**
 * Puerto de `ccnmt: packages/tool-registry/src/contracts.ts` (61 líneas,
 * 8 símbolos). Los tipos estructurales del registro: qué es una herramienta,
 * quién la provee, y qué le pide el registro a su host.
 *
 * Son ESTRUCTURALES a propósito. `ToolLike` no describe la herramienta real
 * —que vive en el paquete que la implementa— sino lo mínimo que el registro
 * necesita para indexarla y filtrarla: su nombre, sus alias y si está
 * habilitada. Atar el registro a la clase real lo haría depender de cada
 * herramienta que registra, que es justo lo que un registro no debe hacer.
 */

export type ToolPermissionContextLike = {
  mode?: string
  [key: string]: unknown
}

export type ToolLike = {
  name: string
  aliases?: string[]
  isEnabled: () => boolean
  mcpInfo?: { serverName: string; toolName: string }
  [key: string]: unknown
}

export type ToolCategory = 'builtin' | 'mcp' | 'plugin' | 'user'

export type ToolRegistration<TTool extends ToolLike = ToolLike> = {
  tool: TTool
  category: ToolCategory
  providerName: string
}

export type ToolProvider<TTool extends ToolLike = ToolLike> = {
  name: string
  discover(): readonly TTool[] | Promise<readonly TTool[]>
}

export type ToolRegistryEvents<TTool extends ToolLike = ToolLike> = {
  onRegister?: (registration: ToolRegistration<TTool>) => void
  onUnregister?: (name: string) => void
}

/**
 * Sustituto estructural del estado de aplicación, para las herramientas que
 * necesitan tipar un `setAppState` o mirar el contexto de permiso sin
 * importar el estado real.
 */
export type AppStateLike = {
  toolPermissionContext?: ToolPermissionContextLike
  mainLoopModel?: string
  [key: string]: unknown
}

export type ToolRegistryHostBindings<
  TTool extends ToolLike = ToolLike,
  TPermissionContext extends ToolPermissionContextLike = ToolPermissionContextLike,
> = {
  discoverBuiltInTools: () => readonly TTool[]
  getDenyRuleForTool: (
    permissionContext: TPermissionContext,
    tool: Pick<TTool, 'name' | 'mcpInfo'>,
  ) => unknown
  getModeAwareTools?: (args: {
    permissionContext: TPermissionContext
    baseTools: readonly TTool[]
    filterToolsByDenyRules: (
      tools: readonly TTool[],
      permissionContext: TPermissionContext,
    ) => TTool[]
  }) => TTool[]
  replOnlyToolNames: () => ReadonlySet<string>
}
