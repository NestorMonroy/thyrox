/**
 * Sustituto local, compartido, para `getGlobalConfig`/`saveGlobalConfig`
 * de `@claude-code-how-works/config` (bare export, `config/global/config.ts`)
 * — módulo entero ausente en `@thyrox/config` (medido con
 * `Bun.resolveSync('@thyrox/config/global/config.js', <dir>)` desde este
 * paquete: "Cannot find module"). Lo usan tanto `autoUpdater.ts` como
 * `nativeInstaller/installer.ts`.
 *
 * `getGlobalConfig()` devuelve `{}` cuando el módulo no existe —
 * mismo criterio conservador que el resto de los sustitutos de este
 * paquete: los llamadores (`checkInstall`, `installLatestImpl`) ya leen
 * `config.installMethod` con acceso opcional, así que un objeto vacío
 * es un fallback seguro (equivale a "sin config previa").
 * `saveGlobalConfig()` es un no-op documentado cuando el módulo falta —
 * la escritura se pierde, pero no se fabrica un segundo formato de
 * `~/.claude.json` en paralelo al que `@thyrox/config` gestionará.
 */

export type GlobalConfigLike = Record<string, unknown>

type GlobalConfigApi = {
  getGlobalConfig: () => GlobalConfigLike
  saveGlobalConfig: (
    updater: (current: GlobalConfigLike) => GlobalConfigLike,
  ) => void
}

let _cached: GlobalConfigApi | null | undefined

function tryGetGlobalConfigApi(): GlobalConfigApi | null {
  if (_cached !== undefined) {
    return _cached
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _cached = require('@thyrox/config/global/config.js') as GlobalConfigApi
  } catch {
    _cached = null
  }
  return _cached
}

export function getGlobalConfig(): GlobalConfigLike {
  return tryGetGlobalConfigApi()?.getGlobalConfig() ?? {}
}

export function saveGlobalConfig(
  updater: (current: GlobalConfigLike) => GlobalConfigLike,
): void {
  const api = tryGetGlobalConfigApi()
  if (!api) {
    return
  }
  api.saveGlobalConfig(updater)
}
