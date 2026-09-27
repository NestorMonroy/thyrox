/**
 * Leaf state module for the remote-managed-settings sync cache.
 *
 * Split from syncCache.ts to break the settings.ts → syncCache.ts → auth.ts →
 * settings.ts cycle. auth.ts sits inside the large settings SCC; importing it
 * from settings.ts's own dependency chain pulls hundreds of modules into the
 * eagerly-evaluated SCC at startup.
 *
 * This module imports only leaves (path, envUtils, file, json, types,
 * settings/settingsCache — also a leaf, only type-imports validation). settings.ts
 * reads the cache from here. syncCache.ts keeps isRemoteManagedSettingsEligible
 * (the auth-touching part) and re-exports everything from here for callers that
 * don't care about the cycle.
 *
 * Eligibility is a tri-state here: undefined (not yet determined — return
 * null), false (ineligible — return null), true (proceed). managedEnv.ts
 * calls isRemoteManagedSettingsEligible() just before the policySettings
 * read — after userSettings/flagSettings env vars are applied, so the check
 * sees config-provided THYROX_CODE_USE_BEDROCK/ANTHROPIC_BASE_URL. That call
 * computes once and mirrors the result here via setEligibility(). Every
 * subsequent read hits the cached bool instead of re-running the auth chain.
 */

import { readFileSync as fsReadFileSync } from 'node:fs'
import { join } from 'path'
import { HostBindingsError } from '../errors.js'
import { getConfigHostBindings } from '../host.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import type { SettingsJson } from '../settings/types.js'

// V7 §11.4 — inlined 1-liners to avoid src/ imports.
const UTF8_BOM = '\uFEFF'
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

// sync IO — settings pipeline is sync. fileRead and jsonRead are leaves;
// file.ts and json.ts both sit in the settings SCC.
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
    // Los ajustes remotos acaban de estar disponibles por primera vez. Todo
    // resultado fusionado de getSettings() cacheado antes de este momento
    // carece de la capa policySettings (la guarda `eligible !== true` de
    // arriba devolvía null). Se vacía para que la siguiente lectura fusionada
    // vuelva a fusionar con esta capa visible.
    //
    // Ocurre como mucho una vez: las llamadas siguientes salen por
    // `if (sessionCache)`. Llamada desde loadSettingsFromDisk(), el caché
    // fusionado todavía es null (setSessionSettingsCache corre después de que
    // loadSettingsFromDisk vuelve): no hace nada. La rama de descarga
    // asíncrona (setSessionCache + notifyChange en index.ts) ya hace su propio
    // vaciado.
    //
    // gh-23085: isBridgeEnabled(), evaluado al definir los comandos de
    // Commander (antes de preAction → init() → isRemoteManagedSettingsEligible()),
    // llegaba a getSettings() desde auth. El try/catch de bridgeEnabled se
    // tragaba el fallo posterior de getGlobalConfig(), pero el caché fusionado
    // ya estaba envenenado. La mitad unitaria del control es
    // `__tests__/remoteSettingsFirstHitFlush.test.ts`; la de integración
    // headless espera a que se porte la composición de policySettings.
    resetSettingsCache()
    return cachedSettings
  }
  return null
}
