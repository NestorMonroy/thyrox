/**
 * Restauración de sesión al reanudar (`--resume`).
 *
 * Adaptación de ccnmt `packages/storage/src/sessionRestore.ts` (573 líneas).
 *
 * PORTE PARCIAL DECLARADO — sólo se porta `computeStandaloneAgentContext`
 * (1 de más de una docena de símbolos del archivo fuente: entre otros
 * `restoreAgentFromSession`, `restoreFileHistoryFromLastSession`, y el
 * cuerpo de `--resume`/`--continue` que compone el estado inicial del REPL).
 * Es la única función que el conjunto de tests portado hasta ahora ejerce.
 * El resto del archivo depende de tipos y símbolos de `@thyrox/agent`
 * (`AppState`, `refreshAgentDefinitionsForModeSwitch`, bootstrap de
 * mainThreadAgentType) que este paquete no importa todavía (DEC-04) y que
 * no tienen contraparte medida aquí. Se declara ausente en vez de portarse
 * en silencio.
 */

/** El subconjunto de `AppState['standaloneAgentContext']` que esta función produce. */
export interface StandaloneAgentContext {
  name: string
  color: string | undefined
}

/**
 * Calcula el contexto del badge de "agente standalone" que se muestra en el
 * banner del REPL, a partir del nombre y color de agente resueltos al
 * reanudar la sesión.
 *
 * `agentColor === 'default'` es el centinela de "sin color explícito" y se
 * normaliza a `undefined` — sin esta normalización el badge renderizaría la
 * palabra literal "default" como nombre de color.
 */
export function computeStandaloneAgentContext(
  agentName: string | undefined,
  agentColor: string | undefined,
): StandaloneAgentContext | undefined {
  if (!agentName && !agentColor) {
    return undefined
  }
  return {
    name: agentName ?? '',
    color: agentColor === 'default' ? undefined : agentColor,
  }
}
