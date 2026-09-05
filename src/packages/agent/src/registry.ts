// El registro: de una lista de definiciones al objeto que `--agents` recibe.
//
// La forma la fija el validador de `--agents` del ejecutable vendorizado
// 2.1.250 (`AgentsJsonSchema` = record de nombre → definición, más un
// post-check sobre las claves). Ver `src/schema.ts` para el bloque delimitado.
import { parseAgentJson } from './schema.ts'
import type { AgentJson } from './schema.ts'
import type { AgentDefinition } from './types.ts'
import { isModelAlias, isModelId, resolveModel } from './models.ts'

/** Literal del ejecutable — se cita, no se parafrasea. */
export const NAME_MUST_NOT_START_WITH_DASH =
  "agent names must not start with '-'"

/**
 * Literal del ejecutable 2.1.258, tras `normalize("NFKC")`: los dos puntos
 * están reservados al espacio de nombres de plugin (`<plugin>:<agente>`).
 */
export const NAME_MUST_NOT_CONTAIN_COLON =
  "names must not contain ':' (reserved for plugin namespacing)"

/** Propio, no del ejecutable: el cliente ACEPTA el alias; este registro no. */
export const MODEL_MUST_BE_A_CATALOG_ID =
  'model debe ser un identificador completo del catálogo, no un alias'

export type AgentRegistry = Record<string, AgentJson>

export type BuildResult =
  | { ok: true; registry: AgentRegistry }
  | { ok: false; errors: string[] }

/**
 * Construye el registro, o devuelve TODOS los errores encontrados.
 *
 * Acumula en vez de cortar en el primero: quien corrige prefiere la lista
 * entera a descubrirlos de uno en uno.
 *
 * Diverge de la fuente en un punto, y es deliberado: el ejecutable ante un
 * nombre duplicado **deja ganar al último** —`Map.set` sobrescribe en el
 * orden `built-in < plugin < userSettings < projectSettings < flagSettings <
 * policySettings`—, avisa sólo cuando el duplicado está en la misma fuente y
 * el mismo directorio, y **calla** cuando la colisión es entre fuentes (un
 * `~/.claude/agents/x.md` sombreado por el del proyecto). Aquí se rehúsa. Un
 * duplicado en un registro que emitimos nosotros no es ambigüedad heredada de
 * dos directorios — es un defecto de nuestro árbol, y silenciarlo publicaría
 * una definición que nadie escribió a propósito. Medido en
 * `analisis-flujo-carga-de-agentes-en-el-binario.rst` (H-DOCS-1005 corrige
 * la redacción anterior de este comentario, que decía «gana el primero»).
 */
export function buildRegistry(definitions: AgentDefinition[]): BuildResult {
  const registry: AgentRegistry = {}
  const errors: string[] = []
  const seen = new Set<string>()

  for (const definition of definitions) {
    const { name, ...rest } = definition
    // El `prompt` puede ser un getter (lee el `.md` hermano); el spread lo
    // evaluaría una sola vez o lo perdería, así que se copia explícito.
    const candidate = { ...rest, prompt: definition.prompt }

    if (name.startsWith('-')) {
      errors.push(`${name}: ${NAME_MUST_NOT_START_WITH_DASH}`)
      continue
    }
    if (name.normalize('NFKC').includes(':')) {
      errors.push(`${name}: ${NAME_MUST_NOT_CONTAIN_COLON}`)
      continue
    }
    if (seen.has(name)) {
      errors.push(`${name}: nombre de agente duplicado`)
      continue
    }
    seen.add(name)

    // El cliente admite `model: sonnet` y lo resuelve según el proveedor; aquí
    // se rehúsa porque el tier y la ventana quedarían fuera de la definición.
    if (typeof rest.model === 'string' && rest.model !== 'inherit' && !isModelId(rest.model)) {
      const pista = isModelAlias(rest.model)
        ? ` (el alias '${rest.model}' resuelve a ${resolveModel(rest.model)} en first-party)`
        : ''
      errors.push(`${name}.model: ${MODEL_MUST_BE_A_CATALOG_ID}${pista}`)
      continue
    }

    const parsed = parseAgentJson(candidate)
    if (!parsed.ok) {
      errors.push(...parsed.errors.map((e) => `${name}.${e}`))
      continue
    }
    registry[name] = parsed.value
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, registry }
}
