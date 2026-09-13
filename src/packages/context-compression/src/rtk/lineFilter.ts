/**
 * Motor de filtrado por lineas -- porte nativo de
 * `open-sse/services/compression/engines/rtk/lineFilter.ts` (OmniRoute,
 * MIT), recortado al subconjunto de `RtkFilter` que este pase declara
 * completo (ver `types.ts`). El orden de las etapas es el de la fuente:
 * ANSI -> drop -> include -> collapse -> dedupe -> truncado inteligente.
 */
import type { RtkFilter, LineFilterResult } from './types.ts'
import { smartTruncate } from './smartTruncate.ts'

const ANSI_PATTERN = new RegExp('\\x1b\\[[0-?]*[ -/]*[@-~]', 'g')

export function stripAnsi(texto: string): string {
  return texto.replace(ANSI_PATTERN, '')
}

export function applyLineFilter(texto: string, filtro: RtkFilter): LineFilterResult {
  const reglasAplicadas: string[] = []
  let lineas = stripAnsi(texto).split(/\r?\n/)
  // Un texto que termina en salto de linea produce un ultimo elemento vacio
  // al partir -- artefacto del split, no una linea real del contenido. Se
  // quita UNA sola vez (no es lo mismo que "sin lineas en blanco": esas
  // siguen filtrables por `dropPatterns`/`collapsePatterns` como cualquier
  // otra).
  if (lineas.length > 1 && lineas.at(-1) === '') lineas = lineas.slice(0, -1)
  const lineasOriginales = lineas.length

  if (filtro.dropPatterns.length > 0) {
    const antes = lineas.length
    lineas = lineas.filter((l) => !filtro.dropPatterns.some((p) => p.test(l)))
    if (lineas.length !== antes) reglasAplicadas.push(`${filtro.id}:drop`)
  }

  if (filtro.includePatterns.length > 0) {
    const conservadas = lineas.filter((l) => filtro.includePatterns.some((p) => p.test(l)))
    if (conservadas.length > 0) {
      lineas = conservadas
      reglasAplicadas.push(`${filtro.id}:include`)
    }
  }

  if (filtro.collapsePatterns.length > 0) {
    const vistas = new Set<string>()
    lineas = lineas.filter((l) => {
      if (!filtro.collapsePatterns.some((p) => p.test(l))) return true
      const clave = l.trim()
      if (vistas.has(clave)) return false
      vistas.add(clave)
      return true
    })
    reglasAplicadas.push(`${filtro.id}:collapse`)
  }

  if (filtro.deduplicate) {
    const sinRepetirConsecutiva: string[] = []
    for (const l of lineas) {
      if (sinRepetirConsecutiva.at(-1) !== l) sinRepetirConsecutiva.push(l)
    }
    if (sinRepetirConsecutiva.length !== lineas.length) reglasAplicadas.push(`${filtro.id}:deduplicate`)
    lineas = sinRepetirConsecutiva
  }

  const unido = lineas.join('\n')
  if (lineas.length <= filtro.maxLines) {
    const salida = unido.trim().length === 0 && filtro.onEmpty ? filtro.onEmpty : unido
    return { texto: salida, lineasQuitadas: Math.max(0, lineasOriginales - lineas.length), reglasAplicadas }
  }

  const resultado = smartTruncate(unido, {
    maxLines: filtro.maxLines,
    headLines: filtro.headLines,
    tailLines: filtro.tailLines,
    priorityPatterns: filtro.errorPatterns,
  })
  if (resultado.truncado) reglasAplicadas.push(`${filtro.id}:truncate`)
  const salida = resultado.texto.trim().length === 0 && filtro.onEmpty ? filtro.onEmpty : resultado.texto
  return {
    texto: salida,
    lineasQuitadas: Math.max(0, lineasOriginales - salida.split(/\r?\n/).length),
    reglasAplicadas,
  }
}
