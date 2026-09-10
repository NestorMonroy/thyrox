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
