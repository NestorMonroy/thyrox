/**
 * Porte de `ccnmt: packages/agent/__tests__/cronJitterConfig.test.ts`
 * contra `../misc/cronJitterConfig.ts` y `../scheduler.ts`.
 *
 * DIVERGENCIA DE ALCANCE: el `mock.module` de la fuente apunta a
 * `@claude-code-how-works/config/feature-flags`, ausente en este árbol.
 * Se sustituye por `../scheduler.ts` — ver la cabecera de ese archivo y
 * la de `../misc/cronJitterConfig.ts` para el porqué (mismo patrón que
 * `agentSwarmsEnabled.test.ts` ya usa con `../featureFlags.ts` en este
 * mismo árbol). El resto del test — casos, datos, aserciones — es
 * idéntico a la fuente; la descripción de cada `describe`/`test` se
 * tradujo al español.
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test'

// Mockear el accesor de feature flag antes de importar el SUT.
const realScheduler = await import('../scheduler.js')
let featureValue: unknown

mock.module('../scheduler.js', () => ({
  ...realScheduler,
  getFeatureValue_CACHED_WITH_REFRESH: <T>(
    _key: string,
    fallback: T,
    _refreshMs: number,
  ): T => {
    return featureValue !== undefined ? (featureValue as T) : fallback
  },
}))

const { getCronJitterConfig } = await import('../misc/cronJitterConfig.js')
const { DEFAULT_CRON_JITTER_CONFIG } = await import('../scheduler.js')

beforeEach(() => {
  featureValue = undefined
})

describe('getCronJitterConfig — defaults', () => {
  test('sin entrada en GB → DEFAULT_CRON_JITTER_CONFIG', () => {
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('foto de DEFAULT_CRON_JITTER_CONFIG — ancla de recuperación de incidentes', () => {
    // Los defaults son palancas operativas. Fijarlos aquí atrapa una
    // edición accidental con un test en vez de con un incidente de
    // producción en el próximo límite de :00.
    expect(DEFAULT_CRON_JITTER_CONFIG).toEqual({
      recurringFrac: 0.1,
      recurringCapMs: 15 * 60 * 1000,
      oneShotMaxMs: 90 * 1000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      cacheLeadMs: 60_000,
    })
  })
})

describe('getCronJitterConfig — payload de GB válido', () => {
  test('deja pasar una config completa válida', () => {
    const valid = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 5_000,
      oneShotMinuteMod: 15,
      recurringMaxAgeMs: 24 * 60 * 60 * 1000,
      cacheLeadMs: 30_000,
    }
    featureValue = valid
    expect(getCronJitterConfig()).toEqual(valid)
  })

  test('config parcial SIN recurringMaxAgeMs obtiene el default para ese campo', () => {
    // recurringMaxAgeMs y cacheLeadMs tienen `.default(...)` para que las
    // configs de antes de que esos campos se agregaran no se rechacen.
    // Los demás campos no tienen default; un campo faltante rechaza todo.
    const partial = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      // sin recurringMaxAgeMs, sin cacheLeadMs
    }
    featureValue = partial
    expect(getCronJitterConfig()).toEqual({
      ...partial,
      recurringMaxAgeMs: DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs,
      cacheLeadMs: DEFAULT_CRON_JITTER_CONFIG.cacheLeadMs,
    })
  })
})

describe('getCronJitterConfig — payload de GB inválido cae a los defaults', () => {
  // Crítico: la violación de UN solo campo rechaza la config ENTERA. Es
  // defensa en profundidad intencional contra un push de GB con un dedo
  // torcido.

  test('campo faltante por completo (p. ej. recurringFrac) → defaults', () => {
    featureValue = {
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    } // sin recurringFrac
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('recurringFrac fuera de rango (> 1) → defaults', () => {
    featureValue = {
      recurringFrac: 1.5, // > 1
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('recurringFrac negativo → defaults', () => {
    featureValue = {
      recurringFrac: -0.1,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('recurringCapMs por encima de la cota HALF_HOUR_MS → defaults', () => {
    // La cota superior evita que el jitter interrumpa el horario recurrente.
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60 * 60 * 1000, // 1 hora > HALF_HOUR_MS
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('campo de ms no entero → defaults', () => {
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000.5, // no entero
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('oneShotMinuteMod fuera de [1, 60] → defaults', () => {
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 0, // < 1
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('oneShotMinuteMod = 61 → defaults', () => {
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 61, // > 60
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('CRÍTICO — oneShotFloorMs > oneShotMaxMs (falla el refine) → defaults', () => {
    // La regla .refine() evita un rango de jitter invertido.
    // Sin esto, el jitter tendría duración negativa → bug.
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 5_000,
      oneShotFloorMs: 30_000, // floor > max
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
    }
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('oneShotFloorMs == oneShotMaxMs está permitido (límite igual)', () => {
    // El refine es `oneShotFloorMs <= oneShotMaxMs`. Igual está bien.
    const valid = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 5_000,
      oneShotFloorMs: 5_000, // floor == max
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
      cacheLeadMs: 30_000,
    }
    featureValue = valid
    expect(getCronJitterConfig()).toEqual(valid)
  })

  test('payload que no es un objeto → defaults', () => {
    featureValue = 'not an object'
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('payload null → defaults', () => {
    featureValue = null
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('payload arreglo → defaults', () => {
    featureValue = ['array', 'not', 'object']
    expect(getCronJitterConfig()).toEqual(DEFAULT_CRON_JITTER_CONFIG)
  })

  test('los campos extra desconocidos se ignoran (default de zod)', () => {
    // Documenta que campos extra no causan rechazo. La forma validada
    // sólo incluye los campos documentados.
    featureValue = {
      recurringFrac: 0.5,
      recurringCapMs: 60_000,
      oneShotMaxMs: 30_000,
      oneShotFloorMs: 0,
      oneShotMinuteMod: 30,
      recurringMaxAgeMs: 60_000,
      newFieldFromFuture: 'ignored',
    }
    const result = getCronJitterConfig()
    expect(result.recurringFrac).toBe(0.5)
    expect((result as Record<string, unknown>).newFieldFromFuture).toBeUndefined()
  })
})
