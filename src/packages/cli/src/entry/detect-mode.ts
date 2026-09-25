/**
 * `detectMode(argv)` — qué va a hacer esta invocación, decidido y NO ejecutado.
 *
 * Adaptación de `claude-code-nestor-monroy-tools: packages/cli/src/entry/
 * detect-mode.ts`, con una divergencia declarada: **el suyo tiene efectos y
 * éste es puro**.
 *
 * `detectRuntimeMode()` de la referencia devuelve `void` y empuja lo que
 * decide a cuatro setters del estado de arranque (`setIsInteractive`,
 * `setClientType`, `setQuestionPreviewFormat`, `setSessionSource`), porque
 * downstream lee ese estado como snapshot estable. Aquí no hay estado de
 * arranque global que sembrar, así que la pureza sale gratis — y compra lo
 * que el binario monolítico no tenía: el despacho se puede medir sin
 * arrancar el bucle, el proveedor ni el registro de skills.
 *
 * Lo que esta función NO hace, y es deliberado: no valida los argumentos del
 * modo que elige. `--workbench-check` sin ruta se detecta como `workbench` y
 * es el comando quien rehúsa. Mezclar detección con validación devolvería el
 * `if` gigante que este módulo parte.
 */
import { hasFlag } from './flags.ts'
import { stopCapturingEarlyInput } from '@thyrox/repl/earlyInput.js'
import { setIsInteractive } from '@thyrox/app-host/bootstrap/state.js'
import { initializeEntrypoint } from '@thyrox/app-host/main/startup/settings.js'
import { setClientType } from '@thyrox/app-host/bootstrap/state.js'
import { setQuestionPreviewFormat } from '@thyrox/app-host/bootstrap/state.js'
import { setSessionSource } from '@thyrox/app-host/bootstrap/state.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'

/** Los modos que una invocación puede tomar. El despacho los cubre todos. */
export const MODE_KINDS = [
  'workbench',
  'selectTests',
  'checkPremises',
  'importTasks',
  'claims',
  'configOrigin',
  'sessions',
  'help',
  'loop',
] as const

export type ModeKind = (typeof MODE_KINDS)[number]

/** El descriptor del modo. `usage` distingue «pidió ayuda» de «le falta algo». */
export type Mode = {
  readonly kind: ModeKind
  /** Sólo en `help`: true cuando la ayuda se imprime por falta de argumentos. */
  readonly usage?: boolean
}

/**
 * El modo de esta invocación.
 *
 * El orden importa y es el mismo que tenía la cascada del binario: los
 * comandos autocontenidos ganan sobre el bucle, porque quien pide
 * `--select-tests --prompt x` está pidiendo el selector. Cambiar el orden
 * cambiaría la conducta de esas combinaciones, así que se conserva.
 */
export function detectMode(argv: string[]): Mode {
  if (hasFlag(argv, 'workbench-new') || hasFlag(argv, 'workbench-check')) {
    return { kind: 'workbench' }
  }
  if (hasFlag(argv, 'select-tests')) return { kind: 'selectTests' }
  if (hasFlag(argv, 'check-premises')) return { kind: 'checkPremises' }
  if (hasFlag(argv, 'import-tasks')) return { kind: 'importTasks' }
  if (
    hasFlag(argv, 'claim') || hasFlag(argv, 'release') ||
    hasFlag(argv, 'who-has') || hasFlag(argv, 'overlap')
  ) {
    return { kind: 'claims' }
  }
  if (hasFlag(argv, 'config-origin')) return { kind: 'configOrigin' }
  if (hasFlag(argv, 'sessions')) return { kind: 'sessions' }

  const pide = hasFlag(argv, 'prompt') || hasFlag(argv, 'chat')
  if (hasFlag(argv, 'help')) return { kind: 'help', usage: !pide }
  if (!pide) return { kind: 'help', usage: true }
  return { kind: 'loop' }
}

/**
 * Resolve the client type string from process env + entrypoint hints.
 */
function resolveClientType(): string {
  if (isEnvTruthy(process.env.GITHUB_ACTIONS)) return 'github-action'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'sdk-ts') return 'sdk-typescript'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'sdk-py') return 'sdk-python'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'sdk-cli') return 'sdk-cli'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'claude-vscode') return 'claude-vscode'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'local-agent') return 'local-agent'
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'claude-desktop') return 'claude-desktop'

  // Check if session-ingress token is provided (indicates remote session)
  const hasSessionIngressToken =
    process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN ||
    process.env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR
  if (process.env.CLAUDE_CODE_ENTRYPOINT === 'remote' || hasSessionIngressToken) {
    return 'remote'
  }

  return 'cli'
}
/**
 * Detect interactive/non-interactive mode from argv + TTY.
 * Mirrors the logic that lived at the top of `src/main.tsx` `main()`.
 */
export function detectRuntimeMode(): void {
  const cliArgs = process.argv.slice(2)
  const hasPrintFlag = cliArgs.includes('-p') || cliArgs.includes('--print')
  const hasInitOnlyFlag = cliArgs.includes('--init-only')
  const hasSdkUrl = cliArgs.some(arg => arg.startsWith('--sdk-url'))
  const isNonInteractive =
    hasPrintFlag || hasInitOnlyFlag || hasSdkUrl || !process.stdout.isTTY

  // Stop capturing early input for non-interactive modes
  if (isNonInteractive) {
    stopCapturingEarlyInput()
  }

  const isInteractive = !isNonInteractive
  setIsInteractive(isInteractive)

  // Initialize entrypoint based on mode - needs to be set before any event is logged
  initializeEntrypoint(isNonInteractive)

  const clientType = resolveClientType()
  setClientType(clientType)

  const previewFormat = process.env.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT
  if (previewFormat === 'markdown' || previewFormat === 'html') {
    setQuestionPreviewFormat(previewFormat)
  } else if (
    !clientType.startsWith('sdk-') &&
    // Desktop and CCR pass previewFormat via toolConfig; when the feature is
    // gated off they pass undefined — don't override that with markdown.
    clientType !== 'claude-desktop' &&
    clientType !== 'local-agent' &&
    clientType !== 'remote'
  ) {
    setQuestionPreviewFormat('markdown')
  }

  // Tag sessions created via `claude remote-control` so the backend can identify them
  if (process.env.CLAUDE_CODE_ENVIRONMENT_KIND === 'bridge') {
    setSessionSource('remote-control')
  }
}
