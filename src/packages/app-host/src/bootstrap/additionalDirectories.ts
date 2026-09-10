/**
 * Porte de `ccnmt: packages/app-host/src/bootstrap/additionalDirectories.ts`
 * — el registro de suscriptores para cambios en la lista de directorios
 * adicionales (los que alimentan CLAUDE.md fuera del cwd).
 *
 * SIN TEST DEDICADO: la fuente no tiene un `__tests__/additionalDirectories.test.ts`
 * (medido: `grep -rln additionalDirectories ccnmt/` solo encuentra
 * `state.ts`, que lo consume, y dos tests de `packages/config/` que
 * ejercitan el concepto desde otro ángulo, no este módulo). Sin test que
 * dirija un ciclo rojo/verde, este es un porte estructural directo — sin
 * dependencias externas, 12 líneas en la fuente.
 *
 * Se porta ahora (y no se difiere) porque `state.ts` — que otro agente de
 * esta misma tanda está escribiendo — importa
 * `notifyAdditionalDirectories` y reexporta `subscribeAdditionalDirectories`
 * desde este archivo (`state.ts:24-25` de la fuente); sin él, ese porte
 * queda bloqueado por un archivo ausente que sí es mío.
 */

const listeners = new Set<(directories: string[]) => void>()

export function subscribeAdditionalDirectories(
  listener: (directories: string[]) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyAdditionalDirectories(directories: string[]): void {
  for (const listener of listeners) listener([...directories])
}
