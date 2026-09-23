/**
 * El estado de navegación de `/plugin` y las props de su vista raíz.
 *
 * PROCEDENCIA. Eran stubs `unknown` («Auto-generated stub»). Cada variante de
 * `ViewState` es un `type` que `PluginSettings.tsx` compara, con los campos que
 * le asignan sus constructores (`PluginSettings`, `AddMarketplace`,
 * `BrowseMarketplace`, `DiscoverPlugins`, `ManageMarketplaces`,
 * `ManagePlugins`) y el tipo que el checker da a cada inicializador. Un campo
 * es opcional cuando algún constructor lo omite o lo asigna `undefined`.
 *
 * No incluye la vista LOCAL de `ManagePlugins` (`plugin-options`, `mcp-detail`,
 * …): comparte la forma `{ type }` pero es otra unión, de otro componente.
 */
import type { LocalJSXCommandOnDone } from '@thyrox/agent/command.js'

export type ViewState =
  | { type: 'menu' }
  | { type: 'help' }
  | { type: 'validate'; path?: string }
  | { type: 'marketplace-menu' }
  | { type: 'marketplace-list' }
  | { type: 'add-marketplace'; initialValue?: string }
  | { type: 'browse-marketplace'; targetMarketplace: string; targetPlugin?: string }
  | { type: 'discover-plugins'; targetPlugin?: string }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: 'uninstall' | 'enable' | 'disable'
    }
  | { type: 'manage-marketplaces'; targetMarketplace?: string; action?: 'remove' | 'update' }

export type PluginSettingsProps = {
  onComplete: LocalJSXCommandOnDone
  args?: string
  showMcpRedirectMessage?: boolean
}
