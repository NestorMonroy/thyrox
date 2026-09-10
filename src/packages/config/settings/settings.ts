/**
 * Puerto PARCIAL de `ccnmt: packages/config/settings/settings.ts` (1096
 * líneas fuente, 23 símbolos exportados). Resuelve el subpath público
 * `@thyrox/config/settings` — el `"./*": "./*.ts"` de este paquete lo
 * resolvía antes contra `./settings.ts` (raíz, inexistente); este pase
 * añade el override explícito `"./settings": "./settings/settings.ts"`
 * en `package.json`. El import real que lo necesita es
 * `@thyrox/provider/fastMode.ts` (uno de los 16 módulos de este pase):
 * `getInitialSettings`, `getSettingsForSource`, `updateSettingsForSource`.
 * `../managedEnv.ts` (mismo paquete) también lo consume vía
 * `require('./settings/settings.js')` — de ahí el alias `getSettings`.
 *
 * Cobertura: 10 de 23 exports de la fuente (9 + el alias `getSettings`,
 * añadido tras medir que `../managedEnv.ts` lo necesita vía
 * `require('./settings/settings.js')`), más 2 privados que esos 10
 * necesitan internamente.
 *
 * Portados (fieles, con la fs virtual pendiente — ver abajo):
 * `getSettingsRootPathForSource`, `getSettingsFilePathForSource`,
 * `getRelativeSettingsFilePathForSource`, `parseSettingsFile`,
 * `getSettingsForSource`, `updateSettingsForSource`,
 * `settingsMergeCustomizer`, `getSettingsWithErrors`, `getInitialSettings`,
 * `getSettings` (alias).
 *
 * NO portados — bloqueado, declarado por nombre:
 *
 * - Resolución de `policySettings` (remote > MDM/plist/HKLM >
 *   managed-settings.json > HKCU): depende de `../remote/syncCacheState.js`
 *   (`getRemoteManagedSettingsSyncFromCache`), `./mdm/settings.js`
 *   (`getHkcuSettings`, `getMdmSettings`) y `./managedPath.js` +
 *   `loadManagedFileSettings` — ninguno existe en `@thyrox/config`.
 *   `getSettingsForSource('policySettings')` devuelve `null`, el mismo
 *   valor que la fuente cuando las cuatro capas están vacías.
 * - Capa de plugin settings (`getPluginSettingsBase`, `plugin/*` como base
 *   de menor precedencia): no portada. `loadSettingsFromDisk` arranca el
 *   merge desde `{}` en vez de la base de plugins.
 * - `getEnabledSettingSources()` (restricción `--setting-sources` vía
 *   `../internal/allowedSourcesState.js`, ausente): sustituida aquí por
 *   `SETTING_SOURCES` completo (`./constants.ts`, ya portado) — sin la
 *   restricción de fuentes permitidas.
 * - `sanitizeUntrustedAutoDefaultMode`: omitida. Depende de
 *   `@claude-code-how-works/permission/permissionTypes` (paquete cruzado no
 *   asignado a este pase) y el enum `defaultMode` que
 *   `@thyrox/config/settings/types.ts` ya declara
 *   (`['default', 'acceptEdits', 'bypass']`) no incluye `'auto'` — el guard
 *   sería inerte con el esquema actual.
 * - `loadManagedFileSettings`, `getManagedFileSettingsPresence`,
 *   `getPolicySettingsOrigin`, `getManagedSettingsKeysForLogging`,
 *   `getSandboxBinaryPath`, `getSettingsWithSources`,
 *   `hasSkipDangerousModePermissionPrompt`, `hasAutoModeOptIn`,
 *   `getUseAutoModeDuringPlan`, `getAutoModeConfig`,
 *   `rawSettingsContainsKey`, el alias `getSettings`: ninguno lo consume
 *   alguno de los 16 módulos de este pase — se omiten sin sustituto.
 * - Caché: `./settingsCache.ts` no existe en `@thyrox/config`. Se sustituye
 *   por tres cachés de módulo equivalentes (`Map` + variable), ámbito local
 *   a este archivo — mismo contrato observable (`resetSettingsCache`
 *   invalida las tres).
 * - `markInternalWrite` (`./internalWrites.ts`, ausente): se omite; una
 *   escritura vía `updateSettingsForSource` puede ser tratada como externa
 *   por un detector de cambios que la consulte. Declarado, no fabricado.
 * - Lectura/escritura de disco: `node:fs` crudo, igual que la fuente — NO
 *   se usan los bindings `readFileSync`/`writeFileSyncAndFlush` de
 *   `ConfigHostBindings` (existen en `./contracts.ts` pero la fuente tampoco
 *   los usa aquí; los reserva para otros consumidores). La virtualización de
 *   fs queda para un pase posterior.
 */
import mergeWith from 'lodash-es/mergeWith.js'
import {
  existsSync,
  mkdirSync,
  readFileSync as fsReadFileSync,
  realpathSync,
  writeFileSync as fsWriteFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import {
  filterInvalidPermissionRules,
  formatZodError,
  type SettingsError,
} from './validation.ts'
import { SETTING_SOURCES, type SettingSource } from './constants.ts'
import { SettingsSchema, type Settings as SettingsJson } from './types.ts'
import { getConfigHostBindings, tryGetConfigHostBindings } from '../host.ts'

// Excluye 'policySettings' (resolución MDM/remota, no portada) y
// 'flagSettings' (sólo lectura, viene del flag/SDK) — mismo recorte que la
// fuente (`constants.ts: EditableSettingSource`), definido en el sitio
// porque `constants.ts` no lo declara todavía en este árbol.
export type EditableSettingSource = Exclude<
  SettingSource,
  'policySettings' | 'flagSettings'
>

function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)]
}

function safeParseJSON(json: string | null | undefined): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

function logError(e: unknown): void {
  tryGetConfigHostBindings().logDebug?.(
    `[error] ${e instanceof Error ? e.message : String(e)}`,
  )
}

function handleFileSystemError(error: unknown, path: string): void {
  if (isENOENT(error)) {
    tryGetConfigHostBindings().logDebug?.(
      `Broken symlink or missing file encountered for settings.json at path: ${path}`,
    )
  } else {
    logError(error)
  }
}

/** Sustituto local de `./settingsCache.ts` (ausente) — mismo contrato: */
const parsedFileCache = new Map<
  string,
  { settings: SettingsJson | null; errors: SettingsError[] }
>()
const settingsForSourceCache = new Map<SettingSource, SettingsJson | null>()
let sessionSettingsCache: { settings: SettingsJson; errors: SettingsError[] } | null = null

function resetSettingsCache(): void {
  parsedFileCache.clear()
  settingsForSourceCache.clear()
  sessionSettingsCache = null
}

function getManagedSettingsFilePath(): string {
  return join(getConfigHostBindings().getConfigHomeDir?.() ?? '.', 'managed-settings.json')
}

function parseSettingsFileUncached(path: string): {
  settings: SettingsJson | null
  errors: SettingsError[]
} {
  try {
    const resolvedPath = realpathSync(path)
    const content = fsReadFileSync(resolvedPath, 'utf8')

    if (content.trim() === '') {
      return { settings: {}, errors: [] }
    }

    const data = safeParseJSON(content)

    const ruleWarnings = filterInvalidPermissionRules(data, path)

    const result = SettingsSchema.safeParse(data)

    if (!result.success) {
      const errors = formatZodError(result.error, path)
      return { settings: null, errors: [...ruleWarnings, ...errors] }
    }

    return { settings: result.data, errors: ruleWarnings }
  } catch (error) {
    handleFileSystemError(error, path)
    return { settings: null, errors: [] }
  }
}

/**
 * Parsea un archivo de settings, con cache por ruta (sustituto local de
 * `getCachedParsedFile`/`setCachedParsedFile`).
 */
export function parseSettingsFile(path: string): {
  settings: SettingsJson | null
  errors: SettingsError[]
} {
  const cached = parsedFileCache.get(path)
  if (cached) {
    return {
      settings: cached.settings ? structuredClone(cached.settings) : null,
      errors: cached.errors,
    }
  }
  const result = parseSettingsFileUncached(path)
  parsedFileCache.set(path, result)
  return {
    settings: result.settings ? structuredClone(result.settings) : null,
    errors: result.errors,
  }
}

/**
 * Ruta absoluta a la raíz del archivo de una fuente (p. ej. para
 * `$PROJ_DIR/.claude/settings.json`, devuelve `$PROJ_DIR`).
 */
export function getSettingsRootPathForSource(source: SettingSource): string {
  switch (source) {
    case 'userSettings':
      return resolve(
        getConfigHostBindings().getConfigHomeDir?.() ??
          join(process.env.HOME ?? '.', '.claude'),
      )
    case 'policySettings':
    case 'projectSettings':
    case 'localSettings':
      return resolve(getConfigHostBindings().getOriginalCwd?.() ?? process.cwd())
    case 'flagSettings': {
      const path = getConfigHostBindings().getFlagSettingsPath?.()
      return path
        ? dirname(resolve(path))
        : resolve(getConfigHostBindings().getOriginalCwd?.() ?? process.cwd())
    }
  }
}

function getUserSettingsFilePath(): string {
  if (getConfigHostBindings().getUseCoworkPlugins?.()) {
    return 'cowork_settings.json'
  }
  return 'settings.json'
}

export function getRelativeSettingsFilePathForSource(
  source: 'projectSettings' | 'localSettings',
): string {
  switch (source) {
    case 'projectSettings':
      return join('.claude', 'settings.json')
    case 'localSettings':
      return join('.claude', 'settings.local.json')
  }
}

export function getSettingsFilePathForSource(
  source: SettingSource,
): string | undefined {
  switch (source) {
    case 'userSettings':
      return join(getSettingsRootPathForSource(source), getUserSettingsFilePath())
    case 'projectSettings':
    case 'localSettings':
      return join(
        getSettingsRootPathForSource(source),
        getRelativeSettingsFilePathForSource(source),
      )
    case 'policySettings':
      return getManagedSettingsFilePath()
    case 'flagSettings':
      return getConfigHostBindings().getFlagSettingsPath?.()
  }
}

function getSettingsForSourceUncached(
  source: SettingSource,
): SettingsJson | null {
  // policySettings: la cadena remote > MDM/plist > managed-settings.json >
  // HKCU no está portada (ver docstring del módulo) — se devuelve `null`,
  // el mismo valor que la fuente cuando las cuatro capas están vacías.
  if (source === 'policySettings') {
    return null
  }

  const settingsFilePath = getSettingsFilePathForSource(source)
  const { settings: fileSettings } = settingsFilePath
    ? parseSettingsFile(settingsFilePath)
    : { settings: null }

  if (source === 'flagSettings') {
    const inlineSettings = getConfigHostBindings().getFlagSettingsInline?.()
    if (inlineSettings) {
      const parsed = SettingsSchema.safeParse(inlineSettings)
      if (parsed.success) {
        return mergeWith(
          fileSettings || {},
          parsed.data,
          settingsMergeCustomizer,
        ) as SettingsJson
      }
    }
  }

  return fileSettings
}

export function getSettingsForSource(source: SettingSource): SettingsJson | null {
  if (settingsForSourceCache.has(source)) {
    return settingsForSourceCache.get(source) ?? null
  }
  const result = getSettingsForSourceUncached(source)
  settingsForSourceCache.set(source, result)
  return result
}

/**
 * Fusiona `settings` en la configuración existente de `source` (lodash
 * `mergeWith`). Para borrar una clave de un record (p. ej.
 * `enabledPlugins`), se fija a `undefined` — NO usar `delete`.
 */
export function updateSettingsForSource(
  source: EditableSettingSource,
  settings: SettingsJson,
): { error: Error | null } {
  const src = source as string
  if (src === 'policySettings' || src === 'flagSettings') {
    return { error: null }
  }

  const filePath = getSettingsFilePathForSource(source)
  if (!filePath) {
    return { error: null }
  }

  try {
    mkdirSync(dirname(filePath), { recursive: true })

    let existingSettings = getSettingsForSourceUncached(source)

    if (!existingSettings) {
      let content: string | null = null
      try {
        content = fsReadFileSync(filePath, 'utf8')
      } catch (e) {
        if (!isENOENT(e)) {
          throw e
        }
      }
      if (content !== null) {
        const rawData = safeParseJSON(content)
        if (rawData === null) {
          return {
            error: new Error(`Invalid JSON syntax in settings file at ${filePath}`),
          }
        }
        if (rawData && typeof rawData === 'object') {
          existingSettings = rawData as SettingsJson
          tryGetConfigHostBindings().logDebug?.(
            `Using raw settings from ${filePath} due to validation failure`,
          )
        }
      }
    }

    const updatedSettings = mergeWith(
      existingSettings || {},
      settings,
      (
        _objValue: unknown,
        srcValue: unknown,
        key: string | number | symbol,
        object: Record<string | number | symbol, unknown>,
      ) => {
        if (srcValue === undefined && object && typeof key === 'string') {
          delete object[key]
          return undefined
        }
        if (Array.isArray(srcValue)) {
          return srcValue
        }
        return undefined
      },
    )

    // `markInternalWrite` (./internalWrites.ts) no está portado — ver
    // docstring del módulo. La escritura sigue siendo real; sólo se omite
    // la marca que distingue una escritura propia de una externa.
    fsWriteFileSync(filePath, JSON.stringify(updatedSettings, null, 2) + '\n', 'utf8')

    resetSettingsCache()

    if (source === 'localSettings') {
      getConfigHostBindings().addFileGlobRuleToGitignore?.(
        getConfigHostBindings().getOriginalCwd?.() ?? process.cwd(),
        getRelativeSettingsFilePathForSource('localSettings'),
      )
    }
  } catch (e) {
    const error = new Error(`Failed to read raw settings from ${filePath}: ${e}`)
    logError(error)
    return { error }
  }

  return { error: null }
}

function mergeArrays<T>(targetArray: T[], sourceArray: T[]): T[] {
  return uniq([...targetArray, ...sourceArray])
}

/**
 * Customizer de `mergeWith` para settings: los arrays se concatenan y
 * deduplican; el resto usa el merge por defecto de lodash.
 */
export function settingsMergeCustomizer(
  objValue: unknown,
  srcValue: unknown,
): unknown {
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return mergeArrays(objValue, srcValue)
  }
  return undefined
}

let isLoadingSettings = false

function loadSettingsFromDisk(): { settings: SettingsJson; errors: SettingsError[] } {
  if (isLoadingSettings) {
    return { settings: {}, errors: [] }
  }

  const startTime = Date.now()
  tryGetConfigHostBindings().profileCheckpoint?.('loadSettingsFromDisk_start')
  tryGetConfigHostBindings().logDiagnostics?.('info', 'settings_load_started')

  isLoadingSettings = true
  try {
    // Sin capa de plugin settings (getPluginSettingsBase, no portada) — el
    // merge arranca vacío en vez de con la base de plugins.
    let mergedSettings: SettingsJson = {}
    const allErrors: SettingsError[] = []
    const seenErrors = new Set<string>()
    const seenFiles = new Set<string>()

    // Sin restricción `--setting-sources` (getEnabledSettingSources, no
    // portada) — se recorren TODAS las fuentes declaradas.
    for (const source of SETTING_SOURCES) {
      if (source === 'policySettings') {
        // Cadena remote/MDM/managed-file/HKCU no portada — 0 aporte.
        continue
      }

      const filePath = getSettingsFilePathForSource(source)
      if (filePath) {
        const resolvedPath = resolve(filePath)
        if (!seenFiles.has(resolvedPath)) {
          seenFiles.add(resolvedPath)
          const { settings, errors } = parseSettingsFile(filePath)
          for (const error of errors) {
            const errorKey = `${error.file}:${error.path}:${error.message}`
            if (!seenErrors.has(errorKey)) {
              seenErrors.add(errorKey)
              allErrors.push(error)
            }
          }
          if (settings) {
            // `sanitizeUntrustedAutoDefaultMode` no portado (ver docstring)
            // — se fusiona el settings tal cual, sin el guard de
            // `defaultMode: 'auto'` no confiable.
            mergedSettings = mergeWith(mergedSettings, settings, settingsMergeCustomizer)
          }
        }
      }

      if (source === 'flagSettings') {
        const inlineSettings = getConfigHostBindings().getFlagSettingsInline?.()
        if (inlineSettings) {
          const parsed = SettingsSchema.safeParse(inlineSettings)
          if (parsed.success) {
            mergedSettings = mergeWith(mergedSettings, parsed.data, settingsMergeCustomizer)
          }
        }
      }
    }

    tryGetConfigHostBindings().logDiagnostics?.('info', 'settings_load_completed', {
      duration_ms: Date.now() - startTime,
      source_count: seenFiles.size,
      error_count: allErrors.length,
    })

    return { settings: mergedSettings, errors: allErrors }
  } finally {
    isLoadingSettings = false
  }
}

export function getSettingsWithErrors(): { settings: SettingsJson; errors: SettingsError[] } {
  if (sessionSettingsCache !== null) {
    return sessionSettingsCache
  }
  const result = loadSettingsFromDisk()
  tryGetConfigHostBindings().profileCheckpoint?.('loadSettingsFromDisk_end')
  sessionSettingsCache = result
  return result
}

/**
 * Settings fusionados de todas las fuentes habilitadas, en orden de
 * precedencia. Cachea a nivel de sesión — invalidar con
 * `resetSettingsCache()` interno (expuesto sólo como efecto de
 * `updateSettingsForSource`, igual que la fuente).
 */
export function getInitialSettings(): SettingsJson {
  const { settings } = getSettingsWithErrors()
  return settings || {}
}

/**
 * @deprecated Usar `getInitialSettings()`. Alias por compatibilidad hacia
 * atrás — consumido por `../managedEnv.ts` vía `require('./settings/settings.js')`.
 */
export const getSettings = getInitialSettings
