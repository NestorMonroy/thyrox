/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/statsCacheHelpers.test.ts`
 * (396 líneas fuente, 100 % portado). Sin dependencias de paquete
 * hermano — todos los símbolos bajo prueba son puros.
 *
 * Tests de los helpers puros de statsCache — impulsan la agregación
 * incremental para el display de /stats, los gráficos de /usage, y el
 * tracking de la sesión más larga.
 *
 * Una matemática de merge equivocada = dashboards engañosos (p. ej. "has
 * usado 10x tus tokens reales" o "la sesión más larga duró 2s porque el
 * merger comparó timestamps, no duraciones").
 *
 * Los helpers de fecha sostienen los cálculos de racha — una comparación
 * "antes" equivocada implica que la sesión de ayer nunca cuenta hacia la
 * racha.
 */
import { describe, expect, test } from 'bun:test'
import {
  isDateBefore,
  mergeCacheWithNewStats,
  type PersistedStatsCache,
  toDateString,
} from '../aggregates/statsCache.ts'

describe('toDateString', () => {
  test('extrae YYYY-MM-DD de un Date', () => {
    const d = new Date('2026-04-30T15:30:00Z')
    expect(toDateString(d)).toBe('2026-04-30')
  })

  test('usa la fecha UTC (no local)', () => {
    // El mismo instante en UTC y hora local puede diferir por un día.
    // toISOString() siempre da UTC.
    const d = new Date('2026-04-30T23:59:59.999Z')
    expect(toDateString(d)).toBe('2026-04-30')
  })

  test('lanza con un Date inválido (toISOString devuelve "Invalid Date")', () => {
    const invalid = new Date('not a date')
    expect(() => toDateString(invalid)).toThrow()
  })
})

describe('isDateBefore', () => {
  test('fecha anterior < fecha posterior → true', () => {
    expect(isDateBefore('2026-04-29', '2026-04-30')).toBe(true)
  })

  test('misma fecha → false', () => {
    expect(isDateBefore('2026-04-30', '2026-04-30')).toBe(false)
  })

  test('fecha posterior → false', () => {
    expect(isDateBefore('2026-05-01', '2026-04-30')).toBe(false)
  })

  test('la comparación lexicográfica funciona sobre YYYY-MM-DD', () => {
    // Los strings YYYY-MM-DD ordenan igual que las fechas reales.
    expect(isDateBefore('2025-12-31', '2026-01-01')).toBe(true)
    expect(isDateBefore('2026-01-01', '2025-12-31')).toBe(false)
  })

  test('fronteras de mes distintas', () => {
    expect(isDateBefore('2026-04-30', '2026-05-01')).toBe(true)
    expect(isDateBefore('2026-04-01', '2026-04-30')).toBe(true)
  })
})

const emptyCache = (): PersistedStatsCache => ({
  version: 3,
  lastComputedDate: null,
  dailyActivity: [],
  dailyModelTokens: [],
  modelUsage: {},
  totalSessions: 0,
  totalMessages: 0,
  longestSession: null,
  firstSessionDate: null,
  hourCounts: {},
  totalSpeculationTimeSavedMs: 0,
})

const emptyNewStats = () => ({
  dailyActivity: [],
  dailyModelTokens: [],
  modelUsage: {},
  sessionStats: [],
  hourCounts: {},
  totalSpeculationTimeSavedMs: 0,
})

const sampleUsage = () => ({
  inputTokens: 100,
  outputTokens: 200,
  cacheReadInputTokens: 50,
  cacheCreationInputTokens: 30,
  webSearchRequests: 0,
  costUSD: 0.01,
  contextWindow: 200_000,
  maxOutputTokens: 8_192,
})

describe('mergeCacheWithNewStats — merge vacío', () => {
  test('caché vacío + stats nuevas vacías → caché vacío con lastComputedDate actualizado', () => {
    const result = mergeCacheWithNewStats(emptyCache(), emptyNewStats(), '2026-04-30')
    expect(result.lastComputedDate).toBe('2026-04-30')
    expect(result.totalSessions).toBe(0)
    expect(result.totalMessages).toBe(0)
    expect(result.longestSession).toBeNull()
  })

  test('lastComputedDate siempre se sobreescribe (no se mezcla)', () => {
    const cache = { ...emptyCache(), lastComputedDate: '2026-04-29' }
    const result = mergeCacheWithNewStats(cache, emptyNewStats(), '2026-04-30')
    expect(result.lastComputedDate).toBe('2026-04-30')
  })
})

describe('mergeCacheWithNewStats — merge de actividad diaria', () => {
  test('días nuevos se agregan, la salida sale ordenada ascendente', () => {
    const cache = {
      ...emptyCache(),
      dailyActivity: [
        { date: '2026-04-29', messageCount: 1, sessionCount: 1, toolCallCount: 1 },
      ],
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        dailyActivity: [
          { date: '2026-04-30', messageCount: 2, sessionCount: 2, toolCallCount: 2 },
          { date: '2026-04-28', messageCount: 3, sessionCount: 3, toolCallCount: 3 },
        ],
      },
      '2026-04-30',
    )
    expect(result.dailyActivity.map(d => d.date)).toEqual([
      '2026-04-28',
      '2026-04-29',
      '2026-04-30',
    ])
  })

  test('merge de la misma fecha: los conteos se SUMAN', () => {
    const cache = {
      ...emptyCache(),
      dailyActivity: [
        { date: '2026-04-30', messageCount: 5, sessionCount: 1, toolCallCount: 2 },
      ],
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        dailyActivity: [
          { date: '2026-04-30', messageCount: 3, sessionCount: 1, toolCallCount: 2 },
        ],
      },
      '2026-04-30',
    )
    expect(result.dailyActivity).toHaveLength(1)
    expect(result.dailyActivity[0]).toEqual({
      date: '2026-04-30',
      messageCount: 8,
      sessionCount: 2,
      toolCallCount: 4,
    })
  })
})

describe('mergeCacheWithNewStats — tokens diarios por modelo', () => {
  test('tokens de modelo nuevos para una fecha nueva se insertan', () => {
    const result = mergeCacheWithNewStats(
      emptyCache(),
      {
        ...emptyNewStats(),
        dailyModelTokens: [
          { date: '2026-04-30', tokensByModel: { 'claude-opus': 1000 } },
        ],
      },
      '2026-04-30',
    )
    expect(result.dailyModelTokens).toHaveLength(1)
    expect(result.dailyModelTokens[0]).toEqual({
      date: '2026-04-30',
      tokensByModel: { 'claude-opus': 1000 },
    })
  })

  test('misma fecha + mismo modelo: los conteos de tokens se SUMAN', () => {
    const cache = {
      ...emptyCache(),
      dailyModelTokens: [
        { date: '2026-04-30', tokensByModel: { 'claude-opus': 500 } },
      ],
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        dailyModelTokens: [
          { date: '2026-04-30', tokensByModel: { 'claude-opus': 700 } },
        ],
      },
      '2026-04-30',
    )
    expect(result.dailyModelTokens[0]?.tokensByModel['claude-opus']).toBe(1200)
  })

  test('misma fecha + modelo distinto: se guardan lado a lado', () => {
    const cache = {
      ...emptyCache(),
      dailyModelTokens: [
        { date: '2026-04-30', tokensByModel: { 'claude-opus': 500 } },
      ],
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        dailyModelTokens: [
          { date: '2026-04-30', tokensByModel: { 'claude-sonnet': 300 } },
        ],
      },
      '2026-04-30',
    )
    expect(result.dailyModelTokens[0]?.tokensByModel).toEqual({
      'claude-opus': 500,
      'claude-sonnet': 300,
    })
  })
})

describe('mergeCacheWithNewStats — uso de modelo', () => {
  test('modelo nuevo se agrega cuando no está en el caché', () => {
    const result = mergeCacheWithNewStats(
      emptyCache(),
      {
        ...emptyNewStats(),
        modelUsage: { 'claude-opus': sampleUsage() },
      },
      '2026-04-30',
    )
    expect(result.modelUsage['claude-opus']).toEqual(sampleUsage())
  })

  test('uso de modelo existente se SUMA para campos aditivos', () => {
    const cache = {
      ...emptyCache(),
      modelUsage: { 'claude-opus': sampleUsage() },
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        modelUsage: { 'claude-opus': sampleUsage() },
      },
      '2026-04-30',
    )
    const merged = result.modelUsage['claude-opus']!
    expect(merged.inputTokens).toBe(200) // 100+100
    expect(merged.outputTokens).toBe(400)
    expect(merged.cacheReadInputTokens).toBe(100)
    expect(merged.costUSD).toBe(0.02)
  })

  test('contextWindow + maxOutputTokens usan Math.max (no suma)', () => {
    // Documentado: los límites no se suman — se conserva el mayor.
    const cache = {
      ...emptyCache(),
      modelUsage: {
        'claude-opus': { ...sampleUsage(), contextWindow: 200_000, maxOutputTokens: 8_192 },
      },
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        modelUsage: {
          'claude-opus': { ...sampleUsage(), contextWindow: 1_000_000, maxOutputTokens: 32_000 },
        },
      },
      '2026-04-30',
    )
    const merged = result.modelUsage['claude-opus']!
    expect(merged.contextWindow).toBe(1_000_000)
    expect(merged.maxOutputTokens).toBe(32_000)
  })
})

describe('mergeCacheWithNewStats — conteos por hora', () => {
  test('conteos de hora nuevos se agregan', () => {
    const result = mergeCacheWithNewStats(
      emptyCache(),
      { ...emptyNewStats(), hourCounts: { 9: 5, 14: 10 } },
      '2026-04-30',
    )
    expect(result.hourCounts).toEqual({ 9: 5, 14: 10 })
  })

  test('conteos de hora existentes se SUMAN', () => {
    const cache = { ...emptyCache(), hourCounts: { 9: 5 } }
    const result = mergeCacheWithNewStats(
      cache,
      { ...emptyNewStats(), hourCounts: { 9: 7, 14: 3 } },
      '2026-04-30',
    )
    expect(result.hourCounts).toEqual({ 9: 12, 14: 3 })
  })
})

describe('mergeCacheWithNewStats — agregados de sesión', () => {
  test('totalSessions + totalMessages se SUMAN', () => {
    const cache = { ...emptyCache(), totalSessions: 10, totalMessages: 100 }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        sessionStats: [
          { sessionId: 's1', duration: 1000, messageCount: 5, timestamp: '2026-04-30T10:00:00Z' },
          { sessionId: 's2', duration: 2000, messageCount: 10, timestamp: '2026-04-30T11:00:00Z' },
        ],
      },
      '2026-04-30',
    )
    expect(result.totalSessions).toBe(12)
    expect(result.totalMessages).toBe(115)
  })

  test('longestSession se toma de las stats nuevas cuando es más larga', () => {
    const cache = {
      ...emptyCache(),
      longestSession: { sessionId: 'old', duration: 1000, messageCount: 5, timestamp: '2026-04-29T10:00:00Z' },
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        sessionStats: [
          { sessionId: 'new', duration: 5000, messageCount: 20, timestamp: '2026-04-30T10:00:00Z' },
        ],
      },
      '2026-04-30',
    )
    expect(result.longestSession?.sessionId).toBe('new')
    expect(result.longestSession?.duration).toBe(5000)
  })

  test('longestSession se conserva del caché cuando su valor es más largo', () => {
    const cache = {
      ...emptyCache(),
      longestSession: { sessionId: 'old', duration: 9999, messageCount: 5, timestamp: '2026-04-29T10:00:00Z' },
    }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        sessionStats: [
          { sessionId: 'new', duration: 1000, messageCount: 5, timestamp: '2026-04-30T10:00:00Z' },
        ],
      },
      '2026-04-30',
    )
    expect(result.longestSession?.sessionId).toBe('old')
  })

  test('firstSessionDate usa el timestamp más temprano visto', () => {
    const cache = { ...emptyCache(), firstSessionDate: '2026-04-30T10:00:00Z' }
    const result = mergeCacheWithNewStats(
      cache,
      {
        ...emptyNewStats(),
        sessionStats: [
          { sessionId: 'older', duration: 100, messageCount: 1, timestamp: '2026-04-25T10:00:00Z' },
        ],
      },
      '2026-04-30',
    )
    expect(result.firstSessionDate).toBe('2026-04-25T10:00:00Z')
  })

  test('totalSpeculationTimeSavedMs se SUMA', () => {
    const cache = { ...emptyCache(), totalSpeculationTimeSavedMs: 1000 }
    const result = mergeCacheWithNewStats(
      cache,
      { ...emptyNewStats(), totalSpeculationTimeSavedMs: 500 },
      '2026-04-30',
    )
    expect(result.totalSpeculationTimeSavedMs).toBe(1500)
  })
})

describe('mergeCacheWithNewStats — versión', () => {
  test('result.version siempre usa la versión actual del caché', () => {
    // Los cachés viejos migrados tendrán su versión fijada al cargar,
    // pero el merger siempre emite la versión de schema más reciente.
    const result = mergeCacheWithNewStats(emptyCache(), emptyNewStats(), '2026-04-30')
    expect(result.version).toBe(3) // constante STATS_CACHE_VERSION
  })
})
