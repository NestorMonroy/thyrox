/**
 * Puerto de `ccnmt: packages/config/settings/allErrors.ts` (39 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * `SettingsWithErrors` se completa en `validation.ts` en este mismo pase
 * (ver su docstring) — la fuente ya lo declaraba ahí.
 *
 * Combina los errores de validación de settings con los errores de config
 * MCP.
 *
 * Este módulo existe para romper una dependencia circular:
 *   settings.ts → mcp/config.ts → settings.ts
 *
 * config (hoja de Wave 1) no puede importar de mcp-runtime (integración de
 * Wave 5). La obtención de errores MCP se inyecta vía el binding
 * `ConfigHostBindings.getMcpErrorsByScope`, que el app-host conecta a
 * mcp-runtime en tiempo de composición.
 */

import { getConfigHostBindings } from '../host.ts'
import { getSettingsWithErrors } from './settings.ts'
import type { SettingsWithErrors } from './validation.ts'

/**
 * Obtiene los settings fusionados con TODOS los errores de validación,
 * incluidos los errores de config MCP.
 *
 * Usar esto en vez de `getSettingsWithErrors()` cuando haga falta el
 * conjunto completo de errores (settings + MCP). El
 * `getSettingsWithErrors()` subyacente ya no incluye errores MCP, para
 * evitar la dependencia circular.
 */
export function getSettingsWithAllErrors(): SettingsWithErrors {
  const result = getSettingsWithErrors()
  const getMcpErrors = getConfigHostBindings().getMcpErrorsByScope
  if (!getMcpErrors) {
    // El binding del host no está instalado todavía (bootstrap temprano, o
    // corridas headless que se saltan MCP). Devuelve sólo los errores de settings.
    return result
  }
  // El scope 'dynamic' no devuelve errores — lanza, y se fija en el arranque del cli.
  const scopes = ['user', 'project', 'local'] as const
  const mcpErrors = scopes.flatMap(scope => getMcpErrors(scope))
  return {
    settings: result.settings,
    errors: [...result.errors, ...mcpErrors],
  }
}
