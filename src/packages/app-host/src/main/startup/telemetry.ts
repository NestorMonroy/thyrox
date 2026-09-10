// Adaptación de @claude-code-how-works/app-host: src/main/startup/telemetry.ts.
// Capa 1 (con cita a `../../bootstrap/cwd.js`, `../../startup/skillLoadedEvent.js`
// y `../../startup/ghAuthStatus.js`, todos del mismo paquete) — porte
// PARCIAL declarado.
//
// La fuente cita ~18 símbolos repartidos en 8 paquetes hermanos ausentes
// en este árbol: `@claude-code-how-works/shell` (SandboxManager),
// `/provider` (modelo por defecto/especificado), `/agent` (ventana de
// contexto), `/config` (plugins, settings, auto-updater),
// `/tool-registry` (telemetría de plugins), `/local-observability`
// (logError/logEvent), `/storage` (git), `/config/env/privacy`
// (isAnalyticsDisabled). Se resuelven con inyección de dependencia total,
// con defaults no-op/false/vacío que reproducen el estado real de hoy.
//
// Tres colaboradores SÍ están disponibles en este paquete y se wiran de
// verdad: `getCwd()` (bootstrap/cwd.ts), `logSkillsLoaded` y
// `getGhAuthStatus` — los dos últimos porteados en este mismo pase (ver
// `../../startup/skillLoadedEvent.ts` y `../../startup/ghAuthStatus.ts`).
//
// `hasNodeOption` se reimplementa localmente, verbatim de
// `ccnmt: packages/config/env/utils.ts:37-41`.
//
// Divergencia de forma: `SandboxManager.isSandboxingEnabled()` / etc. (tres
// métodos estáticos de una clase) se aplanan a tres colaboradores
// inyectables sueltos — la clase no aporta nada aquí sin su paquete, y
// tres funciones son igual de testeables.

import { getCwd } from '../../bootstrap/cwd.js'
import { getGhAuthStatus } from '../../startup/ghAuthStatus.js'
import { logSkillsLoaded, type SkillLoadedEventDeps } from '../../startup/skillLoadedEvent.js'

function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) return false
  return nodeOptions.split(/\s+/).includes(flag)
}

export type PluginInfo = { name: string; repository: string; hooksConfig?: unknown }
export type PluginLoadResult = { enabled: PluginInfo[]; errors: unknown[] }
export type SettingsBySource = {
  userSettings?: unknown
  projectSettings?: unknown
  localSettings?: unknown
  flagSettings?: unknown
  policySettings?: unknown
}

export type SessionTelemetryDeps = {
  parseUserSpecifiedModel?: (model: string) => string
  getDefaultMainLoopModel?: () => string
  getInitialMainLoopModel?: () => string | undefined
  getSdkBetas?: () => string[]
  getContextWindowForModel?: (model: string, betas: string[]) => number
  loadAllPluginsCacheOnly?: () => Promise<PluginLoadResult>
  getManagedPluginNames?: () => string[]
  getPluginSeedDirs?: () => string[]
  getSettingsForSource?: (source: string) => { hooks?: unknown } | undefined
  parsePluginIdentifier?: (repository: string) => { marketplace: string }
  logHooksRegistered?: (
    bySource: SettingsBySource,
    plugins: { name: string; marketplace: string; hooksConfig?: unknown }[],
    managedNames: string[],
  ) => void
  logPluginLoadErrors?: (errors: unknown[], managedNames: string[]) => void
  logPluginsEnabledForSession?: (enabled: PluginInfo[], managedNames: string[], seedDirs: string[]) => void
  logError?: (err: unknown) => void
  skillLoadedDeps?: SkillLoadedEventDeps
}

/**
 * Loguea la telemetría de sesión: el modelo del ciclo principal (con su
 * ventana de contexto, vía `logSkillsLoaded`), y — tras cargar los plugins
 * cacheados — los plugins habilitados, sus errores de carga, y los hooks
 * registrados (de settings y de plugins, para que ambos aparezcan una
 * sola vez en OTel al arrancar).
 */
export function logSessionTelemetry(deps: SessionTelemetryDeps = {}): void {
  const parseUserSpecifiedModel = deps.parseUserSpecifiedModel ?? ((model) => model)
  const getDefaultMainLoopModel = deps.getDefaultMainLoopModel ?? (() => '')
  const getInitialMainLoopModel = deps.getInitialMainLoopModel ?? (() => undefined)
  const getSdkBetas = deps.getSdkBetas ?? (() => [])
  const getContextWindowForModel = deps.getContextWindowForModel ?? (() => 0)
  const loadAllPluginsCacheOnly = deps.loadAllPluginsCacheOnly ?? (async () => ({ enabled: [], errors: [] }))
  const getManagedPluginNames = deps.getManagedPluginNames ?? (() => [])
  const getPluginSeedDirs = deps.getPluginSeedDirs ?? (() => [])
  const getSettingsForSource = deps.getSettingsForSource ?? (() => undefined)
  const parsePluginIdentifier = deps.parsePluginIdentifier ?? ((repository) => ({ marketplace: repository }))
  const logHooksRegistered = deps.logHooksRegistered ?? (() => {})
  const logPluginLoadErrors = deps.logPluginLoadErrors ?? (() => {})
  const logPluginsEnabledForSession = deps.logPluginsEnabledForSession ?? (() => {})
  const logError = deps.logError ?? (() => {})

  const model = parseUserSpecifiedModel(getInitialMainLoopModel() ?? getDefaultMainLoopModel())
  void logSkillsLoaded(getCwd(), getContextWindowForModel(model, getSdkBetas()), deps.skillLoadedDeps)

  void loadAllPluginsCacheOnly()
    .then(({ enabled, errors }) => {
      const managedNames = getManagedPluginNames()
      logPluginsEnabledForSession(enabled, managedNames, getPluginSeedDirs())
      logPluginLoadErrors(errors, managedNames)
      logHooksRegistered(
        {
          userSettings: getSettingsForSource('userSettings')?.hooks,
          projectSettings: getSettingsForSource('projectSettings')?.hooks,
          localSettings: getSettingsForSource('localSettings')?.hooks,
          flagSettings: getSettingsForSource('flagSettings')?.hooks,
          policySettings: getSettingsForSource('policySettings')?.hooks,
        },
        enabled.map((p) => ({
          name: p.name,
          marketplace: parsePluginIdentifier(p.repository).marketplace,
          hooksConfig: p.hooksConfig,
        })),
        managedNames,
      )
    })
    .catch((err) => logError(err))
}

function getCertEnvVarTelemetry(): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  if (process.env.NODE_EXTRA_CA_CERTS) {
    result.has_node_extra_ca_certs = true
  }
  if (process.env.CLAUDE_CODE_CLIENT_CERT) {
    result.has_client_cert = true
  }
  if (hasNodeOption('--use-system-ca')) {
    result.has_use_system_ca = true
  }
  if (hasNodeOption('--use-openssl-ca')) {
    result.has_use_openssl_ca = true
  }
  return result
}

export type StartupTelemetryDeps = {
  isAnalyticsDisabled?: () => boolean
  getIsGit?: () => Promise<boolean>
  getWorktreeCount?: () => Promise<number>
  getGhAuthStatus?: () => Promise<string>
  logEvent?: (event: string, metadata: Record<string, unknown>) => void
  isSandboxingEnabled?: () => boolean
  areUnsandboxedCommandsAllowed?: () => boolean
  isAutoAllowBashIfSandboxedEnabled?: () => boolean
  isAutoUpdaterDisabled?: () => boolean
  getInitialSettings?: () => { prefersReducedMotion?: boolean }
}

/**
 * Loguea telemetría de arranque de una sola vez: git/worktree, estado de
 * `gh`, sandboxing, auto-updater, preferencia de movimiento reducido y las
 * variables de entorno de certificados presentes.
 */
export async function logStartupTelemetry(deps: StartupTelemetryDeps = {}): Promise<void> {
  const isAnalyticsDisabled = deps.isAnalyticsDisabled ?? (() => false)
  if (isAnalyticsDisabled()) return

  const getIsGit = deps.getIsGit ?? (async () => false)
  const getWorktreeCount = deps.getWorktreeCount ?? (async () => 0)
  const getGhAuthStatusFn = deps.getGhAuthStatus ?? getGhAuthStatus

  const [isGit, worktreeCount, ghAuthStatus] = await Promise.all([
    getIsGit(),
    getWorktreeCount(),
    getGhAuthStatusFn(),
  ])

  const logEvent = deps.logEvent ?? (() => {})
  logEvent('tengu_startup_telemetry', {
    is_git: isGit,
    worktree_count: worktreeCount,
    gh_auth_status: ghAuthStatus,
    sandbox_enabled: (deps.isSandboxingEnabled ?? (() => false))(),
    are_unsandboxed_commands_allowed: (deps.areUnsandboxedCommandsAllowed ?? (() => false))(),
    is_auto_bash_allowed_if_sandbox_enabled: (deps.isAutoAllowBashIfSandboxedEnabled ?? (() => false))(),
    auto_updater_disabled: (deps.isAutoUpdaterDisabled ?? (() => false))(),
    prefers_reduced_motion: (deps.getInitialSettings ?? (() => ({})))().prefersReducedMotion ?? false,
    ...getCertEnvVarTelemetry(),
  })
}
