/**
 * Tres delegados a bindings del host — porte de
 * `ccnmt: packages/agent/internal/runtimeSignals.ts`.
 *
 * Los tres se llaman desde el camino caliente de una query y avisan al host
 * (checkpoints de diagnóstico, notificaciones de ciclo de vida de comando)
 * sin bloquear si el host no instaló el binding correspondiente — de ahí el
 * `?.` en cada uno: sin binding, la llamada es un no-op silencioso, no una
 * excepción.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `getAgentHostBindings`
 * desde `../host.js`; aquí desde `../host.ts` — mismo módulo, extensión de
 * import ajustada a la convención ya establecida en este árbol para módulos
 * de `internal/` que importan hermanos del paquete (ver `internal/abort.ts`).
 */
import { getAgentHostBindings } from '../host.ts'

export function headlessProfilerCheckpoint(name: string): void {
  getAgentHostBindings().headlessProfilerCheckpoint?.(name)
}

export function queryCheckpoint(name: string): void {
  getAgentHostBindings().queryCheckpoint?.(name)
}

export function notifyCommandLifecycle(
  uuid: string,
  state: 'started' | 'completed',
): void {
  getAgentHostBindings().notifyCommandLifecycle?.(uuid, state)
}
