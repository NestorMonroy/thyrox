/**
 * Categoria de origen de una consulta — porte de
 * `ccnmt: packages/agent/promptCategory.ts` (`getQuerySourceForAgent`).
 *
 * Es la etiqueta de analitica que separa un agente propio del producto de
 * uno definido por quien lo usa. Si las categorias se colapsan, cualquier
 * lectura por tipo de agente deja de poder hacerse.
 */

/**
 * La categoria de un agente.
 *
 * El tipo SOLO cuenta para los propios: todos los definidos por el usuario
 * ruedan a una sola categoria a proposito, porque sus nombres son
 * arbitrarios y abrirlos por tipo devolveria la cardinalidad ilimitada que
 * la etiqueta existe para evitar.
 *
 * Y el tipo vacio cae al defecto, no a `agent:builtin:`. Es la conducta de
 * la fuente y se porta: una etiqueta con el prefijo y sin sujeto seria un
 * cubo que nadie puede interpretar.
 */
export function getQuerySourceForAgent(
  agentType: string | undefined,
  isBuiltInAgent: boolean,
): string {
  if (!isBuiltInAgent) return 'agent:custom'
  return agentType ? `agent:builtin:${agentType}` : 'agent:default'
}
