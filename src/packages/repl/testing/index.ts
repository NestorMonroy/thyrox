/**
 * Dobles en memoria de la superficie del REPL, para las pruebas de OTROS
 * paquetes. Se importan como `@thyrox/repl/testing`.
 *
 * No es lo mismo que `src/__tests__/`: aquel directorio contiene las pruebas
 * del propio REPL; éste exporta piezas que otros paquetes necesitan para
 * probarse sin levantar la interfaz. La partición es la del porte
 * (`ccnmt`, V7 §9.11), que declaró el subpath vacío.
 *
 * Cada doble existe porque un consumidor lo fabricaba a mano:
 * - `createRecordingCanUseTool` — el motor de `Workflow`
 *   (`agent/workflow/__tests__/engine.test.ts`);
 * - `selectStubModule` — `powerup` (`command-runtime`), cuyo `Select` real
 *   necesita el contexto de teclado de Ink que `bun:test` no provee.
 *
 * Restricción del porte: nada de aquí importa de `../src/internal/`, y sólo
 * se importan TIPOS de `../src/`, para que cargar el doble no arrastre la UI.
 */
import type { CanUseToolFn } from '../src/hooks/useCanUseTool.js'

type Decision = Awaited<ReturnType<CanUseToolFn>>

/** Una llamada registrada al doble: qué herramienta, con qué entrada, con qué id. */
export type CanUseToolCall = {
  toolName: string
  input: Record<string, unknown>
  toolUseID: string
}

/**
 * Un `CanUseToolFn` que registra cada llamada y decide con `decide`.
 *
 * Sin `decide`, permite y devuelve como `updatedInput` la entrada recibida:
 * en `PermissionAllowDecision` ese campo SUSTITUYE a la entrada, así que un
 * objeto vacío fijo borraría los argumentos de la herramienta.
 */
export function createRecordingCanUseTool(
  decide?: (call: CanUseToolCall) => Decision,
): { canUseTool: CanUseToolFn; calls: CanUseToolCall[] } {
  const calls: CanUseToolCall[] = []
  const canUseTool = (async (tool, input, _context, _message, toolUseID) => {
    const call = { toolName: (tool as { name: string }).name, input, toolUseID }
    calls.push(call)
    return decide ? decide(call) : { behavior: 'allow', updatedInput: input }
  }) as CanUseToolFn
  return { canUseTool, calls }
}

/**
 * La fábrica para `mock.module('@thyrox/repl/components/CustomSelect/index.js', …)`:
 * un `Select` que devuelve sus props en vez de renderizar, para comprobar qué
 * opciones y callbacks construye quien lo usa.
 */
export function selectStubModule(): { Select: (props: unknown) => { props: unknown; _stub: 'select' } } {
  return { Select: (props: unknown) => ({ props, _stub: 'select' as const }) }
}
