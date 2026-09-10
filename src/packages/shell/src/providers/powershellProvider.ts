/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/providers/powershellProvider.ts` —
 * implementación del `ShellProvider` de PowerShell.
 *
 * Porte COMPLETO: los tres símbolos exportados de la fuente están
 * presentes (`buildPowerShellArgs`, `createPowerShellProvider`, y la
 * función interna `encodePowerShellCommand` que ambos consumen).
 *
 * @module
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { join as posixJoin } from 'node:path/posix'
import type { ShellExecContext } from '../context.js'
import type { ShellProvider } from './shellProvider.js'

/**
 * Flags de invocación de PowerShell + comando. Compartido entre
 * `getSpawnArgs` del proveedor y el camino de spawn de hooks, para que el
 * conjunto de flags viva en un solo lugar.
 */
export function buildPowerShellArgs(cmd: string): string[] {
  return ['-NoProfile', '-NonInteractive', '-Command', cmd]
}

/**
 * Codifica en base64 una cadena como UTF-16LE para el `-EncodedCommand`
 * de PowerShell. Misma codificación que usa el parser
 * (`parser.ts:toUtf16LeBase64`). La salida es sólo `[A-Za-z0-9+/=]` —
 * sobrevive a CUALQUIER capa de quoting de shell, incluida la
 * `shellquote.quote()` de `@anthropic-ai/sandbox-runtime`, que si no
 * corrompería `!$?` a `\!$?` al re-envolver una cadena de comillas
 * simples en comillas dobles.
 */
function encodePowerShellCommand(psCommand: string): string {
  return Buffer.from(psCommand, 'utf16le').toString('base64')
}

export function createPowerShellProvider(
  shellPath: string,
  ctx: Pick<ShellExecContext, 'getSessionEnvVars'>,
): ShellProvider {
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
      // Guarda sandboxTmpDir para getEnvironmentOverrides (espeja a bashProvider).
      currentSandboxTmpDir = opts.useSandbox ? opts.sandboxTmpDir : undefined

      // En sandbox, tmpdir() no es escribible — el sandbox sólo permite
      // escrituras en sandboxTmpDir. El archivo de seguimiento de cwd va
      // ahí para que el pwsh interno pueda de verdad escribirlo. Sólo
      // aplica en Linux/macOS/WSL2; en Windows nativo el sandbox nunca se
      // habilita, así que esta rama es código muerto ahí.
      const cwdFilePath =
        opts.useSandbox && opts.sandboxTmpDir
          ? posixJoin(opts.sandboxTmpDir, `claude-pwd-ps-${opts.id}`)
          : join(tmpdir(), `claude-pwd-ps-${opts.id}`)
      const escapedCwdFilePath = cwdFilePath.replace(/'/g, "''")
      // Captura del código de salida: se prefiere $LASTEXITCODE cuando
      // corrió un ejecutable nativo. En PS 5.1, un comando nativo que
      // escribe a stderr mientras el stream está redirigido por PS (p. ej.
      // `git push 2>&1`) fija $? = $false aunque el ejecutable haya
      // devuelto exit 0 — así que `if (!$?)` reporta un falso positivo.
      // $LASTEXITCODE es $null sólo si ningún ejecutable nativo corrió en
      // la sesión; en ese caso se cae a $? para pipelines de sólo
      // cmdlets.
      const cwdTracking = `\n; $_ec = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } elseif ($?) { 0 } else { 1 }\n; (Get-Location).Path | Out-File -FilePath '${escapedCwdFilePath}' -Encoding utf8 -NoNewline\n; exit $_ec`
      const psCommand = command + cwdTracking

      // El sandbox envuelve la commandString devuelta como
      // `<binShell> -c '<cmd>'` — `-c` fijo, sin forma de inyectar
      // -NoProfile -NonInteractive. Así que para el camino de sandbox se
      // construye un comando que él mismo invoca a pwsh con el conjunto
      // completo de flags. El camino sin sandbox devuelve el comando PS
      // desnudo; `getSpawnArgs()` añade los flags vía
      // `buildPowerShellArgs()`.
      //
      // `-EncodedCommand` (base64 UTF-16LE), no `-Command`: el runtime del
      // sandbox aplica su PROPIO `shellquote.quote()` encima de lo que se
      // construya aquí. Cualquier cadena con `'` dispara el modo de
      // comillas dobles, que escapa `!` como `\!` — POSIX sh lo preserva
      // literal, error de parseo en pwsh. Base64 es sólo
      // `[A-Za-z0-9+/=]` — ningún carácter que una capa de quoting pueda
      // corromper.
      //
      // shellPath va entre comillas simples POSIX para que una ruta de
      // instalación con espacios sobreviva al word-split del `/bin/sh -c`
      // interno. Los flags y el base64 son sólo `[A-Za-z0-9+/=-]` — no
      // hace falta quoting.
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
      // Aplica las variables de entorno de sesión fijadas vía `/env`
      // (sólo subprocesos, no el REPL). Sin esto, `/env PATH=...` afecta
      // a los comandos del tool de Bash pero no a PowerShell.
      // Orden: las variables de sesión van PRIMERO para que el TMPDIR de
      // sandbox de abajo no pueda ser sobreescrito por `/env TMPDIR=...`.
      // `bashProvider.ts` las tiene en el orden opuesto (preexistente),
      // pero el aislamiento del sandbox debe ganar.
      for (const [key, value] of ctx.getSessionEnvVars()) {
        env[key] = value
      }
      if (currentSandboxTmpDir) {
        // PowerShell en Linux/macOS respeta TMPDIR para
        // [System.IO.Path]::GetTempPath()
        env.TMPDIR = currentSandboxTmpDir
        env.CLAUDE_CODE_TMPDIR = currentSandboxTmpDir
      }
      return env
    },
  }
}
