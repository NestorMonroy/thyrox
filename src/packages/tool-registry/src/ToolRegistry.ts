/**
 * Puerto de `ccnmt: packages/tool-registry/src/ToolRegistry.ts` (153 líneas).
 * El índice de herramientas y su política de ensamblado.
 *
 * Es un índice de DOS claves: el nombre canónico y cada alias. Por eso
 * `unregister` recorre los alias de la herramienta que se retira y borra
 * sólo los que apuntan a ella — vaciar el mapa entero dejaría a las demás
 * sin sus propias claves, y eso no se ve contando entradas.
 */
import uniqBy from 'lodash-es/uniqBy.js'
import type {
  ToolCategory,
  ToolLike,
  ToolPermissionContextLike,
  ToolProvider,
  ToolRegistration,
  ToolRegistryEvents,
} from './contracts.ts'
import { getToolRegistryHostBindings } from './host.ts'

export class ToolRegistry<
  TTool extends ToolLike = ToolLike,
  TPermissionContext extends ToolPermissionContextLike = ToolPermissionContextLike,
> {
  private toolsByName = new Map<string, TTool>()
  private registrationsByName = new Map<string, ToolRegistration<TTool>>()
  private aliasIndex = new Map<string, string>()
  private providers = new Map<string, ToolProvider<TTool>>()
  private events: ToolRegistryEvents<TTool>

  constructor(events?: ToolRegistryEvents<TTool>) {
    this.events = events ?? {}
  }

  register(tool: TTool, category: ToolCategory, providerName: string): void {
    this.toolsByName.set(tool.name, tool)
    this.registrationsByName.set(tool.name, { tool, category, providerName })

    if (tool.aliases) {
      for (const alias of tool.aliases) this.aliasIndex.set(alias, tool.name)
    }

    this.events.onRegister?.({ tool, category, providerName })
  }

  unregister(name: string): boolean {
    const tool = this.toolsByName.get(name)
    if (!tool) return false

    // Sólo los alias que apuntan a ESTA herramienta: otra pudo haber
    // reclamado el mismo alias después, y borrarlo la dejaría sin su clave.
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        if (this.aliasIndex.get(alias) === name) this.aliasIndex.delete(alias)
      }
    }

    this.toolsByName.delete(name)
    this.registrationsByName.delete(name)
    this.events.onUnregister?.(name)
    return true
  }

  async registerProvider(provider: ToolProvider<TTool>): Promise<void> {
    this.providers.set(provider.name, provider)
    const tools = await provider.discover()
    for (const tool of tools) this.register(tool, 'builtin', provider.name)
  }

  get(name: string): TTool | undefined {
    const directo = this.toolsByName.get(name)
    if (directo) return directo
    const canonico = this.aliasIndex.get(name)
    return canonico ? this.toolsByName.get(canonico) : undefined
  }

  getAll(): TTool[] {
    return Array.from(this.toolsByName.values())
  }

  getRegistrations(): ToolRegistration<TTool>[] {
    return Array.from(this.registrationsByName.values())
  }

  getByCategory(category: ToolCategory): TTool[] {
    return this.getRegistrations()
      .filter(r => r.category === category)
      .map(r => r.tool)
  }

  getRegistration(name: string): ToolRegistration<TTool> | undefined {
    return this.registrationsByName.get(name)
  }

  has(name: string): boolean {
    return this.toolsByName.has(name) || this.aliasIndex.has(name)
  }

  filterByDenyRules<T extends Pick<TTool, 'name' | 'mcpInfo'>>(
    tools: readonly T[],
    permissionContext: TPermissionContext,
  ): T[] {
    const bindings = getToolRegistryHostBindings()
    return tools.filter(
      tool =>
        !bindings.getDenyRuleForTool(
          permissionContext,
          tool as Pick<TTool, 'name' | 'mcpInfo'>,
        ),
    )
  }

  getEnabledTools(permissionContext: TPermissionContext): TTool[] {
    // Dos filtros distintos, y hacen falta los dos: la denegación es del
    // host y `isEnabled` es de la herramienta.
    const todas = this.getByCategory('builtin')
    return this.filterByDenyRules(todas, permissionContext).filter(t =>
      t.isEnabled(),
    )
  }

  assemblePool(
    permissionContext: TPermissionContext,
    mcpTools: readonly TTool[],
  ): TTool[] {
    const integradas = this.getEnabledTools(permissionContext)
    const deMcp = this.filterByDenyRules(mcpTools, permissionContext)
    const porNombre = (a: TTool, b: TTool) => a.name.localeCompare(b.name)
    // Las integradas van PRIMERO y `uniqBy` conserva la primera: un servidor
    // MCP no puede suplantar una herramienta del producto llamándola igual.
    return uniqBy(
      [...integradas].sort(porNombre).concat([...deMcp].sort(porNombre)),
      'name',
    )
  }

  static findIn<T extends Pick<ToolLike, 'name' | 'aliases'>>(
    tools: readonly T[],
    name: string,
  ): T | undefined {
    return tools.find(
      t => t.name === name || (t.aliases?.includes(name) ?? false),
    )
  }

  clear(): void {
    this.toolsByName.clear()
    this.registrationsByName.clear()
    this.aliasIndex.clear()
    this.providers.clear()
  }

  get size(): number {
    return this.toolsByName.size
  }
}
