/**
 * Puerto de `ccnmt: packages/config/testing/index.ts` (188 líneas fuente).
 * Reimplementación fiel VERBATIM — todos los campos de `ConfigHostBindings`
 * que este archivo consume ya existen en `../contracts.ts` (verificado uno
 * por uno antes de portar: ninguno faltaba).
 *
 * `@thyrox/config/testing` — fake en memoria para el paquete config.
 *
 * InMemoryConfig : provee una implementación de `ConfigHostBindings` que
 *                  opera enteramente en memoria — sin filesystem real, sin
 *                  OAuth, sin servicios externos. Útil en tests unitarios
 *                  que ejercitan código dependiente de config sin un setup
 *                  completo de host.
 *
 * NO debe importar de ../internal/ (regla dura de la fuente).
 */

import type { ConfigHostBindings } from '../contracts.ts'

export type { ConfigHostBindings }

// ---------------------------------------------------------------------------
// InMemoryConfig
// ---------------------------------------------------------------------------

export type InMemoryConfigOptions = {
  /** Ruta simulada del directorio home de config. Default '/test-config-home'. */
  configHomeDir?: string
  /** Raíz de proyecto simulada. Default undefined (sin proyecto). */
  projectRoot?: string
  /** CWD simulado. Default '/test-cwd'. */
  cwd?: string
  /** Si se simula el modo interactivo. Default false. */
  interactive?: boolean
  /** Contenidos de archivo iniciales en memoria, indexados por ruta absoluta. */
  files?: Record<string, string>
}

/**
 * InMemoryConfig — una implementación de `ConfigHostBindings` en memoria.
 *
 * Todas las operaciones respaldadas por filesystem (read, write, stat,
 * mkdir, readdir …) operan sobre un `Map<string, string>` en vez del
 * filesystem real, haciendo a los tests herméticos y rápidos.
 *
 * ```ts
 * const cfg = new InMemoryConfig({ configHomeDir: '/home/test' })
 * installConfigHostBindings(cfg.bindings)
 * // … código de test que llama getGlobalConfig(), saveGlobalConfig() …
 * ```
 */
export class InMemoryConfig {
  private readonly _fs = new Map<string, string>()
  private readonly _dirs = new Set<string>()
  private readonly _opts: Required<InMemoryConfigOptions>

  constructor(options: InMemoryConfigOptions = {}) {
    this._opts = {
      configHomeDir: options.configHomeDir ?? '/test-config-home',
      projectRoot: options.projectRoot ?? (undefined as unknown as string),
      cwd: options.cwd ?? '/test-cwd',
      interactive: options.interactive ?? false,
      files: options.files ?? {},
    }

    // Pre-puebla el fs en memoria con los archivos provistos.
    for (const [path, content] of Object.entries(this._opts.files)) {
      this._fs.set(path, content)
    }
  }

  /** Lee el contenido actual en memoria de un archivo (undefined si falta). */
  readMemoryFile(path: string): string | undefined {
    return this._fs.get(path)
  }

  /** Escribe directamente al filesystem en memoria (para setup de test). */
  writeMemoryFile(path: string, content: string): void {
    this._fs.set(path, content)
  }

  /** El objeto `ConfigHostBindings` a pasar a `installConfigHostBindings()`. */
  readonly bindings: ConfigHostBindings = {
    getConfigHomeDir: () => this._opts.configHomeDir,
    getProjectRoot: () => this._opts.projectRoot,
    getCwd: () => this._opts.cwd,
    getOriginalCwd: () => this._opts.cwd,
    isInteractive: () => this._opts.interactive,

    // Bindings stub — devuelven valores no-op seguros para aislar tests.
    getSessionTrustAccepted: () => true,
    getFlagSettingsPath: () => undefined,
    getFlagSettingsInline: () => null,
    getUseCoworkPlugins: () => false,
    getIsRemoteMode: () => false,
    isBridgeAutoConnectDefault: () => false,
    checkRemoteSettingsEligibility: () => false,

    // Shims de filesystem en memoria.
    readFileSync: (path: string, _encoding: string): string => {
      const content = this._fs.get(path)
      if (content === undefined) {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      }
      return content
    },

    writeFileSyncAndFlush: (path: string, content: string): void => {
      this._fs.set(path, content)
    },

    statSync: (path: string): { mtimeMs: number; size: number } => {
      const content = this._fs.get(path)
      if (content === undefined) {
        const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      }
      return { mtimeMs: 0, size: content.length }
    },

    existsSync: (path: string): boolean => {
      return this._fs.has(path) || this._dirs.has(path)
    },

    mkdirSync: (path: string): void => {
      this._dirs.add(path)
    },

    readFileAsync: async (path: string, _encoding: string): Promise<string> => {
      const content = this._fs.get(path)
      if (content === undefined) {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`) as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      }
      return content
    },

    readdirSync: (path: string): Array<{ name: string; isFile(): boolean; isSymbolicLink(): boolean }> => {
      const prefix = path.endsWith('/') ? path : `${path}/`
      const entries: Array<{ name: string; isFile(): boolean; isSymbolicLink(): boolean }> = []
      for (const key of this._fs.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length)
          if (!rest.includes('/')) {
            entries.push({
              name: rest,
              isFile: () => true,
              isSymbolicLink: () => false,
            })
          }
        }
      }
      return entries
    },

    // Hooks de ciclo de vida no-op — los tests rara vez los necesitan.
    registerCleanup: (_fn) => () => {},
    logEvent: () => {},
    logDebug: () => {},
    logDiagnostics: () => {},
    profileCheckpoint: () => {},
    clearMemoryFileCaches: () => {},
    getGlobalClaudeFile: () => `${this._opts.configHomeDir}/.claude.json`,

    // No-ops asíncronos.
    executeConfigChangeHooks: async () => ({ blocked: false }),
    getMcpErrorsByScope: () => [],
    findCanonicalGitRoot: () => undefined,
    addFileGlobRuleToGitignore: () => {},
    getRepoRemoteHash: async () => null,
    getSettingsSyncAuth: () => null,
    unlock: async () => {},

    // Seguridad de settings managed — siempre aprueba en tests.
    checkManagedSettingsSecurity: async () => 'no_check_needed',
    handleSecurityCheckResult: () => true,

    // Stubs de testing para los puentes de permission/memory.
    parsePermissionRule: (rule: string) => {
      const idx = rule.indexOf('(')
      if (idx === -1) return { toolName: rule }
      return { toolName: rule.substring(0, idx), ruleContent: rule.substring(idx + 1, rule.length - 1) }
    },
    isClaudeSettingsPath: () => false,
    reconcilePermissionContext: (prev: unknown) => prev,
    getAutoMemEntrypoint: () => '/test-config-home/memory/auto.md',
  }
}
