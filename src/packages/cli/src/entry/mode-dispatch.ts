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
import { checkPremisesCommand } from '../commands/checkPremises.ts'
import { claimsCommand } from '../commands/claims.ts'
import { configOriginCommand } from '../commands/configOrigin.ts'
import { HELP } from '../commands/help.ts'
import { importTasksCommand } from '../commands/importTasks.ts'
import { selectTestsCommand } from '../commands/selectTests.ts'
import { sessionsCommand } from '../commands/sessions.ts'
import { workbenchCommand } from '../commands/workbench.ts'
import { runLoop } from './runLoop.ts'
import type { Mode, ModeKind } from './detect-mode.ts'
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
