/**
 * El despacho: del modo al manejador que lo ejecuta.
 *
 * Adaptación de `ccnmt: packages/cli/src/entry/mode-dispatch.ts`, con la
 * divergencia declarada en `detect-mode.ts`: allí el despacho es una función de
 * 4419 líneas porque su preámbulo de fases (hooks → config → plugins → MCP →
 * modo) es load-bearing y su docstring pide no partirlo. Aquí ese preámbulo no
 * existe —los siete comandos son autocontenidos— así que el despacho es lo que
 * de verdad es: una tabla.
 *
 * Que sea una TABLA y no una cascada de `if` es lo que hace medible su
 * cobertura: el control compara sus claves contra `MODE_KINDS`, y un modo
 * nuevo sin manejador se ve al instante. La cascada que esto reemplaza no
 * tenía forma de decir si cubría todos sus casos.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { checkPremisesCommand } from '../commands/checkPremises.ts'
import { claimsCommand } from '../commands/claims.ts'
import { configOriginCommand } from '../commands/configOrigin.ts'
import { HELP } from '../commands/help.ts'
import { importTasksCommand } from '../commands/importTasks.ts'
import { selectTestsCommand } from '../commands/selectTests.ts'
import { sessionsCommand } from '../commands/sessions.ts'
import { workbenchCommand } from '../commands/workbench.ts'
import { projectSlug } from '@thyrox/agent/loop/session'
import type { RuntimeHandles } from '@thyrox/app-host'
import { runLoop } from './runLoop.ts'
import { detectMode, type Mode, type ModeKind } from './detect-mode.ts'
import { flag } from './flags.ts'
import type { PendingHandles } from './preprocess-argv.ts'
import { EXIT_OK, EXIT_USAGE } from '../exitCodes.ts'

/** Lo que un manejador necesita saber de la invocación. */
export type CliContext = {
  readonly argv: string[]
  readonly cwd: string
  /** Ya resuelto por el arranque: nadie lo vuelve a derivar. */
  readonly transcriptDir: string
  readonly mode: Mode
}

export type Handler = (ctx: CliContext) => number | Promise<number>

export const HANDLERS: Record<ModeKind, Handler> = {
  workbench: ({ argv, cwd }) => workbenchCommand(argv, cwd),
  selectTests: ({ argv, cwd }) => selectTestsCommand(argv, cwd),
  checkPremises: ({ argv, cwd }) => checkPremisesCommand(argv, cwd),
  importTasks: ({ argv, cwd }) => importTasksCommand(argv, cwd),
  claims: ({ argv, cwd }) => claimsCommand(argv, cwd),
  configOrigin: ({ argv, cwd }) => configOriginCommand(argv, cwd),
  sessions: ({ transcriptDir }) => sessionsCommand(transcriptDir),
  // `usage` distingue «pidió ayuda» (0) de «le falta lo obligatorio» (2). El
  // binario que esto reemplaza lo resolvía con `return prompt || chat ? 0 : 2`
  // dentro del mismo bloque; aquí la distinción viaja en el modo, medida.
  help: ({ mode }) => {
    process.stdout.write(HELP)
    return mode.usage ? EXIT_USAGE : EXIT_OK
  },
  loop: ({ argv, cwd, transcriptDir }) => runLoop(argv, cwd, transcriptDir),
}

/** Corre el manejador del modo. */
export function dispatch(ctx: CliContext): number | Promise<number> {
  return HANDLERS[ctx.mode.kind](ctx)
}

/**
 * El contexto del puente `runModeDispatch`: `--cwd` manda sobre el del
 * proceso y el transcript sale de ese cwd, igual que en `runCli`.
 */
export function modeDispatchContext(argv: string[], processCwd: string): CliContext {
  const cwd = flag(argv, 'cwd') ?? processCwd
  const transcriptDir = flag(argv, 'transcript-dir') ?? join(homedir(), '.harness', projectSlug(cwd))
  return { argv, cwd, transcriptDir, mode: detectMode(argv) }
}

/**
 * Puente entre el `.action()` de commander en `run-program.ts` —que ya trae
 * `prompt`/`options` parseados— y esta tabla, que decide el modo leyendo las
 * banderas crudas de `process.argv` (la misma fuente que usa `runCli`).
 *
 * Divergencia declarada: la referencia usa `prompt`/`options` y el resto del
 * contexto (`runtimeHandles`, `pendingConnect`, `pendingSSH`,
 * `pendingAssistantChat`) para construir el `ModeDispatchContext` de sus ~12
 * modos (REPL, headless host, connect, ssh, assistant chat…). Ninguno de los
 * siete comandos autocontenidos de `HANDLERS` los necesita hoy, así que
 * viajan sin usarse — no se inventa un modo que no existe en `MODE_KINDS`
 * para consumirlos.
 */
export async function runModeDispatch(
  _prompt: string | undefined,
  _options: Record<string, unknown>,
  _context: {
    readonly runtimeHandles: RuntimeHandles
    readonly pendingConnect: PendingHandles['pendingConnect']
    readonly pendingSSH: PendingHandles['pendingSSH']
    readonly pendingAssistantChat: PendingHandles['pendingAssistantChat']
  },
): Promise<number> {
  return dispatch(modeDispatchContext(process.argv.slice(2), process.cwd()))
}
