import { buildRegistry } from '../registry.ts'
import type { AgentRegistry } from '../registry.ts'
import type { AgentDefinition } from '../types.ts'

/**
 * Deriva el objeto que consume el flag `--agents '<json>'` y el control
 * request del SDK.
 *
 * Tres diferencias con la codificación markdown, las tres medidas: `name` es
 * la CLAVE del registro y no un campo; `color` y `experimental` no pertenecen
 * a este esquema —sólo la vía markdown los lleva— y `parseAgentJson` los
 * descarta al validar (`z.object` sin `.strict()` recorta las claves que no
 * declara).
 *
 * VALIDA antes de emitir. Publicar un registro que el cliente rechazará
 * traslada el fallo al momento del despacho, donde el mensaje ya no dice qué
 * definición lo causó.
 */
export function toAgentsJson(agents: AgentDefinition[]): AgentRegistry {
  const built = buildRegistry(agents)
  if (!built.ok) {
    throw new Error(
      `toAgentsJson: ${built.errors.length} definición(es) inválida(s):\n  ` +
      built.errors.join('\n  '))
  }
  return built.registry
}
