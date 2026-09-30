/**
 * Las métricas por combo del proxy — los casos de OmniRoute
 * `tests/unit/service-combo-metrics.test.ts` (a58000c7) sobre una instancia en
 * vez del almacén global, más los de la vista derivada y el desalojo.
 */
import { describe, expect, it } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { ComboMetrics, MAX_METRICS_ENTRIES, METRICS_TTL_MS } = (await import(
  process.env.COMBO_METRICS_MODULE ?? '../src/proxy/combo/comboMetrics.ts'
)) as typeof import('../src/proxy/combo/comboMetrics.ts')

describe('record / get', () => {
  it('registra y devuelve las métricas de un combo', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', 'gpt-4', { success: true, latencyMs: 200 })
    metrics.record('c', 'gpt-4', { success: false, latencyMs: 300 })
    const m = metrics.get('c')!
    expect(m).toMatchObject({ totalRequests: 2, totalSuccesses: 1, totalFailures: 1, totalLatencyMs: 500 })
  })

  it('un combo desconocido no tiene métricas', () => {
    expect(new ComboMetrics().get('nadie')).toBeNull()
  })

  it('lleva métricas por modelo', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', 'gpt-4', { success: true, latencyMs: 100 })
    metrics.record('c', 'claude-3', { success: true, latencyMs: 200 })
    expect(Object.keys(metrics.get('c')!.byModel).sort()).toEqual(['claude-3', 'gpt-4'])
  })

  it('la vista deriva la latencia media, la tasa de éxito y la de conmutación', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', 'm', { success: true, latencyMs: 100, fallbackCount: 1 })
    metrics.record('c', 'm', { success: false, latencyMs: 201 })
    const m = metrics.get('c')!
    expect(m).toMatchObject({ avgLatencyMs: 151, successRate: 50, fallbackRate: 50 })
    expect(m.byModel.m).toMatchObject({ requests: 2, successes: 1, failures: 1, avgLatencyMs: 151, successRate: 50, lastStatus: 'error' })
  })

  it('por destino, la clave es el executionKey, y si falta, el modelo', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', 'm', { success: true, latencyMs: 10, target: { executionKey: 'up-a', provider: 'openai' } })
    metrics.record('c', 'm', { success: true, latencyMs: 10, target: { executionKey: 'up-b' } })
    metrics.record('c', 'm', { success: true, latencyMs: 10 })
    const m = metrics.get('c')!
    expect(Object.keys(m.byTarget).sort()).toEqual(['m', 'up-a', 'up-b'])
    expect(m.byTarget['up-a']).toMatchObject({ requests: 1, provider: 'openai', model: 'm' })
  })

  it('sin modelo cuenta el total, no por modelo ni por destino', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', null, { success: false, latencyMs: 5 })
    const m = metrics.get('c')!
    expect(m.totalRequests).toBe(1)
    expect(m.byModel).toEqual({})
    expect(m.byTarget).toEqual({})
  })

  it('guarda la estrategia del último registro', () => {
    const metrics = new ComboMetrics()
    metrics.record('c', 'm', { success: true, latencyMs: 1 })
    expect(metrics.get('c')!.strategy).toBe('priority')
    metrics.record('c', 'm', { success: true, latencyMs: 1, strategy: 'least-used' })
    expect(metrics.get('c')!.strategy).toBe('least-used')
  })
})

describe('all / reset', () => {
  it('all devuelve todos los combos registrados', () => {
    const metrics = new ComboMetrics()
    metrics.record('a', 'm1', { success: true, latencyMs: 10 })
    metrics.record('b', 'm2', { success: true, latencyMs: 20 })
    expect(Object.keys(metrics.all()).sort()).toEqual(['a', 'b'])
  })

  it('reset borra un combo y resetAll todos', () => {
    const metrics = new ComboMetrics()
    metrics.record('a', 'm', { success: true, latencyMs: 10 })
    metrics.record('b', 'm', { success: true, latencyMs: 10 })
    metrics.reset('a')
    expect(metrics.get('a')).toBeNull()
    metrics.resetAll()
    expect(metrics.all()).toEqual({})
  })
})

describe('desalojo', () => {
  it('al pasar del máximo de combos se desaloja el de uso más antiguo', () => {
    let now = 1_000
    const metrics = new ComboMetrics(() => now)
    for (let i = 0; i < MAX_METRICS_ENTRIES; i++) {
      now += 1
      metrics.record(`c${i}`, 'm', { success: true, latencyMs: 1 })
    }
    now += 1
    metrics.record('c0', 'm', { success: true, latencyMs: 1 })
    now += 1
    metrics.record('nuevo', 'm', { success: true, latencyMs: 1 })
    expect(metrics.get('c1')).toBeNull()
    expect(metrics.get('c0')).not.toBeNull()
    expect(Object.keys(metrics.all())).toHaveLength(MAX_METRICS_ENTRIES)
  })

  it('un combo sin uso durante más de una hora se descarta al leer', () => {
    let now = 1_000
    const metrics = new ComboMetrics(() => now)
    metrics.record('viejo', 'm', { success: true, latencyMs: 1 })
    now += METRICS_TTL_MS
    expect(metrics.get('viejo')).not.toBeNull()
    now += 1
    expect(metrics.get('viejo')).toBeNull()
    expect(metrics.all()).toEqual({})
  })
})
