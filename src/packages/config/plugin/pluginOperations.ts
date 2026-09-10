/**
 * Puerto de `ccnmt: packages/config/plugin/pluginOperations.ts` (1088
 * líneas fuente). Operaciones nucleares de plugin (instalar, desinstalar,
 * habilitar, deshabilitar, actualizar). Reimplementación fiel — mismo
 * algoritmo de resolución de scope, mismo orden instalar→escribir
 * settings→cachear, misma lógica de reverse-dependents y de
 * "settings-first" en enable/disable.
 *
 * Funciones de este módulo (documentado en la fuente, sin cambios):
 * - NO llaman a `process.exit()`.
 * - NO escriben a consola.
 * - Devuelven objetos de resultado que indican éxito/fallo con mensajes.
 * - Pueden lanzar errores ante fallos inesperados.
 *
 * Repuntados vía `require()` diferido, agrupados por archivo — TODOS
 * GENUINAMENTE BLOQUEADOS: ninguno de los 11 hermanos de `plugin/` que este
 * archivo importa está en los 15 módulos del alcance ni es una hoja
 * (`cacheUtils`, `dependencyResolver`, `installedPluginsManager`,
 * `marketplaceManager`, `pluginDirectories`, `pluginIdentifier`,
 * `pluginInstallationHelpers`, `pluginLoader`, `pluginOptionsStorage`,
 * `pluginPolicy`, `pluginStartupCheck`, `pluginVersioning` — cada uno trae
 * su propia red de dependencias, sin medir cuál). Extender el alcance para
 * portarlos habría convertido "15 módulos" en "todo `plugin/`" sin que el
 * reporte final lo declarara — se documenta el bloqueo en su lugar, mismo
 * criterio que `managedEnv.ts`/`outputStyles.ts` con `settings/settings.ts`.
 *
 * `getSettingsForSource`/`updateSettingsForSource` — de `../settings/settings.ts`,
 * el mismo bloqueo (caso `@thyrox/config/settings` del brief) que ya
 * documentan `managedEnv.ts`, `outputStyles.ts` y `plugin/builtin.ts`. Este
 * archivo lo bloquea con SU PROPIO envoltorio local, no reenrutado a través
 * de los slots setter de `plugin/_deps.ts` — la fuente tampoco lo hace así:
 * `pluginOperations.ts` importa `getSettingsForSource`/`updateSettingsForSource`
 * directo de `../settings/settings.js`, no de `./_deps.js`.
 *
 * `LoadedPlugin` — se reusa el tipo ya declarado en `./builtin.ts` (mismo
 * concepto real de `./types.ts`, no portado; `builtin.ts` ya declaró el
 * subconjunto local que cubre `.name`/`.source`, los dos únicos campos que
 * este archivo toca).
 *
 * `PluginManifest`, `PluginMarketplaceEntry`, `PluginScope`,
 * `PluginInstallationEntry` — subconjuntos locales de `./types.ts` (367
 * líneas) y `./schemas.ts` (>1600 líneas), ninguno de los dos en los 15.
 * Los campos declarados son los que este archivo efectivamente lee —
 * medidos contra `schemas.ts` (`PluginScopeSchema`,
 * `PluginMarketplaceEntrySchema`, `PluginInstallationEntrySchema`), no
 * inventados. `PluginMarketplaceEntry` lleva `& Record<string, unknown>`
 * para los campos del manifiesto que se transportan opacos (`category`,
 * `tags`, `strict`, …) sin que este archivo los inspeccione.
 */

import { dirname, join } from 'path'
import {
  getOriginalCwd,
  isBuiltinPluginId,
  isENOENT,
  toError,
  getFsImplementation,
  logError,
  plural,
} from './_deps.js'
import type { LoadedPlugin } from './builtin.js'
import { EDITABLE_SOURCES } from '../settings/constants.js'

// --- tipos locales — ver docstring del módulo ---

/** Subconjunto local de `./schemas.ts::PluginScope` (`PluginScopeSchema`). */
export type PluginScope = 'managed' | 'user' | 'project' | 'local'

/** Subconjunto local de `./schemas.ts::PluginMarketplaceEntry`. */
export type PluginMarketplaceEntry = {
  name: string
  source: string | Record<string, unknown>
  version?: string
} & Record<string, unknown>

/** Subconjunto local de `./types.ts::PluginManifest` — se transporta opaco. */
export type PluginManifest = Record<string, unknown>

/** Subconjunto local de `./schemas.ts::PluginInstallationEntry`. */
type PluginInstallationEntry = {
  scope: PluginScope
  projectPath?: string
  installPath: string
  version?: string
  gitCommitSha?: string
}

/** `(typeof EDITABLE_SOURCES)[number]` — mismo derivado que `scopeToSettingSource` usa en la fuente. */
type EditableSettingSource = (typeof EDITABLE_SOURCES)[number]

// --- envoltorios de dependencias bloqueadas — ver docstring del módulo ---

/** `../settings/settings.ts` — ver docstring del módulo. */
function requireSettingsSettings(): {
  getSettingsForSource: (source: EditableSettingSource) => {
    enabledPlugins?: Record<string, boolean | string[] | undefined>
  } | null
  updateSettingsForSource: (
    source: EditableSettingSource,
    patch: {
      enabledPlugins: Record<string, boolean | string[] | undefined>
    },
  ) => { error?: { message: string } }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../settings/settings.js')
}

/** `./cacheUtils.ts` — no es uno de los 15. */
function requireCacheUtils(): {
  clearAllCaches: () => void
  markPluginVersionOrphaned: (installPath: string) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./cacheUtils.js')
}

/** `./dependencyResolver.ts` — no es uno de los 15. */
function requireDependencyResolver(): {
  findReverseDependents: (
    pluginId: string,
    plugins: LoadedPlugin[],
  ) => string[]
  formatReverseDependentsSuffix: (deps: string[] | undefined) => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./dependencyResolver.js')
}

/** `./installedPluginsManager.ts` — no es uno de los 15. */
function requireInstalledPluginsManager(): {
  loadInstalledPluginsFromDisk: () => {
    plugins: Record<string, PluginInstallationEntry[]>
  }
  loadInstalledPluginsV2: () => {
    plugins: Record<string, PluginInstallationEntry[]>
  }
  removePluginInstallation: (
    pluginId: string,
    scope: PluginScope,
    projectPath: string | undefined,
  ) => void
  updateInstallationPathOnDisk: (
    pluginId: string,
    scope: PluginScope,
    projectPath: string | undefined,
    versionedPath: string,
    newVersion: string,
    gitCommitSha: string | undefined,
  ) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./installedPluginsManager.js')
}

/** `./marketplaceManager.ts` — no es uno de los 15. */
function requireMarketplaceManager(): {
  getMarketplace: (
    name: string,
  ) => Promise<{ plugins: PluginMarketplaceEntry[] }>
  getPluginById: (plugin: string) => Promise<
    | {
        entry: PluginMarketplaceEntry
        marketplaceInstallLocation: string
      }
    | undefined
  >
  loadKnownMarketplacesConfig: () => Promise<
    Record<string, { installLocation: string }>
  >
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./marketplaceManager.js')
}

/** `./pluginDirectories.ts` — no es uno de los 15. */
function requirePluginDirectories(): {
  deletePluginDataDir: (pluginId: string) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginDirectories.js')
}

/** `./pluginIdentifier.ts` — no es uno de los 15. */
function requirePluginIdentifier(): {
  parsePluginIdentifier: (plugin: string) => {
    name: string
    marketplace?: string
  }
  scopeToSettingSource: (scope: PluginScope) => EditableSettingSource
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginIdentifier.js')
}

/** `./pluginInstallationHelpers.ts` — no es uno de los 15. */
function requirePluginInstallationHelpers(): {
  formatResolutionError: (resolution: unknown) => string
  installResolvedPlugin: (params: {
    pluginId: string
    entry: PluginMarketplaceEntry
    scope: 'user' | 'project' | 'local'
    marketplaceInstallLocation: string | undefined
  }) => Promise<
    | { ok: true; depNote: string }
    | {
        ok: false
        reason:
          | 'local-source-no-location'
          | 'settings-write-failed'
          | 'resolution-failed'
          | 'blocked-by-policy'
          | 'dependency-blocked-by-policy'
        pluginName?: string
        message?: string
        resolution?: unknown
        blockedDependency?: string
      }
  >
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginInstallationHelpers.js')
}

/** `./pluginLoader.ts` — no es uno de los 15. */
function requirePluginLoader(): {
  cachePlugin: (
    source: unknown,
    opts: { manifest: { name: string } },
  ) => Promise<{
    path: string
    gitCommitSha?: string
    manifest?: PluginManifest
  }>
  copyPluginToVersionedCache: (
    sourcePath: string,
    pluginId: string,
    newVersion: string,
    entry: PluginMarketplaceEntry,
  ) => Promise<string>
  getVersionedCachePath: (pluginId: string, version: string) => string
  getVersionedZipCachePath: (pluginId: string, version: string) => string
  loadAllPlugins: () => Promise<{
    enabled: LoadedPlugin[]
    disabled: LoadedPlugin[]
  }>
  loadPluginManifest: (
    manifestPath: string,
    name: string,
    source: unknown,
  ) => Promise<PluginManifest>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginLoader.js')
}

/** `./pluginOptionsStorage.ts` — no es uno de los 15. */
function requirePluginOptionsStorage(): {
  deletePluginOptions: (pluginId: string) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginOptionsStorage.js')
}

/** `./pluginPolicy.ts` — no es uno de los 15. */
function requirePluginPolicy(): {
  isPluginBlockedByPolicy: (pluginId: string) => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginPolicy.js')
}

/** `./pluginStartupCheck.ts` — no es uno de los 15. */
function requirePluginStartupCheck(): {
  getPluginEditableScopes: () => Map<string, unknown>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginStartupCheck.js')
}

/** `./pluginVersioning.ts` — no es uno de los 15. */
function requirePluginVersioning(): {
  calculatePluginVersion: (
    pluginId: string,
    source: unknown,
    manifest: PluginManifest | undefined,
    path: string,
    entryVersion: string | undefined,
    gitCommitSha?: string,
  ) => Promise<string>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./pluginVersioning.js')
}

/** Fuentes de settings instalables (excluye `managed`, que sólo se instala desde managed-settings.json). */
export const VALID_INSTALLABLE_SCOPES = ['user', 'project', 'local'] as const

/** Tipo de scope de instalación, derivado de VALID_INSTALLABLE_SCOPES. */
export type InstallableScope = (typeof VALID_INSTALLABLE_SCOPES)[number]

/** Scopes válidos para operaciones de actualización (incluye `managed`, que sí puede actualizarse). */
export const VALID_UPDATE_SCOPES: readonly PluginScope[] = [
  'user',
  'project',
  'local',
  'managed',
] as const

/**
 * Comprueba en tiempo de ejecución que un scope es un scope instalable válido.
 * @throws Error si el scope no es un scope instalable válido.
 */
export function assertInstallableScope(
  scope: string,
): asserts scope is InstallableScope {
  if (
    !(VALID_INSTALLABLE_SCOPES as readonly string[]).includes(scope)
  ) {
    throw new Error(
      `Invalid scope "${scope}". Must be one of: ${VALID_INSTALLABLE_SCOPES.join(', ')}`,
    )
  }
}

/**
 * Type guard: ¿es este scope un scope instalable (no `managed`)? Para
 * estrechar el tipo en bloques condicionales.
 */
export function isInstallableScope(
  scope: PluginScope,
): scope is InstallableScope {
  return (VALID_INSTALLABLE_SCOPES as readonly string[]).includes(scope)
}

/**
 * Obtiene la ruta de proyecto para scopes específicos de proyecto.
 * Devuelve el cwd original para `project`/`local`, `undefined` en el resto.
 */
export function getProjectPathForScope(scope: PluginScope): string | undefined {
  return scope === 'project' || scope === 'local' ? getOriginalCwd() : undefined
}

/**
 * ¿Está este plugin habilitado (valor === true) en `.claude/settings.json`?
 *
 * Distinto del scope de `installed_plugins.json` (V2): ese archivo rastrea
 * DESDE DÓNDE se instaló un plugin, pero el mismo plugin puede además
 * habilitarse a nivel de proyecto vía settings. La UI de desinstalación
 * necesita comprobar ESTO, porque una instalación a nivel de usuario con
 * habilitación a nivel de proyecto significaría que "desinstalar" quita la
 * instalación de usuario pero deja la habilitación de proyecto activa — el
 * plugin sigue corriendo.
 */
export function isPluginEnabledAtProjectScope(pluginId: string): boolean {
  return (
    requireSettingsSettings().getSettingsForSource('projectSettings')
      ?.enabledPlugins?.[pluginId] === true
  )
}

// ============================================================================
// Tipos de resultado
// ============================================================================

/** Resultado de una operación de plugin. */
export type PluginOperationResult = {
  success: boolean
  message: string
  pluginId?: string
  pluginName?: string
  scope?: PluginScope
  /** Plugins que declaran a este como dependencia (aviso al desinstalar/deshabilitar). */
  reverseDependents?: string[]
}

/** Resultado de una operación de actualización de plugin. */
export type PluginUpdateResult = {
  success: boolean
  message: string
  pluginId?: string
  newVersion?: string
  oldVersion?: string
  alreadyUpToDate?: boolean
  scope?: PluginScope
}

// ============================================================================
// Funciones auxiliares
// ============================================================================

/**
 * Busca en todos los scopes de settings editables un plugin ID que
 * coincida con la entrada dada.
 *
 * Si `plugin` contiene `@`, se trata como un pluginId completo y se
 * devuelve si se encuentra en algún scope. Si `plugin` es un nombre
 * pelado, busca cualquier clave que empiece con `{plugin}@` en cualquier
 * scope.
 *
 * Devuelve el scope más específico donde se menciona el plugin
 * (habilitado o no) más el pluginId completo resuelto.
 *
 * Precedencia: local > project > user (el más específico gana).
 */
function findPluginInSettings(
  plugin: string,
): { pluginId: string; scope: InstallableScope } | null {
  const hasMarketplace = plugin.includes('@')
  // El más específico primero — el primer match gana.
  const searchOrder: InstallableScope[] = ['local', 'project', 'user']

  for (const scope of searchOrder) {
    const enabledPlugins = requireSettingsSettings().getSettingsForSource(
      requirePluginIdentifier().scopeToSettingSource(scope),
    )?.enabledPlugins
    if (!enabledPlugins) continue

    for (const key of Object.keys(enabledPlugins)) {
      if (hasMarketplace ? key === plugin : key.startsWith(`${plugin}@`)) {
        return { pluginId: key, scope }
      }
    }
  }
  return null
}

/** Encuentra un plugin entre los plugins ya cargados. */
function findPluginByIdentifier(
  plugin: string,
  plugins: LoadedPlugin[],
): LoadedPlugin | undefined {
  const { name, marketplace } =
    requirePluginIdentifier().parsePluginIdentifier(plugin)

  return plugins.find((p) => {
    // Coincidencia exacta de nombre.
    if (p.name === plugin || p.name === name) return true

    // Si se especificó marketplace, comprueba si coincide con la fuente.
    if (marketplace && p.source) {
      return p.name === name && p.source.includes(`@${marketplace}`)
    }

    return false
  })
}

/**
 * Resuelve un pluginId desde los datos V2 de plugins instalados, para un
 * plugin que pudo haber sido delisted de su marketplace. Devuelve `null`
 * si el plugin no está en los datos V2.
 */
function resolveDelistedPluginId(
  plugin: string,
): { pluginId: string; pluginName: string } | null {
  const { name } = requirePluginIdentifier().parsePluginIdentifier(plugin)
  const installedData = requireInstalledPluginsManager().loadInstalledPluginsV2()

  // Primero coincidencia exacta, luego búsqueda por nombre.
  if (installedData.plugins[plugin]?.length) {
    return { pluginId: plugin, pluginName: name }
  }

  const matchingKey = Object.keys(installedData.plugins).find((key) => {
    const { name: keyName } = requirePluginIdentifier().parsePluginIdentifier(key)
    return keyName === name && (installedData.plugins[key]?.length ?? 0) > 0
  })

  if (matchingKey) {
    return { pluginId: matchingKey, pluginName: name }
  }

  return null
}

/**
 * Obtiene la instalación más relevante de un plugin desde los datos V2.
 * Para plugins de scope project/local, prioriza instalaciones que
 * coincidan con el proyecto actual. Orden de prioridad: local
 * (coincidente) > project (coincidente) > user > primera disponible.
 */
export function getPluginInstallationFromV2(pluginId: string): {
  scope: PluginScope
  projectPath?: string
} {
  const installedData = requireInstalledPluginsManager().loadInstalledPluginsV2()
  const installations = installedData.plugins[pluginId]

  if (!installations || installations.length === 0) {
    return { scope: 'user' }
  }

  const currentProjectPath = getOriginalCwd()

  // Busca instalaciones por prioridad: local > project > user > managed.
  const localInstall = installations.find(
    (inst) => inst.scope === 'local' && inst.projectPath === currentProjectPath,
  )
  if (localInstall) {
    return { scope: localInstall.scope, projectPath: localInstall.projectPath }
  }

  const projectInstall = installations.find(
    (inst) => inst.scope === 'project' && inst.projectPath === currentProjectPath,
  )
  if (projectInstall) {
    return {
      scope: projectInstall.scope,
      projectPath: projectInstall.projectPath,
    }
  }

  const userInstall = installations.find((inst) => inst.scope === 'user')
  if (userInstall) {
    return { scope: userInstall.scope }
  }

  // Cae a la primera instalación (podría ser managed).
  return {
    scope: installations[0]!.scope,
    projectPath: installations[0]!.projectPath,
  }
}

// ============================================================================
// Operaciones nucleares
// ============================================================================

/**
 * Instala un plugin (settings-first).
 *
 * Orden de operaciones:
 *   1. Busca el plugin en los marketplaces materializados.
 *   2. Escribe settings (LA ACCIÓN — declara intención).
 *   3. Cachea el plugin + registra el hint de versión (materialización).
 *
 * La reconciliación de marketplace NO es responsabilidad de esta función —
 * el reconcile de arranque maneja marketplaces declarados-pero-no-
 * materializados. Si el marketplace no se encuentra, "not found" es el
 * error correcto.
 */
export async function installPluginOp(
  plugin: string,
  scope: InstallableScope = 'user',
): Promise<PluginOperationResult> {
  assertInstallableScope(scope)

  const { name: pluginName, marketplace: marketplaceName } =
    requirePluginIdentifier().parsePluginIdentifier(plugin)

  // ── Busca el plugin en los marketplaces materializados ──
  let foundPlugin: PluginMarketplaceEntry | undefined
  let foundMarketplace: string | undefined
  let marketplaceInstallLocation: string | undefined

  if (marketplaceName) {
    const pluginInfo = await requireMarketplaceManager().getPluginById(plugin)
    if (pluginInfo) {
      foundPlugin = pluginInfo.entry
      foundMarketplace = marketplaceName
      marketplaceInstallLocation = pluginInfo.marketplaceInstallLocation
    }
  } else {
    const marketplaces =
      await requireMarketplaceManager().loadKnownMarketplacesConfig()
    for (const [mktName, mktConfig] of Object.entries(marketplaces)) {
      try {
        const marketplace = await requireMarketplaceManager().getMarketplace(
          mktName,
        )
        const pluginEntry = marketplace.plugins.find(
          (p) => p.name === pluginName,
        )
        if (pluginEntry) {
          foundPlugin = pluginEntry
          foundMarketplace = mktName
          marketplaceInstallLocation = mktConfig.installLocation
          break
        }
      } catch (error) {
        logError(toError(error))
      }
    }
  }

  if (!foundPlugin || !foundMarketplace) {
    const location = marketplaceName
      ? `marketplace "${marketplaceName}"`
      : 'any configured marketplace'
    return {
      success: false,
      message: `Plugin "${pluginName}" not found in ${location}`,
    }
  }

  const entry = foundPlugin
  const pluginId = `${entry.name}@${foundMarketplace}`

  const result = await requirePluginInstallationHelpers().installResolvedPlugin({
    pluginId,
    entry,
    scope,
    marketplaceInstallLocation,
  })

  if (!result.ok) {
    switch (result.reason) {
      case 'local-source-no-location':
        return {
          success: false,
          message: `Cannot install local plugin "${result.pluginName}" without marketplace install location`,
        }
      case 'settings-write-failed':
        return {
          success: false,
          message: `Failed to update settings: ${result.message}`,
        }
      case 'resolution-failed':
        return {
          success: false,
          message: requirePluginInstallationHelpers().formatResolutionError(
            result.resolution,
          ),
        }
      case 'blocked-by-policy':
        return {
          success: false,
          message: `Plugin "${result.pluginName}" is blocked by your organization's policy and cannot be installed`,
        }
      case 'dependency-blocked-by-policy':
        return {
          success: false,
          message: `Plugin "${result.pluginName}" depends on "${result.blockedDependency}", which is blocked by your organization's policy`,
        }
    }
  }

  return {
    success: true,
    message: `Successfully installed plugin: ${pluginId} (scope: ${scope})${result.depNote}`,
    pluginId,
    pluginName: entry.name,
    scope,
  }
}

/** Desinstala un plugin. */
export async function uninstallPluginOp(
  plugin: string,
  scope: InstallableScope = 'user',
  deleteDataDir = true,
): Promise<PluginOperationResult> {
  // Valida el scope en tiempo de ejecución para detección temprana de errores.
  assertInstallableScope(scope)

  const { enabled, disabled } = await requirePluginLoader().loadAllPlugins()
  const allPlugins = [...enabled, ...disabled]

  // Busca el plugin.
  const foundPlugin = findPluginByIdentifier(plugin, allPlugins)

  const settingSource = requirePluginIdentifier().scopeToSettingSource(scope)
  const settings = requireSettingsSettings().getSettingsForSource(settingSource)

  let pluginId: string
  let pluginName: string

  if (foundPlugin) {
    // Encuentra la clave de settings que coincide con este plugin (puede
    // diferir de `plugin` si el usuario dio un nombre corto pero settings
    // tiene plugin@marketplace).
    pluginId =
      Object.keys(settings?.enabledPlugins ?? {}).find(
        (k) =>
          k === plugin ||
          k === foundPlugin.name ||
          k.startsWith(`${foundPlugin.name}@`),
      ) ?? (plugin.includes('@') ? plugin : foundPlugin.name)
    pluginName = foundPlugin.name
  } else {
    // No se encontró vía marketplace — pudo haber sido delisted. Cae a
    // installed_plugins.json (V2), que rastrea instalaciones
    // independientemente del estado del marketplace.
    const resolved = resolveDelistedPluginId(plugin)
    if (!resolved) {
      return {
        success: false,
        message: `Plugin "${plugin}" not found in installed plugins`,
      }
    }
    pluginId = resolved.pluginId
    pluginName = resolved.pluginName
  }

  // Comprueba si el plugin está instalado en este scope (en el archivo V2).
  const projectPath = getProjectPathForScope(scope)
  const installedData = requireInstalledPluginsManager().loadInstalledPluginsV2()
  const installations = installedData.plugins[pluginId]
  const scopeInstallation = installations?.find(
    (i) => i.scope === scope && i.projectPath === projectPath,
  )

  if (!scopeInstallation) {
    // Intenta encontrar dónde está realmente instalado, para un error útil.
    const { scope: actualScope } = getPluginInstallationFromV2(pluginId)
    if (actualScope !== scope && installations && installations.length > 0) {
      // El scope de proyecto es especial: .claude/settings.json se
      // comparte con el equipo. Se apunta a la escapatoria de local en vez
      // de --scope project.
      if (actualScope === 'project') {
        return {
          success: false,
          message: `Plugin "${plugin}" is enabled at project scope (.claude/settings.json, shared with your team). To disable just for you: claude plugin disable ${plugin} --scope local`,
        }
      }
      return {
        success: false,
        message: `Plugin "${plugin}" is installed in ${actualScope} scope, not ${scope}. Use --scope ${actualScope} to uninstall.`,
      }
    }
    return {
      success: false,
      message: `Plugin "${plugin}" is not installed in ${scope} scope. Use --scope to specify the correct scope.`,
    }
  }

  const installPath = scopeInstallation.installPath

  // Quita el plugin del archivo de settings correspondiente (borra la
  // clave por completo). `undefined` señala borrado vía mergeWith en
  // updateSettingsForSource.
  const newEnabledPlugins: Record<string, boolean | string[] | undefined> = {
    ...settings?.enabledPlugins,
  }
  newEnabledPlugins[pluginId] = undefined
  requireSettingsSettings().updateSettingsForSource(settingSource, {
    enabledPlugins: newEnabledPlugins,
  })

  requireCacheUtils().clearAllCaches()

  // Quita de installed_plugins_v2.json para este scope.
  requireInstalledPluginsManager().removePluginInstallation(
    pluginId,
    scope,
    projectPath,
  )

  const updatedData = requireInstalledPluginsManager().loadInstalledPluginsV2()
  const remainingInstallations = updatedData.plugins[pluginId]
  const isLastScope =
    !remainingInstallations || remainingInstallations.length === 0
  if (isLastScope && installPath) {
    await requireCacheUtils().markPluginVersionOrphaned(installPath)
  }
  // Aparte del guard `&& installPath` de arriba — deletePluginOptions sólo
  // necesita pluginId, no installPath. Última instancia removida → limpia
  // las opciones y secretos guardados. Antes de esto, desinstalar dejaba
  // entradas huérfanas en settings.pluginConfigs (incluida la sub-clave
  // legacy sin gate mcpServers del flujo MCPB Configure) y en el keychain
  // pluginSecrets para siempre. Sin feature gate: deletePluginOptions no
  // hace nada si no hay nada guardado, y pluginConfigs.mcpServers se
  // escribe sin gate, así que su limpieza también debe correr sin gate.
  if (isLastScope) {
    requirePluginOptionsStorage().deletePluginOptions(pluginId)
    if (deleteDataDir) {
      await requirePluginDirectories().deletePluginDataDir(pluginId)
    }
  }

  // Avisa (no bloquea) si otros plugins habilitados dependen de éste.
  // Bloquear crea tombstones — no se puede desmontar un grafo con un
  // plugin delisted. verifyAndDemote en la carga atrapa las consecuencias.
  const reverseDependents = requireDependencyResolver().findReverseDependents(
    pluginId,
    allPlugins,
  )
  const depWarn =
    requireDependencyResolver().formatReverseDependentsSuffix(reverseDependents)

  return {
    success: true,
    message: `Successfully uninstalled plugin: ${pluginName} (scope: ${scope})${depWarn}`,
    pluginId,
    pluginName,
    scope,
    reverseDependents:
      reverseDependents.length > 0 ? reverseDependents : undefined,
  }
}

/**
 * Fija el estado habilitado/deshabilitado de un plugin (settings-first).
 *
 * Resuelve el pluginId y el scope desde settings — NO pre-filtra contra
 * installed_plugins.json. Settings declara la intención; si el plugin aún
 * no está cacheado, la siguiente carga lo cacheará.
 */
export async function setPluginEnabledOp(
  plugin: string,
  enabled: boolean,
  scope?: InstallableScope,
): Promise<PluginOperationResult> {
  const operation = enabled ? 'enable' : 'disable'

  // Plugins built-in: siempre usan settings de scope usuario, saltan la
  // resolución de scope normal + búsqueda en installed_plugins (no están
  // instalados).
  if (isBuiltinPluginId(plugin)) {
    const { error } = requireSettingsSettings().updateSettingsForSource(
      'userSettings',
      {
        enabledPlugins: {
          ...requireSettingsSettings().getSettingsForSource('userSettings')
            ?.enabledPlugins,
          [plugin]: enabled,
        },
      },
    )
    if (error) {
      return {
        success: false,
        message: `Failed to ${operation} built-in plugin: ${error.message}`,
      }
    }
    requireCacheUtils().clearAllCaches()
    const { name: pluginName } =
      requirePluginIdentifier().parsePluginIdentifier(plugin)
    return {
      success: true,
      message: `Successfully ${operation}d built-in plugin: ${pluginName}`,
      pluginId: plugin,
      pluginName,
      scope: 'user',
    }
  }

  if (scope) {
    assertInstallableScope(scope)
  }

  // ── Resuelve pluginId y scope desde settings ──
  // Busca en los scopes editables cualquier mención (habilitado o no) de
  // este plugin. NO pre-filtra contra installed_plugins.json.
  let pluginId: string
  let resolvedScope: InstallableScope

  const found = findPluginInSettings(plugin)

  if (scope) {
    // Scope explícito: se usa tal cual. Resuelve pluginId desde settings si
    // es posible, si no exige un identificador completo plugin@marketplace.
    resolvedScope = scope
    if (found) {
      pluginId = found.pluginId
    } else if (plugin.includes('@')) {
      pluginId = plugin
    } else {
      return {
        success: false,
        message: `Plugin "${plugin}" not found in settings. Use plugin@marketplace format.`,
      }
    }
  } else if (found) {
    // Auto-detecta el scope: usa el más específico donde se menciona el
    // plugin en settings.
    pluginId = found.pluginId
    resolvedScope = found.scope
  } else if (plugin.includes('@')) {
    // No está en ningún scope de settings, pero se dio el pluginId
    // completo — default a scope usuario (calza con el default de
    // instalación). Permite habilitar un plugin que se cacheó pero nunca
    // se declaró.
    pluginId = plugin
    resolvedScope = 'user'
  } else {
    return {
      success: false,
      message: `Plugin "${plugin}" not found in any editable settings scope. Use plugin@marketplace format.`,
    }
  }

  // ── Guard de política ──
  // Los plugins bloqueados por la organización no pueden habilitarse en
  // ningún scope. Se comprueba después de resolver pluginId, para atrapar
  // tanto identificadores completos como búsquedas por nombre pelado.
  if (enabled && requirePluginPolicy().isPluginBlockedByPolicy(pluginId)) {
    return {
      success: false,
      message: `Plugin "${pluginId}" is blocked by your organization's policy and cannot be enabled`,
    }
  }

  const settingSource = requirePluginIdentifier().scopeToSettingSource(
    resolvedScope,
  )
  const scopeSettingsValue = requireSettingsSettings().getSettingsForSource(
    settingSource,
  )?.enabledPlugins?.[pluginId]

  // ── Hint cross-scope: se dio scope explícito pero el plugin está en otro ──
  // Si el plugin está ausente del scope pedido pero presente en otro
  // distinto, se guía al usuario al --scope correcto — SALVO que esté
  // escribiendo a un scope de mayor precedencia para sobreescribir uno de
  // menor precedencia (p. ej. `disable --scope local` para sobreescribir un
  // plugin habilitado a nivel de proyecto sin tocar el .claude/settings.json
  // compartido).
  const SCOPE_PRECEDENCE: Record<InstallableScope, number> = {
    user: 0,
    project: 1,
    local: 2,
  }
  const isOverride =
    scope && found && SCOPE_PRECEDENCE[scope] > SCOPE_PRECEDENCE[found.scope]
  if (
    scope &&
    scopeSettingsValue === undefined &&
    found &&
    found.scope !== scope &&
    !isOverride
  ) {
    return {
      success: false,
      message: `Plugin "${plugin}" is installed at ${found.scope} scope, not ${scope}. Use --scope ${found.scope} or omit --scope to auto-detect.`,
    }
  }

  // ── Comprueba el estado actual (para el mensaje de idempotencia) ──
  // Con scope explícito: comprueba el valor de settings de ese scope
  // directamente (el estado combinado puede estar mal si el plugin está
  // habilitado en otro lado pero deshabilitado aquí). Auto-detectado: usa
  // el estado combinado efectivo. Al sobreescribir un scope de menor
  // precedencia: usa el estado combinado — scopeSettingsValue es
  // `undefined` (el plugin aún no está en este scope), que se leería como
  // "ya deshabilitado", pero el propósito de la sobreescritura es
  // justamente escribir un `false` explícito que enmascara el `true` del
  // scope inferior.
  const isCurrentlyEnabled =
    scope && !isOverride
      ? scopeSettingsValue === true
      : requirePluginStartupCheck().getPluginEditableScopes().has(pluginId)
  if (enabled === isCurrentlyEnabled) {
    return {
      success: false,
      message: `Plugin "${plugin}" is already ${enabled ? 'enabled' : 'disabled'}${scope ? ` at ${scope} scope` : ''}`,
    }
  }

  // Al deshabilitar: captura los reverse-dependents del snapshot PREVIO a
  // deshabilitar, antes de escribir settings y limpiar la caché memoizada
  // de plugins.
  let reverseDependents: string[] | undefined
  if (!enabled) {
    const { enabled: loadedEnabled, disabled } =
      await requirePluginLoader().loadAllPlugins()
    const rdeps = requireDependencyResolver().findReverseDependents(pluginId, [
      ...loadedEnabled,
      ...disabled,
    ])
    if (rdeps.length > 0) reverseDependents = rdeps
  }

  // ── ACCIÓN: escribe settings ──
  const { error } = requireSettingsSettings().updateSettingsForSource(
    settingSource,
    {
      enabledPlugins: {
        ...requireSettingsSettings().getSettingsForSource(settingSource)
          ?.enabledPlugins,
        [pluginId]: enabled,
      },
    },
  )
  if (error) {
    return {
      success: false,
      message: `Failed to ${operation} plugin: ${error.message}`,
    }
  }

  requireCacheUtils().clearAllCaches()

  const { name: pluginName } =
    requirePluginIdentifier().parsePluginIdentifier(pluginId)
  const depWarn =
    requireDependencyResolver().formatReverseDependentsSuffix(reverseDependents)
  return {
    success: true,
    message: `Successfully ${operation}d plugin: ${pluginName} (scope: ${resolvedScope})${depWarn}`,
    pluginId,
    pluginName,
    scope: resolvedScope,
    reverseDependents,
  }
}

/** Habilita un plugin. */
export async function enablePluginOp(
  plugin: string,
  scope?: InstallableScope,
): Promise<PluginOperationResult> {
  return setPluginEnabledOp(plugin, true, scope)
}

/** Deshabilita un plugin. */
export async function disablePluginOp(
  plugin: string,
  scope?: InstallableScope,
): Promise<PluginOperationResult> {
  return setPluginEnabledOp(plugin, false, scope)
}

/** Deshabilita todos los plugins habilitados. */
export async function disableAllPluginsOp(): Promise<PluginOperationResult> {
  const enabledPlugins = requirePluginStartupCheck().getPluginEditableScopes()

  if (enabledPlugins.size === 0) {
    return { success: true, message: 'No enabled plugins to disable' }
  }

  const disabled: string[] = []
  const errors: string[] = []

  for (const [pluginId] of enabledPlugins) {
    const result = await setPluginEnabledOp(pluginId, false)
    if (result.success) {
      disabled.push(pluginId)
    } else {
      errors.push(`${pluginId}: ${result.message}`)
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Disabled ${disabled.length} ${plural(disabled.length, 'plugin')}, ${errors.length} failed:\n${errors.join('\n')}`,
    }
  }

  return {
    success: true,
    message: `Disabled ${disabled.length} ${plural(disabled.length, 'plugin')}`,
  }
}

/**
 * Actualiza un plugin a la última versión.
 *
 * Realiza una actualización NO-IN-PLACE:
 * 1. Obtiene la info del plugin desde el marketplace.
 * 2. Para plugins remotos: descarga a un directorio temporal y calcula la versión.
 * 3. Para plugins locales: calcula la versión desde la fuente del marketplace.
 * 4. Si la versión difiere de la instalada, copia a un directorio de caché versionado nuevo.
 * 5. Actualiza la instalación en el archivo V2 (la memoria no cambia hasta reiniciar).
 * 6. Limpia la versión vieja si ya no la referencia ninguna instalación.
 */
export async function updatePluginOp(
  plugin: string,
  scope: PluginScope,
): Promise<PluginUpdateResult> {
  // Parsea el identificador para obtener el pluginId completo.
  const { name: pluginName, marketplace: marketplaceName } =
    requirePluginIdentifier().parsePluginIdentifier(plugin)
  const pluginId = marketplaceName ? `${pluginName}@${marketplaceName}` : plugin

  // Obtiene la info del plugin desde el marketplace.
  const pluginInfo = await requireMarketplaceManager().getPluginById(plugin)
  if (!pluginInfo) {
    return {
      success: false,
      message: `Plugin "${pluginName}" not found`,
      pluginId,
      scope,
    }
  }

  const { entry, marketplaceInstallLocation } = pluginInfo

  // Obtiene instalaciones desde disco.
  const diskData = requireInstalledPluginsManager().loadInstalledPluginsFromDisk()
  const installations = diskData.plugins[pluginId]

  if (!installations || installations.length === 0) {
    return {
      success: false,
      message: `Plugin "${pluginName}" is not installed`,
      pluginId,
      scope,
    }
  }

  // Determina projectPath según el scope.
  const projectPath = getProjectPathForScope(scope)

  // Encuentra la instalación para este scope.
  const installation = installations.find(
    (inst) => inst.scope === scope && inst.projectPath === projectPath,
  )
  if (!installation) {
    const scopeDesc = projectPath ? `${scope} (${projectPath})` : scope
    return {
      success: false,
      message: `Plugin "${pluginName}" is not installed at scope ${scopeDesc}`,
      pluginId,
      scope,
    }
  }

  return performPluginUpdate({
    pluginId,
    pluginName,
    entry,
    marketplaceInstallLocation,
    installation,
    scope,
    projectPath,
  })
}

/**
 * Ejecuta la actualización real: trae la fuente, calcula la versión, copia
 * a caché, actualiza disco. Es el núcleo de ejecución extraído de
 * updatePluginOp.
 */
async function performPluginUpdate({
  pluginId,
  pluginName,
  entry,
  marketplaceInstallLocation,
  installation,
  scope,
  projectPath,
}: {
  pluginId: string
  pluginName: string
  entry: PluginMarketplaceEntry
  marketplaceInstallLocation: string
  installation: { version?: string; installPath: string }
  scope: PluginScope
  projectPath: string | undefined
}): Promise<PluginUpdateResult> {
  const fs = getFsImplementation()
  const oldVersion = installation.version

  let sourcePath: string
  let newVersion: string
  let shouldCleanupSource = false
  let gitCommitSha: string | undefined

  // Maneja plugins remotos vs. locales.
  if (typeof entry.source !== 'string') {
    // Plugin remoto: descarga a directorio temporal primero.
    const cacheResult = await requirePluginLoader().cachePlugin(entry.source, {
      manifest: { name: entry.name },
    })
    sourcePath = cacheResult.path
    shouldCleanupSource = true
    gitCommitSha = cacheResult.gitCommitSha

    // Calcula la versión desde el plugin descargado. Para fuentes
    // git-subdir, cachePlugin capturó el SHA del commit antes de descartar
    // el clon efímero (el subdirectorio extraído no tiene .git, así que el
    // fallback basado en installPath de calculatePluginVersion no puede
    // recuperarlo).
    newVersion = await requirePluginVersioning().calculatePluginVersion(
      pluginId,
      entry.source,
      cacheResult.manifest,
      cacheResult.path,
      entry.version,
      cacheResult.gitCommitSha,
    )
  } else {
    // Plugin local: usa la ruta del marketplace.
    // Stat directo — maneja ENOENT inline en vez de pre-chequear existencia.
    let marketplaceStats
    try {
      marketplaceStats = await fs.stat(marketplaceInstallLocation)
    } catch (e: unknown) {
      if (isENOENT(e)) {
        return {
          success: false,
          message: `Marketplace directory not found at ${marketplaceInstallLocation}`,
          pluginId,
          scope,
        }
      }
      throw e
    }
    const marketplaceDir = marketplaceStats.isDirectory()
      ? marketplaceInstallLocation
      : dirname(marketplaceInstallLocation)
    sourcePath = join(marketplaceDir, entry.source)

    // Verifica que sourcePath existe. Este stat es obligatorio — ninguna
    // de las dos operaciones posteriores expone ENOENT de forma confiable:
    //   1. calculatePluginVersion → findGitRoot sube más allá de un
    //      directorio ausente hasta el .git del marketplace, devolviendo
    //      el mismo SHA que al instalar → falso positivo silencioso
    //      {success: true, alreadyUpToDate: true}.
    //   2. copyPluginToVersionedCache (si las versiones difieren) lanza un
    //      ENOENT crudo sin mensaje amigable.
    // El TOCTOU es despreciable para un directorio local gestionado por el usuario.
    try {
      await fs.stat(sourcePath)
    } catch (e: unknown) {
      if (isENOENT(e)) {
        return {
          success: false,
          message: `Plugin source not found at ${sourcePath}`,
          pluginId,
          scope,
        }
      }
      throw e
    }

    // Intenta cargar el manifiesto desde el directorio del plugin (para info de versión).
    let pluginManifest: PluginManifest | undefined
    const manifestPath = join(sourcePath, '.claude-plugin', 'plugin.json')
    try {
      pluginManifest = await requirePluginLoader().loadPluginManifest(
        manifestPath,
        entry.name,
        entry.source,
      )
    } catch {
      // Falló la carga — se usarán otras fuentes de versión.
    }

    // Calcula la versión desde la ruta de la fuente del plugin.
    newVersion = await requirePluginVersioning().calculatePluginVersion(
      pluginId,
      entry.source,
      pluginManifest,
      sourcePath,
      entry.version,
    )
  }

  // Usa try/finally para asegurar la limpieza del directorio temporal ante cualquier error.
  try {
    // Comprueba si esta versión ya existe en caché.
    let versionedPath = requirePluginLoader().getVersionedCachePath(
      pluginId,
      newVersion,
    )

    // Comprueba si la instalación ya está en la versión nueva.
    const zipPath = requirePluginLoader().getVersionedZipCachePath(
      pluginId,
      newVersion,
    )
    const isUpToDate =
      installation.version === newVersion ||
      installation.installPath === versionedPath ||
      installation.installPath === zipPath
    if (isUpToDate) {
      return {
        success: true,
        message: `${pluginName} is already at the latest version (${newVersion}).`,
        pluginId,
        newVersion,
        oldVersion,
        alreadyUpToDate: true,
        scope,
      }
    }

    // Copia a caché versionada (devuelve la ruta real, puede ser .zip).
    versionedPath = await requirePluginLoader().copyPluginToVersionedCache(
      sourcePath,
      pluginId,
      newVersion,
      entry,
    )

    // Guarda la ruta de la versión vieja para posible limpieza.
    const oldVersionPath = installation.installPath

    // Actualiza el archivo JSON de disco para esta instalación
    // (la memoria no cambia hasta reiniciar).
    requireInstalledPluginsManager().updateInstallationPathOnDisk(
      pluginId,
      scope,
      projectPath,
      versionedPath,
      newVersion,
      gitCommitSha,
    )

    if (oldVersionPath && oldVersionPath !== versionedPath) {
      const updatedDiskData =
        requireInstalledPluginsManager().loadInstalledPluginsFromDisk()
      const isOldVersionStillReferenced = Object.values(
        updatedDiskData.plugins,
      ).some((pluginInstallations) =>
        pluginInstallations.some((inst) => inst.installPath === oldVersionPath),
      )

      if (!isOldVersionStillReferenced) {
        await requireCacheUtils().markPluginVersionOrphaned(oldVersionPath)
      }
    }

    const scopeDesc = projectPath ? `${scope} (${projectPath})` : scope
    const message = `Plugin "${pluginName}" updated from ${oldVersion || 'unknown'} to ${newVersion} for scope ${scopeDesc}. Restart to apply changes.`

    return {
      success: true,
      message,
      pluginId,
      newVersion,
      oldVersion,
      scope,
    }
  } finally {
    // Limpia la fuente temporal si fue una descarga remota.
    if (
      shouldCleanupSource &&
      sourcePath !==
        requirePluginLoader().getVersionedCachePath(pluginId, newVersion)
    ) {
      await fs.rm(sourcePath, { recursive: true, force: true })
    }
  }
}
