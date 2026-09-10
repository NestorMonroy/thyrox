/**
 * Puerto de `ccnmt: packages/config/internal/allowedSourcesState.ts` (30
 * líneas fuente). Reimplementación fiel VERBATIM.
 *
 * config es el dueño canónico del estado de fuentes de settings
 * permitidas, así que el estado vive junto a las reglas que lo consumen.
 * Hay exactamente un valor `allowedSettingSources` a nivel de proceso.
 */

import type { SettingSource } from '../settings/constants.ts'

const DEFAULT_ALLOWED_SETTING_SOURCES: SettingSource[] = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
]

let allowedSettingSources: SettingSource[] = DEFAULT_ALLOWED_SETTING_SOURCES

export function getAllowedSettingSources(): SettingSource[] {
  return allowedSettingSources
}

export function setAllowedSettingSources(sources: SettingSource[]): void {
  allowedSettingSources = sources
}
