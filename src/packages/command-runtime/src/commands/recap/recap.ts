/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/recap/recap.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la lógica; `generateAwaySummary` pasa por
 * `internal/pendingCrossPackageDeps.ts` (`@thyrox/agent/awaySummary.js`
 * NO existe todavía — falla al llamarse, no al importar este archivo).
 *
 * Divergencia declarada: `LocalCommandCall` es el propio de `../../types.js`
 * en vez del de `agent/command.js` (mismo nombre y forma), para no acoplar
 * este archivo a un paquete en construcción concurrente.
 *
 * Cuerpo del comando `/recap` — llama a `generateAwaySummary` bajo demanda.
 */
import type { LocalCommandCall } from '../../types.js'
import { requireAgentAwaySummary } from '../../internal/pendingCrossPackageDeps.js'

export const call: LocalCommandCall = async (_args, context) => {
  if (context.messages.length === 0) {
    return {
      type: 'text',
      value: 'Nothing to recap yet — send a message first.',
    }
  }
  try {
    const { generateAwaySummary } = requireAgentAwaySummary()
    const summary = await generateAwaySummary(
      context.messages,
      context.abortController.signal,
    )
    if (context.abortController.signal.aborted) {
      return { type: 'text', value: 'Recap cancelled.' }
    }
    if (summary === null) {
      return {
        type: 'text',
        value: "Couldn't generate a recap. Run with --debug for details.",
      }
    }
    return { type: 'text', value: summary }
  } catch (err) {
    if (context.abortController.signal.aborted) {
      return { type: 'text', value: 'Recap cancelled.' }
    }
    throw err
  }
}
