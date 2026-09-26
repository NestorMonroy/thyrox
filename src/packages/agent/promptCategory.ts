/**
 * Categoria de origen de una consulta — porte de
 * `ccnmt: packages/agent/promptCategory.ts` (`getQuerySourceForAgent`).
 *
 * Es la etiqueta de analitica que separa un agente propio del producto de
 * uno definido por quien lo usa. Si las categorias se colapsan, cualquier
 * lectura por tipo de agente deja de poder hacerse.
 */

import { DEFAULT_OUTPUT_STYLE_NAME, OUTPUT_STYLE_CONFIG } from '@thyrox/config/outputStyles.js'
import { getSettings } from '@thyrox/config/settings/core/settings.js'

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

/**
 * La categoria de una consulta del hilo principal — `cxe` de 2.1.281.
 *
 * El estilo de salida por defecto no marca nada; uno propio del producto
 * lleva su nombre, y cualquier otro colapsa a `custom` por la misma razon
 * que los agentes del usuario: sus nombres son arbitrarios.
 */
export function getQuerySourceForREPL(
  readOutputStyle: () => string | undefined = () => getSettings()?.outputStyle,
): string {
  const style = readOutputStyle() ?? DEFAULT_OUTPUT_STYLE_NAME
  if (style === DEFAULT_OUTPUT_STYLE_NAME) return 'repl_main_thread'
  return Object.hasOwn(OUTPUT_STYLE_CONFIG, style)
    ? `repl_main_thread:outputStyle:${style}`
    : 'repl_main_thread:outputStyle:custom'
}
