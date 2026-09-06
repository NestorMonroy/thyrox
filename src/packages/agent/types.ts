/**
 * El objeto que define un agente.
 *
 * Adaptado de `AgentJsonSchema` y `BaseAgentDefinition` del cliente
 * (medido en H-DOCS-502). Se conservan los nombres de clave de la fuente
 * porque son el contrato de las tres vías de despacho: el frontmatter de
 * `.claude/agents/*.md`, el flag `--agents '<json>'`, y el control request
 * del SDK. Renombrarlos rompería las tres a la vez.
 */

/** Los cinco niveles de esfuerzo que el cliente declara. */
// Los niveles los declara `schema.ts`, que los deriva del ejecutable
// vendorizado. Aquí se RE-EXPORTAN: dos listas iguales serían dos fuentes
// de verdad que nadie sincroniza (calibration-verified-numbers.md).
export { EFFORT_LEVELS } from './schema.ts'
import { EFFORT_LEVELS } from './schema.ts'
import type { ModelId } from './models.ts'
import type { Flow } from './flowHomes.ts'
export type EffortValue = (typeof EFFORT_LEVELS)[number] | number

/**
 * Los alias que el `enum` de `model` del tool `Agent` admite.
 *
 * Se exportan para RESOLVERLOS, no para declararlos: un alias no determina
 * la versión —resuelve distinto según el proveedor (H-DOCS-220), y con ella
 * el tier, la ventana y el coste—. Directiva del ejecutor 2026-09-02: los
 * agentes se nombran por identificador completo (`claude-sonnet-5`), nunca
 * por alias; `registry.ts` rehúsa el alias.
 */
export const MODEL_ALIASES = ['opus', 'sonnet', 'haiku', 'fable'] as const
export type ModelAlias = (typeof MODEL_ALIASES)[number]
export type ModelValue = ModelId | 'inherit'

/** Los dos TTL de caché de prompt que el ejecutable admite por agente. */
export const CACHE_TTLS = ['5m', '1h'] as const
export type CacheTtl = (typeof CACHE_TTLS)[number]

export type PermissionMode =
  | 'default'
  | 'plan'
  | 'acceptEdits'
  | 'dontAsk'
  | 'bypassPermissions'

/**
 * La definición completa. `name` y `prompt` son obligatorios aquí; en la
 * codificación JSON del cliente `name` es la CLAVE del registro y no un
 * campo, y el emisor de `agentsJson` hace esa transposición.
 */
export type AgentDefinition = {
  /** Identificador del tipo de agente. Alfanumérico y guiones, 3..50. */
  name: string
  /** Cuándo usarlo. El cliente lo llama `description` en las dos vías. */
  description: string
  /** El system prompt. Prosa larga; vive en su propio archivo. */
  prompt: string
  /** Herramientas permitidas. Omitir = todas. Arreglo vacío = ninguna. */
  tools?: string[]
  disallowedTools?: string[]
  /** Identificador completo del catálogo, o `inherit`. Nunca un alias. */
  model?: ModelValue
  /** Gana sobre el esfuerzo de la sesión (H-DOCS-500). */
  effort?: EffortValue
  permissionMode?: PermissionMode
  maxTurns?: number
  skills?: string[]
  initialPrompt?: string
  background?: boolean
  isolation?: 'worktree' | 'remote'
  /**
   * Metodologia declarada del coordinador (DEC-R-01). NO es clave de
   * frontmatter: el emisor la CONSUME para pegar el bloque `Hogar de
   * diseno` derivado de `FLOW_HOMES` al cuerpo del prompt, y la via JSON
   * la descarta (zod la elimina por no declararla `AgentJsonSchema`).
   */
  flow?: Flow
  /** Color de la etiqueta en el cliente. Sólo la vía markdown lo lleva. */
  color?: string
  /**
   * Opciones experimentales del esquema sombra del frontmatter (clave 20 de
   * 20 en 2.1.258). Sólo la vía markdown la lleva: `AgentJsonSchema` no la
   * declara, y el emisor JSON la descarta. `cacheTtl` fija el TTL de la caché
   * de prompt de las peticiones del agente cuando no hay
   * `subagentPromptCacheTtl` ni la variable de entorno; `"1h"` se ignora
   * mientras la suscripción está en excedente (literal del ejecutable).
   */
  experimental?: { cacheTtl?: CacheTtl }
}
