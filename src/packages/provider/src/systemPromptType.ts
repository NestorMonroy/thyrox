/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/systemPromptType.ts` —
 * sus 2 exportaciones, ninguna omitida.
 *
 * Tipo branded para arrays de system prompt. Módulo deliberadamente sin
 * dependencias, para poder importarse desde cualquier parte sin riesgo de
 * inicialización circular.
 */

export type SystemPrompt = readonly string[] & {
  readonly __brand: 'SystemPrompt'
}

export function asSystemPrompt(value: readonly string[]): SystemPrompt {
  return value as SystemPrompt
}
