/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/legacy/powershellProvider.ts`.
 *
 * Versión pre-DI de `../providers/powershellProvider.ts` (mismo
 * hermano): en vez de recibir `getSessionEnvVars` por inyección de
 * contexto (`ctx.getSessionEnvVars()`), importa `getSessionEnvVars`
 * directamente de `@thyrox/storage/sessionEnvVars.js` — que SÍ existe y
 * resuelve en este árbol.
 *
 * Porte COMPLETO: los tres símbolos exportados de la fuente están
 * presentes (`buildPowerShellArgs`, `createPowerShellProvider`, y la
 * función interna `encodePowerShellCommand`).
 *
 * @module
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { join as posixJoin } from 'node:path/posix'
import { getSessionEnvVars } from '@thyrox/storage/sessionEnvVars.js'
import type { ShellProvider } from './shellProvider.js'

export function buildPowerShellArgs(cmd: string): string[] {
  return ['-NoProfile', '-NonInteractive', '-Command', cmd]
}

function encodePowerShellCommand(psCommand: string): string {
  return Buffer.from(psCommand, 'utf16le').toString('base64')
}

export function createPowerShellProvider(shellPath: string): ShellProvider {
  let currentSandboxTmpDir: string | undefined

  return {
    type: 'powershell' as ShellProvider['type'],
    shellPath,
    detached: false,

    async buildExecCommand(
      command: string,
      opts: {
        id: number | string
        sandboxTmpDir?: string
        useSandbox: boolean
      },
    ): Promise<{ commandString: string; cwdFilePath: string }> {
      currentSandboxTmpDir = opts.useSandbox ? opts.sandboxTmpDir : undefined

      const cwdFilePath =
        opts.useSandbox && opts.sandboxTmpDir
          ? posixJoin(opts.sandboxTmpDir, `claude-pwd-ps-${opts.id}`)
          : join(tmpdir(), `claude-pwd-ps-${opts.id}`)
      const escapedCwdFilePath = cwdFilePath.replace(/'/g, "''")
      const cwdTracking = `\n; $_ec = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } elseif ($?) { 0 } else { 1 }\n; (Get-Location).Path | Out-File -FilePath '${escapedCwdFilePath}' -Encoding utf8 -NoNewline\n; exit $_ec`
      const psCommand = command + cwdTracking

      const commandString = opts.useSandbox
        ? [
            `'${shellPath.replace(/'/g, `'\\''`)}'`,
            '-NoProfile',
            '-NonInteractive',
            '-EncodedCommand',
            encodePowerShellCommand(psCommand),
          ].join(' ')
        : psCommand

      return { commandString, cwdFilePath }
    },

    getSpawnArgs(commandString: string): string[] {
      return buildPowerShellArgs(commandString)
    },

    async getEnvironmentOverrides(): Promise<Record<string, string>> {
      const env: Record<string, string> = {}
      for (const [key, value] of getSessionEnvVars()) {
        env[key] = value
      }
      if (currentSandboxTmpDir) {
        env.TMPDIR = currentSandboxTmpDir
        env.CLAUDE_CODE_TMPDIR = currentSandboxTmpDir
      }
      return env
    },
  }
}
