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
