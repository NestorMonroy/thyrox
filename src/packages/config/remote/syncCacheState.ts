/**
 * La lectura síncrona de la caché de ajustes remotos — porte de `lgn`/`sm`
 * de 2.1.283 (`chunk-379zyrv7.js`) sobre el estado de carga remota de
 * `./loadState.ts` (`Ma`), que es la única caché de sesión: este módulo ya no
 * guarda la suya. Hoja del grafo: importa `../host.js`, `./loadState.js` y
 * `../settings/settingsCache.js`, todos hojas, para que `settings.ts` pueda
 * leerla sin arrastrar `auth.ts` al SCC de arranque (la razón original de
 * separarla de `syncCache.ts`, que sigue vigente).
 *
 * `lgn`: sin elegibilidad registrada no hay crudo; con caché de sesión, ésa;
 * si no, el disco (`sm`) siembra el estado (`Ma.seedFromDisk`) y vacía la
 * caché fusionada (`Ss`), porque todo `getSettings()` cacheado antes de este
 * momento carecía de la capa `policySettings`. Ocurre como mucho una vez: las
 * llamadas siguientes salen por la caché de sesión. La rama de `cs()` —el
 * `backendView` que invalida sólo la capa de política— no se toma: ver la
 * divergencia `backendView` en `./loadState.ts`.
 *
 * `sm` lee el archivo con `node:fs` y descarta lo que no sea un objeto;
 * `I5n` (la normalización del crudo de disco) y `La`/`gz` (el tope de tamaño)
 * no están extraídos: el crudo se sirve tal cual y sin tope.
 *
 * gh-23085: `isBridgeEnabled()`, evaluado al definir los comandos de Commander
 * (antes de `preAction → init() → isRemoteManagedSettingsEligible()`), llegaba
 * a `getSettings()` desde auth. El try/catch de bridgeEnabled se tragaba el
 * fallo posterior de `getGlobalConfig()`, pero la caché fusionada ya estaba
 * envenenada. La mitad unitaria del control es
 * `__tests__/remoteSettingsFirstHitFlush.test.ts`; la de integración,
 * `__tests__/policySettingsWiring.test.ts`.
 *
 * `setEligibility` y `resetSyncCache` se conservan como superficie: la primera
 * es `V1r` (registra y memoiza) y la segunda `W1r` (el reset completo, con su
 * listener), que no hace nada si aún no hay host instalado.
 */

import { readFileSync as fsReadFileSync } from 'node:fs'
import { join } from 'path'
import { HostBindingsError } from '../errors.js'
import { getConfigHostBindings } from '../host.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import type { SettingsJson } from '../settings/types.js'
import {
  getRemoteLoadState,
  getRemoteSettingsOverridePath,
  recordRemoteEligibility,
  resetRemoteLoadState,
  tryGetRemoteLoadState,
} from './loadState.js'

// V7 §11.4 — inlined 1-liners to avoid src/ imports.
const UTF8_BOM = '﻿'
function stripBOM(content: string): string {
  return content.startsWith(UTF8_BOM) ? content.slice(1) : content
}

const SETTINGS_FILENAME = 'remote-settings.json'

/** La razón que `MUt` publica cuando el host niega la elegibilidad: el binding no da otra. */
export const INELIGIBLE_REASON = 'user is not eligible for remote managed settings'

/** `W1r`, si hay host: sin él no hay estado que resetear. */
export function resetSyncCache(): void {
  if (tryGetRemoteLoadState() !== undefined) resetRemoteLoadState()
}

/** `V1r` con la razón fija de este árbol; devuelve lo registrado. */
export function setEligibility(eligible: boolean): boolean {
  return recordRemoteEligibility(eligible, eligible ? undefined : INELIGIBLE_REASON)
}

export function getSettingsPath(): string {
  const homeDir = getConfigHostBindings().getConfigHomeDir?.()
  if (!homeDir) {
    throw new HostBindingsError(
      'Config host binding getConfigHomeDir not installed',
    )
  }
  return join(homeDir, SETTINGS_FILENAME)
}

/** `sm`: el crudo de disco, o null si falta o no es un objeto. */
function loadSettings(): SettingsJson | null {
  try {
    const content = fsReadFileSync(getSettingsPath(), 'utf8')
    const data: unknown = JSON.parse(stripBOM(content))
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null
    }
    return data as SettingsJson
  } catch {
    return null
  }
}

/** `lgn`. */
export function getRemoteManagedSettingsSyncFromCache(): SettingsJson | null {
  const state = getRemoteLoadState()
  if (!getRemoteSettingsOverridePath() && state.eligible !== true) return null
  if (state.sessionCache) return state.sessionCache
  const cachedSettings = loadSettings()
  if (!cachedSettings) return null
  state.seedFromDisk(cachedSettings)
  resetSettingsCache()
  return cachedSettings
}
