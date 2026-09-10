/**
 * Porte fiel de `ccnmt: packages/shell/src/context.ts` — los dos
 * contratos de inyección de dependencias que desacoplan este paquete del
 * resto del harness: `ShellExecContext` (lo que un proveedor de shell
 * necesita del entorno para ejecutar un comando) y `SnapshotContext` (lo
 * que `ShellSnapshot` necesita para construir su snapshot de bash).
 *
 * Es el mismo patrón de sustrato que ya declara
 * `internal/pendingCrossPackageDeps.ts` en `@thyrox/ide`: en vez de
 * importar directamente paquetes hermanos (`config/settings`,
 * `storage/sessionEnvVars`, `tool-registry/...`), el consumidor recibe un
 * objeto que cumple esta interfaz y lo inyecta en tiempo de ejecución.
 *
 * Porte COMPLETO: las dos interfaces de la fuente están presentes, con
 * todos sus miembros — incluidos los opcionales.
 *
 * @module
 */

export interface ShellExecContext {
  getCwd(): string
  setCwd(path: string): void
  getOriginalCwd(): string

  getSessionId(): string

  logEvent(name: string, data: Record<string, unknown>): void
  logForDebugging(msg: string): void

  getSessionEnvVars(): Iterable<[string, string]>
  getSessionEnvironmentScript(): Promise<string>

  wrapWithSandbox?(
    cmd: string,
    shell: string,
    tmpDir: string | undefined,
    signal: AbortSignal,
  ): Promise<string>
  cleanupAfterSandbox?(): void

  onCwdChanged?(oldCwd: string, newCwd: string): Promise<void>

  getTmuxEnv?(command: string): Promise<string | null>
  ensureTmuxSocket?(): Promise<void>
  hasTmuxToolBeenUsed?(): boolean

  registerUpstreamProxyEnvFn?(fn: () => Record<string, string>): void
  getUpstreamProxyEnv?(): Record<string, string>

  getPlatform(): 'macos' | 'linux' | 'windows'
  which(command: string): Promise<string | null>

  invalidateSessionEnvCache?(): void

  getTaskOutputDir(): string
  generateTaskId(prefix: string): string
  getMaxTaskOutputBytes(): number

  getSandboxTmpDirName?(): string
}

/**
 * Lo que `ShellSnapshot` necesita del entorno: logging, plataforma,
 * cwd, acceso al directorio de configuración, existencia/borrado de
 * archivos, registro de limpieza, y la resolución del binario de
 * ripgrep embebido.
 */
export interface SnapshotContext {
  logEvent(name: string, data: Record<string, unknown>): void
  logForDebugging(msg: string): void
  logError(error: unknown): void

  getPlatform(): 'macos' | 'linux' | 'windows'

  // ─── CWD ──────────────────────────────────────────────────────
  getCwd(): string

  getClaudeConfigHomeDir(): string

  pathExists(path: string): Promise<boolean>
  getFs(): {
    unlink(path: string): Promise<void>
    readdir(path: string): Promise<string[]>
  }

  registerCleanup(fn: () => Promise<void>): void

  hasEmbeddedSearchTools(): boolean
  embeddedSearchToolsBinaryPath(): string

  // ─── Ripgrep ─────────────────────────────────────────────────
  ripgrepCommand(): {
    rgPath: string
    rgArgs: string[]
    argv0?: string
  }

  subprocessEnv(): Record<string, string | undefined>
}
