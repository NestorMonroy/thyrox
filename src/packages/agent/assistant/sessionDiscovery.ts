/**
 * Porte COMPLETO de `ccnmt: packages/agent/assistant/sessionDiscovery.ts`.
 *
 * La fuente misma es un stub auto-generado: `discoverAssistantSessions`
 * siempre resuelve un arreglo vacío, sin descubrimiento real de sesiones
 * detrás. El porte lo refleja tal cual.
 *
 * `assistant/sessionHistory.ts` (hermano, también ausente) NO es un stub en
 * la fuente — queda fuera de este pase.
 */
export type AssistantSession = { id: string; [key: string]: unknown }

export const discoverAssistantSessions: () => Promise<AssistantSession[]> =
  () => Promise.resolve([])
