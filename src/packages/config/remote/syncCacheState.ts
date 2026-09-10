/**
 * Puerto de `ccnmt: packages/config/remote/syncCacheState.ts` (107 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * Módulo hoja de estado para la caché de sync de settings managed
 * remotos. Separado de `syncCache.ts` para romper el ciclo
 * `settings.ts → syncCache.ts → auth.ts → settings.ts`. `auth.ts` vive
 * dentro del SCC grande de settings; importarlo desde la propia cadena de
 * dependencias de `settings.ts` arrastraría cientos de módulos al SCC
 * evaluado con avidez en el arranque.
 *
 * Este módulo importa sólo hojas (path, envUtils, file, json, types,
 * settings/settingsCache — también una hoja, sólo type-importa
 * validation). `settings.ts` lee la caché desde aquí. `syncCache.ts`
 * conserva `isRemoteManagedSettingsEligible` (la parte que toca auth) y
 * re-exporta todo lo de aquí para llamadores a quienes no les importa el
 * ciclo.
 *
 * La elegibilidad aquí es tri-estado: undefined (aún no determinada —
 * devuelve null), false (no elegible — devuelve null), true (procede).
 * `managedEnv.ts` llama a `isRemoteManagedSettingsEligible()` justo antes
 * de la lectura de `policySettings` — después de que se aplican las
 * variables de entorno de userSettings/flagSettings, así que el chequeo ve
 * `CLAUDE_CODE_USE_BEDROCK`/`ANTHROPIC_BASE_URL` provisto por config. Esa
 * llamada calcula una sola vez y refleja el resultado aquí vía
 * `setEligibility()`. Cada lectura subsiguiente pega contra el booleano
 * cacheado en vez de re-correr la cadena de auth.
 */

import { readFileSync as fsReadFileSync } from 'node:fs'
import { join } from 'node:path'
import { HostBindingsError } from '../errors.ts'
import { getConfigHostBindings } from '../host.ts'
import { resetSettingsCache } from '../settings/settingsCache.ts'
import type { SettingsJson } from '../settings/types.ts'

// Utilidades de una línea inlineadas para no arrastrar imports de `src/`.
const UTF8_BOM = '﻿'
function stripBOM(content: string): string {
  return content.startsWith(UTF8_BOM) ? content.slice(1) : content
}

const SETTINGS_FILENAME = 'remote-settings.json'

let sessionCache: SettingsJson | null = null
let eligible: boolean | undefined

export function setSessionCache(value: SettingsJson | null): void {
  sessionCache = value
}

export function resetSyncCache(): void {
  sessionCache = null
  eligible = undefined
}

export function setEligibility(v: boolean): boolean {
  eligible = v
  return v
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

// I/O sync — el pipeline de settings es sync. `fileRead` y `jsonRead` son
// hojas; `file.ts` y `json.ts` viven ambos en el SCC de settings.
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

export function getRemoteManagedSettingsSyncFromCache(): SettingsJson | null {
  if (eligible !== true) return null
  if (sessionCache) return sessionCache
  const cachedSettings = loadSettings()
  if (cachedSettings) {
    sessionCache = cachedSettings
    // Los settings remotos acaban de estar disponibles por primera vez.
    // Cualquier resultado de `getSettings()` fusionado cacheado antes de
    // este momento carece de la capa `policySettings` (el guard
    // `eligible !== true` de arriba devolvió null). Se descarga la caché
    // para que la próxima lectura fusionada re-fusione con esta capa
    // visible.
    //
    // Dispara como máximo una vez: llamadas subsiguientes pegan contra
    // `if (sessionCache)` arriba. Cuando se llama desde
    // `loadSettingsFromDisk()` (`settings.ts:546`), la caché fusionada aún
    // es null (`setSessionSettingsCache` corre en `:732` después de que
    // `loadSettingsFromDisk` retorna) — no-op. La rama de fetch async
    // (`index.ts` `setSessionCache` + `notifyChange`) ya maneja su propio
    // reset.
    //
    // gh-23085: `isBridgeEnabled()` en el momento de definición de
    // Commander de `main.tsx` (antes de `preAction → init() →
    // isRemoteManagedSettingsEligible()`) alcanzaba `getSettings()` en
    // `auth.ts:115`. El try/catch en `bridgeEnabled` tragaba el `throw` de
    // `getGlobalConfig()` posterior, pero la caché de settings fusionados
    // ya estaba envenenada. Ver `managedSettingsHeadless.int.test.ts`.
    resetSettingsCache()
    return cachedSettings
  }
  return null
}
