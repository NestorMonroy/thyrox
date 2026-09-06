/**
 * Porte de `ccnmt: packages/agent/__tests__/cronTasksJitter.test.ts`.
 *
 * Tests de los ayudantes de scheduling de tareas cron — la lógica de
 * jitter determinístico que evita picos de "manada estampida" (thundering
 * herd) de inferencia cuando muchas sesiones agendan `0 * * * *` al mismo
 * tiempo.
 *
 * Una matemática de jitter equivocada implica o bien esparcimiento cero
 * (el pico de :00 vuelve para toda la flota) o retraso descontrolado (la
 * tarea recurrente dispara horas tarde).
 */
import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_CRON_JITTER_CONFIG,
  findMissedTasks,
  jitteredNextCronRunMs,
  nextCronRunMs,
  oneShotJitteredNextCronRunMs,
} from '../internal/cronTasksCore.js'

describe('nextCronRunMs', () => {
  test('el cron horario devuelve la siguiente marca :00 estrictamente posterior a ahora', () => {
    // 2026-04-30 14:30:00 UTC → siguiente 0 * * * * = 2026-04-30 15:00 UTC
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const next = nextCronRunMs('0 * * * *', t)
    expect(next).not.toBeNull()
    expect(next!).toBeGreaterThan(t)
    // Debe estar dentro de los siguientes 60 minutos.
    expect(next! - t).toBeLessThanOrEqual(60 * 60 * 1000)
  })

  test('un cron inválido devuelve null', () => {
    expect(nextCronRunMs('not a cron', Date.now())).toBeNull()
  })

  test('el cron cada minuto devuelve el minuto siguiente', () => {
    const t = Date.UTC(2026, 3, 30, 14, 30, 30) // :30s dentro de un minuto
    const next = nextCronRunMs('* * * * *', t)
    expect(next).not.toBeNull()
    // El siguiente minuto dispara dentro de 60s.
    expect(next! - t).toBeLessThanOrEqual(60 * 1000)
  })

  test('semántica estricta "posterior a": el cron en fromMs exacto NO coincide', () => {
    // 0 * * * * exactamente a :00 → la siguiente coincidencia es :00 de la
    // hora SIGUIENTE.
    const exact = Date.UTC(2026, 3, 30, 14, 0, 0)
    const next = nextCronRunMs('0 * * * *', exact)
    expect(next!).toBeGreaterThan(exact)
  })
})

describe('jitteredNextCronRunMs — jitter recurrente determinístico', () => {
  test('mismo taskId + mismo fromMs → misma hora de disparo (determinístico)', () => {
    const t = Date.now()
    const a = jitteredNextCronRunMs('0 * * * *', t, 'abcdef01')
    const b = jitteredNextCronRunMs('0 * * * *', t, 'abcdef01')
    expect(a).toBe(b)
  })

  test('distinto taskId + mismo fromMs → potencialmente distinta hora de disparo', () => {
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const a = jitteredNextCronRunMs('0 * * * *', t, '00000000') // hashea cerca de 0
    const b = jitteredNextCronRunMs('0 * * * *', t, 'ffffffff') // hashea cerca de 1
    expect(a).not.toBe(b)
  })

  test('el jitter es SOLO hacia adelante (retraso, no adelanto)', () => {
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const baseline = nextCronRunMs('0 * * * *', t)!
    const jittered = jitteredNextCronRunMs('0 * * * *', t, 'ffffffff')!
    expect(jittered).toBeGreaterThanOrEqual(baseline)
  })

  test('el jitter respeta el tope recurringCapMs', () => {
    // Cron diario: el hueco entre disparos es 24h. recurringFrac=0.1 → 2.4h
    // sería un jitter enorme, pero capMs=15min debe acotarlo.
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const baseline = nextCronRunMs('0 0 * * *', t)!
    const jittered = jitteredNextCronRunMs('0 0 * * *', t, 'ffffffff')!
    const offset = jittered - baseline
    expect(offset).toBeLessThanOrEqual(DEFAULT_CRON_JITTER_CONFIG.recurringCapMs)
  })

  test('un taskId no-hexadecimal cae por defecto a jitter 0', () => {
    // Según el docstring: los ids no-hex (JSON editado a mano) caen a 0 = sin jitter.
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const baseline = nextCronRunMs('0 * * * *', t)!
    const jittered = jitteredNextCronRunMs('0 * * * *', t, 'not-a-hex-id')!
    // El jitter debe ser 0 (o muy cercano — frac × cap, frac=0).
    expect(jittered).toBe(baseline)
  })

  test('un cron inválido devuelve null', () => {
    expect(jitteredNextCronRunMs('bad', Date.now(), 'abc')).toBeNull()
  })
})

describe('oneShotJitteredNextCronRunMs — jitter hacia atrás (adelanto)', () => {
  test('un minuto no redondo → sin jitter (devuelve el baseline)', () => {
    // 0 17 * * * dispara a :17 → minuto % 30 !== 0 → sin jitter.
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const baseline = nextCronRunMs('17 * * * *', t)
    const jittered = oneShotJitteredNextCronRunMs('17 * * * *', t, 'abc')
    expect(jittered).toBe(baseline)
  })

  test('el jitter se acota a fromMs (no dispara antes de la creación)', () => {
    // Agenda una tarea que dispara dentro de su propia ventana de jitter.
    // El Math.max(t1 - lead, fromMs) garantiza que no dispare antes de
    // fromMs.
    const t = Date.now()
    const cron = '0 * * * *' // en punto
    const result = oneShotJitteredNextCronRunMs(cron, t, 'ffffffff')
    if (result !== null) {
      expect(result).toBeGreaterThanOrEqual(t)
    }
  })

  test('determinístico: mismo taskId + mismo fromMs → misma hora de disparo', () => {
    const t = Date.UTC(2026, 3, 30, 14, 30, 0)
    const a = oneShotJitteredNextCronRunMs('0 * * * *', t, 'abcdef01')
    const b = oneShotJitteredNextCronRunMs('0 * * * *', t, 'abcdef01')
    expect(a).toBe(b)
  })
})

describe('findMissedTasks', () => {
  test('la lista vacía devuelve vacío', () => {
    expect(findMissedTasks([], Date.now())).toEqual([])
  })

  test('una tarea cuya próxima-desde-creación está en el pasado se considera perdida', () => {
    // Tarea creada hace 1 día con agenda horaria. nextCronRunMs desde
    // createdAt = createdAt + 1h. nowMs es 24h después → perdida.
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const tasks = [
      {
        id: 'task1',
        cron: '0 * * * *',
        createdAt: oneDayAgo,
      } as never,
    ]
    expect(findMissedTasks(tasks, Date.now())).toHaveLength(1)
  })

  test('una tarea agendada en el futuro NO se considera perdida', () => {
    // Creada hace 1ms, horaria → el próximo disparo está en el futuro.
    const tasks = [
      {
        id: 'task1',
        cron: '0 * * * *',
        createdAt: Date.now() - 1,
      } as never,
    ]
    expect(findMissedTasks(tasks, Date.now())).toEqual([])
  })

  test('una tarea con cron inválido queda excluida', () => {
    // nextCronRunMs devuelve null → el filtro la excluye.
    const tasks = [
      {
        id: 'task1',
        cron: 'invalid',
        createdAt: Date.now() - 100_000_000,
      } as never,
    ]
    expect(findMissedTasks(tasks, Date.now())).toEqual([])
  })

  test('lista mixta: solo se devuelven las tareas con próximo-disparo pasado', () => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const tasks = [
      { id: 'past', cron: '0 * * * *', createdAt: oneDayAgo },
      { id: 'future', cron: '0 * * * *', createdAt: Date.now() - 1 },
      { id: 'invalid', cron: 'bad', createdAt: oneDayAgo },
    ] as never[]
    const missed = findMissedTasks(tasks, Date.now())
    expect(missed).toHaveLength(1)
    expect((missed[0] as { id: string }).id).toBe('past')
  })
})
