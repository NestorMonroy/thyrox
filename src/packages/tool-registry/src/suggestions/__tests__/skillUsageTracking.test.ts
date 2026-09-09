/**
 * La mitad ROJA de `skillUsageTracking`.
 *
 * Procedencia del SUJETO:
 * `ccnmt: packages/tool-registry/src/suggestions/skillUsageTracking.ts`. Los
 * casos son propios —ese árbol declara `"license": "UNLICENSED"`.
 *
 * DÓNDE SE ESCRIBE, Y POR QUÉ NO SE SUSTITUYE `config`. `saveGlobalConfig` trae
 * su propio modo de prueba: con `NODE_ENV === 'test'` y sin ruta explícita
 * lee y escribe un objeto en memoria en vez del archivo del usuario
 * (`config/global/config.ts:792,831`). `bun test` fija `NODE_ENV=test`, así que
 * el sujeto corre contra esa memoria sin tocar el disco.
 *
 * Eso NO es comodidad: `mock.module` en bun 1.3.11 no se puede deshacer y no se
 * queda en su archivo —medido en este mismo paquete al portar `pdf.ts`—, así
 * que sustituir `config` envenenaría las otras 23 suites del paquete. La
 * costura del sujeto es la que su dependencia ya declara.
 *
 * Consecuencia: la memoria es COMPARTIDA por todo el proceso de test, así que
 * cada caso usa un nombre de skill propio y ninguno afirma sobre el mapa entero.
 *
 * Tres costuras con anulación, y las tres se corrieron:
 *
 * 1. **El antirrebote de un minuto** — Anulación: quitar la salida temprana y
 *    cae **1** caso, el del segundo uso inmediato. Es lo que evita un lock +
 *    lectura + escritura por cada invocación de un skill.
 * 2. **El suelo del factor de recencia** — `Math.max(..., 0.1)`. Anulación:
 *    quitarlo y cae **1** caso, el del skill muy usado hace un año, cuya
 *    puntuación caería a un valor indistinguible de cero.
 * 3. **La semivida de siete días** — Anulación: cambiarla a un día y caen **2**
 *    casos, el 8 y el 9: los dos que fijan la curva, a una y a dos semividas.
 *
 * Métrica: la puntuación devuelta y el contenido de `skillUsage` en la config
 * de prueba, con el reloj real y fechas fabricadas hacia atrás.
 * Ciega a: la contención del lock del archivo real, que el modo de prueba no
 * ejerce; y al vencimiento del antirrebote, que exigiría esperar un minuto.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { getGlobalConfig, saveGlobalConfig } from '@thyrox/config'
import {
  _test_resetSkillUsageDebounce,
  getSkillUsageScore,
  recordSkillUsage,
} from '../skillUsageTracking.js'

const DAY_MS = 1000 * 60 * 60 * 24

/** Siembra un uso con una fecha fabricada, sin pasar por el antirrebote. */
function seedUsage(skill: string, usageCount: number, daysAgo: number): void {
  saveGlobalConfig(current => ({
    ...current,
    skillUsage: {
      ...current.skillUsage,
      [skill]: { usageCount, lastUsedAt: Date.now() - daysAgo * DAY_MS },
    },
  }))
}

beforeEach(() => {
  _test_resetSkillUsageDebounce()
})

describe('recordSkillUsage — la cuenta y su antirrebote', () => {
  test('1. el primer uso siembra la entrada con cuenta 1', () => {
    recordSkillUsage('rec-primero')
    const usage = getGlobalConfig().skillUsage?.['rec-primero']
    expect(usage?.usageCount).toBe(1)
    expect(usage?.lastUsedAt).toBeGreaterThan(0)
  })

  test('2. un segundo uso inmediato NO incrementa: lo para el antirrebote', () => {
    recordSkillUsage('rec-rebote')
    recordSkillUsage('rec-rebote')
    recordSkillUsage('rec-rebote')
    expect(getGlobalConfig().skillUsage?.['rec-rebote']?.usageCount).toBe(1)
  })

  test('3. tras vaciar el antirrebote, el uso siguiente sí incrementa', () => {
    recordSkillUsage('rec-tras-vaciar')
    _test_resetSkillUsageDebounce()
    recordSkillUsage('rec-tras-vaciar')
    expect(getGlobalConfig().skillUsage?.['rec-tras-vaciar']?.usageCount).toBe(2)
  })

  test('4. el antirrebote es POR skill, no global', () => {
    recordSkillUsage('rec-uno')
    recordSkillUsage('rec-otro')
    expect(getGlobalConfig().skillUsage?.['rec-uno']?.usageCount).toBe(1)
    expect(getGlobalConfig().skillUsage?.['rec-otro']?.usageCount).toBe(1)
  })

  test('5. registrar uno no borra los demás', () => {
    recordSkillUsage('rec-vecino-a')
    _test_resetSkillUsageDebounce()
    recordSkillUsage('rec-vecino-b')
    expect(getGlobalConfig().skillUsage?.['rec-vecino-a']).toBeDefined()
    expect(getGlobalConfig().skillUsage?.['rec-vecino-b']).toBeDefined()
  })
})

describe('getSkillUsageScore — frecuencia cruzada con recencia', () => {
  test('6. un skill sin registro puntúa 0', () => {
    expect(getSkillUsageScore('score-nunca-usado')).toBe(0)
  })

  test('7. un uso de hoy vale prácticamente su cuenta entera', () => {
    seedUsage('score-hoy', 10, 0)
    expect(getSkillUsageScore('score-hoy')).toBeCloseTo(10, 5)
  })

  test('8. a los siete días vale la mitad: ésa es la semivida', () => {
    seedUsage('score-semivida', 8, 7)
    expect(getSkillUsageScore('score-semivida')).toBeCloseTo(4, 3)
  })

  test('9. a los catorce días vale un cuarto', () => {
    seedUsage('score-dos-semividas', 8, 14)
    expect(getSkillUsageScore('score-dos-semividas')).toBeCloseTo(2, 3)
  })

  test('10. el suelo impide que un skill muy usado desaparezca', () => {
    // Con un año de antigüedad el decaimiento crudo daría ~1e-16: sin suelo,
    // cien usos y cero usos serían indistinguibles en el orden.
    seedUsage('score-viejo-pero-usado', 100, 365)
    expect(getSkillUsageScore('score-viejo-pero-usado')).toBeCloseTo(10, 5)
  })

  test('11. con la misma antigüedad, ordena por cuenta', () => {
    seedUsage('score-mucho', 20, 3)
    seedUsage('score-poco', 2, 3)
    expect(getSkillUsageScore('score-mucho')).toBeGreaterThan(
      getSkillUsageScore('score-poco'),
    )
  })

  test('12. con la misma cuenta, ordena por recencia', () => {
    seedUsage('score-reciente', 5, 1)
    seedUsage('score-antiguo', 5, 20)
    expect(getSkillUsageScore('score-reciente')).toBeGreaterThan(
      getSkillUsageScore('score-antiguo'),
    )
  })
})
