/**
 * Porte fiel de `ccnmt: packages/shell/src/commandLifecycle.ts` — un
 * único listener process-wide que se notifica cuando un comando arranca
 * o termina, identificado por su UUID.
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente están
 * presentes.
 *
 * @module
 */

type CommandLifecycleState = 'started' | 'completed'

type CommandLifecycleListener = (
  uuid: string,
  state: CommandLifecycleState,
) => void

let listener: CommandLifecycleListener | null = null

export function setCommandLifecycleListener(
  cb: CommandLifecycleListener | null,
): void {
  listener = cb
}

export function notifyCommandLifecycle(
  uuid: string,
  state: CommandLifecycleState,
): void {
  listener?.(uuid, state)
}
