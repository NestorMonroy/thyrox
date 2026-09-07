/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/cost/cost.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la lógica.
 *
 * Divergencia declarada: la fuente tipa `call` con
 * `LocalCommandCall` importado de `@claude-code-how-works/agent/command.js`.
 * Se usa el `LocalCommandCall` propio de `../../types.js` (mismo nombre,
 * mismo propósito, ya portado en este paquete) en vez de acoplar el tipo
 * a `agent`, que otro agente está portando en paralelo en esta sesión.
 * `formatTotalCost`/`currentLimits`/`isClaudeAISubscriber` pasan por
 * `internal/pendingCrossPackageDeps.ts`; `currentLimits`
 * (`claudeAiLimits.js`) no existe todavía en `@thyrox/provider` — ver el
 * docstring de ese envoltorio.
 */
import type { LocalCommandCall } from '../../types.js'
import {
  requireConfigEnvUtils,
  requireProviderAuthAlias,
  requireProviderClaudeAiLimits,
  requireProviderCostTracker,
} from '../../internal/pendingCrossPackageDeps.js'

export const call: LocalCommandCall = async () => {
  if (requireProviderAuthAlias().isClaudeAISubscriber()) {
    let value: string

    if (requireProviderClaudeAiLimits().currentLimits.isUsingOverage) {
      value =
        'You are currently using your overages to power your Claude Code usage. We will automatically switch you back to your subscription rate limits when they reset'
    } else {
      value =
        'You are currently using your subscription to power your Claude Code usage'
    }

    if (requireConfigEnvUtils().readEnv('USER_TYPE') === 'ant') {
      value += `\n\n[ANT-ONLY] Showing cost anyway:\n ${requireProviderCostTracker().formatTotalCost()}`
    }
    return { type: 'text', value }
  }
  return { type: 'text', value: requireProviderCostTracker().formatTotalCost() }
}
