// Adaptación de @claude-code-how-works/app-host: src/startup/caCertsConfig.ts.
// Capa 1 — porte PARCIAL declarado.
//
// La fuente lee `NODE_EXTRA_CA_CERTS` de dos fuentes de config:
// `getGlobalConfig()` (de `@claude-code-how-works/config`) y
// `getSettingsForSource('userSettings')` (de
// `@claude-code-how-works/config/settings`). Ninguna de las dos existe en
// este árbol — `@thyrox/config` tiene una forma distinta (`loadSettings`/
// `mergeSettings` sobre specs explícitas, sin noción de "config global" ni
// de "fuente por nombre") y, aun si la tuviera, un sibling package no
// resuelve hoy desde `app-host` (medido: `import('@thyrox/storage/...')`
// desde este mismo paquete da `Cannot find module`).
//
// Se resuelve con inyección de dependencia: los dos lectores se reciben
// como colaboradores opcionales (`ConfigEnvReaders`), con default
// `() => undefined` — equivalente a "sin fuente de config disponible", que
// es exactamente el estado real hoy. Cuando `@thyrox/config` exponga el
// equivalente, el llamador (`main/startup/context.ts` o quien orqueste el
// arranque) los provee. El resto del mecanismo — comprobar primero el env
// var, preferir settings sobre config global, aplicar y loguear — se porta
// verbatim.
//
// `readEnv`/`setEnv`/`logForDebugging` se reimplementan localmente (los dos
// primeros verbatim de `ccnmt: packages/config/env/utils.ts:198-217`; el
// tercero simplificado a un colaborador inyectable, ver docstring de
// `startupProfiler.ts` punto 4 para el mismo patrón).

export type ConfigEnvReaders = {
  getGlobalConfigEnv?: () => Record<string, string> | undefined
  getUserSettingsEnv?: () => Record<string, string> | undefined
  debugSink?: (message: string) => void
}

function readEnv(name: string): string | undefined {
  return process.env[name]
}

function setEnv(name: string, value: string): void {
  process.env[name] = value
}

const noopDebugSink = (_message: string): void => {}

export function applyExtraCACertsFromConfig(readers: ConfigEnvReaders = {}): void {
  if (readEnv('NODE_EXTRA_CA_CERTS')) {
    return
  }
  const configPath = getExtraCertsPathFromConfig(readers)
  if (configPath) {
    setEnv('NODE_EXTRA_CA_CERTS', configPath)
    ;(readers.debugSink ?? noopDebugSink)(
      `CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${configPath}`,
    )
  }
}

function getExtraCertsPathFromConfig(readers: ConfigEnvReaders): string | undefined {
  const debugSink = readers.debugSink ?? noopDebugSink
  try {
    const globalEnv = (readers.getGlobalConfigEnv ?? (() => undefined))()
    const settingsEnv = (readers.getUserSettingsEnv ?? (() => undefined))()

    debugSink(
      `CA certs: Config fallback - globalEnv keys: ${globalEnv ? Object.keys(globalEnv).join(',') : 'none'}, settingsEnv keys: ${settingsEnv ? Object.keys(settingsEnv).join(',') : 'none'}`,
    )

    const path = settingsEnv?.NODE_EXTRA_CA_CERTS || globalEnv?.NODE_EXTRA_CA_CERTS
    if (path) {
      debugSink(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${path}`)
    }
    return path
  } catch (error) {
    debugSink(`CA certs: Config fallback failed: ${error}`)
    return undefined
  }
}
