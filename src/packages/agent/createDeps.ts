/**
 * Frontera SDK ↔ runtime del agente — porte PARCIAL de
 * `ccnmt: packages/agent/createDeps.ts` (471 líneas en la fuente).
 *
 * Recorte declarado: la fuente completa importa
 * `@claude-code-how-works/provider`, `@claude-code-how-works/local-observability`
 * y `@claude-code-how-works/tool-registry`, y define `createAgentDeps(...)`
 * (la fábrica de `AgentDeps` — provider/tools/permission/output/hooks/
 * compaction/context/session) más media docena de clases `*DepImpl` que
 * envuelven esos paquetes. Ninguno de esos símbolos existe en este árbol, y
 * ninguno lo ejercita el test que este archivo porta
 * (`__tests__/fromAgentEvent.test.ts`).
 *
 * Se portan sólo los TRES símbolos que ese test importa —
 * `fromAgentEvent`, `toCoreMessages`, `fromCoreMessages`— porque los tres son
 * AUTOCONTENIDOS en la fuente: no dependen de ningún import externo, sólo de
 * su propio parámetro. Se portan completos y con fidelidad byte a byte de
 * comportamiento (`ccnmt: packages/agent/createDeps.ts:443-471`).
 *
 * NO se portan: `createAgentDeps` y las clases `ProviderDepImpl`,
 * `ToolDepImpl`, `PermissionDepImpl`, `OutputDepImpl`, `HookDepImpl`,
 * `ContextDepImpl`, `SessionDepImpl` — dependen de los tres paquetes
 * ausentes arriba.
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
