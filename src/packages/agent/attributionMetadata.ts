/**
 * Porte de `ccnmt: packages/agent/attributionMetadata.ts` (byte-identical
 * en comportamiento; comentarios traducidos al español).
 *
 * Calcula la metadata `{attributionAgent, attributionSkill,
 * attributionPlugin}` a partir del querySource actual + spawnedBySkill +
 * activeSkill.
 *
 * Consumido por:
 *   - claudeLegacyRuntime: se esparce en los eventos de mensaje del
 *     asistente enviados a los consumidores del SDK, para que las
 *     herramientas río abajo puedan enrutar por procedencia agent/skill.
 *   - payloads de atribución de logEvent (telemetría).
 */

/**
 * Normaliza una cadena querySource a su familia amplia.
 * Devuelve 'main' para SDK / repl-main-thread; 'subagent' para agent:* o
 * hook_agent / verification_agent; 'auxiliary' para todo lo demás.
 */
export function querySourceFamily(querySource: string | undefined): 'main' | 'subagent' | 'auxiliary' | undefined {
  if (querySource === undefined) return undefined
  if (querySource.startsWith('repl_main_thread') || querySource === 'sdk') return 'main'
  if (querySource.startsWith('agent:') || querySource === 'hook_agent' || querySource === 'verification_agent') return 'subagent'
  return 'auxiliary'
}

/** Extrae el nombre del plugin de un id `pluginName:skillName`. */
export function skillToPlugin(skillId: string): string | undefined {
  const i = skillId.indexOf(':')
  return i > 0 ? skillId.slice(0, i) : undefined
}

interface SkillBlock {
  attributionSkill?: string
  attributionPlugin?: string
}

/** Produce {attributionSkill, attributionPlugin} para un nombre de skill. */
function skillAttribution(skillName: string | undefined, pluginOverride?: string): SkillBlock {
  if (!skillName) return pluginOverride ? { attributionPlugin: pluginOverride } : {}
  const plugin = skillToPlugin(skillName) ?? pluginOverride
  return {
    attributionSkill: skillName,
    ...(plugin && { attributionPlugin: plugin }),
  }
}

export interface AttributionMetadata {
  attributionAgent?: string
  attributionSkill?: string
  attributionPlugin?: string
}

/**
 * Calcula la metadata de atribución para una query en curso.
 *   - querySource = "agent:builtin:<name>"  → agent = <name>, + bloque skill
 *   - querySource = "agent:custom:<name>"   → agent = <name>, + bloque skill (con override de plugin custom)
 *   - querySource = main + activeSkill set  → solo bloque skill (agent omitido)
 *   - resto                                 → vacío
 *
 * El wrapper es a prueba de excepciones — devuelve {} ante cualquier throw.
 */
export function computeAttributionMetadata(
  querySource: string | undefined,
  spawnedBySkill: string | undefined,
  activeSkill: string | undefined,
): AttributionMetadata {
  try {
    if (!querySource) return {}
    if (querySource.startsWith('agent:builtin:')) {
      return { attributionAgent: querySource.slice('agent:builtin:'.length), ...skillAttribution(spawnedBySkill) }
    }
    if (querySource.startsWith('agent:custom:')) {
      const name = querySource.slice('agent:custom:'.length)
      return { attributionAgent: name, ...skillAttribution(spawnedBySkill, skillToPlugin(name)) }
    }
    if (querySourceFamily(querySource) === 'main' && activeSkill) {
      return skillAttribution(activeSkill)
    }
    return {}
  } catch {
    return {}
  }
}
