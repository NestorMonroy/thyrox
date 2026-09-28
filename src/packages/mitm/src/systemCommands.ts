/**
 * La ejecución de comandos del sistema que necesita el MITM: con `sudo` (la
 * contraseña nunca comparte stdin con el comando elevado), sin él cuando no
 * hace falta, y la elevación por UAC en Windows. Ningún valor en tiempo de
 * ejecución se interpreta como shell: cada argumento viaja en su arreglo.
 *
 * Porte de `omniroute: src/mitm/systemCommands.ts` (MIT). `getErrorMessage`
 * es el `errorMessage` de `@thyrox/local-observability`; la bandera sin sudo
 * es `THYROX_MITM_NO_SUDO`, leída con el `isEnvTruthy` canónico; y la prueba
 * de la elevación inyecta su ejecutor en `runElevatedPowerShell` en vez de
 * duplicar la función en una variante sólo para pruebas.
 *
 * Cada proceso hijo recibe `env: process.env` explícito: medido, sin él Bun
 * resuelve el ejecutable y hereda el entorno de ARRANQUE del proceso, no el
 * actual, así que un PATH cambiado en tiempo de ejecución no llega al hijo;
 * Node sí lo hace llegar.
 */
import { execFile, execFileSync, spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { isEnvTruthy } from '@thyrox/config/env/utils'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'

export function isRoot(): boolean {
  try {
    return !!(process.getuid && process.getuid() === 0)
  } catch {
    return false
  }
}

/**
 * ¿Hay `sudo` en el PATH? Una imagen mínima de contenedor no lo trae, y sin
 * él y sin ser root `execFileWithPassword` corre el comando directamente
 * (mismo usuario, sin elevar). En Windows siempre `false`: allí se eleva por
 * UAC. La plataforma se lee al llamar, no en la carga del módulo.
 */
export function isSudoAvailable(): boolean {
  if (os.platform() === 'win32') return false
  try {
    execFileSync('sh', ['-c', 'command -v sudo'], { stdio: 'ignore', env: process.env })
    return true
  } catch {
    return false
  }
}

export function execFileText(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: 'utf8', env: process.env }, (error, stdout, stderr) => {
      if (error) {
        // El mensaje de `execFile` ya dice «Command failed: …» o «spawn … ENOENT»:
        // no se vuelve a prefijar, y sólo se añade stderr si trae algo.
        reject(new Error(errorMessage(error) + (stderr ? `\n${stderr}` : '')))
        return
      }
      resolve(stdout)
    })
  })
}

/** ¿El operador pidió no usar sudo nunca (`THYROX_MITM_NO_SUDO`)? */
export function isNoSudoEnv(): boolean {
  return isEnvTruthy(process.env.THYROX_MITM_NO_SUDO)
}

export interface ResolvedSpawn {
  finalCommand: string
  finalArgs: string[]
  stripSudo: boolean
  needsPassword: boolean
}

type SudoOverrides = { root?: boolean; sudoAvailable?: boolean; noSudo?: boolean }

/**
 * La decisión de quitar `sudo -S`, pura para poder probarla sin lanzar nada:
 * se quita siendo root, sin `sudo` instalado o con `THYROX_MITM_NO_SUDO`, y
 * entonces el comando corre directamente. Sólo se retiran los tokens
 * iniciales de `sudo`; el resto del arreglo se conserva.
 */
export function resolveSudoSpawn(command: string, args: string[], overrides: SudoOverrides = {}): ResolvedSpawn {
  const root = overrides.root ?? isRoot()
  const sudoAvailable = overrides.sudoAvailable ?? isSudoAvailable()
  const noSudo = overrides.noSudo ?? isNoSudoEnv()
  const stripSudo = command === 'sudo' && (root || !sudoAvailable || noSudo)
  const needsPassword = !stripSudo && command === 'sudo'
  let finalCommand = command
  let finalArgs = args
  if (stripSudo) {
    const realCmdIndex = args.findIndex(arg => !arg.startsWith('-'))
    if (realCmdIndex !== -1) {
      finalCommand = args[realCmdIndex]!
      finalArgs = args.slice(realCmdIndex + 1)
    }
  }
  return { finalCommand, finalArgs, stripSudo, needsPassword }
}

/** Un proceso a lanzar: su arreglo y exactamente lo que recibe por stdin. */
export interface SudoStep {
  command: string
  args: string[]
  stdin: string
}

type SpawnLike = typeof spawn

/**
 * Los procesos de un `sudo -S <cmd>`, de modo que la contraseña nunca comparta
 * stdin con el comando elevado. Si sudo no la pide (NOPASSWD, o credencial en
 * caché), no lee stdin, y un único `sudo -S tee -a /etc/hosts` escribiría la
 * contraseña en el archivo de hosts. Por eso la contraseña va sólo a
 * `sudo -S -v` (valida y no corre nada) y el comando corre como `sudo -n` con
 * sus propios datos. Sin sudo que usar, es un único paso sin contraseña.
 */
export function planSudoSteps(
  command: string,
  args: string[],
  password: string,
  stdinAfterPassword = '',
  overrides: SudoOverrides = {},
): { steps: SudoStep[]; fallback: SudoStep | null } {
  const { finalCommand, finalArgs, needsPassword } = resolveSudoSpawn(command, args, overrides)
  if (!needsPassword) {
    return { steps: [{ command: finalCommand, args: finalArgs, stdin: stdinAfterPassword || '' }], fallback: null }
  }
  let firstReal = 0
  while (firstReal < args.length && args[firstReal] === '-S') firstReal++
  const commandArgs = args.slice(firstReal)
  return {
    steps: [
      { command: 'sudo', args: ['-S', '-p', '', '-v'], stdin: `${password}\n` },
      { command: 'sudo', args: ['-n', ...commandArgs], stdin: stdinAfterPassword || '' },
    ],
    // Con `timestamp_timeout=0` la credencial de `-v` no se conserva y
    // `sudo -n` rehúsa. Ahí sudo pregunta seguro: consume él la línea de la
    // contraseña y nada llega al comando.
    fallback: { command: 'sudo', args: ['-S', ...commandArgs], stdin: `${password}\n${stdinAfterPassword}` },
  }
}

type StepResult = { code: number | null; stdout: string; stderr: string; error: Error | null }

function runStep(step: SudoStep, spawnImpl: SpawnLike): Promise<StepResult> {
  return new Promise(resolve => {
    // `spawn` y no `exec`: cada argumento es una entrada del arreglo y ningún
    // metacarácter se expande.
    const child = spawnImpl(step.command, step.args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const settle = (code: number | null, error: Error | null) => {
      if (settled) return
      settled = true
      resolve({ code, stdout, stderr, error })
    }
    child.stdout?.on('data', chunk => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', chunk => {
      stderr += chunk.toString()
    })
    child.on('error', error => settle(null, error))
    child.on('close', code => settle(code, null))
    if (step.stdin) child.stdin?.write(step.stdin)
    child.stdin?.end()
  })
}

const SUDO_PASSWORD_REQUIRED = /a password is required/i

/**
 * Corre `command` con sudo cuando hace falta. Siendo root, sin `sudo`
 * instalado o con `THYROX_MITM_NO_SUDO` corre el comando directamente: basta
 * para todo lo que no escribe `/etc/hosts` ni el almacen de confianza.
 */
export async function execFileWithPassword(
  command: string,
  args: string[],
  password: string,
  stdinAfterPassword = '',
  deps: { spawnImpl?: SpawnLike; sudoOverrides?: SudoOverrides } = {},
): Promise<string> {
  const spawnImpl = deps.spawnImpl ?? spawn
  const { steps, fallback } = planSudoSteps(command, args, password, stdinAfterPassword, deps.sudoOverrides)
  let stdout = ''
  for (let i = 0; i < steps.length; i++) {
    const result = await runStep(steps[i]!, spawnImpl)
    const canFallBack = i === steps.length - 1 && fallback !== null
    if (canFallBack && needsSudoPasswordFallback(result)) {
      return stepOutputOrThrow(await runStep(fallback, spawnImpl))
    }
    stdout = stepOutputOrThrow(result)
  }
  return stdout
}

/** `sudo -n` rehusó porque esta máquina nunca conserva la credencial. */
function needsSudoPasswordFallback(result: StepResult): boolean {
  return !result.error && result.code !== 0 && SUDO_PASSWORD_REQUIRED.test(result.stderr)
}

function stepOutputOrThrow(result: StepResult): string {
  if (result.error) throw new Error(`Command failed: ${errorMessage(result.error)}\n${result.stderr}`)
  if (result.code !== 0) throw new Error(`Command failed with code ${result.code}\n${result.stderr}`)
  return result.stdout
}

export function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function runPowerShell(script: string): Promise<string> {
  return execFileText('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script])
}

/**
 * El guion exterior, sin elevar, que dispara UAC y lanza el PowerShell
 * elevado con `-File <ruta>`. Sin `-EncodedCommand`: esa es la huella que los
 * antivirus reconocen por heurística.
 */
export function buildElevatedScriptWrapper(scriptPath: string): string {
  return `
    $proc = Start-Process powershell -ArgumentList @(
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      ${quotePowerShell(scriptPath)}
    ) -Verb RunAs -Wait -PassThru;
    if ($proc.ExitCode -ne 0) {
      throw "Elevated command exited with code $($proc.ExitCode)"
    }
  `
}

/**
 * Corre `script` elevado por UAC. El guion va a un `.ps1` con permisos sólo
 * del dueño, en un directorio temporal privado y con un nombre aleatorio, y
 * se borra al terminar aunque la elevación se rechace o el guion falle.
 * `runner` recibe el envoltorio y la ruta; por defecto es PowerShell.
 */
export async function runElevatedPowerShell(
  script: string,
  runner: (wrapper: string, scriptPath: string) => Promise<string> = wrapper => runPowerShell(wrapper),
): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-elevate-'))
  const scriptPath = path.join(tempDir, `thyrox-elevate-${crypto.randomUUID()}.ps1`)
  fs.writeFileSync(scriptPath, script, { encoding: 'utf8', mode: 0o600 })
  try {
    return await runner(buildElevatedScriptWrapper(scriptPath), scriptPath)
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Un resto en el temporal es del usuario local y el sistema lo limpia.
    }
  }
}
