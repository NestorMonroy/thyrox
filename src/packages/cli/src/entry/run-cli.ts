/**
 * `runCli(argv)` — el arranque: resuelve el contexto, detecta el modo, despacha.
 *
 * Adaptación de `ccnmt: packages/cli/src/entry/run-cli.ts`, que hace lo mismo
 * en 76 líneas: instala los manejadores de proceso, preprocesa argv, detecta el
 * modo y delega en `runCliProgram`. La forma —un orquestador delgado que no
 * implementa ningún modo— es la que se porta.
 *
 * Lo que aquí NO se porta, y se declara: sus `profileCheckpoint()`, su
 * `installProcessHandlers()` (que fija `NoDefaultCurrentDirectoryInExePath` de
 * Windows y engancha SIGINT) y su `eagerLoadSettings()`. Los tres sirven a un
 * REPL interactivo con perfilado de arranque que thyrox no tiene todavía; el
 * arranque de settings ya ocurre dentro de cada modo que lo necesita
 * (`entry/settings.ts`). Portarlos sin consumidor sería fabricar superficie.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { projectSlug } from '@thyrox/agent/loop/session'
import { detectMode } from './detect-mode.ts'
import { dispatch } from './mode-dispatch.ts'
import { flag } from './flags.ts'
import type { RuntimeHandles } from '@thyrox/app-host'
import { profileCheckpoint } from '@thyrox/app-host/startup/startupProfiler.js'
import { type PendingHandles } from './preprocess-argv.js'
import { createPendingHandles } from './preprocess-argv.js'
import { preprocessCliArgv } from './preprocess-argv.js'
import { detectRuntimeMode } from './detect-mode.js'
import { eagerLoadSettings } from '@thyrox/app-host/main/startup/settings.js'
import { runCliProgram } from './run-program.js'
import { initializeWarningHandler } from '../utils/warningHandler.js'
import { resetCursor } from './bootstrap-utils.js'

/**
 * El transcript de esta invocación. Se resuelve UNA vez y viaja en el
 * contexto: los modos que lo necesitan lo reciben en vez de derivarlo, para
 * que no haya dos respuestas el día que la regla cambie.
 */
export function transcriptDirFor(argv: string[], cwd: string): string {
  return flag(argv, 'transcript-dir') ?? join(homedir(), '.harness', projectSlug(cwd))
}

export async function runCli(argv: string[]): Promise<number> {
  const cwd = flag(argv, 'cwd') ?? process.cwd()
  return dispatch({
    argv,
    cwd,
    transcriptDir: transcriptDirFor(argv, cwd),
    mode: detectMode(argv),
  })
}

/**
 * Install the shared process-level signal/exit handlers.
 * In print mode, print.ts registers its own SIGINT handler that aborts the
 * in-flight query and calls gracefulShutdown; skip here to avoid preempting
 * it with a synchronous process.exit().
 */
function installProcessHandlers(): void {
  // SECURITY: Prevent Windows from executing commands from current directory
  // This must be set before ANY command execution to prevent PATH hijacking attacks
  // See: https://docs.microsoft.com/en-us/windows/win32/api/processenv/nf-processenv-searchpathw
  process.env.NoDefaultCurrentDirectoryInExePath = '1'

  // Initialize warning handler early to catch warnings
  initializeWarningHandler()

  process.on('exit', () => {
    resetCursor()
  })
  process.on('SIGINT', () => {
    if (process.argv.includes('-p') || process.argv.includes('--print')) {
      return
    }
    process.exit(0)
  })
}
/**
 * Top-level orchestrator for Claude Code CLI startup.
 * Called from `main()` in src/main.tsx after module-load side effects.
 */
export async function runClaudeCode(runtimeHandles: RuntimeHandles): Promise<void> {
  profileCheckpoint('main_function_start')

  installProcessHandlers()
  profileCheckpoint('main_warning_handler_initialized')

  const pendings: PendingHandles = createPendingHandles()
  await preprocessCliArgv(pendings)

  detectRuntimeMode()

  profileCheckpoint('main_client_type_determined')

  // Parse and load settings flags early, before init()
  eagerLoadSettings()

  profileCheckpoint('main_before_run')

  await runCliProgram(runtimeHandles, pendings)
  profileCheckpoint('main_after_run')
}
