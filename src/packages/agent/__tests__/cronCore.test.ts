/**
 * Porte de `ccnmt: packages/agent/__tests__/cronCore.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import {
  computeNextCronRun,
  cronToHuman,
  parseCronExpression,
} from '../internal/cronCore.js'

describe('parseCronExpression — comodines', () => {
  test('todos los comodines se expanden al rango completo', () => {
    const r = parseCronExpression('* * * * *')
    expect(r?.minute).toHaveLength(60)
    expect(r?.hour).toHaveLength(24)
    expect(r?.dayOfMonth).toHaveLength(31)
    expect(r?.month).toHaveLength(12)
    expect(r?.dayOfWeek).toHaveLength(7)
  })

  test('paso estrella-slash-N', () => {
    const r = parseCronExpression('*/15 * * * *')
    expect(r?.minute).toEqual([0, 15, 30, 45])
  })

  test('paso estrella-slash-N (divisor grande)', () => {
    const r = parseCronExpression('*/30 * * * *')
    expect(r?.minute).toEqual([0, 30])
  })

  test('estrella-slash-1 equivale al comodín', () => {
    const r = parseCronExpression('*/1 * * * *')
    expect(r?.minute).toHaveLength(60)
  })
})

describe('parseCronExpression — valores únicos', () => {
  test('minuto único', () => {
    expect(parseCronExpression('30 * * * *')?.minute).toEqual([30])
  })
  test('hora 0 (medianoche)', () => {
    expect(parseCronExpression('0 0 * * *')?.hour).toEqual([0])
  })
  test('día 31', () => {
    expect(parseCronExpression('0 0 31 * *')?.dayOfMonth).toEqual([31])
  })
  test('dayOfWeek 7 → normalizado a 0 (domingo)', () => {
    // Peculiaridad POSIX cron: 7 es alias de domingo (0). Contrato crítico.
    expect(parseCronExpression('0 0 * * 7')?.dayOfWeek).toEqual([0])
  })
})

describe('parseCronExpression — rangos + listas', () => {
  test('el rango se expande incluyendo ambos extremos', () => {
    expect(parseCronExpression('0-5 * * * *')?.minute).toEqual([0, 1, 2, 3, 4, 5])
  })

  test('rango con paso', () => {
    expect(parseCronExpression('0-10/2 * * * *')?.minute).toEqual([
      0, 2, 4, 6, 8, 10,
    ])
  })

  test('lista separada por comas', () => {
    expect(parseCronExpression('5,10,15 * * * *')?.minute).toEqual([5, 10, 15])
  })

  test('la lista deduplica y ordena', () => {
    expect(parseCronExpression('15,5,10,5 * * * *')?.minute).toEqual([
      5, 10, 15,
    ])
  })

  test('rango mezclado con valor único en la lista', () => {
    expect(parseCronExpression('0,30-32 * * * *')?.minute).toEqual([
      0, 30, 31, 32,
    ])
  })

  test('dayOfWeek rango 5-7 → [5, 6, 0] (7 normalizado a 0 dentro del rango)', () => {
    expect(parseCronExpression('0 0 * * 5-7')?.dayOfWeek.sort()).toEqual([
      0, 5, 6,
    ])
  })
})

describe('parseCronExpression — entrada inválida', () => {
  test('número de campos incorrecto → null', () => {
    expect(parseCronExpression('* * * *')).toBeNull()
    expect(parseCronExpression('* * * * * *')).toBeNull()
  })

  test('minuto fuera de rango (60) → null', () => {
    expect(parseCronExpression('60 * * * *')).toBeNull()
  })

  test('hora fuera de rango (24) → null', () => {
    expect(parseCronExpression('0 24 * * *')).toBeNull()
  })

  test('día fuera de rango (32) → null', () => {
    expect(parseCronExpression('0 0 32 * *')).toBeNull()
  })

  test('mes fuera de rango (13) → null', () => {
    expect(parseCronExpression('0 0 * 13 *')).toBeNull()
  })

  test('dayOfWeek fuera de rango (8) → null', () => {
    expect(parseCronExpression('0 0 * * 8')).toBeNull()
  })

  test('rango invertido (10-5) → null', () => {
    expect(parseCronExpression('10-5 * * * *')).toBeNull()
  })

  test('paso cero → null', () => {
    expect(parseCronExpression('*/0 * * * *')).toBeNull()
  })

  test('sintaxis basura → null', () => {
    expect(parseCronExpression('@daily')).toBeNull()
    expect(parseCronExpression('foo bar baz qux quux')).toBeNull()
  })

  test('cadena vacía → null', () => {
    expect(parseCronExpression('')).toBeNull()
  })

  test('letras en los campos → null', () => {
    expect(parseCronExpression('MON * * * *')).toBeNull()
  })
})

describe('parseCronExpression — tolerancia a espacios en blanco', () => {
  test('múltiples espacios entre campos', () => {
    const r = parseCronExpression('0    0    *    *    *')
    expect(r?.minute).toEqual([0])
    expect(r?.hour).toEqual([0])
  })
  test('espacio en blanco inicial/final recortado', () => {
    const r = parseCronExpression('  0 0 * * *  ')
    expect(r?.minute).toEqual([0])
  })
  test('los tabs se tratan como espacio en blanco', () => {
    const r = parseCronExpression('0\t0\t*\t*\t*')
    expect(r?.minute).toEqual([0])
  })
})

describe('computeNextCronRun', () => {
  test('cron cada minuto devuelve el minuto siguiente', () => {
    const fields = parseCronExpression('* * * * *')!
    const from = new Date('2026-01-01T12:00:00')
    const next = computeNextCronRun(fields, from)
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThan(from.getTime())
    // Debe estar dentro de 60 segundos.
    expect(next!.getTime() - from.getTime()).toBeLessThanOrEqual(60_000)
  })

  test('cron en punto a las 12:30 → siguiente es 13:00', () => {
    const fields = parseCronExpression('0 * * * *')!
    const from = new Date('2026-01-01T12:30:00')
    const next = computeNextCronRun(fields, from)
    expect(next?.getMinutes()).toBe(0)
    expect(next?.getHours()).toBe(13)
  })

  test('cron diario 9am desde las 8am → hoy a las 9am', () => {
    const fields = parseCronExpression('0 9 * * *')!
    const from = new Date('2026-01-01T08:00:00')
    const next = computeNextCronRun(fields, from)
    expect(next?.getDate()).toBe(1)
    expect(next?.getHours()).toBe(9)
    expect(next?.getMinutes()).toBe(0)
  })

  test('cron diario 9am desde las 10am → mañana a las 9am', () => {
    const fields = parseCronExpression('0 9 * * *')!
    const from = new Date('2026-01-01T10:00:00')
    const next = computeNextCronRun(fields, from)
    expect(next?.getDate()).toBe(2)
    expect(next?.getHours()).toBe(9)
  })

  test('el resultado es estrictamente POSTERIOR a `from` (no igual)', () => {
    // Crítico: `from` mismo no califica aunque coincida con el patrón.
    // De lo contrario el scheduler volvería a disparar el mismo minuto.
    const fields = parseCronExpression('30 12 * * *')!
    const from = new Date('2026-01-01T12:30:00')
    const next = computeNextCronRun(fields, from)
    expect(next!.getTime()).toBeGreaterThan(from.getTime())
  })
})

describe('cronToHuman', () => {
  test('devuelve una cadena legible no vacía para un cron válido', () => {
    const result = cronToHuman('0 9 * * *')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('devuelve la entrada sin cambios o el fallback para un cron inválido', () => {
    const result = cronToHuman('invalid cron expression')
    expect(typeof result).toBe('string')
  })
})
