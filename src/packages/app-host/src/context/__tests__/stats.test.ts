import { describe, expect, test } from 'bun:test'
import { createStatsStore } from '../stats.js'

describe('createStatsStore', () => {
  test('increment acumula y respeta el valor por defecto', () => {
    const store = createStatsStore()
    store.increment('calls')
    store.increment('calls')
    store.increment('calls', 3)
    expect(store.getAll().calls).toBe(5)
  })

  test('set sobrescribe el valor', () => {
    const store = createStatsStore()
    store.set('gauge', 10)
    store.set('gauge', 42)
    expect(store.getAll().gauge).toBe(42)
  })

  test('add cuenta valores únicos del set', () => {
    const store = createStatsStore()
    store.add('models', 'sonnet')
    store.add('models', 'opus')
    store.add('models', 'sonnet')
    expect(store.getAll().models).toBe(2)
  })

  test('observe agrega count/min/max/avg/percentiles al histograma', () => {
    const store = createStatsStore()
    for (const v of [1, 2, 3, 4, 5]) {
      store.observe('latency', v)
    }
    const all = store.getAll()
    expect(all.latency_count).toBe(5)
    expect(all.latency_min).toBe(1)
    expect(all.latency_max).toBe(5)
    expect(all.latency_avg).toBe(3)
    expect(all.latency_p50).toBe(3)
  })

  test('un histograma sin observaciones no aparece en getAll', () => {
    const store = createStatsStore()
    expect(store.getAll()).toEqual({})
  })
})
