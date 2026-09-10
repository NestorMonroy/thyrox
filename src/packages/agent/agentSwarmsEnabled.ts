/**
 * Gate central de agent teams/teammate — porte de
 * `ccnmt: packages/agent/agentSwarmsEnabled.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa
 * `getFeatureValue_CACHED_MAY_BE_STALE` de
 * `@claude-code-how-works/config/feature-flags`, que no existe en este
 * árbol. Se sustituye por `./featureFlags.ts` — un stand-in local cuya
 * cabecera declara por qué (DEC-04, sin cliente GrowthBook en un
 * despliegue self-hosted de un solo operador). El comportamiento de
 * `isAgentSwarmsEnabled` se porta byte a byte: sigue siendo la única
 * puerta para las features de swarm/teammate.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from './featureFlags.ts'

/**
 * Verificación centralizada en runtime para las features de agent
 * teams/teammate. Es la única puerta que debe consultarse en cualquier
 * lugar donde se referencien teammates (prompts, código, isEnabled de
 * tools, UI, etc.).
 *
 * Swarm es una feature de primera clase de ccb: sin opt-in por entorno,
 * sin flag de CLI, sin bifurcación por USER_TYPE. La única puerta que
 * queda es el killswitch de GrowthBook (`tengu_amber_flint`, default
 * true), para poder deshabilitarlo remotamente si un bug crítico llega a
 * producción. El default es ON.
 *
 * Histórico: esto solía cortar en corto con `USER_TYPE === 'ant'` para
 * builds internos de Anthropic, más exigir la variable de entorno
 * `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` o el flag de CLI
 * `--agent-teams` para builds externos. Las dos puertas se retiraron para
 * el modelo de un solo operador self-hosted de ccb — ver el plan
 * `reactive-honking-dusk.md` Fase W1.
 */
export function isAgentSwarmsEnabled(): boolean {
  return getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_flint', true)
}
