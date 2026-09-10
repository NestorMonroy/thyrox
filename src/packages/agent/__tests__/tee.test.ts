/**
 * Porte de `ccnmt: packages/agent/__tests__/tee.test.ts`.
 * El caso que no es obvio es el del error: lo ya emitido tiene que llegar
 * ANTES del fallo, porque si no el consumidor pierde datos que la fuente si
 * produjo.
 */
import { describe, expect, test } from 'bun:test'
import { tee } from '../tee.ts'

async function* fuente<T>(...items: T[]): AsyncGenerator<T> {
  for (const i of items) yield i
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const v of it) out.push(v)
  return out
}

describe('tee', () => {
  test('reparte en dos consumidores independientes por defecto', async () => {
    const [a, b] = tee(fuente(1, 2, 3))
    expect(await collect(a)).toEqual([1, 2, 3])
    expect(await collect(b)).toEqual([1, 2, 3])
  })

  test('reparte en tres cuando count es tres', async () => {
    const consumidores = tee(fuente('x', 'y'), 3)
    expect(consumidores).toHaveLength(3)
    for (const c of consumidores) expect(await collect(c)).toEqual(['x', 'y'])
  })

  test('una fuente vacia da consumidores vacios', async () => {
    const [a, b] = tee(fuente<number>())
    expect(await collect(a)).toEqual([])
    expect(await collect(b)).toEqual([])
  })

  test('el consumidor lento no bloquea al rapido: el rapido acumula', async () => {
    const [rapido, lento] = tee(fuente(1, 2, 3))
    expect(await collect(rapido)).toEqual([1, 2, 3])
    // El lento arranca cuando el otro ya termino: su cola conservo todo.
    expect(await collect(lento)).toEqual([1, 2, 3])
  })

  test('un error tras emitir: primero lo emitido, DESPUES el error', async () => {
    async function* rompe(): AsyncGenerator<number> {
      yield 1
      yield 2
      throw new Error('reventon')
    }
    const [a] = tee(rompe(), 1)
    const vistos: number[] = []
    let capturado: unknown
    try {
      for await (const v of a) vistos.push(v)
    } catch (e) {
      capturado = e
    }
    expect(vistos).toEqual([1, 2])
    expect((capturado as Error).message).toBe('reventon')
  })

  test('una fuente que revienta de entrada rechaza a cada consumidor', async () => {
    async function* rompeYa(): AsyncGenerator<number> {
      throw new Error('de entrada')
    }
    const consumidores = tee(rompeYa(), 2)
    for (const c of consumidores) {
      await expect(collect(c)).rejects.toThrow('de entrada')
    }
  })

  test('count uno da exactamente un consumidor', async () => {
    const consumidores = tee(fuente(7), 1)
    expect(consumidores).toHaveLength(1)
    expect(await collect(consumidores[0])).toEqual([7])
  })
})
