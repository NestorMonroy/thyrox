/**
 * Traducción de `@kaupamex/agent` a definiciones del harness (T-036).
 *
 * Las 31 definiciones del paquete ya son la fuente de verdad de los agentes de
 * este proyecto: se emiten a `.claude/agents/*.md` y a `--agents '<json>'`.
 * Ejecutarlas bajo el harness es una **tercera vía de despacho**, no un
 * formato nuevo — por eso esto traduce y no redefine.
 *
 * Dos asimetrías del contrato original que la traducción tiene que respetar,
 * porque colapsarlas cambia lo que el agente puede hacer:
 *
 * - `tools` **ausente** significa «todas»; `tools: []` significa «ninguna».
 *   `undefined` y `[]` no son lo mismo, y tratarlos igual daría al agente el
 *   núcleo entero justo cuando su definición se lo negaba.
 * - `model: 'inherit'` **no es un modelo**: es la ausencia de elección, y el
 *   hijo toma el del padre. Traducirlo a un identificador fijaría un modelo
 *   que la definición nunca eligió.
 */
import type { AgentDefinition as PaqueteAgent } from '@kaupamex/agent/types'
import type { AgentDefinition } from './agent.ts'
import { CORE_TOOLS } from './registry.ts'

/** Una definición del paquete, con la forma que la herramienta `Agent` consume. */
export function toHarnessDefinition(a: PaqueteAgent): AgentDefinition {
  const d: AgentDefinition = { systemPrompt: a.prompt }
  if (a.model && a.model !== 'inherit') d.model = a.model
  if (a.maxTurns) d.maxTurns = a.maxTurns
  if (a.tools) {
    d.tools = a.tools
  } else if (a.disallowedTools?.length) {
    // `disallowedTools` sólo RECORTA lo que ya se tiene. Si además hubiera
    // `tools`, aquélla manda: es la lista explícita de la definición.
    const vetadas = new Set(a.disallowedTools)
    d.tools = CORE_TOOLS.map((t) => t.name).filter((n) => !vetadas.has(n))
  }
  return d
}

/** El registro entero, indexado por el nombre con que se despacha. */
export function agentDefinitionsFromRegistry(agents: readonly PaqueteAgent[]): Record<string, AgentDefinition> {
  return Object.fromEntries(agents.map((a) => [a.name, toHarnessDefinition(a)]))
}
