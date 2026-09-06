/**
 * Superficie de inyección de dependencias del query loop — porte de
 * `ccnmt: packages/agent/internal/queryDeps.ts`.
 *
 * `query.ts` no llama al modelo ni a la compactación directo: pasa por
 * este `QueryDeps`, y `productionDeps()` arma la instancia real que usa
 * producción. Eso deja los tres puntos de variación (modelo, micro/auto
 * compact, generación de uuid) sustituibles por un test sin tocar el loop.
 *
 * Cuatro invariantes que este módulo fija:
 *  1. `callModel` es el `queryModelWithStreaming` real — import directo,
 *     sin capa de binding del host, para no meter una llamada de función
 *     extra en la ruta caliente de streaming.
 *  2. `microcompact`/`autocompact` llaman al binding del host con
 *     `?.()` — si el host no lo instaló, caen a un valor por defecto que
 *     NUNCA finge trabajo hecho: `{ messages }` (los mensajes de entrada
 *     intactos, no un array vacío) y `{ wasCompacted: false }`
 *     respectivamente. Un default que mintiera dejaría al loop de la
 *     query saltarse su lógica de continuación o perder historial en
 *     silencio.
 *  3. `uuid` es `randomUUID` de `crypto` — nunca un contador ni un stub
 *     determinista, que colisionaría entre queries corriendo en paralelo.
 *  4. El tipo de retorno de `autocompact` declara
 *     `rapidRefillBreakerTripped`/`consecutiveRapidRefills` — el caller
 *     los usa para salir del loop con la razón `rapid_refill_breaker` en
 *     vez de seguir compactando.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa
 * `queryModelWithStreaming` de
 * `@claude-code-how-works/provider/claudeLegacy`, paquete hermano ausente
 * en este árbol. El único consumidor de este archivo hasta ahora
 * (`__tests__/internalQueryDeps.behavior.test.ts`) lee este archivo como
 * texto plano (`readFileSync`) y nunca lo importa, así que el import se
 * deja verbatim — es lo que el test pinnea contra la fuente — en vez de
 * reimplementarlo localmente (no hay una versión mínima razonable de
 * "streaming real al modelo" que sustituir, a diferencia de `readEnv` o
 * `createSignal`, que sí son primitivos triviales).
 */
import { randomUUID } from 'crypto'
import { queryModelWithStreaming } from '@claude-code-how-works/provider/claudeLegacy'
import { getAgentHostBindings } from '../host.ts'
import type {
  AgentMessage,
  AgentQuerySource,
  AgentToolUseContext,
} from '../internalTypes.ts'

export type QueryDeps = {
  callModel: typeof queryModelWithStreaming
  microcompact: (
    messages: AgentMessage[],
    toolUseContext?: AgentToolUseContext,
    querySource?: AgentQuerySource,
  ) => Promise<{ messages: AgentMessage[]; [key: string]: unknown }>
  autocompact: (
    messages: AgentMessage[],
    toolUseContext: AgentToolUseContext,
    cacheSafeParams: unknown,
    querySource?: AgentQuerySource,
    tracking?: unknown,
    snipTokensFreed?: number,
  ) => Promise<{
    wasCompacted: boolean
    compactionResult?: unknown
    consecutiveFailures?: number
    // ant 3970.js — se fija cuando autocompact desiste porque el breaker
    // de rellenado rápido saltó. El caller sale del query loop con razón
    // "rapid_refill_breaker" en vez de seguir compactando.
    rapidRefillBreakerTripped?: boolean
    consecutiveRapidRefills?: number
  }>
  uuid: () => string
}

export function productionDeps(): QueryDeps {
  return {
    callModel: queryModelWithStreaming,
    microcompact: async (messages, toolUseContext, querySource) =>
      (await getAgentHostBindings().microcompactMessages?.(
        messages,
        toolUseContext,
        querySource,
      )) ?? { messages },
    autocompact: async (
      messages,
      toolUseContext,
      cacheSafeParams,
      querySource,
      tracking,
      snipTokensFreed,
    ) =>
      (await getAgentHostBindings().autoCompactIfNeeded?.(
        messages,
        toolUseContext,
        cacheSafeParams,
        querySource,
        tracking,
        snipTokensFreed,
      )) ?? { wasCompacted: false },
    uuid: randomUUID,
  }
}
