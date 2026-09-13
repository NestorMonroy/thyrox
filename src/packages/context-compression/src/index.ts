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

const TOPE_SIN_FILTRO = 2000
const RETROCESO = 80

function esPalabra(c: string | undefined): boolean {
  return c !== undefined && /\S/.test(c)
}

function retrocederALimiteDePalabra(texto: string, corte: number): number {
  if (!esPalabra(texto[corte - 1]) || !esPalabra(texto[corte])) return corte
  const inicioVentana = Math.max(0, corte - RETROCESO)
  for (let i = corte; i > inicioVentana; i--) if (!esPalabra(texto[i - 1])) return i - 1
  const finVentana = Math.min(texto.length, corte + RETROCESO)
  for (let i = corte; i < finVentana; i++) if (!esPalabra(texto[i])) return i
  return corte
}

export type CompressToolResultOutcome = {
  texto: string
  motor: 'rtk' | 'tope-generico' | 'sin-cambio'
  filtroId: string | null
}

/** Comprime el `content` de UN tool_result. Ver el docstring del modulo. */
export function compressToolResult(texto: string, comando?: string | null): CompressToolResultOutcome {
  if (!texto) return { texto, motor: 'sin-cambio', filtroId: null }

  const rtk = applyRtk(texto, comando)
  if (rtk.filtroId && rtk.reglasAplicadas.length > 0) {
    return { texto: rtk.texto, motor: 'rtk', filtroId: rtk.filtroId }
  }

  if (texto.length <= TOPE_SIN_FILTRO) return { texto, motor: 'sin-cambio', filtroId: null }
  const corte = retrocederALimiteDePalabra(texto, TOPE_SIN_FILTRO)
  return { texto: texto.slice(0, corte) + '\n...[truncado]', motor: 'tope-generico', filtroId: null }
}

export {
  collapseWhitespace,
  compressToolResults,
  removeRedundantContent,
  applyLiteCompression,
  normalizeWhitespace,
} from './lite.ts'
export type { LiteResult } from './lite.ts'
export { applyRtk, RTK_FILTERS } from './rtk/index.ts'
export type { RtkApplyResult } from './rtk/index.ts'
