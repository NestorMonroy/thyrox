/**
 * Persistencia de resultados grandes de herramienta a disco en vez de
 * truncarlos.
 *
 * Adaptación de ccnmt `packages/storage/src/toolResultStorage.ts`
 * (1040 líneas).
 *
 * PORTE PARCIAL DECLARADO — sólo se portan cinco símbolos:
 * `getPersistenceThreshold`, `isToolResultContentEmpty`, `generatePreview`,
 * `isPersistError`, `buildLargeToolResultMessage`. Son los que el conjunto
 * de tests portado hasta ahora ejerce — todos puros, sin I/O. El resto del
 * archivo (`maybePersistLargeToolResult`, `persistToolResult`,
 * `processToolResultBlock`, el presupuesto agregado de tool results por
 * mensaje, `createContentReplacementState`, etc.) depende de escritura a
 * disco (`fs/promises`), de `getOriginalCwd`/`getSessionId`
 * (`@thyrox/app-host`, aún sin cross-import — DEC-04) y de
 * `@claude-code-how-works/agent/eventMetadata.js` y
 * `@claude-code-how-works/local-observability`; queda fuera de este porte.
 *
 * Sustitutos y constantes locales (misma razón que en `sessionStorage.ts` —
 * DEC-04, sin cross-import `@thyrox/*` todavía):
 *
 * - `getFeatureValue_CACHED_MAY_BE_STALE` — en la fuente viene de
 *   `@claude-code-how-works/config/feature-flags` (GrowthBook, cacheado).
 *   Aquí es un setter DI de módulo (`setFeatureFlagOverrideFn`), default
 *   "siempre devuelve el fallback" — mismo comportamiento que el propio
 *   stub de `@thyrox/agent: featureFlags.ts` (que tampoco es cross-
 *   importado aquí).
 * - `DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000` — literal verbatim de
 *   `@claude-code-how-works/tool-registry/toolLimits.ts` (constante cuyo
 *   valor ES el contrato).
 * - `PREVIEW_SIZE_BYTES = 2000`, `PERSISTED_OUTPUT_TAG`,
 *   `PERSISTED_OUTPUT_CLOSING_TAG` — literales verbatim de la fuente, misma
 *   razón.
 * - `formatFileSize` — reimplementación local funcionalmente equivalente a
 *   `@claude-code-how-works/output/src/formatters/format.ts::formatFileSize`
 *   (KB/MB/GB con un decimal, sin el sufijo `.0`); no se cruza-importa
 *   porque `@thyrox/*` no expone ese paquete y el original no depende de
 *   nada más que aritmética pura.
 */

/** Ver docstring del módulo — sustituto DI de `getFeatureValue_CACHED_MAY_BE_STALE`. */
let _featureFlagOverride: (flagName: string) => unknown = () => undefined

export function setFeatureFlagOverrideFn(
  fn: (flagName: string) => unknown,
): void {
  _featureFlagOverride = fn
}

function getFeatureValue<T>(flagName: string, fallback: T): T {
  const override = _featureFlagOverride(flagName)
  return override === undefined ? fallback : (override as T)
}

/** Literal verbatim — ver docstring del módulo. */
const DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000

/** Literal verbatim — ver docstring del módulo. */
const PREVIEW_SIZE_BYTES = 2000

/** Literal verbatim — ver docstring del módulo. */
export const PERSISTED_OUTPUT_TAG = '<persisted-output>'
export const PERSISTED_OUTPUT_CLOSING_TAG = '</persisted-output>'

/**
 * Mapa de override de GrowthBook: nombre de herramienta -> umbral de
 * persistencia (chars). Cuando el nombre de la herramienta está presente en
 * este mapa, ese valor se usa directamente como el umbral efectivo, sin el
 * clamp de `Math.min()` contra el default de 50k. Las herramientas
 * ausentes del mapa usan el fallback hardcodeado. Default del flag es
 * `{}` (sin overrides == comportamiento sin cambios).
 */
const PERSIST_THRESHOLD_OVERRIDE_FLAG = 'tengu_satin_quoll'

/**
 * Resuelve el umbral de persistencia efectivo para una herramienta. El
 * override de GrowthBook gana cuando está presente; si no, cae al límite
 * por-herramienta declarado, acotado por el default global.
 *
 * Defensivo: el caché de GrowthBook devuelve
 * `cached !== undefined ? cached : default`, así que un flag servido como
 * `null` se filtra. Se protege con optional chaining y un chequeo typeof
 * para que cualquier valor de flag que no sea objeto (null, string,
 * número) caiga al default hardcodeado en vez de reventar en el índice o
 * devolver 0.
 */
export function getPersistenceThreshold(
  toolName: string,
  declaredMaxResultSizeChars: number,
): number {
  // Infinity = opt-out duro. Read acota su propio tamaño vía maxTokens;
  // persistir su salida a un archivo que el modelo relee con Read sería
  // circular. Se chequea ANTES del override de GB para que
  // tengu_satin_quoll no pueda forzarlo de nuevo.
  if (!Number.isFinite(declaredMaxResultSizeChars)) {
    return declaredMaxResultSizeChars
  }
  const overrides = getFeatureValue<Record<string, number> | null>(
    PERSIST_THRESHOLD_OVERRIDE_FLAG,
    {},
  )
  const override = overrides?.[toolName]
  if (
    typeof override === 'number' &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override
  }
  return Math.min(declaredMaxResultSizeChars, DEFAULT_MAX_RESULT_SIZE_CHARS)
}

/** Resultado de persistir un resultado de herramienta a disco. */
export type PersistedToolResult = {
  filepath: string
  originalSize: number
  isJson: boolean
  preview: string
  hasMore: boolean
}

/** Resultado de error cuando la persistencia falla. */
export type PersistToolResultError = {
  error: string
}

/**
 * Reimplementación local funcionalmente equivalente de
 * `@claude-code-how-works/output/src/formatters/format.ts::formatFileSize` —
 * ver docstring del módulo.
 */
function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) {
    return `${sizeInBytes} bytes`
  }
  if (kb < 1024) {
    return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}

/**
 * Construye un mensaje para resultados de herramienta grandes con preview.
 */
export function buildLargeToolResultMessage(
  result: PersistedToolResult,
): string {
  let message = `${PERSISTED_OUTPUT_TAG}\n`
  message += `Output too large (${formatFileSize(result.originalSize)}). Full output saved to: ${result.filepath}\n\n`
  message += `Preview (first ${formatFileSize(PREVIEW_SIZE_BYTES)}):\n`
  message += result.preview
  message += result.hasMore ? '\n...\n' : '\n'
  message += PERSISTED_OUTPUT_CLOSING_TAG
  return message
}

interface ToolResultTextBlock {
  type: 'text'
  text?: string
}

/** El subconjunto de `ToolResultBlockParam['content']` que este módulo lee. */
export type ToolResultContent =
  | string
  | Array<ToolResultTextBlock | { type: string }>
  | null
  | undefined

/**
 * True cuando el contenido de un tool_result está vacío o efectivamente
 * vacío. Cubre: undefined/null/'', strings sólo de espacios, arrays vacíos,
 * y arrays cuyos únicos bloques son de texto con texto vacío/de espacios.
 * Los bloques que no son de texto (imágenes, tool_reference) se tratan como
 * no-vacíos.
 */
export function isToolResultContentEmpty(content: ToolResultContent): boolean {
  if (!content) return true
  if (typeof content === 'string') return content.trim() === ''
  if (!Array.isArray(content)) return false
  if (content.length === 0) return true
  return content.every(
    block =>
      typeof block === 'object' &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block &&
      (typeof (block as ToolResultTextBlock).text !== 'string' ||
        (block as ToolResultTextBlock).text!.trim() === ''),
  )
}

/**
 * Genera un preview del contenido, truncando en un límite de salto de línea
 * cuando es posible.
 */
export function generatePreview(
  content: string,
  maxBytes: number,
): { preview: string; hasMore: boolean } {
  if (content.length <= maxBytes) {
    return { preview: content, hasMore: false }
  }

  // Encuentra el último salto de línea dentro del límite para evitar
  // cortar a mitad de línea.
  const truncated = content.slice(0, maxBytes)
  const lastNewline = truncated.lastIndexOf('\n')

  // Si se encontró un salto de línea razonablemente cerca del límite, se
  // usa. Si no, cae al límite exacto.
  const cutPoint = lastNewline > maxBytes * 0.5 ? lastNewline : maxBytes

  return { preview: content.slice(0, cutPoint), hasMore: true }
}

/**
 * Type guard para chequear si el resultado de persistir es un error.
 */
export function isPersistError(
  result: PersistedToolResult | PersistToolResultError,
): result is PersistToolResultError {
  return 'error' in result
}
