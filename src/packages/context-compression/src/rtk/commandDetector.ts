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

const COMMAND_PREFIX = /^[$>]?\s*[\w./-]+(?:\s+[\w./-]+){0,3}/

/** El comando de la primera linea no vacia, si la salida lo trae como eco. */
export function detectCommandFromText(text: string): string | null {
  const firstLines = text.split(/\r?\n/).slice(0, 4)
  for (const line of firstLines) {
    const trimmed = line.trim().replace(/^\$\s+/, '')
    if (!trimmed) continue
    const m = COMMAND_PREFIX.exec(trimmed)
    if (m) return m[0]
  }
  return null
}

export function selectFilter(
  text: string,
  filters: RtkFilter[],
  command?: string | null,
): { filter: RtkFilter; detection: CommandDetectionResult } | null {
  const detectedCommand = (command?.trim() || detectCommandFromText(text) || '') || null
  let best: { filter: RtkFilter; confidence: number } | null = null

  for (const filter of filters) {
    const commandMatches =
      detectedCommand !== null && filter.match.commands.some((p) => p.test(detectedCommand))
    const matchingPatternCount = filter.match.patterns.filter((p) => p.test(text)).length
    if (!commandMatches && matchingPatternCount === 0) continue

    const confidence = Math.min(1, (commandMatches ? 0.55 : 0) + matchingPatternCount * 0.25)
    if (
      !best ||
      confidence > best.confidence ||
      (confidence === best.confidence && filter.priority > best.filter.priority)
    ) {
      best = { filter, confidence }
    }
  }

  if (!best) return null
  return {
    filter: best.filter,
    detection: { type: best.filter.id, command: detectedCommand, confidence: best.confidence },
  }
}
