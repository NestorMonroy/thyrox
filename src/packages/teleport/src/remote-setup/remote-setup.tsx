/**
 * Puerto de `ccnmt: packages/teleport/src/remote-setup/remote-setup.tsx`
 * (189 líneas fuente).
 *
 * Cobertura: 3 de 5 símbolos exportados/privados de la fuente —
 * `checkLoginState` (100%, misma firma, reimplementado con `Bun.spawn`
 * en vez de `execa`), `errorMessage` (100%, verbatim) y los tipos
 * `CheckResult`/`Step` (100%). Los DOS que quedan sin portar son el
 * componente JSX `Web` y el `call` que lo monta:
 *
 *   - `React`, `@anthropic/ink` (Box/Dialog/LoadingState/Text) y
 *     `@claude-code-how-works/repl/components/CustomSelect/index.js` NO
 *     existen en este árbol — medido: `find . -iname "*.tsx"` bajo
 *     `src/packages` da 0 resultados propios antes de este pase (los
 *     únicos `.tsx` del árbol son los que este mismo pase de porte
 *     crea), y no hay paquete `repl` entre los 21 de `src/packages`
 *     (thyrox es un SDK headless: agent, app-host, cli, command-runtime,
 *     config, harness, headless-sdk, local-observability, mcp-runtime,
 *     memory, observability, output, permission, plan, provider, shell,
 *     skills, storage, swarm, tools — sin capa de TUI interactiva).
 *   - `execa` tampoco está declarado como dependencia en ningún
 *     `package.json` del árbol (`grep -rn '"execa"'` → 0 hits):
 *     igual que hizo `app-host/src/startup/ghAuthStatus.ts` con el
 *     mismo bloqueo (ver su propio docstring), `checkLoginState` se
 *     reimplementa aquí con `Bun.spawn`, evitando la dependencia — y
 *     de paso deja de necesitar el stub de `execa`.
 *
 * `Web`/`call` quedan como `require()` diferido de un módulo que no
 * existe todavía (`./remote-setup-view.js`) — el bloqueo es
 * arquitectónico (falta el runtime de UI), no una preferencia de estilo;
 * es la ÚNICA excepción admitida a "sin lazy imports" bajo esta regla.
 */

import { getGhAuthStatus } from '@thyrox/app-host/startup/ghAuthStatus.js'
import type { LocalJSXCommandOnDone } from '@thyrox/command-runtime/types.js'
import {
  type ImportTokenError,
  RedactedGithubToken,
  isSignedIn,
} from './api.js'

export type CheckResult =
  | { status: 'not_signed_in' }
  | { status: 'has_gh_token'; token: RedactedGithubToken }
  | { status: 'gh_not_installed' }
  | { status: 'gh_not_authenticated' }

/**
 * Reimplementación de `checkLoginState` con `Bun.spawn` en vez de
 * `execa` (ver docstring del módulo). `getGhAuthStatus()` ya spawnea con
 * stdout:'ignore' (telemetry-safe); aquí se spawnea una vez más con
 * stdout capturado para leer el token, igual que la fuente.
 */
export async function checkLoginState(): Promise<CheckResult> {
  if (!(await isSignedIn())) {
    return { status: 'not_signed_in' }
  }

  const ghStatus = await getGhAuthStatus()
  if (ghStatus === 'not_installed') {
    return { status: 'gh_not_installed' }
  }
  if (ghStatus === 'not_authenticated') {
    return { status: 'gh_not_authenticated' }
  }

  // ghStatus === 'authenticated'. getGhAuthStatus ya spawneó con
  // stdout:'ignore'; spawnea una vez más con stdout capturado para leer
  // el token.
  const proc = Bun.spawn(['gh', 'auth', 'token'], {
    stdout: 'pipe',
    stderr: 'ignore',
    signal: AbortSignal.timeout(5000),
  })
  const stdout = await new Response(proc.stdout).text()
  await proc.exited
  const trimmed = stdout.trim()
  if (!trimmed) {
    return { status: 'gh_not_authenticated' }
  }
  return { status: 'has_gh_token', token: new RedactedGithubToken(trimmed) }
}

export function errorMessage(err: ImportTokenError, codeUrl: string): string {
  switch (err.kind) {
    case 'not_signed_in':
      return `Login failed. Please visit ${codeUrl} and login using the GitHub App`
    case 'invalid_token':
      return 'GitHub rejected that token. Run `gh auth login` and try again.'
    case 'server':
      return `Server error (${err.status}). Try again in a moment.`
    case 'network':
      return "Couldn't reach the server. Check your connection."
  }
}

export type Step =
  | { name: 'checking' }
  | { name: 'confirm'; token: RedactedGithubToken }
  | { name: 'uploading' }

/**
 * `call` monta el componente `Web` — el flujo interactivo de
 * confirmación (Select/Dialog) que pide React + ink + el `CustomSelect`
 * de `repl`. Ninguno de los tres existe en este árbol (ver docstring del
 * módulo). Se declara con la misma firma que la fuente y se resuelve con
 * `require()` diferido hacia un módulo de vista que aún no existe —
 * fallará al invocarse hasta que exista un runtime de UI en thyrox, y
 * ese fallo es la señal correcta: no hay forma honesta de renderizar
 * JSX sin React.
 */
export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const view = require('./remote-setup-view.js') as {
    renderWeb: (onDone: LocalJSXCommandOnDone) => Promise<unknown>
  }
  return view.renderWeb(onDone)
}
