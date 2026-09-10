/**
 * Puerto de `ccnmt: packages/tool-registry/src/providers/BuiltInToolsProvider.ts`
 * (8 líneas). El proveedor de las herramientas integradas.
 *
 * No las conoce: se las pide al host. El registro no puede importar cada
 * herramienta del producto sin depender de todas ellas, así que el
 * descubrimiento se invierte — el host declara qué hay, el registro las
 * indexa.
 */
import type { ToolLike, ToolProvider } from '../contracts.ts'
import { getToolRegistryHostBindings } from '../host.ts'

export const BuiltInToolsProvider: ToolProvider<ToolLike> = {
  name: 'builtin',
  discover(): readonly ToolLike[] {
    return getToolRegistryHostBindings().discoverBuiltInTools()
  },
}
