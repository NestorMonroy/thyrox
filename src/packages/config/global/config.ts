/**
 * Puerto de `ccnmt: packages/config/global/config.ts` (1883 líneas, 45
 * símbolos exportados: 23 funciones, 7 constantes, 15 tipos) — el registro
 * de configuración global, o sea `~/.claude.json` y su modelo de datos.
 *
 * POR QUÉ ESTE PORTE (#260). `@thyrox/config` no exportaba `getGlobalConfig`,
 * así que sus dos consumidores vivían de sustitutos que fingen que la
 * configuración está vacía: `updater/src/internal/globalConfigCompat.ts`
 * (devuelve `{}`, y su `saveGlobalConfig` es un no-op declarado) y el
 * `require()` diferido de `provider/src/oauth/client.ts`. Un `oauth/client`
 * que lee `{}` no encuentra el registro de conexiones y se comporta como si
 * el usuario no tuviera ninguna.
 *
 * ALCANCE, declarado y no omitido en silencio (`porte-completo-no-parcial.md`).
 * Este pase trae el NÚCLEO DE LECTURA/ESCRITURA y su modelo de datos, que es
 * lo que desbloquea a los dos consumidores:
 *
 *   tipos      `GlobalConfig` con sus 15 tipos satélite, entero.
 *   constantes `DEFAULT_GLOBAL_CONFIG`, `GLOBAL_CONFIG_KEYS`,
 *              `PROJECT_CONFIG_KEYS`, `CONFIG_WRITE_DISPLAY_THRESHOLD`.
 *   funciones  `getGlobalConfig`, `saveGlobalConfig`, `isGlobalConfigKey`,
 *              `isProjectConfigKey`, `getGlobalConfigWriteCount`,
 *              `enableConfigs`, `checkHasTrustDialogAccepted`,
 *              `isPathTrusted`, `_setGlobalConfigCacheForTesting`.
 *
 * LO QUE NO TRAE, con su razón — cada uno es una tarea, no un olvido:
 *
 *   [PORTADA 2026-09-19, al final de este archivo] la mitad de PROYECTO
 *       (`getCurrentProjectConfig`, `saveCurrentProjectConfig`,
 *       `getProjectPathForConfig`). Sus dos razones de deferimiento estaban
 *       rancias al medirlas: los bindings `getOriginalCwd` y
 *       `findCanonicalGitRoot` ya existían, y 18 archivos en 10 paquetes la
 *       importan — `repl` no arrancaba por eso.
 *   [PORTADOS 2026-09-24, en `./autoUpdater.ts`] los accesores del
 *       AUTO-UPDATER (`isAutoUpdaterDisabled`, `shouldSkipPluginAutoupdate`,
 *       `formatAutoUpdaterDisabledReason`, `getAutoUpdaterDisabledReason`).
 *   las rutas de MEMORIA y REGLAS (`getMemoryPath`, `getManagedClaudeRulesDir`,
 *       `getUserClaudeRulesDir`) — `getMemoryPath` cuelga de `teamMemPaths`,
 *       que la fuente carga tras la bandera `TEAMMEM`.
 *   [PORTADOS 2026-09-24, en `./configMarkers.ts`] `recordFirstStartTime`,
 *       `markHasUsedAgentsFleet`, `getRemoteControlAtStartup`,
 *       `getCustomApiKeyStatus` — sus consumidores ya existían.
 *
 * DIVERGENCIA DECLARADA, y es la única de firma: el parámetro `filePath`
 * OPCIONAL. La fuente resuelve la ruta ella misma y, para poder probarse,
 * desvía a un objeto fijo cuando `NODE_ENV === 'test'` — o sea, en pruebas
 * nunca lee un archivo. Sin el parámetro la conducta es la de la fuente,
 * literal; con él el mecanismo se mide leyendo y escribiendo de verdad. Es
 * aditivo (ningún llamador de la firma original cambia) y compra el único
 * control que importa: que lo guardado aterrice en disco y vuelva a leerse.
 *
 * La caché, en consecuencia, guarda TAMBIÉN el archivo del que salió: con
 * una sola ranura sin esa clave, un lector de otra ruta recibiría la config
 * de la anterior. Los dos escritores de la mitad de PROYECTO resuelven ese
 * archivo con `_getGlobalClaudeFile()` y no admiten override: el registro de
 * proyecto vive DENTRO del archivo global, bajo la clave `projects`, así que
 * su ruta no es un parámetro del llamador.
 *
 * `ProjectConfig` recupera las tres claves que su `DEFAULT_PROJECT_CONFIG`
 * siembra —`projectOnboardingSeenCount` (requerida, sin `?`),
 * `hasClaudeMdExternalIncludesApproved` y
 * `hasClaudeMdExternalIncludesWarningShown`— con la misma opcionalidad que la
 * fuente les da en `ccnmt: packages/config/global/config.ts:154-156`. No es
 * completitud por completitud: siete sitios de `@thyrox/repl` las leen
 * (`projectOnboardingState.ts`, `ClaudeMdExternalIncludesDialog.tsx`,
 * `Settings/Config.tsx`). El resto del tipo sigue siendo un porte parcial
 * declarado — la fuente declara ~15 claves más que ningún consumidor de este
 * árbol lee todavía.
 */
import { randomBytes } from 'node:crypto'
import { unwatchFile, watchFile } from 'node:fs'
import memoize from 'lodash-es/memoize.js'
import pickBy from 'lodash-es/pickBy.js'
import { dirname, join, normalize, resolve } from 'node:path'
import { AccessError, ParseError as ConfigParseError } from '../errors.js'
import { getConfigHostBindings, tryGetConfigHostBindings } from '../host.js'
import { getManagedFilePath } from '../settings/managedPath.js'
import { feature } from 'bun:bundle'

// La fuente inlinea estos tipos para no arrastrar el paquete que los define
// (su comentario: «type-only imports inlined»). Se conserva el criterio.
type McpServerConfig = Record<string, unknown>
type BillingType = unknown
type ReferralEligibilityResponse = unknown
type ThemeSetting = string
type MemoryType = string
type ImageDimensions = {
  originalWidth?: number
  originalHeight?: number
  displayWidth?: number
  displayHeight?: number
}
type ModelOption = {
  value: string
  label: string
  description: string
  descriptionForModel?: string
}

function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
    return e.code
  }
  return undefined
}

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content
}

function safeParseJSON(json: string | null | undefined): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function normalizePathForConfigKey(path: string): string {
  return normalize(path).replace(/\\/g, '/')
}

function getConfigHomeDir(): string {
  return (
    getConfigHostBindings().getConfigHomeDir?.() ??
    join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.claude')
  )
}

// Helpers de fs por host binding — NUNCA `node:fs` crudo: la capa virtual es
// carga útil para el sandbox (nota de la fuente: `fs-replacement-danger`).
function _getGlobalClaudeFile(): string {
  const fn = tryGetConfigHostBindings().getGlobalClaudeFile
  if (fn) return fn()
  return join(getConfigHomeDir(), '.claude.json')
}

/* eslint-disable @typescript-eslint/no-require-imports */
function _fs() {
  const b = getConfigHostBindings() as Record<string, unknown>
  const nodeFs = () => require('node:fs')
  return {
    readFileSync:
      (b.readFileSync as ((p: string, enc: string) => string) | undefined) ??
      ((p: string, enc: string) => nodeFs().readFileSync(p, enc)),
    writeFileSyncAndFlush:
      (b.writeFileSyncAndFlush as
        | ((p: string, c: string, o?: unknown) => void)
        | undefined) ??
      ((p: string, c: string, o?: unknown) => nodeFs().writeFileSync(p, c, o)),
    statSync:
      (b.statSync as
        | ((p: string) => { mtimeMs: number; size: number })
        | undefined) ?? ((p: string) => nodeFs().statSync(p)),
    mkdirSync:
      (b.mkdirSync as ((p: string) => void) | undefined) ??
      ((p: string) => nodeFs().mkdirSync(p, { recursive: true })),
    readFileAsync:
      (b.readFileAsync as
        | ((p: string, enc: string) => Promise<string>)
        | undefined) ??
      ((p: string, enc: string) =>
        require('node:fs/promises').readFile(p, enc)),
  }
}

function _lockSync(file: string, options?: unknown): () => void {
  const fn = (tryGetConfigHostBindings() as Record<string, unknown>)
    .lockSync as ((f: string, o?: unknown) => () => void) | undefined
  if (fn) return fn(file, options)
  return require('proper-lockfile').lockSync(file, options)
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Lo que el usuario pega en el prompt. Los siete campos de la fuente —el
 * porte de #260 llegó con cuatro, y los tres ausentes no fallaron al
 * portarse sino al consumirse: `imageStore` decide la extensión del
 * archivo por `mediaType`, así que sin él un jpeg aterriza llamándose
 * `.png`.
 */
export type PastedContent = {
  /** Identificador secuencial dentro de la sesión. */
  id: number
  type: 'text' | 'image'
  content: string
  /** `image/png`, `image/jpeg`… — decide la extensión en disco. */
  mediaType?: string
  /** Nombre a mostrar en la ranura de adjuntos. */
  filename?: string
  dimensions?: ImageDimensions
  /** Ruta original, cuando la imagen se arrastró a la terminal. */
  sourcePath?: string
}

export interface HistoryEntry {
  display: string
  pastedContents: { [id: number]: PastedContent }
}

export type ReleaseChannel = 'stable' | 'latest'

export type ApprovedComputerUseApp = {
  bundleId: string
  displayName: string
  grantedAt: number
}

export type GroveConfigCacheEntry = {
  grove_enabled: boolean
  timestamp: number
}

export type OverageCreditGrantCacheEntry = {
  info: {
    available: boolean
    eligible: boolean
    granted: boolean
    amount_minor_units: number | null
    currency: string | null
  }
  timestamp: number
}

export type OfficialMarketplaceAutoInstallFailReason =
  | 'policy_blocked'
  | 'gcs_unavailable'
  | 'git_unavailable'
  | 'unknown'

export type ProjectConfig = {
  allowedTools?: string[]
  hasTrustDialogAccepted?: boolean
  hasCompletedProjectOnboarding?: boolean
  projectOnboardingSeenCount: number
  hasClaudeMdExternalIncludesApproved?: boolean
  hasClaudeMdExternalIncludesWarningShown?: boolean
  mcpServers?: Record<string, McpServerConfig>
  /** @deprecated Migrado a `settings.enableAllProjectMcpServers`. */
  enableAllProjectMcpServers?: boolean
  enabledMcpjsonServers?: string[]
  disabledMcpjsonServers?: string[]
  enabledMcpServers?: string[]
  disabledMcpServers?: string[]
  mcpContextUris?: string[]
  exampleFiles?: string[]
  exampleFilesGeneratedAt?: number
  lastCost?: number
  lastAPIDuration?: number
  lastDuration?: number
  lastToolDuration?: number
  lastFpsAverage?: number
  lastFpsLow1Pct?: number
  lastSessionMetrics?: Record<string, number>
  lastLinesAdded?: number
  lastLinesRemoved?: number
  lastTotalInputTokens?: number
  lastTotalOutputTokens?: number
  lastTotalCacheCreationInputTokens?: number
  lastTotalCacheReadInputTokens?: number
  lastSessionId?: string
}

export type InstallMethod = 'local' | 'native' | 'global' | 'unknown'

export const NOTIFICATION_CHANNELS = [
  'auto',
  'iterm2',
  'iterm2_with_bell',
  'terminal_bell',
  'kitty',
  'ghostty',
  'notifications_disabled',
] as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export type AccountInfo = {
  accountUuid: string
  emailAddress: string
  organizationUuid?: string
  organizationRole?: string
  workspaceRole?: string | null
  organizationName?: string
  billingType?: BillingType
  // Los campos del perfil que `fetchProfileInfo` y `refreshOAuthToken`
  // guardan (su_/Bq_ del binario). Vivían sólo en el `AccountInfo` de
  // `provider/internal/oauthTypes.ts`; `oauth/client.ts` escribe en este.
  displayName?: string
  hasExtraUsageEnabled?: boolean
  accountCreatedAt?: string
  subscriptionCreatedAt?: string
  ccOnboardingFlags?: Record<string, unknown>
  claudeCodeTrialEndsAt?: string | null
  claudeCodeTrialDurationDays?: number | null
  seatTier?: string | null
}

export type AuthProtocol = 'anthropic' | 'openai' | 'codex' | 'gemini'

export type ConnectionModelEffort =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export type ConnectionModelRecord = {
  id: string
  label?: string
  effort?: ConnectionModelEffort
}

export type ConnectionRecord = {
  id: string
  name: string
  protocol: AuthProtocol
  endpoint: string
  auth: { type: 'oauth'; source: string } | { type: 'api_key'; key?: string }
  enabled: boolean
  models: ConnectionModelRecord[]
  createdAt: number
}

// 'emacs' se conserva por retrocompatibilidad; se auto-migra a 'normal'.
export type EditorMode = 'emacs' | 'normal' | 'vim'
export type DiffTool = 'terminal' | 'auto'
export type OutputStyle = string

export type GlobalConfig = {
  /** @deprecated Usar `settings.apiKeyHelper`. */
  apiKeyHelper?: string
  projects?: Record<string, ProjectConfig>
  numStartups: number
  installMethod?: InstallMethod
  autoUpdates?: boolean
  autoUpdatesProtectedForNative?: boolean
  doctorShownAtSession?: number
  userID?: string
  theme: ThemeSetting
  hasCompletedOnboarding?: boolean
  powerupsUnlocked?: string[]
  lastOnboardingVersion?: string
  mcpServers?: Record<string, McpServerConfig>
  claudeAiMcpEverConnected?: string[]
  preferredNotifChannel: NotificationChannel
  /** @deprecated Usar el hook `Notification`. */
  customNotifyCommand?: string
  verbose: boolean
  customApiKeyResponses?: { approved?: string[]; rejected?: string[] }
  primaryApiKey?: string
  hasAcknowledgedCostThreshold?: boolean
  oauthAccount?: AccountInfo
  /** Tokens OAuth de Codex en config (no en keychain). Auth aparte. */
  codexOAuth?: {
    accessToken: string
    refreshToken: string
    expiresAt: number
    accountId: string
  }
  /**
   * Autenticación multi-proveedor por conexión. Cada conexión es una fuente
   * de auth independiente: entrar o salir de una no afecta a ninguna otra.
   */
  connections?: ConnectionRecord[]
  iterm2KeyBindingInstalled?: boolean
  editorMode?: EditorMode
  bypassPermissionsModeAccepted?: boolean
  hasUsedBackslashReturn?: boolean
  autoCompactEnabled: boolean
  showTurnDuration: boolean
  /** @deprecated Usar `settings.env`. */
  env: { [key: string]: string }
  hasSeenTasksHint?: boolean
  /**
   * Si ya se mostró el aviso de que el modo encubierto se activó SOLO. Es de
   * una sola vez: quien lo declara por variable ya lo sabe, y repetirlo en
   * cada sesión entrena a ignorarlo.
   */
  hasSeenUndercoverAutoNotice?: boolean
  hasUsedStash?: boolean
  hasUsedBackgroundTask?: boolean
  queuedCommandUpHintCount?: number
  diffTool?: DiffTool
  iterm2SetupInProgress?: boolean
  iterm2BackupPath?: string
  appleTerminalBackupPath?: string
  appleTerminalSetupInProgress?: boolean
  shiftEnterKeyBindingInstalled?: boolean
  optionAsMetaKeyInstalled?: boolean
  autoConnectIde?: boolean
  autoInstallIdeExtension?: boolean
  hasIdeOnboardingBeenShown?: Record<string, boolean>
  ideHintShownCount?: number
  hasIdeAutoConnectDialogBeenShown?: boolean
  tipsHistory: { [tipId: string]: number }
  memoryUsageCount: number
  s1mAccessCache?: Record<
    string,
    { hasAccess: boolean; hasAccessNotAsDefault?: boolean; timestamp: number }
  >
  passesEligibilityCache?: Record<
    string,
    ReferralEligibilityResponse & { timestamp: number }
  >
  passesUpsellSeenCount?: number
  hasVisitedPasses?: boolean
  passesLastSeenRemaining?: number
  overageCreditUpsellSeenCount?: number
  hasVisitedExtraUsage?: boolean
  experimentNoticesSeenCount?: Record<string, number>
  promptQueueUseCount: number
  btwUseCount: number
  lastPlanModeUse?: number
  subscriptionNoticeCount?: number
  hasAvailableSubscription?: boolean
  todoFeatureEnabled: boolean
  showExpandedTodos?: boolean
  showSpinnerTree?: boolean
  firstStartTime?: string
  messageIdleNotifThresholdMs: number
  githubActionSetupCount?: number
  slackAppInstallCount?: number
  fileCheckpointingEnabled: boolean
  terminalProgressBarEnabled: boolean
  showStatusInTerminalTab?: boolean
  inputNeededNotifEnabled?: boolean
  agentPushNotifEnabled?: boolean
  claudeCodeFirstTokenDate?: string
  remoteDialogSeen?: boolean
  bridgeOauthDeadExpiresAt?: number
  bridgeOauthDeadFailCount?: number
  cachedStatsigGates: { [gateName: string]: boolean }
  cachedDynamicConfigs?: { [configName: string]: unknown }
  cachedGrowthBookFeatures?: { [featureName: string]: unknown }
  growthBookOverrides?: { [featureName: string]: unknown }
  lastShownEmergencyTip?: string
  respectGitignore: boolean
  copyFullResponse: boolean
  copyOnSelect?: boolean
  leftArrowOpensAgents?: boolean
  defaultToAgentsView?: boolean
  hasUsedAgentsFleet?: boolean
  githubRepoPaths?: Record<string, string[]>
  deepLinkTerminal?: string
  skillUsage?: Record<string, { usageCount: number; lastUsedAt: number }>
  hasCompletedClaudeInChromeOnboarding?: boolean
  claudeInChromeDefaultEnabled?: boolean
  cachedChromeExtensionInstalled?: boolean
  chromeExtension?: { pairedDeviceId?: string; pairedDeviceName?: string }
  lspRecommendationDisabled?: boolean
  lspRecommendationNeverPlugins?: string[]
  lspRecommendationIgnoredCount?: number
  claudeCodeHints?: { plugin?: string[]; disabled?: boolean }
  /** No-op conservado para que un config viejo siga parseando. */
  permissionExplainerEnabled?: boolean
  teammateMode?: 'auto' | 'tmux' | 'in-process'
  teammateDefaultModel?: string | null
  prStatusFooterEnabled?: boolean
  startupPrefetchedAt?: number
  remoteControlAtStartup?: boolean
  cachedExtraUsageDisabledReason?: string | null
  clientDataCache?: Record<string, unknown> | null
  additionalModelOptionsCache?: ModelOption[]
  metricsStatusCache?: { enabled: boolean; timestamp: number }
  migrationVersion?: number
  sonnet1m45MigrationComplete?: boolean
  hasResetAutoModeOptInForDefaultOffer?: boolean
  opusProMigrationComplete?: boolean
  opusProMigrationTimestamp?: number
  legacyOpusMigrationTimestamp?: number
  sonnet45To46MigrationTimestamp?: number
  autoPermissionsNotificationCount?: number
  computerUseApprovedApps?: ApprovedComputerUseApp[]
  desktopUpsellDismissed?: boolean
  desktopUpsellSeenCount?: number
  effortCalloutDismissed?: boolean
  effortCalloutV2Dismissed?: boolean
  groveConfigCache?: Record<string, GroveConfigCacheEntry>
  hasSeenUltraplanTerms?: boolean
  idleReturnDismissed?: boolean
  officialMarketplaceAutoInstallAttempted?: boolean
  officialMarketplaceAutoInstalled?: boolean
  officialMarketplaceAutoInstallFailReason?: OfficialMarketplaceAutoInstallFailReason
  officialMarketplaceAutoInstallRetryCount?: number
  officialMarketplaceAutoInstallNextRetryTime?: number
  opus1mMergeNoticeSeenCount?: number
  overageCreditGrantCache?: Record<string, OverageCreditGrantCacheEntry>
  speculationEnabled?: boolean
  tungstenPanelVisible?: boolean
  voiceFooterHintSeenCount?: number
  voiceLangHintLastLanguage?: string
  voiceLangHintShownCount?: number
  voiceNoticeSeenCount?: number
  agentLastUsed?: Record<string, number>
  fleetViewGroupMode?: 'state' | 'directory'
}

/**
 * Fábrica de un `GlobalConfig` por defecto fresco. La fuente usa fábrica en
 * vez de clonar una constante compartida: los contenedores anidados están
 * todos vacíos, así que da referencias frescas a coste cero.
 */
function createDefaultGlobalConfig(): GlobalConfig {
  return {
    numStartups: 0,
    installMethod: undefined,
    autoUpdates: undefined,
    theme: 'dark',
    preferredNotifChannel: 'auto',
    verbose: false,
    editorMode: 'normal',
    autoCompactEnabled: true,
    showTurnDuration: true,
    hasSeenTasksHint: false,
    hasSeenUndercoverAutoNotice: false,
    hasUsedStash: false,
    hasUsedBackgroundTask: false,
    queuedCommandUpHintCount: 0,
    diffTool: 'auto',
    customApiKeyResponses: { approved: [], rejected: [] },
    env: {},
    tipsHistory: {},
    memoryUsageCount: 0,
    promptQueueUseCount: 0,
    btwUseCount: 0,
    todoFeatureEnabled: true,
    showExpandedTodos: false,
    messageIdleNotifThresholdMs: 60000,
    autoConnectIde: false,
    autoInstallIdeExtension: true,
    fileCheckpointingEnabled: true,
    terminalProgressBarEnabled: true,
    cachedStatsigGates: {},
    cachedDynamicConfigs: {},
    cachedGrowthBookFeatures: {},
    respectGitignore: true,
    copyFullResponse: false,
  }
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = createDefaultGlobalConfig()

export const GLOBAL_CONFIG_KEYS = [
  'apiKeyHelper',
  'installMethod',
  'autoUpdates',
  'autoUpdatesProtectedForNative',
  'theme',
  'verbose',
  'preferredNotifChannel',
  'shiftEnterKeyBindingInstalled',
  'editorMode',
  'hasUsedBackslashReturn',
  'autoCompactEnabled',
  'showTurnDuration',
  'diffTool',
  'env',
  'tipsHistory',
  'todoFeatureEnabled',
  'showExpandedTodos',
  'messageIdleNotifThresholdMs',
  'autoConnectIde',
  'autoInstallIdeExtension',
  'fileCheckpointingEnabled',
  'terminalProgressBarEnabled',
  'showStatusInTerminalTab',
  'inputNeededNotifEnabled',
  'agentPushNotifEnabled',
  'respectGitignore',
  'claudeInChromeDefaultEnabled',
  'hasCompletedClaudeInChromeOnboarding',
  'lspRecommendationDisabled',
  'lspRecommendationNeverPlugins',
  'lspRecommendationIgnoredCount',
  'copyFullResponse',
  'copyOnSelect',
  'leftArrowOpensAgents',
  'defaultToAgentsView',
  'hasUsedAgentsFleet',
  'permissionExplainerEnabled',
  'prStatusFooterEnabled',
  'remoteControlAtStartup',
  'remoteDialogSeen',
] as const

type GlobalConfigKey = (typeof GLOBAL_CONFIG_KEYS)[number]

export function isGlobalConfigKey(key: string): key is GlobalConfigKey {
  return GLOBAL_CONFIG_KEYS.includes(key as GlobalConfigKey)
}

export const PROJECT_CONFIG_KEYS = [
  'allowedTools',
  'hasTrustDialogAccepted',
  'hasCompletedProjectOnboarding',
] as const

type ProjectConfigKey = (typeof PROJECT_CONFIG_KEYS)[number]

export function isProjectConfigKey(key: string): key is ProjectConfigKey {
  return PROJECT_CONFIG_KEYS.includes(key as ProjectConfigKey)
}

/**
 * Confianza del workspace — siempre `true` en la fuente, y aquí igual.
 *
 * El diálogo de arriba («Accessing workspace») guarda una frontera
 * multi-inquilino que este árbol no tiene: el operador es dueño de la
 * máquina y es el único principal de confianza. La fuente lo retiró entero
 * en vez de dejar el estado incoherente «home en silencio, cualquier otro
 * directorio pregunta una vez». Compensación aceptada y declarada: el
 * `.claude` de un repo recién clonado —que puede ejecutar shell— corre sin
 * diálogo de revisión.
 */
export function checkHasTrustDialogAccepted(): boolean {
  return true
}

export function isPathTrusted(_dir: string): boolean {
  return checkHasTrustDialogAccepted()
}

const TEST_GLOBAL_CONFIG_FOR_TESTING: GlobalConfig = {
  ...DEFAULT_GLOBAL_CONFIG,
  autoUpdates: false,
}

// Caché de la config global. A diferencia de la fuente, guarda TAMBIÉN el
// archivo del que salió: con la divergencia de `filePath` una sola ranura sin
// esa clave serviría la config de otra ruta.
let globalConfigCache: {
  config: GlobalConfig | null
  mtime: number
  file: string | null
} = { config: null, mtime: 0, file: null }

let globalConfigWriteCount = 0
// Guard de reentrada: evita `getConfig → logEvent → getGlobalConfig →
// getConfig` cuando el archivo está corrupto.
let insideGetConfig = false
let configReadingAllowed = false

export function getGlobalConfigWriteCount(): number {
  return globalConfigWriteCount
}

export const CONFIG_WRITE_DISPLAY_THRESHOLD = 20

export function enableConfigs(): void {
  if (configReadingAllowed) return
  configReadingAllowed = true
}

function migrateConfigFields(config: GlobalConfig): GlobalConfig {
  if (config.installMethod !== undefined) return config

  const legacy = config as GlobalConfig & {
    autoUpdaterStatus?:
      | 'migrated'
      | 'installed'
      | 'disabled'
      | 'enabled'
      | 'no_permissions'
      | 'not_configured'
  }

  let installMethod: InstallMethod = 'unknown'
  let autoUpdates = config.autoUpdates ?? true

  switch (legacy.autoUpdaterStatus) {
    case 'migrated':
      installMethod = 'local'
      break
    case 'installed':
      installMethod = 'native'
      break
    case 'disabled':
      autoUpdates = false
      break
    case 'enabled':
    case 'no_permissions':
    case 'not_configured':
      installMethod = 'global'
      break
    case undefined:
      break
  }

  return { ...config, installMethod, autoUpdates }
}

/** Quita `history` de los proyectos (migrado a `history.jsonl`). */
function removeProjectHistory(
  projects: Record<string, ProjectConfig> | undefined,
): Record<string, ProjectConfig> | undefined {
  if (!projects) return projects

  const cleaned: Record<string, ProjectConfig> = {}
  let needsCleaning = false

  for (const [path, projectConfig] of Object.entries(projects)) {
    const legacy = projectConfig as ProjectConfig & { history?: unknown }
    if (legacy.history !== undefined) {
      needsCleaning = true
      const { history: _history, ...rest } = legacy
      cleaned[path] = rest
    } else {
      cleaned[path] = projectConfig
    }
  }

  return needsCleaning ? cleaned : projects
}

function getConfig<A>(
  file: string,
  createDefault: () => A,
  throwOnInvalid?: boolean,
): A {
  if (!configReadingAllowed && process.env.NODE_ENV !== 'test') {
    throw new AccessError('Config accessed before allowed.')
  }

  const fs = _fs()

  try {
    const fileContent = fs.readFileSync(file, 'utf-8')
    try {
      const parsed = JSON.parse(stripBOM(fileContent))
      return { ...createDefault(), ...parsed }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConfigParseError(message, file, createDefault())
    }
  } catch (error) {
    if (getErrnoCode(error) === 'ENOENT') {
      return createDefault()
    }

    if (error instanceof ConfigParseError && throwOnInvalid) {
      throw error
    }

    if (error instanceof ConfigParseError) {
      getConfigHostBindings().logDebug?.(
        `Config file corrupted, resetting to defaults: ${error.message}`,
        { level: 'error' },
      )

      if (!insideGetConfig) {
        insideGetConfig = true
        try {
          tryGetConfigHostBindings().logEvent?.('tengu_config_parse_error', {})
        } finally {
          insideGetConfig = false
        }
      }

      return error.defaultConfig as A
    }

    throw error
  }
}

function saveConfig<A extends object>(
  file: string,
  config: A,
  defaultConfig: A,
): void {
  const fs = _fs()
  fs.mkdirSync(dirname(file))

  // Se filtra todo valor que coincida con el default: el archivo sólo guarda
  // la divergencia, no una copia del default.
  const filtered = pickBy(
    config,
    (value, key) =>
      JSON.stringify(value) !== JSON.stringify(defaultConfig[key as keyof A]),
  )
  fs.writeFileSyncAndFlush(file, JSON.stringify(filtered, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })
  globalConfigWriteCount++
}

/**
 * Devuelve `true` si hubo escritura; `false` si se saltó (sin cambios, o el
 * guard de pérdida de auth saltó). El llamador lo usa para decidir si
 * invalida la caché: invalidarla tras una escritura saltada destruye el buen
 * estado cacheado del que depende el guard.
 */
function saveConfigWithLock<A extends object>(
  file: string,
  createDefault: () => A,
  mergeFn: (current: A) => A,
): boolean {
  const defaultConfig = createDefault()
  const fs = _fs()
  fs.mkdirSync(dirname(file))

  let release: (() => void) | undefined
  try {
    release = _lockSync(file, { lockfilePath: `${file}.lock` })
    const current = getConfig(file, createDefault)
    const merged = mergeFn(current)
    if (merged === current) return false
    saveConfig(file, merged, defaultConfig)
    return true
  } finally {
    try {
      release?.()
    } catch {
      // Soltar un lock ya comprometido no es recuperable ni fatal.
    }
  }
}

function wouldLoseAuthState(fresh: {
  oauthAccount?: unknown
  hasCompletedOnboarding?: boolean
}): boolean {
  const cached = globalConfigCache.config
  if (!cached) return false
  const lostOauth =
    cached.oauthAccount !== undefined && fresh.oauthAccount === undefined
  const lostOnboarding =
    cached.hasCompletedOnboarding === true &&
    fresh.hasCompletedOnboarding !== true
  return lostOauth || lostOnboarding
}

const CONFIG_FRESHNESS_POLL_MS = 1000
let freshnessWatcherStarted = false

// `watchFile` sondea `stat` en el threadpool de libuv y sólo llama cuando el
// mtime cambió — un stat colgado nunca bloquea el hilo principal.
function startGlobalConfigFreshnessWatcher(file: string): void {
  if (freshnessWatcherStarted || process.env.NODE_ENV === 'test') return
  freshnessWatcherStarted = true
  watchFile(
    file,
    { interval: CONFIG_FRESHNESS_POLL_MS, persistent: false },
    curr => {
      // Nuestras propias escrituras también disparan esto: el `Date.now()` de
      // la escritura directa deja `cache.mtime` por encima del mtime del
      // archivo, así que se salta la relectura.
      if (curr.mtimeMs <= globalConfigCache.mtime) return
      void _fs()
        .readFileAsync(file, 'utf-8')
        .then((content: string) => {
          if (curr.mtimeMs <= globalConfigCache.mtime) return
          const parsed = safeParseJSON(stripBOM(content))
          if (parsed === null || typeof parsed !== 'object') return
          globalConfigCache = {
            config: migrateConfigFields({
              ...createDefaultGlobalConfig(),
              ...(parsed as Partial<GlobalConfig>),
            }),
            mtime: curr.mtimeMs,
            file,
          }
        })
        .catch(() => {})
    },
  )
  getConfigHostBindings().registerCleanup?.(async () => {
    unwatchFile(file)
    freshnessWatcherStarted = false
  })
}

// Escritura directa a caché: lo que se acaba de escribir ES la nueva config.
// `cache.mtime` sobrepasa el mtime real del archivo para que el vigilante de
// frescura no relea nuestra propia escritura en su siguiente tick.
function writeThroughGlobalConfigCache(
  config: GlobalConfig,
  file: string,
): void {
  globalConfigCache = { config, mtime: Date.now(), file }
}

export function getGlobalConfig(filePath?: string): GlobalConfig {
  // Sin ruta explícita, la conducta es la de la fuente, literal.
  if (!filePath && process.env.NODE_ENV === 'test') {
    return TEST_GLOBAL_CONFIG_FOR_TESTING
  }

  const file = filePath ?? _getGlobalClaudeFile()

  // Camino rápido: lectura pura de memoria. Tras el arranque siempre acierta
  // — nuestras escrituras van directas a caché y las de otra instancia las
  // recoge el vigilante de frescura, que nunca bloquea este camino.
  if (globalConfigCache.config && globalConfigCache.file === file) {
    return globalConfigCache.config
  }

  // Camino lento: carga de arranque. La E/S síncrona es aceptable porque
  // corre exactamente una vez, antes de que se pinte nada. Se hace `stat`
  // antes de leer para que cualquier carrera se autocorrija.
  try {
    let stats: { mtimeMs: number; size: number } | null = null
    try {
      stats = _fs().statSync(file)
    } catch {
      // El archivo no existe.
    }
    const config = migrateConfigFields(
      getConfig(file, createDefaultGlobalConfig),
    )
    globalConfigCache = { config, mtime: stats?.mtimeMs ?? Date.now(), file }
    if (!filePath) startGlobalConfigFreshnessWatcher(file)
    return config
  } catch {
    return migrateConfigFields(getConfig(file, createDefaultGlobalConfig))
  }
}

export function saveGlobalConfig(
  updater: (currentConfig: GlobalConfig) => GlobalConfig,
  filePath?: string,
): void {
  if (!filePath && process.env.NODE_ENV === 'test') {
    const config = updater(TEST_GLOBAL_CONFIG_FOR_TESTING)
    if (config === TEST_GLOBAL_CONFIG_FOR_TESTING) return
    Object.assign(TEST_GLOBAL_CONFIG_FOR_TESTING, config)
    return
  }

  const file = filePath ?? _getGlobalClaudeFile()
  let written: GlobalConfig | null = null

  try {
    const didWrite = saveConfigWithLock(
      file,
      createDefaultGlobalConfig,
      current => {
        const config = updater(current)
        if (config === current) return current
        written = { ...config, projects: removeProjectHistory(current.projects) }
        return written
      },
    )
    // Sólo se escribe a caché si de verdad se escribió. Si el guard de
    // pérdida de auth saltó (o el updater no cambió nada), el archivo está
    // intacto y la caché sigue válida — tocarla corrompería el guard.
    if (didWrite && written) writeThroughGlobalConfigCache(written, file)
  } catch (error) {
    getConfigHostBindings().logDebug?.(
      `Failed to save config with lock: ${error}`,
      { level: 'error' },
    )
    // Sin lock como respaldo. Es una ventana de carrera: si otro proceso está
    // a mitad de escritura (o el archivo quedó truncado), `getConfig` devuelve
    // el default. Se rehúsa escribir eso sobre una config buena en caché para
    // no borrar la auth.
    const currentConfig = getConfig(file, createDefaultGlobalConfig)
    if (wouldLoseAuthState(currentConfig)) {
      getConfigHostBindings().logDebug?.(
        'saveGlobalConfig fallback: la relectura no trae la auth que sí tiene la caché; se rehúsa escribir.',
        { level: 'error' },
      )
      tryGetConfigHostBindings().logEvent?.('tengu_config_auth_loss_prevented', {})
      return
    }
    const config = updater(currentConfig)
    if (config === currentConfig) return
    written = {
      ...config,
      projects: removeProjectHistory(currentConfig.projects),
    }
    saveConfig(file, written, DEFAULT_GLOBAL_CONFIG)
    writeThroughGlobalConfigCache(written, file)
  }
}

export function _setGlobalConfigCacheForTesting(
  config: GlobalConfig | null,
  file?: string,
): void {
  globalConfigCache.config = config
  globalConfigCache.mtime = config ? Date.now() : 0
  globalConfigCache.file = config ? (file ?? globalConfigCache.file) : null
}

// La fábrica se exporta porque `saveConfigWithLock` la recibe como parámetro
// y un consumidor que llame al mecanismo de bloqueo la necesita; el
// normalizador de clave de proyecto lo consume la mitad de PROYECTO, que no
// viaja en este pase pero se porta contra este mismo módulo.
export { createDefaultGlobalConfig, normalizePathForConfigKey }
export type { MemoryType }

// ─── La mitad de PROYECTO ────────────────────────────────────────────────
//
// Porte de `@claude-code-how-works/config` `global/config.ts:1645-1755`.
//
// Llegó en un pase posterior al del registro global, y las dos razones que
// el encabezado daba para diferirla estaban rancias al medirlas:
//
//   «depende del binding `getCwd`»       — `getOriginalCwd` y
//       `findCanonicalGitRoot` ya estaban declarados en `ConfigHostBindings`
//       (`contracts.ts:54,62`), el segundo desde antes de este porte.
//   «ningún consumidor de este pase la usa» — 25 archivos en 10 paquetes la
//       importan hoy, y `repl` no arrancaba por eso.
//
// La clave del registro de proyectos es la RAÍZ DEL REPOSITORIO, no el
// directorio de trabajo: así dos sesiones abiertas en subdirectorios
// distintos del mismo repositorio comparten configuración. Fuera de un
// repositorio cae al `cwd` original resuelto.

/** La forma vacía de una configuración de proyecto. */
const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  allowedTools: [],
  mcpContextUris: [],
  mcpServers: {},
  enabledMcpjsonServers: [],
  disabledMcpjsonServers: [],
  hasTrustDialogAccepted: false,
  projectOnboardingSeenCount: 0,
  hasClaudeMdExternalIncludesApproved: false,
  hasClaudeMdExternalIncludesWarningShown: false,
}

/**
 * El registro de proyecto que los tests ven. Es MUTABLE a propósito: bajo
 * `NODE_ENV=test` las dos funciones de abajo cortocircuitan a este objeto,
 * así que una suite escribe y lee sin tocar el disco ni depender de un
 * repositorio git.
 */
const TEST_PROJECT_CONFIG_FOR_TESTING: ProjectConfig = {
  ...DEFAULT_PROJECT_CONFIG,
}

/**
 * La clave con que el registro global indexa este proyecto.
 *
 * Se memoiza porque resolver la raíz del repositorio bifurca un proceso, y
 * el resultado no cambia durante la vida del proceso. La normalización a
 * barras hacia delante hace que `C:\Users\…` y `C:/Users/…` caigan en la
 * misma clave, que es lo único que distingue a esta ruta de un `resolve`.
 */
/** `dg` del binario: un userID válido son 64 dígitos hex. */
const USER_ID_PATTERN = /^[0-9a-f]{64}$/

/**
 * El userID generado en esta sesión. En el binario vive en el estado de
 * sesión (`generatedUserID`/`setGeneratedUserID`); aquí es una variable de
 * módulo, que dura lo mismo que un proceso. Divergencia de hogar declarada.
 */
let generatedUserID: string | undefined

/**
 * Porte de `P0` (2.1.275): el `userID` de la config global si es válido; si
 * no, el ya generado en la sesión; si no, uno nuevo de 32 bytes aleatorios en
 * hex, que se persiste en la config global antes de devolverse.
 */
export function getOrCreateUserID(filePath?: string): string {
  const config = getGlobalConfig(filePath)
  if (typeof config.userID === 'string' && USER_ID_PATTERN.test(config.userID)) {
    return config.userID
  }
  if (generatedUserID) return generatedUserID
  const userID = randomBytes(32).toString('hex')
  generatedUserID = userID
  saveGlobalConfig(current => ({ ...current, userID }), filePath)
  return userID
}

export function _resetGeneratedUserIDForTesting(): void {
  generatedUserID = undefined
}

export const getProjectPathForConfig = memoize((): string => {
  const originalCwd = getConfigHostBindings().getOriginalCwd?.() ?? process.cwd()
  const gitRoot = getConfigHostBindings().findCanonicalGitRoot?.(originalCwd)

  if (gitRoot) {
    return normalizePathForConfigKey(gitRoot)
  }

  // Fuera de un repositorio: la clave es el propio directorio de trabajo.
  return normalizePathForConfigKey(resolve(originalCwd))
})

/** La configuración del proyecto en curso, o la forma vacía. */
export function getCurrentProjectConfig(): ProjectConfig {
  if (process.env.NODE_ENV === 'test') {
    return TEST_PROJECT_CONFIG_FOR_TESTING
  }

  const absolutePath = getProjectPathForConfig()
  const config = getGlobalConfig()

  if (!config.projects) {
    return DEFAULT_PROJECT_CONFIG
  }

  const projectConfig = config.projects[absolutePath] ?? DEFAULT_PROJECT_CONFIG
  // DIVERGENCIA HEREDADA, declarada en la fuente como «Not sure how this
  // became a string / TODO: Fix upstream»: hay registros en disco donde
  // `allowedTools` quedó serializado como cadena. Se repara al leer porque
  // el consumidor espera un arreglo; retirar esta rama rompería a quien ya
  // tenga uno de esos registros escrito.
  if (typeof projectConfig.allowedTools === 'string') {
    projectConfig.allowedTools =
      (safeParseJSON(projectConfig.allowedTools) as string[]) ?? []
  }

  return projectConfig
}

/**
 * Aplica `updater` a la configuración del proyecto en curso y la persiste.
 *
 * El contrato de «sin cambios» es por IDENTIDAD, no por valor: si `updater`
 * devuelve el mismo objeto que recibió, no se escribe nada. Eso permite a un
 * consumidor decidir dentro del propio actualizador sin pagar una escritura.
 */
export function saveCurrentProjectConfig(
  updater: (currentConfig: ProjectConfig) => ProjectConfig,
): void {
  if (process.env.NODE_ENV === 'test') {
    const config = updater(TEST_PROJECT_CONFIG_FOR_TESTING)
    if (config === TEST_PROJECT_CONFIG_FOR_TESTING) {
      return
    }
    Object.assign(TEST_PROJECT_CONFIG_FOR_TESTING, config)
    return
  }
  const absolutePath = getProjectPathForConfig()

  let written: GlobalConfig | null = null
  try {
    const didWrite = saveConfigWithLock(
      _getGlobalClaudeFile(),
      createDefaultGlobalConfig,
      current => {
        const currentProjectConfig =
          current.projects?.[absolutePath] ?? DEFAULT_PROJECT_CONFIG
        const newProjectConfig = updater(currentProjectConfig)
        if (newProjectConfig === currentProjectConfig) {
          return current
        }
        written = {
          ...current,
          projects: {
            ...current.projects,
            [absolutePath]: newProjectConfig,
          },
        }
        return written
      },
    )
    if (didWrite && written) {
      writeThroughGlobalConfigCache(written, _getGlobalClaudeFile())
    }
  } catch (error) {
    getConfigHostBindings().logDebug?.(
      `Failed to save config with lock: ${error}`,
      { level: 'error' },
    )

    // Misma ventana de carrera que el respaldo de `saveGlobalConfig`: si la
    // relectura perdió el estado de autenticación que la caché sí tiene, el
    // archivo está corrupto o truncado a media escritura. Escribir encima
    // borraría la autenticación de forma permanente.
    const config = getConfig(_getGlobalClaudeFile(), createDefaultGlobalConfig)
    if (wouldLoseAuthState(config)) {
      getConfigHostBindings().logDebug?.(
        'saveCurrentProjectConfig fallback: re-read config is missing auth that cache has; refusing to write.',
        { level: 'error' },
      )
      tryGetConfigHostBindings().logEvent?.('tengu_config_auth_loss_prevented', {})
      return
    }
    const currentProjectConfig =
      config.projects?.[absolutePath] ?? DEFAULT_PROJECT_CONFIG
    const newProjectConfig = updater(currentProjectConfig)
    if (newProjectConfig === currentProjectConfig) {
      return
    }
    written = {
      ...config,
      projects: {
        ...config.projects,
        [absolutePath]: newProjectConfig,
      },
    }
    saveConfig(_getGlobalClaudeFile(), written, DEFAULT_GLOBAL_CONFIG)
    writeThroughGlobalConfigCache(written, _getGlobalClaudeFile())
  }
}

/* eslint-disable @typescript-eslint/no-require-imports */
const teamMemPaths = feature('TEAMMEM')
  ? (require('@thyrox/memory/teamMemPaths') as typeof import('@thyrox/memory/teamMemPaths'))
  : null
export function getMemoryPath(memoryType: MemoryType): string {
  const cwd = getConfigHostBindings().getOriginalCwd?.() ?? process.cwd()

  switch (memoryType) {
    case 'User':
      return join(getConfigHomeDir(), 'CLAUDE.md')
    case 'Local':
      return join(cwd, 'CLAUDE.local.md')
    case 'Project':
      return join(cwd, 'CLAUDE.md')
    case 'Managed':
      return join(getManagedFilePath(), 'CLAUDE.md')
    case 'AutoMem':
      const cfgBindings = tryGetConfigHostBindings()
      return cfgBindings.getAutoMemEntrypoint?.() ?? ''
  }
  // TeamMem is only a valid MemoryType when feature('TEAMMEM') is true
  if (feature('TEAMMEM')) {
    return teamMemPaths!.getTeamMemEntrypoint()
  }
  return '' // unreachable in external builds where TeamMem is not in MemoryType
}
