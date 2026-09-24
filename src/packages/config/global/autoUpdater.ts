/**
 * Por qué está apagado el auto-updater — `ale`, `IJe`, `M9`, `D9` de
 * 2.1.275 (`chunk-xbd48fav.js`).
 *
 * El orden importa: la primera causa que aplica es la que se informa.
 * DISABLE_UPDATES, DISABLE_AUTOUPDATER, el tráfico no esencial apagado
 * (`qje`) y, por último, `autoUpdates: false` en la config global, que no
 * cuenta en una instalación nativa que protegió su auto-update.
 *
 * DIVERGENCIA DE FIRMA, aditiva: las funciones aceptan la config global
 * como parámetro opcional; sin él leen `getGlobalConfig()` como la fuente.
 */
import { isEnvTruthy } from '../env/utils.ts'
import { type GlobalConfig, getGlobalConfig } from './config.ts'

export type AutoUpdaterDisabledReason =
  | { type: 'development' }
  | { type: 'env'; envVar: string }
  | { type: 'config' }

/** `qje`: la variable que apagó el tráfico no esencial, si la hay. */
function nonEssentialTrafficDisabledBy(): string | null {
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'
  return null
}

/** `ale`: la causa por la que el auto-updater no corre, o `null`. */
export function getAutoUpdaterDisabledReason(
  config: Pick<GlobalConfig, 'autoUpdates' | 'installMethod' | 'autoUpdatesProtectedForNative'> = getGlobalConfig(),
): AutoUpdaterDisabledReason | null {
  if (isEnvTruthy(process.env.DISABLE_UPDATES)) return { type: 'env', envVar: 'DISABLE_UPDATES' }
  if (isEnvTruthy(process.env.DISABLE_AUTOUPDATER)) return { type: 'env', envVar: 'DISABLE_AUTOUPDATER' }
  const trafficVar = nonEssentialTrafficDisabledBy()
  if (trafficVar) return { type: 'env', envVar: trafficVar }
  if (
    config.autoUpdates === false &&
    (config.installMethod !== 'native' || config.autoUpdatesProtectedForNative !== true)
  )
    return { type: 'config' }
  return null
}

/** `IJe`: la causa en palabras. */
export function formatAutoUpdaterDisabledReason(reason: AutoUpdaterDisabledReason): string {
  switch (reason.type) {
    case 'development':
      return 'development build'
    case 'env':
      return `set by env: ${reason.envVar}`
    case 'config':
      return 'config'
  }
}

/** `M9`. */
export function isAutoUpdaterDisabled(config?: Parameters<typeof getAutoUpdaterDisabledReason>[0]): boolean {
  return getAutoUpdaterDisabledReason(config) !== null
}

/** `D9`: los plugins no se auto-actualizan salvo FORCE_AUTOUPDATE_PLUGINS. */
export function shouldSkipPluginAutoupdate(config?: Parameters<typeof getAutoUpdaterDisabledReason>[0]): boolean {
  return isAutoUpdaterDisabled(config) && !isEnvTruthy(process.env.FORCE_AUTOUPDATE_PLUGINS)
}
