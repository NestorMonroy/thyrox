/**
 * Puerto de `ccnmt: packages/tool-registry/src/toolSchemaCache.ts`
 * (23 líneas, 2 símbolos). La caché de esquemas renderizados, por sesión.
 *
 * POR QUÉ EXISTE, y es de costo, no de velocidad: los esquemas de
 * herramienta se renderizan en la posición 2 del servidor —antes del prompt
 * de sistema—, así que un cambio de un solo byte invalida el bloque entero
 * de ~11K tokens Y todo lo que va detrás. Memorizar por sesión fija esos
 * bytes en el primer render.
 *
 * VIVE EN UN MÓDULO HOJA a propósito: la capa de autenticación lo vacía al
 * cambiar de credencial, y si tuviera que importar `api.ts` para hacerlo
 * habría un ciclo.
 */
import type { BetaTool } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

type CachedSchema = BetaTool & {
  strict?: boolean
  eager_input_streaming?: boolean
}

const TOOL_SCHEMA_CACHE = new Map<string, CachedSchema>()

/** El mapa, no una copia: quien escriba aquí afecta al render. */
export function getToolSchemaCache(): Map<string, CachedSchema> {
  return TOOL_SCHEMA_CACHE
}

/**
 * Vacía el mapa CONSERVANDO su identidad. Sustituirlo por uno nuevo dejaría
 * a quien guardara la referencia escribiendo en el viejo — un fallo
 * silencioso, no un error.
 */
export function clearToolSchemaCache(): void {
  TOOL_SCHEMA_CACHE.clear()
}
