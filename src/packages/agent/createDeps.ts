/**
 * Frontera SDK ↔ runtime del agente — porte PARCIAL de
 * `ccnmt: packages/agent/createDeps.ts` (471 líneas en la fuente).
 *
 * Recorte declarado: la fuente define `createProductionDeps(...)` —la fábrica
 * de `AgentDeps`: provider, tools, permission, output, hooks, context,
 * session— más siete clases `*DepImpl` que envuelven a los paquetes
 * hermanos. Nada de eso lo ejercita el test que este archivo porta
 * (`__tests__/fromAgentEvent.test.ts`), y su bloqueo real se lista abajo.
 *
 * Se portan sólo los TRES símbolos que ese test importa —
 * `fromAgentEvent`, `toCoreMessages`, `fromCoreMessages`— porque los tres son
 * AUTOCONTENIDOS en la fuente: no dependen de ningún import externo, sólo de
 * su propio parámetro. Se portan completos y con fidelidad byte a byte de
 * comportamiento (`ccnmt: packages/agent/createDeps.ts:443-471`).
 *
 * NO se porta `createProductionDeps` ni sus siete clases `*DepImpl`
 * (`ProviderDepImpl`, `ToolDepImpl`, `PermissionDepImpl`, `OutputDepImpl`,
 * `HookDepImpl`, `ContextDepImpl`, `SessionDepImpl`).
 *
 * RE-MEDIDO 2026-09-08, porque esta cabecera lo declaraba mal en dos puntos.
 * Decía que la fábrica se llama `createAgentDeps` —se llama
 * `createProductionDeps` (`ccnmt: packages/agent/createDeps.ts:413`)— y que
 * la bloquean tres paquetes ausentes. Hoy DOS de esos tres resuelven:
 *
 *   · `@thyrox/provider` resuelve, y exporta `getProviderAdapter` y
 *     `getProviderContextPipeline` — las dos que la fuente importa en su
 *     primera línea. Se cerró en este mismo pase.
 *   · `@thyrox/provider/providerHostSetup` resuelve.
 *   · `@thyrox/local-observability/logging` resuelve, con `logError`.
 *
 * Lo que de verdad lo bloquea hoy, medido símbolo a símbolo:
 *
 *   · `@thyrox/tool-registry` NO existe (`findToolByName`). Es el porte más
 *     grande que queda del reparto — 255 módulos, tarea #234.
 *   · `handleStopHooks` YA ESTÁ portado (#262, 2026-09-08) en
 *     `internal/stopHooksCore.ts`; lo que sigue faltando es que
 *     `./hooks/index.ts` lo re-exporte — pero ese archivo NO EXISTE en este
 *     árbol (medido), así que el cableado espera a que la barrica de hooks
 *     se porte; el símbolo se importa mientras tanto por su ruta directa.
 *   · `recordTranscript` no existe en `./internal/runtimeBridges.ts`; en la
 *     fuente delega en un método del host (`getAgentHostBindings()
 *     .recordTranscript`) que aquí tampoco está declarado.
 *
 * Los tres símbolos que SÍ están abajo se portan completos y con fidelidad
 * byte a byte de comportamiento, y son autocontenidos: no dependen de ningún
 * import, sólo de su propio parámetro
 * (`ccnmt: packages/agent/createDeps.ts:443-471`).
 */

/**
 * Proyector de eventos del SDK: adapta cada evento crudo del agente
 * (etiquetado con `type`) a la forma que consumen los clientes del SDK
 * (TypeScript SDK, extensión de vscode), o descarta el evento devolviendo
 * `undefined`.
 *
 * `message`  → desenvuelve una capa: sólo si el mensaje interior tiene a su
 *              vez un campo `.message` (forma Anthropic anidada); si no,
 *              se descarta.
 * `stream`   → el evento interior, verbatim.
 * `request_start` → un marcador sintético de forma fija; cualquier campo
 *              extra del input se ignora.
 * `done`     → se descarta (señala el fin del stream).
 * cualquier otro `type` → se descarta.
 */
export function fromAgentEvent(event: { type: string; [key: string]: unknown }) {
  switch (event.type) {
    case 'message': {
      const msg = event.message
      if (!msg) return undefined
      if (typeof msg === 'object' && msg !== null && 'message' in msg) {
        return msg
      }
      return undefined
    }
    case 'stream':
      return event.event
    case 'request_start':
      return { type: 'stream_request_start' as const }
    case 'done':
      return undefined
    default:
      return undefined
  }
}

/**
 * Marcadores de frontera de identidad entre `AgentMessage` (runtime del
 * agente) y `CoreMessage` (superficie del SDK). Son estructuralmente
 * idénticos hoy — el cast es un no-op— pero el conversor explícito hace la
 * frontera greppeable y permite que un refactor futuro evolucione las dos
 * formas de manera independiente sin reescribir cada call site.
 *
 * La fuente tipa cada uno como `(messages: AgentMessage[]): CoreMessage[]`
 * y `(messages: CoreMessage[]): AgentMessage[]`, con un cast `as` interno.
 * Ninguno de esos dos tipos existe en este porte parcial (viven en
 * `./index.ts`, que no se importó aquí); se tipan genéricos sobre `T[]` — el
 * cuerpo, la identidad y la igualdad de referencia son exactamente los
 * mismos que la fuente.
 */
export function toCoreMessages<T>(messages: T[]): T[] {
  return messages
}

export function fromCoreMessages<T>(messages: T[]): T[] {
  return messages
}
