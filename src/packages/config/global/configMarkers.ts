/**
 * Lectores y escritores de claves concretas del registro global, que
 * `config.ts` declaraba pendientes «hasta su consumidor». Los consumidores
 * existen: `app-host/init.ts`, `cli/bg/openAgentsFromRepl.ts`, el menú de
 * `/config` y el onboarding.
 *
 * Reimplementación del contrato de 2.1.275, no copia:
 *
 *   `recordFirstStartTime` ≙ `Frr`/`Beo` · `getCustomApiKeyStatus` ≙ `j6r`
 *   · `getRemoteControlAtStartup` ≙ `$3` (con `CJe`/`qEn`, `G9`, `LT`)
 *   · `markHasUsedAgentsFleet` — el marcador que la pestaña de agentes lee
 *     (`hasOpenedAgentsView || hasUsedAgentsFleet`); se escribe sólo si
 *     no estaba, como el resto de marcadores pegajosos.
 *
 * El parámetro `filePath` opcional es la misma divergencia aditiva de
 * `config.ts`: sin él, la conducta es la de la fuente.
 */
import { resolve } from 'node:path'
import { getSettingsFilePathForSource, getSettingsForSource } from '../settings/settings.js'
import { getGlobalConfig, saveGlobalConfig } from './config.ts'

/** Guarda la primera hora de arranque, una sola vez (≙ `Frr`). */
export function recordFirstStartTime(filePath?: string): void {
  if (getGlobalConfig(filePath).firstStartTime) return
  const now = new Date().toISOString()
  saveGlobalConfig(config => (config.firstStartTime ? config : { ...config, firstStartTime: now }), filePath)
}

/** Deja constancia de que se usó la flota de agentes, una sola vez. */
export function markHasUsedAgentsFleet(filePath?: string): void {
  if (getGlobalConfig(filePath).hasUsedAgentsFleet) return
  saveGlobalConfig(config => (config.hasUsedAgentsFleet ? config : { ...config, hasUsedAgentsFleet: true }), filePath)
}

/** Qué respondió el usuario a una API key personalizada (≙ `j6r`). */
export function getCustomApiKeyStatus(truncatedKey: string, filePath?: string): 'approved' | 'rejected' | 'new' {
  const responses = getGlobalConfig(filePath).customApiKeyResponses
  if (responses?.approved?.includes(truncatedKey)) return 'approved'
  if (responses?.rejected?.includes(truncatedKey)) return 'rejected'
  return 'new'
}

/** Las fuentes de settings que pueden ENCENDER Remote Control, por precedencia (≙ `tto`). */
const SECURITY_SENSITIVE_SOURCES = ['policySettings', 'flagSettings', 'userSettings'] as const

export type RemoteControlAtStartupSource =
  | 'project_or_local_false'
  | 'policy'
  | 'flag'
  | 'user'
  | 'legacy_global_config'
  | 'none'

function remoteControlSetting(source: Parameters<typeof getSettingsForSource>[0]): boolean | undefined {
  const value = (getSettingsForSource(source) as { remoteControlAtStartup?: unknown } | null)?.remoteControlAtStartup
  return typeof value === 'boolean' ? value : undefined
}

/** ¿Son las settings de proyecto el mismo archivo que las de usuario? (≙ `LT`). */
function projectSettingsAliasUserSettings(): boolean {
  const project = getSettingsFilePathForSource('projectSettings')
  const user = getSettingsFilePathForSource('userSettings')
  return !!project && !!user && resolve(project) === resolve(user)
}

/**
 * De dónde sale el valor de `remoteControlAtStartup` (≙ `qEn`). Las
 * settings del repositorio sólo pueden APAGARLO: un `true` en proyecto o
 * local se ignora, porque un repositorio no se concede Remote Control a sí
 * mismo.
 */
export function resolveRemoteControlAtStartup(filePath?: string): {
  value: boolean | undefined
  source: RemoteControlAtStartupSource
} {
  const project = projectSettingsAliasUserSettings() ? undefined : remoteControlSetting('projectSettings')
  const local = remoteControlSetting('localSettings')
  if (project === false || local === false) return { value: false, source: 'project_or_local_false' }
  for (const source of SECURITY_SENSITIVE_SOURCES) {
    const value = remoteControlSetting(source)
    if (value !== undefined) {
      return { value, source: ({ policySettings: 'policy', flagSettings: 'flag', userSettings: 'user' } as const)[source] }
    }
  }
  const legacy = getGlobalConfig(filePath).remoteControlAtStartup
  return legacy !== undefined ? { value: legacy, source: 'legacy_global_config' } : { value: undefined, source: 'none' }
}

function ccrAutoConnectDefault(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/bridge/bridgeEnabled.js') as { getCcrAutoConnectDefault: () => boolean }).getCcrAutoConnectDefault()
  } catch {
    return false
  }
}

/** ¿Arranca la sesión con Remote Control? Sin declaración, el defecto de CCR (≙ `$3`). */
export function getRemoteControlAtStartup(filePath?: string): boolean {
  const { value } = resolveRemoteControlAtStartup(filePath)
  return value !== undefined ? value : ccrAutoConnectDefault()
}
