/**
 * Porte RECORTADO de `normalizeProviderSpecificData` en OmniRoute
 * `src/lib/providers/requestDefaults.ts` (MIT). NO es la funcion completa
 * de la fuente -- es la unica regla de campo que
 * `tests/unit/claude-extra-usage.test.ts` ejercita:
 *
 *   normalizeProviderSpecificData("claude", { blockExtraUsage: "nope", tag: "x" })
 *     -> { tag: "x" }   // blockExtraUsage no-booleano se descarta; el resto pasa intacto
 *
 * DIVERGENCIA DE ALCANCE, declarada -- lo que la fuente ADEMAS normaliza y
 * este porte NO reproduce, cada uno porque depende de un modulo de dominio
 * de OmniRoute que este arbol no tiene (multi-tenant SaaS gateway, no el
 * dominio de thyrox):
 *
 * - `reasoningEffort`/`serviceTier` cuando `provider === "codex"`.
 * - `context1m`/`redactThinking`/`summarizeThinking` para el prefijo
 *   `anthropic-compatible-cc-*`.
 * - Normalizacion anidada de `requestDefaults`/`cache`.
 * - `openaiStoreEnabled`, `preserveEncryptedReasoning`, `disableCooling`,
 *   `autoFetchModels`, `timeoutMs` (chequeos de tipo puntuales).
 * - `peakHourProtection` (`@/lib/providers/peakHourProtection`).
 * - `preset` de OpenRouter (`@/shared/constants/openRouterPreset`).
 * - `region` de Bedrock (validacion de patron AWS).
 * - `tag`/`tags` (recorte de espacios / `@/domain/tagRouter`).
 * - `excludedModels`/`excluded_models` (`@/domain/connectionModelRules`).
 * - `customHeaders` (saneo contra la lista negra de
 *   `@/shared/constants/upstreamHeaders`).
 *
 * Si alguno de estos vuelve a hacer falta, se porta como su propio modulo
 * `claudeExtraUsage*` hermano -- no se agranda este archivo con
 * preocupaciones que el ejemplo portado no pedia.
 */

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

/**
 * Copia superficial del registro con la unica regla de campo portada:
 * `blockExtraUsage` sobrevive solo si es un booleano real; de lo contrario
 * se elimina. Devuelve `undefined` cuando el registro de entrada esta vacio
 * o cuando, tras la limpieza, no queda ninguna clave -- igual que la fuente.
 */
export function normalizeProviderSpecificData(
  _provider: string | null | undefined,
  value: unknown,
): JsonRecord | undefined {
  const record = asRecord(value)
  if (Object.keys(record).length === 0) return undefined

  const normalized: JsonRecord = { ...record }

  if ('blockExtraUsage' in normalized && typeof normalized.blockExtraUsage !== 'boolean') {
    delete normalized.blockExtraUsage
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}
