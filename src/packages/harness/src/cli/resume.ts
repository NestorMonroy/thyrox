/**
 * Selector de reanudación (T-041).
 *
 * Reanudar exige elegir, y elegir exige ver qué había en cada sesión. Un id
 * suelto no lo dice; por eso cada opción trae el primer texto del usuario, que
 * es lo más cerca de un título que un transcript tiene sin pedirle un resumen
 * a un modelo.
 */
import { readFileSync } from 'node:fs'
import { indexSessions } from '../sessions/index.ts'

export type ResumeChoice = {
  id: string
  label: string
  model: string | null
  turns: number
  lastAt: string
  summary: string
  forkedFrom: string | null
}

/** El primer texto que el usuario escribió — lo que la sesión iba a resolver. */
function primerTextoDeUsuario(path: string): string {
  try {
    for (const cruda of readFileSync(path, 'utf8').split('\n')) {
      if (!cruda.trim()) continue
      const l = JSON.parse(cruda) as { type?: string; message?: { content?: { type?: string; text?: string }[] } }
      if (l.type !== 'user') continue
      const t = l.message?.content?.find((b) => b.type === 'text')?.text
      if (t) return t.length > 80 ? `${t.slice(0, 80)}…` : t
    }
  } catch {
    // transcript ilegible: la sesión sigue siendo elegible, sólo sin título
  }
  return '(sin texto de usuario)'
}

/** Las sesiones del directorio, de la más reciente a la más antigua. */
export function resumeChoices(transcriptDir: string, limit = 20): ResumeChoice[] {
  return indexSessions(transcriptDir)
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
    .slice(0, limit)
    .map((f) => {
      const summary = primerTextoDeUsuario(f.path)
      const origen = f.forkedFrom ? ` · bifurcada de ${f.forkedFrom.slice(0, 8)}` : ''
      return {
        id: f.id,
        label: `${f.lastAt} · ${f.model ?? 'modelo desconocido'} · ${f.turns} turnos${origen} · ${summary}`,
        model: f.model,
        turns: f.turns,
        lastAt: f.lastAt,
        summary,
        forkedFrom: f.forkedFrom,
      }
    })
}
