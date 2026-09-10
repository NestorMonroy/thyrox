/**
 * Cuenta y fecha el uso de cada skill, para poder ordenarlos por relevancia.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/suggestions/skillUsageTracking.ts`
 * (55 líneas). Ese árbol declara `"license": "UNLICENSED"`: se reimplementa el
 * contrato, no se copia el cuerpo.
 *
 * Dos mecanismos, y los dos existen por el mismo motivo — que el registro no
 * cueste más que lo que registra:
 *
 * - **Antirrebote en memoria del proceso.** `saveGlobalConfig` toma un lock,
 *   lee, parsea y escribe. Como el orden usa una semivida de siete días, la
 *   granularidad por debajo del minuto no cambia ningún veredicto: se sale
 *   antes de tocar el disco. El mapa vive lo que vive el proceso, así que un
 *   reinicio vuelve a permitir una escritura inmediata — aceptado.
 * - **Decaimiento exponencial con suelo.** El factor de recencia es
 *   `0.5 ** (días / 7)`, pero acotado por abajo: un skill muy usado hace meses
 *   no cae a cero, conserva una décima parte de su cuenta. Sin ese suelo el
 *   orden sería sólo «lo último», no «lo útil».
 */

import { getGlobalConfig, saveGlobalConfig } from '@thyrox/config'

/** Ventana bajo la cual dos usos del mismo skill no vuelven a tocar el disco. */
const SKILL_USAGE_DEBOUNCE_MS = 60_000

/** Días en los que el peso de un uso cae a la mitad. */
const SKILL_USAGE_HALF_LIFE_DAYS = 7

/** Suelo del factor de recencia: un skill viejo se hunde, no desaparece. */
const MIN_RECENCY_FACTOR = 0.1

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Última escritura por skill, sólo para este proceso. */
const lastWriteBySkill = new Map<string, number>()

/**
 * Anota un uso del skill: incrementa su cuenta y refresca su fecha. Es un
 * no-op si el mismo skill se anotó hace menos de `SKILL_USAGE_DEBOUNCE_MS`.
 */
export function recordSkillUsage(skillName: string): void {
  const now = Date.now()
  const lastWrite = lastWriteBySkill.get(skillName)
  if (lastWrite !== undefined && now - lastWrite < SKILL_USAGE_DEBOUNCE_MS) {
    return
  }
  lastWriteBySkill.set(skillName, now)

  saveGlobalConfig(current => {
    const previous = current.skillUsage?.[skillName]
    return {
      ...current,
      skillUsage: {
        ...current.skillUsage,
        [skillName]: {
          usageCount: (previous?.usageCount ?? 0) + 1,
          lastUsedAt: now,
        },
      },
    }
  })
}

/**
 * Puntúa el skill cruzando cuántas veces se usó con cuánto hace. Devuelve 0
 * cuando no hay registro — que es distinto de «se usó y su peso decayó a algo
 * muy pequeño», porque eso nunca baja de `usageCount * MIN_RECENCY_FACTOR`.
 */
export function getSkillUsageScore(skillName: string): number {
  const usage = getGlobalConfig().skillUsage?.[skillName]
  if (!usage) {
    return 0
  }
  const daysSinceUse = (Date.now() - usage.lastUsedAt) / MS_PER_DAY
  const recencyFactor = 0.5 ** (daysSinceUse / SKILL_USAGE_HALF_LIFE_DAYS)
  return usage.usageCount * Math.max(recencyFactor, MIN_RECENCY_FACTOR)
}

/** Sólo para tests: vacía el antirrebote del proceso. */
export function _test_resetSkillUsageDebounce(): void {
  lastWriteBySkill.clear()
}
