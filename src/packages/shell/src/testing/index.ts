/**
 * Porte fiel de `ccnmt: packages/shell/src/testing/index.ts`.
 *
 * `@thyrox/shell/testing` — V7 §9.11: costuras públicas in-memory para
 * los tests del paquete `shell`. NO debe importar de `../internal/`.
 *
 * Porte COMPLETO: las tres exportaciones de la fuente están presentes
 * (`StubShellExecContext`, `StubSnapshotContext`,
 * `createCompletedShellCommand`).
 *
 * @module
 */
import type {
  ExecResult,
  ShellCommand,
} from '../types.js'
import type { ShellExecContext, SnapshotContext } from '../context.js'

/**
 * Contexto de ejecución mutable mínimo para tests herméticos del shell.
 */
export class StubShellExecContext implements ShellExecContext {
  private cwd = process.cwd()
  private readonly events: Array<{ name: string; data: Record<string, unknown> }> = []

  getCwd(): string {
    return this.cwd
  }

  setCwd(path: string): void {
    this.cwd = path
  }

  getOriginalCwd(): string {
    return process.cwd()
  }

  getSessionId(): string {
    return 'test-session'
  }

  logEvent(name: string, data: Record<string, unknown>): void {
    this.events.push({ name, data })
  }

  logForDebugging(_msg: string): void {}

  getSessionEnvVars(): Iterable<[string, string]> {
    return []
  }

  async getSessionEnvironmentScript(): Promise<string> {
    return ''
  }

  getPlatform(): 'macos' | 'linux' | 'windows' {
    return process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'macos'
        : 'linux'
  }

  async which(_command: string): Promise<string | null> {
    return null
  }

  getTaskOutputDir(): string {
    return '/tmp'
  }

  generateTaskId(prefix: string): string {
    return `${prefix}-1`
  }

  getMaxTaskOutputBytes(): number {
    return 1024 * 1024
  }

  getLoggedEvents(): ReadonlyArray<{ name: string; data: Record<string, unknown> }> {
    return this.events
  }
}

/**
 * Stub de contexto de snapshot para tests de shell snapshot.
 */
export class StubSnapshotContext implements SnapshotContext {
  private cwd = process.cwd()

  logEvent(_name: string, _data: Record<string, unknown>): void {}
  logForDebugging(_msg: string): void {}
  logError(_error: unknown): void {}
  getPlatform(): 'macos' | 'linux' | 'windows' {
    return process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'macos'
        : 'linux'
  }
  getCwd(): string {
    return this.cwd
  }
  getClaudeConfigHomeDir(): string {
    return '/tmp/claude'
  }
  async pathExists(_path: string): Promise<boolean> {
    return false
  }
  getFs(): { unlink(path: string): Promise<void>; readdir(path: string): Promise<string[]> } {
    return {
      unlink: async () => {},
      readdir: async () => [],
    }
  }
  registerCleanup(_fn: () => Promise<void>): void {}
  hasEmbeddedSearchTools(): boolean {
    return false
  }
  embeddedSearchToolsBinaryPath(): string {
    return ''
  }
  ripgrepCommand(): { rgPath: string; rgArgs: string[]; argv0?: string } {
    return { rgPath: 'rg', rgArgs: [] }
  }
  subprocessEnv(): Record<string, string | undefined> {
    return {}
  }
}

/**
 * Stub de comando de shell ya completado, con resultado determinista.
 */
export function createCompletedShellCommand(
  result: ExecResult,
): ShellCommand {
  return {
    background: () => false,
    result: Promise.resolve(result),
    kill: () => {},
    status: 'completed',
    cleanup: () => {},
  }
}
