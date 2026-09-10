/**
 * Puerto de `ccnmt: packages/ide/src/lsp/config.ts`. `PluginError`,
 * `getPluginLspServers` y `loadAllPluginsCacheOnly` vienen de
 * `@claude-code-how-works/config/plugin/{types,lspPluginIntegration,
 * pluginLoader}.ts` — ninguno de los tres existe todavía en
 * `@thyrox/config` (sólo `plugin/{builtin,pluginOperations,_deps}.ts`).
 * Sustitutos en `../internal/pendingCrossPackageDeps.js`: sin plugins
 * registrados, `loadAllPluginsCacheOnly()` devuelve `{ enabled: [] }` —el
 * mismo desenlace observable que tendría un árbol real sin plugins
 * habilitados, no una invención de comportamiento.
 */
import {
  getPluginLspServers,
  loadAllPluginsCacheOnly,
  type PluginErrorLike,
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
} from '../internal/pendingCrossPackageDeps.js'
import type { ScopedLspServerConfig } from './types.js'

/**
 * Obtiene todos los servidores LSP configurados desde los plugins.
 * Los servidores LSP sólo se admiten vía plugins, no vía settings de
 * usuario/proyecto.
 *
 * @returns Objeto con la configuración de servidores, indexado por nombre
 * de servidor scoped.
 */
export async function getAllLspServers(): Promise<{
  servers: Record<string, ScopedLspServerConfig>
}> {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage, toError } = requireLocalObservabilityErrorHelpers()

  const allServers: Record<string, ScopedLspServerConfig> = {}

  try {
    // Obtiene todos los plugins habilitados.
    const { enabled: plugins } = await loadAllPluginsCacheOnly()

    // Carga los servidores LSP de cada plugin en paralelo. Cada plugin es
    // independiente — los resultados se combinan en el orden original para
    // que la precedencia de colisión de Object.assign (el último plugin
    // gana) se conserve.
    const results = await Promise.all(
      plugins.map(async plugin => {
        const errors: PluginErrorLike[] = []
        try {
          const scopedServers = await getPluginLspServers(plugin, errors)
          return { plugin, scopedServers, errors }
        } catch (e) {
          // Defensivo: si un plugin lanza, no se pierden los resultados de
          // los demás. El loop serial anterior toleraba esto implícitamente.
          logForDebugging(
            `Failed to load LSP servers for plugin ${plugin.name}: ${e}`,
            { level: 'error' },
          )
          return { plugin, scopedServers: undefined, errors }
        }
      }),
    )

    for (const { plugin, scopedServers, errors } of results) {
      const serverCount = scopedServers ? Object.keys(scopedServers).length : 0
      if (serverCount > 0) {
        // Se combina en allServers (ya scoped por getPluginLspServers).
        Object.assign(allServers, scopedServers)

        logForDebugging(
          `Loaded ${serverCount} LSP server(s) from plugin: ${plugin.name}`,
        )
      }

      // Loguea cualquier error encontrado.
      if (errors.length > 0) {
        logForDebugging(
          `${errors.length} error(s) loading LSP servers from plugin: ${plugin.name}`,
        )
      }
    }

    logForDebugging(
      `Total LSP servers loaded: ${Object.keys(allServers).length}`,
    )
  } catch (error) {
    // Se loguea el error para monitoreo en producción.
    // LSP es opcional, así que no se lanza — pero se necesita visibilidad
    // de por qué la carga de plugins falla, para mejorar la feature.
    logError(toError(error))

    logForDebugging(`Error loading LSP servers: ${errorMessage(error)}`)
  }

  return {
    servers: allServers,
  }
}
