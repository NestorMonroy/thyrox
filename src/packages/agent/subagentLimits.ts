/**
 * Las dos guardas de subagentes: profundidad de anidamiento y anchura.
 *
 * Porte del contrato del binario 2.1.275, no de su texto de implementación:
 *   - `bc` (`chunk-xbd48fav.js`): la profundidad de un contexto es 0 para el
 *     hilo principal y `depth ?? 0` para un agente;
 *   - `Yb` (`chunk-0tc6wzvy.js`): el máximo sale de
 *     `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, si no de la bandera
 *     `tengu_hazel_trellis` si es entera y >= 1, si no 3;
 *   - `lo` (`chunk-x9krcp51.js`): al alcanzarlo se rehúsa con
 *     `depth_limit`;
 *   - `pn` (mismo archivo): la anchura sale de
 *     `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS ?? 20`; al alcanzarla se rehúsa
 *     con `concurrency_limit` y «Do not retry» — el lanzamiento N+1 no se
 *     encola.
 *
 * Origen en thyrox: propuesta 2 del banco de ai-course-notes. Medido al abrir
 * la tarea, `src/packages` no tenía ni una de las dos guardas.
 *
 * Divergencia declarada: el binario memoriza el máximo de profundidad en el
 * estado de la sesión; aquí se resuelve en cada llamada, que es más barato de
 * probar y no cambia el valor dentro de una sesión mientras la bandera no
 * cambie.
 */

export const DEFAULT_MAX_SPAWN_DEPTH = 3
export const DEFAULT_MAX_CONCURRENT_SUBAGENTS = 20
export const SPAWN_DEPTH_FLAG = 'tengu_hazel_trellis'

type Env = Record<string, string | undefined>
type DepthContext = { agentType: string; depth?: number } | undefined

export type SubagentRefusal = {
  reason: 'depth_limit' | 'concurrency_limit'
  message: string
}

function positiveInteger(raw: unknown): number | undefined {
  const value = typeof raw === 'string' ? Number(raw) : raw
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? value
    : undefined
}

/** `bc`: el hilo principal es 0; un agente, su `depth` o 0. */
export function agentDepth(context: DepthContext): number {
  if (!context || context.agentType === 'main') return 0
  return context.depth ?? 0
}

/** `Yb`: la variable, luego la bandera, luego 3. */
export function maxSubagentSpawnDepth(
  env: Env,
  flag: (name: string, fallback: number) => unknown,
): number {
  const fromEnv = positiveInteger(env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH)
  if (fromEnv !== undefined) return fromEnv
  return positiveInteger(flag(SPAWN_DEPTH_FLAG, DEFAULT_MAX_SPAWN_DEPTH)) ??
    DEFAULT_MAX_SPAWN_DEPTH
}

export function maxConcurrentSubagents(env: Env): number {
  return positiveInteger(env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS) ??
    DEFAULT_MAX_CONCURRENT_SUBAGENTS
}

/** El rechazo de `lo` si el contexto que engendra ya está en el máximo. */
export function depthRefusal(
  context: DepthContext,
  env: Env,
  flag: (name: string, fallback: number) => unknown,
): SubagentRefusal | undefined {
  const depth = agentDepth(context)
  const max = maxSubagentSpawnDepth(env, flag)
  if (depth < max) return undefined
  return {
    reason: 'depth_limit',
    message: `Subagent nesting limit reached (depth ${depth} of ${max}). Complete this task directly using your tools instead of spawning another agent. If the user explicitly requested deeper nesting, ask them to raise CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH.`,
  }
}

/**
 * El rechazo de `pn` si ya corren tantos subagentes como el máximo.
 * `exempt` cubre las dos exenciones del binario (la bandera
 * `tengu_amber_kestrel` y el modelo/ultracode), que decide quien llama.
 */
export function concurrencyRefusal(
  running: number,
  env: Env,
  exempt: () => boolean = () => false,
): SubagentRefusal | undefined {
  const max = maxConcurrentSubagents(env)
  if (running < max || exempt()) return undefined
  return {
    reason: 'concurrency_limit',
    message: `Concurrent subagent limit reached. You can run ${max} subagents at once. Do not retry. If the user wants more concurrent subagents, ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.`,
  }
}
