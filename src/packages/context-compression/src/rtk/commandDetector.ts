/**
 * Deteccion de que filtro aplica -- version SIMPLIFICADA del detector de
 * OmniRoute (`commandDetector.ts`, MIT): la fuente separa una lista de
 * "detectores" de la lista de "filtros" y las cruza; aqui el filtro YA
 * declara su propio `match` (comandos + patrones de contenido), asi que la
 * puntuacion se hace directo contra el registro de filtros -- una lista
 * menos que sincronizar, mismo criterio que `calibration-verified-numbers.md`
 * (una segunda fuente de verdad es lo que se evita).
 *
 * Puntuacion identica a la fuente: 0.55 si el comando matchea, +0.25 por
 * cada patron de contenido que matchea (tope 1.0). Empate -> gana `priority`.
 */
import type { RtkFilter, CommandDetectionResult } from './types.ts'

const PREFIJO_COMANDO = /^[$>]?\s*[\w./-]+(?:\s+[\w./-]+){0,3}/

/** El comando de la primera linea no vacia, si la salida lo trae como eco. */
export function detectCommandFromText(texto: string): string | null {
  const primeras = texto.split(/\r?\n/).slice(0, 4)
  for (const linea of primeras) {
    const recortada = linea.trim().replace(/^\$\s+/, '')
    if (!recortada) continue
    const m = PREFIJO_COMANDO.exec(recortada)
    if (m) return m[0]
  }
  return null
}

export function selectFilter(
  texto: string,
  filtros: RtkFilter[],
  comando?: string | null,
): { filtro: RtkFilter; deteccion: CommandDetectionResult } | null {
  const comandoDetectado = (comando?.trim() || detectCommandFromText(texto) || '') || null
  let mejor: { filtro: RtkFilter; confianza: number } | null = null

  for (const filtro of filtros) {
    const comandoMatchea =
      comandoDetectado !== null && filtro.match.commands.some((p) => p.test(comandoDetectado))
    const patronesQueMatchean = filtro.match.patterns.filter((p) => p.test(texto)).length
    if (!comandoMatchea && patronesQueMatchean === 0) continue

    const confianza = Math.min(1, (comandoMatchea ? 0.55 : 0) + patronesQueMatchean * 0.25)
    if (
      !mejor ||
      confianza > mejor.confianza ||
      (confianza === mejor.confianza && filtro.priority > mejor.filtro.priority)
    ) {
      mejor = { filtro, confianza }
    }
  }

  if (!mejor) return null
  return {
    filtro: mejor.filtro,
    deteccion: { tipo: mejor.filtro.id, comando: comandoDetectado, confianza: mejor.confianza },
  }
}
