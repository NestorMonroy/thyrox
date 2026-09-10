/**
 * Puerto de `ccnmt: packages/config/contracts.ts` (109 líneas fuente). No es
 * uno de los 15 del alcance — es la dependencia de hoja que `host.ts`
 * necesita (el tipo `ConfigHostBindings`) y que a su vez necesita
 * `remote/index.ts` a través de `getConfigHostBindings()`: cero `import`
 * propios (es puramente estructural), se porta en el sitio en vez de
 * bloquearse.
 *
 * El contrato de "ports-and-adapters" (V7 §7/§8.6 en la fuente) por el que
 * `@thyrox/config` declara qué necesita del resto del sistema sin importar
 * directamente de esas capas — el host (app-host/cli) instala la
 * implementación real vía `installConfigHostBindings()` (`./host.ts`).
 * Ningún método es obligatorio (todos opcionales): un binding no instalado
 * se llama con `?.` y queda como no-op silencioso, por diseño de la fuente.
 */
export type ConfigHostBindings = {
  getConfigHomeDir?: () => string
  getProjectRoot?: () => string | undefined
  logDebug?: (message: string, metadata?: unknown) => void
  // config no puede importar de mcp-runtime (capa de integración). El host
  // conecta este binding a `getMcpConfigsByScope` de mcp-runtime en tiempo
  // de composición, para que allErrors.ts agregue errores de validación MCP
  // sin una dependencia directa entre capas.
  getMcpErrorsByScope?: (scope: string) => Array<{
    file?: string
    path: string
    message: string
    source?: string
  }>
  // config no puede importar de provider/auth (Wave 3). El host lo conecta
  // a la lógica completa de `isRemoteManagedSettingsEligible()` en tiempo
  // de composición. config lo llama y cachea el booleano.
  checkRemoteSettingsEligibility?: () => boolean
  // Bindings de estado de arranque (bootstrap). config los lee pero no es
  // dueño del estado de sesión (eso es app-host).
  getIsRemoteMode?: () => boolean
  // Hook de ciclo de vida para limpieza al salir del proceso.
  registerCleanup?: (fn: () => Promise<void>) => () => void
  // Puente de ejecución de hooks. config no puede importar el runtime de
  // hooks. Devuelve `true` si algún hook bloqueó el cambio.
  executeConfigChangeHooks?: (source: string) => Promise<{ blocked: boolean }>
  // Puente a local-observability para logging de diagnóstico (telemetría MDM).
  logDiagnostics?: (
    level: string,
    event: string,
    data?: Record<string, unknown>,
  ) => void
  // Puente al profiler de arranque (opcional, no-op si no está instalado).
  profileCheckpoint?: (name: string) => void
  // Accesores de estado de arranque. config los lee pero no es dueño del
  // estado de sesión (eso es app-host). Añadidos para global/config.ts +
  // settings/settings.ts, que necesitan CWD, trust, y flag settings.
  getCwd?: () => string
  getOriginalCwd?: () => string
  getSessionTrustAccepted?: () => boolean
  getFlagSettingsPath?: () => string | undefined
  getFlagSettingsInline?: () => Record<string, unknown> | null
  getUseCoworkPlugins?: () => boolean
  // Puente de logging de eventos (config no puede importar eventLogger).
  logEvent?: (event: string, metadata?: Record<string, unknown>) => void
  // Puente de utilidades git (config no puede importar utils de git).
  findCanonicalGitRoot?: (cwd: string) => string | undefined
  addFileGlobRuleToGitignore?: (dir: string, glob: string) => void
  // Ruta del archivo de config global (depende de detección de ruta legacy
  // + OAuth).
  getGlobalClaudeFile?: () => string
  // Puente de auth/provider para sync de settings + remote settings. config
  // no puede importar auth.ts ni providers.ts. El host provee la obtención
  // del token OAuth, el check del provider de API, y el refresh del token.
  getSettingsSyncAuth?: () => {
    isEligible: boolean
    baseApiUrl: string
    getAuthHeaders: () => Promise<Record<string, string>>
    // `force: true` salta la caché en memoria del access token y va directo
    // al IdP por uno fresco. Lo usa el retry-en-401 de remote-settings.
    refreshToken: (opts?: { force?: boolean }) => Promise<void>
    // Obtiene el access token actual (sólo lectura, sin refresh). Se usa
    // para comparar antes/después de un force-refresh y detectar rotación.
    getAccessToken?: () => Promise<string | undefined>
  } | null
  isInteractive?: () => boolean
  // Puente al subsistema de memoria (config no puede importar claudemd).
  clearMemoryFileCaches?: () => void
  // Hash del repo git para el ID de proyecto del sync de settings.
  getRepoRemoteHash?: () => Promise<string | null>
  // Puente de operaciones de fs. config NO DEBE usar `node:fs` crudo porque
  // la capa de fs virtual (getFsImplementation) es load-bearing para el modo
  // sandbox y la inicialización del REPL. El host provee la fachada de fs
  // correcta.
  readFileSync?: (path: string, encoding: string) => string
  writeFileSyncAndFlush?: (
    path: string,
    content: string,
    options?: { encoding?: string; mode?: number },
  ) => void
  statSync?: (path: string) => { mtimeMs: number; size: number }
  existsSync?: (path: string) => boolean
  mkdirSync?: (path: string) => void
  readFileAsync?: (path: string, encoding: string) => Promise<string>
  readdirSync?: (
    path: string,
  ) => Array<{ name: string; isFile(): boolean; isSymbolicLink(): boolean }>
  // Puente de lockfile para escrituras atómicas de config.
  lockSync?: (
    file: string,
    options?: { stale?: number; retries?: unknown },
  ) => () => void
  unlock?: (file: string) => Promise<void>
  // Default de auto-conexión del bridge. Chequeo con feature-gate.
  isBridgeAutoConnectDefault?: () => boolean
  // Puentes de efecto-secundario al cambiar settings. config los dispara al
  // cambiar settings para que las reglas de permiso y los snapshots de
  // hooks se mantengan sincronizados sin que config importe de permission
  // o hooks directamente.
  loadAllPermissionRulesFromDisk?: () => unknown[]
  updateHooksConfigSnapshot?: () => void
  // UI de chequeo de seguridad. El diálogo de React no pertenece a config
  // (hoja de Wave 1). El host provee la implementación que renderiza el
  // diálogo Ink; config sólo le importa el resultado.
  checkManagedSettingsSecurity?: (
    cachedSettings: unknown,
    newSettings: unknown,
  ) => Promise<'approved' | 'rejected' | 'no_check_needed'>
  handleSecurityCheckResult?: (
    result: 'approved' | 'rejected' | 'no_check_needed',
  ) => boolean
  // Puente de parseo de reglas de permiso (config no puede importar
  // permission en Wave 1).
  parsePermissionRule?: (rule: string) => {
    toolName: string
    ruleContent?: string
  }
  // Puente de chequeo de ruta de settings.
  isClaudeSettingsPath?: (filePath: string) => boolean
  // Reconciliación del contexto de permisos tras un cambio de settings.
  // Encapsula syncPermissionRulesFromDisk + filtrado de reglas
  // demasiado-amplias + chequeo de modo bypass + transición de
  // auto-modo-plan.
  reconcilePermissionContext?: (
    prevContext: unknown,
    updatedRules: unknown[],
  ) => unknown
  // Puente de la ruta de entrada automática de memoria.
  getAutoMemEntrypoint?: () => string
}
