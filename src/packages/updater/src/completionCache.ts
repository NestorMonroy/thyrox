/**
 * Puerto de `ccnmt: packages/updater/src/completionCache.ts` (166
 * líneas fuente).
 *
 * Cobertura: 2 de 2 símbolos exportados (`setupShellCompletion`,
 * `regenerateCompletionCache`), 100% de su lógica de detección de shell,
 * escritura de rc file y regeneración de cache.
 *
 * Divergencia declarada, en el formateo de los mensajes de salida:
 * `@anthropic/ink` (theming: `color`, `supportsHyperlinks`, `ThemeName`)
 * NO existe en este árbol — medido, 0 hits de `@anthropic/ink` en los 24
 * `package.json` de `src/packages`. Se reimplementan localmente los TRES
 * símbolos que este módulo consume de ese paquete:
 *
 *   - `ThemeName` — alias local mínimo (`'light' | 'dark'`); el sistema
 *     completo de temas (`Theme`, `colorize`, ANSI-256) no se porta aquí
 *     — pertenece a `@anthropic/ink`, un paquete que no está entre las
 *     rutas de este agente.
 *   - `color(key, theme)` — sustituto local que solo resuelve las DOS
 *     claves que este módulo usa (`warning` → amarillo, `success` →
 *     verde) con `chalk` (dependencia ya presente en el árbol — ver
 *     `local-observability/package.json`, `provider/package.json`).
 *     Ignora `theme` (paleta única). El lookup de tema completo de la
 *     fuente NO se porta.
 *   - `supportsHyperlinks()` — heurística local simplificada
 *     (TTY + `TERM_PROGRAM`/`TERM`), sin la librería `supports-hyperlinks`
 *     (ausente del árbol — 0 hits). Mismo criterio de fallback que la
 *     fuente (`ccnmt: packages/@ant/ink/src/core/supports-hyperlinks.ts`)
 *     para las terminales adicionales, sin la detección primaria de la
 *     librería.
 */

import chalk from 'chalk'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { pathToFileURL } from 'url'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { execFileNoThrow } from '@thyrox/shell/execFileNoThrow.js'
import { logError } from '@thyrox/local-observability/logging'

/** Ver docstring del módulo — sustituto local de `ThemeName` de `@anthropic/ink`. */
export type ThemeName = 'light' | 'dark'

const ADDITIONAL_HYPERLINK_TERMINALS = [
  'ghostty',
  'Hyper',
  'kitty',
  'alacritty',
  'iTerm.app',
  'iTerm2',
]

/** Ver docstring del módulo — sustituto local de `supportsHyperlinks()`. */
function supportsHyperlinks(): boolean {
  if (!process.stdout.isTTY) {
    return false
  }
  const termProgram = process.env['TERM_PROGRAM']
  if (termProgram && ADDITIONAL_HYPERLINK_TERMINALS.includes(termProgram)) {
    return true
  }
  const lcTerminal = process.env['LC_TERMINAL']
  if (lcTerminal && ADDITIONAL_HYPERLINK_TERMINALS.includes(lcTerminal)) {
    return true
  }
  const term = process.env['TERM']
  if (term?.includes('kitty')) {
    return true
  }
  return false
}

/** Ver docstring del módulo — sustituto local de `color()` de `@anthropic/ink`. */
function color(
  key: 'warning' | 'success',
  _theme: ThemeName,
): (text: string) => string {
  return key === 'warning' ? chalk.yellow : chalk.green
}

const EOL = '\n'

type ShellInfo = {
  name: string
  rcFile: string
  cacheFile: string
  completionLine: string
  shellFlag: string
}

function detectShell(): ShellInfo | null {
  const shell = process.env.SHELL || ''
  const home = homedir()
  const claudeDir = join(home, '.claude')

  if (shell.endsWith('/zsh') || shell.endsWith('/zsh.exe')) {
    const cacheFile = join(claudeDir, 'completion.zsh')
    return {
      name: 'zsh',
      rcFile: join(home, '.zshrc'),
      cacheFile,
      completionLine: `[[ -f "${cacheFile}" ]] && source "${cacheFile}"`,
      shellFlag: 'zsh',
    }
  }
  if (shell.endsWith('/bash') || shell.endsWith('/bash.exe')) {
    const cacheFile = join(claudeDir, 'completion.bash')
    return {
      name: 'bash',
      rcFile: join(home, '.bashrc'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'bash',
    }
  }
  if (shell.endsWith('/fish') || shell.endsWith('/fish.exe')) {
    const xdg = process.env.XDG_CONFIG_HOME || join(home, '.config')
    const cacheFile = join(claudeDir, 'completion.fish')
    return {
      name: 'fish',
      rcFile: join(xdg, 'fish', 'config.fish'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'fish',
    }
  }
  return null
}

function formatPathLink(filePath: string): string {
  if (!supportsHyperlinks()) {
    return filePath
  }
  const fileUrl = pathToFileURL(filePath).href
  return `\x1b]8;;${fileUrl}\x07${filePath}\x1b]8;;\x07`
}

/**
 * Genera y cachea el script de completado, y luego agrega una linea de
 * source al rc file del shell. Devuelve un mensaje de estado para el
 * usuario.
 */
export async function setupShellCompletion(theme: ThemeName): Promise<string> {
  const shell = detectShell()
  if (!shell) {
    return ''
  }

  // Asegura que el directorio de cache exista
  try {
    await mkdir(dirname(shell.cacheFile), { recursive: true })
  } catch (e: unknown) {
    logError(e)
    return `${EOL}${color('warning', theme)(`Could not write ${shell.name} completion cache`)}${EOL}${chalk.dim(`Run manually: claude completion ${shell.shellFlag} > ${shell.cacheFile}`)}${EOL}`
  }

  // Genera el script de completado escribiendo directo al archivo de
  // cache. Usar --output evita pasar por stdout donde process.exit()
  // puede truncar la salida antes de que el buffer del pipe drene.
  const claudeBin = process.argv[1] || 'claude'
  const result = await execFileNoThrow(claudeBin, [
    'completion',
    shell.shellFlag,
    '--output',
    shell.cacheFile,
  ])
  if (result.code !== 0) {
    return `${EOL}${color('warning', theme)(`Could not generate ${shell.name} shell completions`)}${EOL}${chalk.dim(`Run manually: claude completion ${shell.shellFlag} > ${shell.cacheFile}`)}${EOL}`
  }

  // Chequea si el rc file ya sourcea los completados
  let existing = ''
  try {
    existing = await readFile(shell.rcFile, { encoding: 'utf-8' })
    if (
      existing.includes('claude completion') ||
      existing.includes(shell.cacheFile)
    ) {
      return `${EOL}${color('success', theme)(`Shell completions updated for ${shell.name}`)}${EOL}${chalk.dim(`See ${formatPathLink(shell.rcFile)}`)}${EOL}`
    }
  } catch (e: unknown) {
    if (!isENOENT(e)) {
      logError(e)
      return `${EOL}${color('warning', theme)(`Could not install ${shell.name} shell completions`)}${EOL}${chalk.dim(`Add this to ${formatPathLink(shell.rcFile)}:`)}${EOL}${chalk.dim(shell.completionLine)}${EOL}`
    }
  }

  // Agrega la linea de source al rc file
  try {
    const configDir = dirname(shell.rcFile)
    await mkdir(configDir, { recursive: true })

    const separator = existing && !existing.endsWith('\n') ? '\n' : ''
    const content = `${existing}${separator}\n# Claude Code shell completions\n${shell.completionLine}\n`
    await writeFile(shell.rcFile, content, { encoding: 'utf-8' })

    return `${EOL}${color('success', theme)(`Installed ${shell.name} shell completions`)}${EOL}${chalk.dim(`Added to ${formatPathLink(shell.rcFile)}`)}${EOL}${chalk.dim(`Run: source ${shell.rcFile}`)}${EOL}`
  } catch (error) {
    logError(error)
    return `${EOL}${color('warning', theme)(`Could not install ${shell.name} shell completions`)}${EOL}${chalk.dim(`Add this to ${formatPathLink(shell.rcFile)}:`)}${EOL}${chalk.dim(shell.completionLine)}${EOL}`
  }
}

/**
 * Regenera los scripts de cache de completado en ~/.claude/. Se llama
 * despues de `claude update` para que los completados sigan
 * sincronizados con el nuevo binario.
 */
export async function regenerateCompletionCache(): Promise<void> {
  const shell = detectShell()
  if (!shell) {
    return
  }

  logForDebugging(`update: Regenerating ${shell.name} completion cache`)

  const claudeBin = process.argv[1] || 'claude'
  const result = await execFileNoThrow(claudeBin, [
    'completion',
    shell.shellFlag,
    '--output',
    shell.cacheFile,
  ])

  if (result.code !== 0) {
    logForDebugging(
      `update: Failed to regenerate ${shell.name} completion cache`,
    )
    return
  }

  logForDebugging(
    `update: Regenerated ${shell.name} completion cache at ${shell.cacheFile}`,
  )
}
