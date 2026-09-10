/**
 * Puerto de `ccnmt: packages/config/settings/pluginOnlyPolicy.ts` (60
 * líneas fuente). Reimplementación fiel VERBATIM.
 *
 * `CUSTOMIZATION_SURFACES` se completa en `types.ts` en este mismo pase
 * (ver su docstring) — la fuente ya lo declaraba ahí.
 */
import { getSettingsForSource } from './settings.ts'
import type { CUSTOMIZATION_SURFACES } from './types.ts'

export type CustomizationSurface = (typeof CUSTOMIZATION_SURFACES)[number]

/**
 * Comprueba si una superficie de customización está bloqueada a fuentes
 * sólo-plugin por la política administrada
 * `strictPluginOnlyCustomization`.
 *
 * "Bloqueada" significa que las fuentes a nivel usuario (`~/.claude/*`) y a
 * nivel proyecto (`.claude/*`) se saltan para esa superficie. Las fuentes
 * managed (`policySettings`) y provistas por plugin siempre cargan sin
 * importar esto — la política la fija un admin, así que las fuentes
 * managed ya están controladas por admin, y los plugins se gatean por
 * separado vía `strictKnownMarketplaces`.
 *
 * `true` bloquea las cuatro superficies; la forma array bloquea sólo las
 * listadas. Ausente/undefined → nada bloqueado (el default).
 */
export function isRestrictedToPluginOnly(
  surface: CustomizationSurface,
): boolean {
  const policy =
    getSettingsForSource('policySettings')?.strictPluginOnlyCustomization
  if (policy === true) return true
  if (Array.isArray(policy)) return policy.includes(surface)
  return false
}

/**
 * Fuentes que sortean `strictPluginOnlyCustomization`. Confiadas por admin
 * porque:
 *   plugin — se gatean por separado vía strictKnownMarketplaces
 *   policySettings — de settings managed, controladas por admin por definición
 *   built-in / builtin / bundled — vienen con el CLI, no son autoría del usuario
 *
 * Todo lo demás (userSettings, projectSettings, localSettings,
 * flagSettings, mcp, undefined) está bajo control del usuario y se bloquea
 * cuando la superficie relevante está bloqueada. Cubre tanto
 * `AgentDefinition.source` ('built-in' con guion) como `Command.source`
 * ('builtin' sin guion, más 'bundled').
 */
const ADMIN_TRUSTED_SOURCES: ReadonlySet<string> = new Set([
  'plugin',
  'policySettings',
  'built-in',
  'builtin',
  'bundled',
])

/**
 * Si la fuente de una customización es confiada por admin bajo
 * `strictPluginOnlyCustomization`. Se usa para gatear el registro de hooks
 * de frontmatter y checks per-ítem similares donde el ítem lleva una
 * etiqueta de fuente pero el loader de filesystem de la superficie ya
 * corrió.
 *
 * Patrón en el sitio de llamada:
 *   const allowed = !isRestrictedToPluginOnly(surface) || isSourceAdminTrusted(item.source)
 *   if (item.hooks && allowed) { register(...) }
 */
export function isSourceAdminTrusted(source: string | undefined): boolean {
  return source !== undefined && ADMIN_TRUSTED_SOURCES.has(source)
}
