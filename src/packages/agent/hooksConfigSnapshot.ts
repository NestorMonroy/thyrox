/**
 * Snapshot de la config de hooks — porte PARCIAL de
 * `ccnmt: packages/agent/hooksConfigSnapshot.ts`.
 *
 * Se portan los SEIS símbolos exportados de la fuente:
 * `shouldAllowManagedHooksOnly`, `shouldDisableAllHooksIncludingManaged`,
 * `captureHooksConfigSnapshot`, `updateHooksConfigSnapshot`,
 * `getHooksConfigFromSnapshot`, `resetHooksConfigSnapshot`.
 *
 * DIVERGENCIA DE ALCANCE MAYOR, declarada: la fuente resuelve las dos
 * primeras contra un store de settings en vivo —
 * `settingsModule.getSettingsForSource('policySettings')`,
 * `settingsModule.getSettings()`, `isRestrictedToPluginOnly('hooks')`— de
 * `@claude-code-how-works/config/settings` y
 * `@claude-code-how-works/config/pluginOnlyPolicy`. Ese store no existe en
 * este árbol: `@thyrox/config` (`src/packages/config/`) expone funciones
 * PURAS (`mergeSettings`, `loadSettings`) sobre entradas explícitas, no un
 * singleton consultable en cualquier punto del árbol — no hay
 * `getSettingsForSource` que llamar.
 *
 * Sin ese store, las dos guardas se declaran de la única forma honesta
 * posible: **siempre `false`** (ningún hook está bloqueado por política,
 * porque no hay política en vivo que consultar). Es el default seguro —
 * un `true` fabricado bloquearía hooks sin que ninguna política real lo
 * pidiera. `goalStopHook.test.ts` (mismo pase) las sobreescribe además vía
 * `mock.module` a `() => false` explícito, así que el valor de esta
 * implementación no es lo que el test verifica — lo que verifica es que
 * el módulo EXISTE y es importable, que es la mitad de esta divergencia
 * que sí es observable.
 *
 * `captureHooksConfigSnapshot`/`updateHooksConfigSnapshot`/
 * `getHooksConfigFromSnapshot`/`resetHooksConfigSnapshot` se portan con su
 * forma —un snapshot mutable de módulo, capturado y reseteable— pero el
 * snapshot en sí es `{}` (no hay `getHooksFromAllowedSources()` real que
 * poblarlo). Se retira `resetSdkInitState()` de `resetHooksConfigSnapshot`
 * por la misma razón: pertenece a `app-host/bootstrap/state.js`, ausente.
 *
 * Se completa cuando `@thyrox/config` tenga un store de settings en vivo
 * — no en este pase, que sólo tiene los dos tests de goal/hooks a cargo.
 */

let hooksConfigSnapshot: Record<string, unknown> = {}

/**
 * ant `getHooksFromAllowedSources` simplificado: sin store de settings en
 * vivo, no hay nada que resolver — el snapshot capturado es siempre `{}`.
 */
function getHooksFromAllowedSources(): Record<string, unknown> {
  return {}
}

/**
 * Check if only managed hooks should run. Divergencia: siempre `false` —
 * ver docstring del módulo.
 */
export function shouldAllowManagedHooksOnly(): boolean {
  return false
}

/**
 * Check if all hooks (including managed) should be disabled. Divergencia:
 * siempre `false` — ver docstring del módulo.
 */
export function shouldDisableAllHooksIncludingManaged(): boolean {
  return false
}

/**
 * Capture a snapshot of the current hooks configuration
 * This should be called once during application startup
 */
export function captureHooksConfigSnapshot(): void {
  hooksConfigSnapshot = getHooksFromAllowedSources()
}

/**
 * Update the hooks configuration snapshot
 * This should be called when hooks are modified through the settings
 */
export function updateHooksConfigSnapshot(): void {
  hooksConfigSnapshot = getHooksFromAllowedSources()
}

/**
 * Get the current hooks configuration from snapshot
 * Falls back to settings if no snapshot exists
 * @returns The hooks configuration
 */
export function getHooksConfigFromSnapshot(): Record<string, unknown> {
  return hooksConfigSnapshot
}

/**
 * Reset the hooks configuration snapshot (useful for testing)
 */
export function resetHooksConfigSnapshot(): void {
  hooksConfigSnapshot = {}
}
