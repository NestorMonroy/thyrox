/**
 * Compresion de contexto para @thyrox/agent -- punto de entrada unico.
 *
 * `compressToolResult` es lo que se invoca desde el bucle, justo despues de
 * `tool.run()` y antes de que el contenido entre al historial de mensajes
 * (ver `agent/loop/index.ts::ejecutar`, variable `salida.content`):
 *
 *   1. Intenta RTK -- si el comando/la salida matchean un filtro conocido,
 *      recorta por lineas preservando errores/resumen.
 *   2. Si RTK no matchea nada (confianza 0), cae a un tope de longitud tipo
 *      Lite (`compressToolResults` de un solo mensaje), para no dejar pasar
 *      sin limite una salida que ningun filtro reconoce.
 *
 * `applyLiteCompression` opera sobre el HISTORIAL completo (varios mensajes
 * a la vez) y se usa aparte, en el punto donde se arma el `ProviderRequest`
 * -- ver el docstring de `package.json` para el alcance completo y lo
 * deferido de este pase.
 */
import { applyRtk } from './rtk/index.ts'

const NO_FILTER_CAP = 2000
const LOOKBACK = 80

function isWordChar(c: string | undefined): boolean {
  return c !== undefined && /\S/.test(c)
}

function backOffToWordBoundary(text: string, cutIndex: number): number {
  if (!isWordChar(text[cutIndex - 1]) || !isWordChar(text[cutIndex])) return cutIndex
  const windowStart = Math.max(0, cutIndex - LOOKBACK)
  for (let i = cutIndex; i > windowStart; i--) if (!isWordChar(text[i - 1])) return i - 1
  const windowEnd = Math.min(text.length, cutIndex + LOOKBACK)
  for (let i = cutIndex; i < windowEnd; i++) if (!isWordChar(text[i])) return i
  return cutIndex
}

export type CompressToolResultOutcome = {
  text: string
  engine: 'rtk' | 'generic-cap' | 'unchanged'
  filterId: string | null
}

/** Comprime el `content` de UN tool_result. Ver el docstring del modulo. */
export function compressToolResult(text: string, command?: string | null): CompressToolResultOutcome {
  if (!text) return { text, engine: 'unchanged', filterId: null }

  const rtk = applyRtk(text, command)
  if (rtk.filterId && rtk.rulesApplied.length > 0) {
    return { text: rtk.text, engine: 'rtk', filterId: rtk.filterId }
  }

  if (text.length <= NO_FILTER_CAP) return { text, engine: 'unchanged', filterId: null }
  const cutIndex = backOffToWordBoundary(text, NO_FILTER_CAP)
  return { text: text.slice(0, cutIndex) + '\n...[truncado]', engine: 'generic-cap', filterId: null }
}

export {
  collapseWhitespace,
  compressToolResults,
  removeRedundantContent,
  applyLiteCompression,
  normalizeWhitespace,
  dedupSections,
} from './lite.ts'
export type { LiteResult, NamedSection, DedupSectionsResult } from './lite.ts'
export { applyRtk, RTK_FILTERS } from './rtk/index.ts'
export type { RtkApplyResult } from './rtk/index.ts'
