/**
 * Puerto de `ccnmt: packages/config/env/paths.ts` (348 líneas fuente).
 * Reimplementación fiel VERBATIM, salvo la resolución de las cinco
 * dependencias cruzadas, declarada abajo.
 *
 * `lodash-es` resuelve en este árbol (dependencia real, verificado) — se
 * importa estático. Las cinco dependencias cruzadas restantes se piden vía
 * `require()` diferido (`internal/pendingCrossPackageDeps.ts`), porque este
 * paquete no declara (ni debe declarar) `@thyrox/provider`, `@thyrox/shell`
 * ni `@thyrox/storage` como dependencias, y hoy no hay symlink de
 * workspace que las resuelva de forma estática:
 *
 *   - `isRunningWithBun` — `./bundledMode.ts`, HERMANO del mismo paquete
 *     (portado en este mismo pase): se importa relativo, sin envoltorio.
 *   - `fileSuffixForOauthConfig` — `@thyrox/provider/oauthConstants.js`
 *     (existe, verificado) → `requireProviderOauthConstants` (nuevo).
 *   - `findExecutable` — `@thyrox/shell/findExecutable.js` (existe) →
 *     `requireShellFindExecutable` (nuevo).
 *   - `which` — `@thyrox/shell/which.js` (existe) → `requireShellWhich`
 *     (nuevo).
 *   - `getFsImplementation` — `@thyrox/storage/fsOperations.js` (existe) →
 *     `requireStorageFsOperations` (ya existente).
 */
import memoize from 'lodash-es/memoize.js'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { isRunningWithBun } from '../bundledMode.ts'
import {
  requireProviderOauthConstants,
  requireShellFindExecutable,
  requireShellWhich,
  requireStorageFsOperations,
} from '../internal/pendingCrossPackageDeps.ts'
import { getClaudeConfigHomeDir, isEnvTruthy } from './utils.ts'

type Platform = 'win32' | 'darwin' | 'linux'

// Rutas de config y de datos.
export const getGlobalClaudeFile = memoize((): string => {
  // Fallback legado por compatibilidad hacia atrás.
  if (
    requireStorageFsOperations().getFsImplementation().existsSync(
      join(getClaudeConfigHomeDir(), '.config.json'),
    )
  ) {
    return join(getClaudeConfigHomeDir(), '.config.json')
  }

  const filename = `.claude${requireProviderOauthConstants().fileSuffixForOauthConfig()}.json`
  return join(process.env.CLAUDE_CONFIG_DIR || homedir(), filename)
})

const hasInternetAccess = memoize(async (): Promise<boolean> => {
  try {
    const { default: axiosClient } = await import('axios')
    await axiosClient.head('http://1.1.1.1', {
      signal: AbortSignal.timeout(1000),
    })
    return true
  } catch {
    return false
  }
})

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    // `which` no ejecuta el archivo.
    return !!(await requireShellWhich().which(command))
  } catch {
    return false
  }
}

const detectPackageManagers = memoize(async (): Promise<string[]> => {
  const packageManagers = []

  if (await isCommandAvailable('npm')) packageManagers.push('npm')
  if (await isCommandAvailable('yarn')) packageManagers.push('yarn')
  if (await isCommandAvailable('pnpm')) packageManagers.push('pnpm')

  return packageManagers
})

const detectRuntimes = memoize(async (): Promise<string[]> => {
  const runtimes = []

  if (await isCommandAvailable('bun')) runtimes.push('bun')
  if (await isCommandAvailable('deno')) runtimes.push('deno')
  if (await isCommandAvailable('node')) runtimes.push('node')

  return runtimes
})

/**
 * Comprueba si se está corriendo en un entorno WSL.
 * @returns verdadero si se ejecuta en WSL, falso si no.
 */
const isWslEnvironment = memoize((): boolean => {
  try {
    // Comprueba el archivo WSLInterop, un indicador confiable de WSL.
    return requireStorageFsOperations().getFsImplementation().existsSync(
      '/proc/sys/fs/binfmt_misc/WSLInterop',
    )
  } catch (_error) {
    // Si hay un error al comprobar, asume que no es WSL.
    return false
  }
})

/**
 * Comprueba si el ejecutable npm está ubicado en el filesystem de Windows
 * dentro de WSL.
 * @returns verdadero si npm viene de Windows (empieza con /mnt/c/), falso si no.
 */
const isNpmFromWindowsPath = memoize((): boolean => {
  try {
    // Sólo relevante en entorno WSL.
    if (!isWslEnvironment()) {
      return false
    }

    // Encuentra la ruta real del ejecutable npm.
    const { cmd } = requireShellFindExecutable().findExecutable('npm', [])

    // Si npm está en ruta de Windows, empezará con /mnt/c/.
    return cmd.startsWith('/mnt/c/')
  } catch (_error) {
    // Si hay un error, asume que no viene de Windows.
    return false
  }
})

/**
 * Comprueba si se está corriendo vía Conductor.
 * @returns verdadero si se ejecuta vía Conductor, falso si no.
 */
function isConductor(): boolean {
  return process.env.__CFBundleIdentifier === 'com.conductor.app'
}

export const JETBRAINS_IDES = [
  'pycharm',
  'intellij',
  'webstorm',
  'phpstorm',
  'rubymine',
  'clion',
  'goland',
  'rider',
  'datagrip',
  'appcode',
  'dataspell',
  'aqua',
  'gateway',
  'fleet',
  'jetbrains',
  'androidstudio',
]

// Detecta el tipo de terminal con fallbacks para todas las plataformas.
function detectTerminal(): string | null {
  if (process.env.CURSOR_TRACE_ID) return 'cursor'
  // Cursor y Windsurf bajo WSL tienen TERM_PROGRAM=vscode.
  if (process.env.VSCODE_GIT_ASKPASS_MAIN?.includes('cursor')) {
    return 'cursor'
  }
  if (process.env.VSCODE_GIT_ASKPASS_MAIN?.includes('windsurf')) {
    return 'windsurf'
  }
  if (process.env.VSCODE_GIT_ASKPASS_MAIN?.includes('antigravity')) {
    return 'antigravity'
  }
  const bundleId = process.env.__CFBundleIdentifier?.toLowerCase()
  if (bundleId?.includes('vscodium')) return 'codium'
  if (bundleId?.includes('windsurf')) return 'windsurf'
  if (bundleId?.includes('com.google.android.studio')) return 'androidstudio'
  // Comprueba IDEs JetBrains en el bundle ID.
  if (bundleId) {
    for (const ide of JETBRAINS_IDES) {
      if (bundleId.includes(ide)) return ide
    }
  }

  if (process.env.VisualStudioVersion) {
    // Esto es Visual Studio de escritorio, no VS Code.
    return 'visualstudio'
  }

  // Comprueba terminal JetBrains en Linux/Windows.
  if (process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') {
    // Para macOS, la detección de bundle ID de arriba ya cubre IDEs JetBrains.
    if (process.platform === 'darwin') return 'pycharm'

    // Para detección fina en Linux/Windows usar
    // envDynamic.getTerminalWithJetBrainsDetection().
    return 'pycharm'
  }

  // Comprueba terminales específicos por TERM antes que TERM_PROGRAM.
  // Esto maneja casos donde TERM y TERM_PROGRAM podrían ser inconsistentes.
  if (process.env.TERM === 'xterm-ghostty') {
    return 'ghostty'
  }
  if (process.env.TERM?.includes('kitty')) {
    return 'kitty'
  }

  if (process.env.TERM_PROGRAM) {
    return process.env.TERM_PROGRAM
  }

  if (process.env.TMUX) return 'tmux'
  if (process.env.STY) return 'screen'

  // Comprueba variables de entorno específicas de terminal (comunes en Linux).
  if (process.env.KONSOLE_VERSION) return 'konsole'
  if (process.env.GNOME_TERMINAL_SERVICE) return 'gnome-terminal'
  if (process.env.XTERM_VERSION) return 'xterm'
  if (process.env.VTE_VERSION) return 'vte-based'
  if (process.env.TERMINATOR_UUID) return 'terminator'
  if (process.env.KITTY_WINDOW_ID) {
    return 'kitty'
  }
  if (process.env.ALACRITTY_LOG) return 'alacritty'
  if (process.env.TILIX_ID) return 'tilix'

  // Detección específica de Windows.
  if (process.env.WT_SESSION) return 'windows-terminal'
  if (process.env.SESSIONNAME && process.env.TERM === 'cygwin') return 'cygwin'
  if (process.env.MSYSTEM) return process.env.MSYSTEM.toLowerCase() // MINGW64, MSYS2, etc.
  if (
    process.env.ConEmuANSI ||
    process.env.ConEmuPID ||
    process.env.ConEmuTask
  ) {
    return 'conemu'
  }

  // Detección de WSL.
  if (process.env.WSL_DISTRO_NAME) return `wsl-${process.env.WSL_DISTRO_NAME}`

  // Detección de sesión SSH.
  if (isSSHSession()) {
    return 'ssh-session'
  }

  // Cae a TERM, que es más universalmente disponible.
  // Caso especial para identificadores comunes de terminal en TERM.
  if (process.env.TERM) {
    const term = process.env.TERM
    if (term.includes('alacritty')) return 'alacritty'
    if (term.includes('rxvt')) return 'rxvt'
    if (term.includes('termite')) return 'termite'
    return process.env.TERM
  }

  // Detecta entorno no interactivo.
  if (!process.stdout.isTTY) return 'non-interactive'

  return null
}

/**
 * Detecta el entorno/plataforma de despliegue según las variables de
 * entorno.
 * @returns el nombre de la plataforma de despliegue, o 'unknown' si no se detecta.
 */
export const detectDeploymentEnvironment = memoize((): string => {
  // Entornos de desarrollo cloud.
  if (isEnvTruthy(process.env.CODESPACES)) return 'codespaces'
  if (process.env.GITPOD_WORKSPACE_ID) return 'gitpod'
  if (process.env.REPL_ID || process.env.REPL_SLUG) return 'replit'
  if (process.env.PROJECT_DOMAIN) return 'glitch'

  // Plataformas cloud.
  if (isEnvTruthy(process.env.VERCEL)) return 'vercel'
  if (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_SERVICE_NAME
  ) {
    return 'railway'
  }
  if (isEnvTruthy(process.env.RENDER)) return 'render'
  if (isEnvTruthy(process.env.NETLIFY)) return 'netlify'
  if (process.env.DYNO) return 'heroku'
  if (process.env.FLY_APP_NAME || process.env.FLY_MACHINE_ID) return 'fly.io'
  if (isEnvTruthy(process.env.CF_PAGES)) return 'cloudflare-pages'
  if (process.env.DENO_DEPLOYMENT_ID) return 'deno-deploy'
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda'
  if (process.env.AWS_EXECUTION_ENV === 'AWS_ECS_FARGATE') return 'aws-fargate'
  if (process.env.AWS_EXECUTION_ENV === 'AWS_ECS_EC2') return 'aws-ecs'
  // Comprueba EC2 vía el UUID de hypervisor.
  try {
    const uuid = requireStorageFsOperations().getFsImplementation()
      .readFileSync('/sys/hypervisor/uuid', { encoding: 'utf8' })
      .trim()
      .toLowerCase()
    if (uuid.startsWith('ec2')) return 'aws-ec2'
  } catch {
    // Ignora errores leyendo el UUID de hypervisor (ENOENT en no-EC2, etc.).
  }
  if (process.env.K_SERVICE) return 'gcp-cloud-run'
  if (process.env.GOOGLE_CLOUD_PROJECT) return 'gcp'
  if (process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_SKU)
    return 'azure-app-service'
  if (process.env.AZURE_FUNCTIONS_ENVIRONMENT) return 'azure-functions'
  if (process.env.APP_URL?.includes('ondigitalocean.app')) {
    return 'digitalocean-app-platform'
  }
  if (process.env.SPACE_CREATOR_USER_ID) return 'huggingface-spaces'

  // Plataformas CI/CD.
  if (isEnvTruthy(process.env.GITHUB_ACTIONS)) return 'github-actions'
  if (isEnvTruthy(process.env.GITLAB_CI)) return 'gitlab-ci'
  if (process.env.CIRCLECI) return 'circleci'
  if (process.env.BUILDKITE) return 'buildkite'
  if (isEnvTruthy(process.env.CI)) return 'ci'

  // Orquestación de contenedores.
  if (process.env.KUBERNETES_SERVICE_HOST) return 'kubernetes'
  try {
    if (requireStorageFsOperations().getFsImplementation().existsSync('/.dockerenv')) return 'docker'
  } catch {
    // Ignora errores comprobando Docker.
  }

  // Fallback específico de plataforma para entornos no detectados.
  if (env.platform === 'darwin') return 'unknown-darwin'
  if (env.platform === 'linux') return 'unknown-linux'
  if (env.platform === 'win32') return 'unknown-win32'

  return 'unknown'
})

// todas estas deberían ser inmutables.
function isSSHSession(): boolean {
  return !!(
    process.env.SSH_CONNECTION ||
    process.env.SSH_CLIENT ||
    process.env.SSH_TTY
  )
}

export const env = {
  hasInternetAccess,
  isCI: isEnvTruthy(process.env.CI),
  platform: (['win32', 'darwin'].includes(process.platform)
    ? process.platform
    : 'linux') as Platform,
  arch: process.arch,
  nodeVersion: process.version,
  terminal: detectTerminal(),
  isSSH: isSSHSession,
  getPackageManagers: detectPackageManagers,
  getRuntimes: detectRuntimes,
  isRunningWithBun: memoize(isRunningWithBun),
  isWslEnvironment,
  isNpmFromWindowsPath,
  isConductor,
  detectDeploymentEnvironment,
}

/**
 * Devuelve la plataforma del host para reporte de analytics.
 * Si `CLAUDE_CODE_HOST_PLATFORM` está fijada a un valor de plataforma
 * válido, ese override tiene precedencia sobre la plataforma detectada.
 * Útil en entornos de contenedor/remoto donde `process.platform` reporta
 * el SO del contenedor pero la plataforma real del host difiere.
 */
export function getHostPlatformForAnalytics(): Platform {
  const override = process.env.CLAUDE_CODE_HOST_PLATFORM
  if (override === 'win32' || override === 'darwin' || override === 'linux') {
    return override
  }
  return env.platform
}
