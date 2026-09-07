/**
 * Puerto de `ccnmt: packages/config/settings/applySettingsChange.ts` (73
 * líneas fuente). Adaptado en un punto, declarado abajo.
 *
 * DIVERGENCIA declarada: la fuente lee `newSettings.effortLevel` /
 * `prev.settings.effortLevel` como campos declarados del esquema. Nuestro
 * `Settings` (`./types.ts`, ya portado por un agente anterior con un
 * esquema más reducido) no declara `effortLevel` — se lee vía
 * `Record<string, unknown>` en vez de ensanchar el esquema compartido en
 * este pase. El esquema SÍ es `.passthrough()`, así que la clave sobrevive
 * en el objeto en runtime si está presente en disco; sólo cambia el tipo
 * estático de acceso.
 */
import { tryGetConfigHostBindings } from '../host.ts'
import type { SettingSource } from './constants.ts'
import { getInitialSettings } from './settings.ts'

/**
 * Tipo estructural mínimo para el slice de estado que
 * `applySettingsChange` lee y actualiza. El `AppState` completo es
 * propiedad de app-host; config sólo necesita estos tres campos más una
 * firma de índice abierta para el spread-back.
 */
type SettingsChangeTarget = {
  toolPermissionContext: unknown
  settings: { effortLevel?: unknown }
  effortValue?: unknown
  [key: string]: unknown
}

/**
 * Aplica un cambio de settings al estado de la app. Relee los settings del
 * disco, recarga permisos y hooks, y empuja el nuevo estado.
 *
 * Lo usan tanto la ruta interactiva (`AppState.tsx` vía
 * `useSettingsChange`) como la ruta headless/SDK (`print.ts` con subscribe
 * directo), para que los cambios de settings managed/política se apliquen
 * completamente en ambos modos.
 *
 * La caché de settings la resetea el notificador
 * (`changeDetector.fanOut`) antes de iterar los listeners, así que
 * `getInitialSettings()` aquí lee el estado fresco del disco.
 * Anteriormente esta función reseteaba la caché ella misma, lo que —
 * combinado con el reset propio de `useSettingsChange`— causaba N
 * recargas de disco por N suscriptores por notificación.
 *
 * Side-effects como limpiar cachés de auth y aplicar variables de entorno
 * los maneja `onChangeAppState`, que dispara cuando `settings` cambia en
 * el estado.
 */
export function applySettingsChange(
  source: SettingSource,
  setAppState: (f: (prev: SettingsChangeTarget) => SettingsChangeTarget) => void,
): void {
  const bindings = tryGetConfigHostBindings()
  const newSettings = getInitialSettings() as Record<string, unknown>

  bindings.logDebug?.(`Settings changed from ${source}, updating app state`)

  const updatedRules = bindings.loadAllPermissionRulesFromDisk?.() ?? []
  bindings.updateHooksConfigSnapshot?.()

  setAppState(prev => {
    const newContext = bindings.reconcilePermissionContext?.(prev.toolPermissionContext, updatedRules) ?? prev.toolPermissionContext

    // Sincroniza effortLevel de settings al AppState de nivel superior
    // cuando cambia (p. ej. vía applyFlagSettings desde el IDE). Sólo se
    // propaga si el propio setting cambió — de lo contrario, churn de
    // settings no relacionado (p. ej. descarte de tips al arrancar)
    // arrasaría con un valor de la flag CLI --effort guardado en AppState.
    const prevEffort = prev.settings.effortLevel
    const newEffort = newSettings.effortLevel
    const effortChanged = prevEffort !== newEffort

    return {
      ...prev,
      settings: newSettings,
      toolPermissionContext: newContext,
      // Sólo propaga un valor nuevo DEFINIDO — cuando la clave en disco
      // está ausente (p. ej. /effort max para no-ants escribe undefined;
      // flag CLI --effort), prev.settings.effortLevel puede estar
      // desactualizado (las escrituras internas suprimen el watcher que
      // resincronizaría AppState.settings), así que effortChanged sería
      // verdadero y borraríamos un valor de ámbito-sesión guardado en
      // effortValue.
      ...(effortChanged && newEffort !== undefined
        ? { effortValue: newEffort }
        : {}),
    }
  })
}
