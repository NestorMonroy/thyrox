/**
 * El limitador de peticiones del proxy: el subconjunto de `bottleneck` que el
 * gestor de límites de OmniRoute usa (concurrencia máxima, intervalo mínimo
 * entre arranques, cupo que se repone), reimplementado en nativo. Cada caso
 * fija una regla de la librería tal como el gestor la consume.
 */
import { expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { RequestLimiter } = (await import(
  process.env.REQUEST_LIMITER_MODULE ?? '../src/proxy/resilience/requestLimiter.ts'
)) as typeof import('../src/proxy/resilience/requestLimiter.ts')

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/** Una tarea que se queda abierta hasta que la prueba la suelta. */
function gate() {
  let release!: () => void
  const done = new Promise<void>(resolve => (release = resolve))
  return { done, release }
}

test('sin límites, todo arranca a la vez', async () => {
  const limiter = new RequestLimiter()
  const g = gate()
  const jobs = [1, 2, 3].map(() => limiter.schedule(() => g.done))
  await wait(5)
  expect(limiter.counts()).toEqual({ QUEUED: 0, RUNNING: 3 })
  g.release()
  await Promise.all(jobs)
  expect(limiter.counts()).toEqual({ QUEUED: 0, RUNNING: 0 })
})

test('maxConcurrent deja esperando lo que no cabe, en orden de llegada', async () => {
  const limiter = new RequestLimiter({ maxConcurrent: 1 })
  const order: number[] = []
  const g = gate()
  const first = limiter.schedule(async () => { order.push(1); await g.done })
  const second = limiter.schedule(async () => { order.push(2) })
  const third = limiter.schedule(async () => { order.push(3) })
  await wait(5)
  expect(limiter.counts()).toEqual({ QUEUED: 2, RUNNING: 1 })
  g.release()
  await Promise.all([first, second, third])
  expect(order).toEqual([1, 2, 3])
})

test('minTime separa los arranques', async () => {
  const limiter = new RequestLimiter({ minTime: 40 })
  const starts: number[] = []
  await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => { starts.push(Date.now()) })))
  expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(35)
  expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(35)
})

test('un cupo agotado retiene hasta que la reposición lo rellena', async () => {
  const limiter = new RequestLimiter({ reservoir: 1, reservoirRefreshAmount: 2, reservoirRefreshInterval: 40 })
  const starts: number[] = []
  const t0 = Date.now()
  await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => { starts.push(Date.now() - t0) })))
  expect(starts[0]!).toBeLessThan(30)
  expect(starts[1]!).toBeGreaterThanOrEqual(35)
  expect(starts[2]!).toBeGreaterThanOrEqual(35)
  limiter.disconnect()
})

test('updateSettings cambia el ritmo de un limitador vivo y la reposición sigue', async () => {
  const limiter = new RequestLimiter()
  limiter.updateSettings({ reservoir: 0, reservoirRefreshAmount: 1, reservoirRefreshInterval: 30 })
  const starts: number[] = []
  const t0 = Date.now()
  await Promise.all([1, 2].map(() => limiter.schedule(async () => { starts.push(Date.now() - t0) })))
  expect(starts[0]!).toBeGreaterThanOrEqual(25)
  expect(starts[1]!).toBeGreaterThanOrEqual(55)
  limiter.disconnect()
})

test('reservoir null vuelve a no tener cupo', async () => {
  const limiter = new RequestLimiter({ reservoir: 0 })
  limiter.updateSettings({ reservoir: null })
  expect(await limiter.schedule(async () => 'ok')).toBe('ok')
})

test('una espera cancelada sale de la cola con la razón de la señal', async () => {
  const limiter = new RequestLimiter({ maxConcurrent: 1 })
  const g = gate()
  const running = limiter.schedule(() => g.done)
  const controller = new AbortController()
  const queued = limiter.schedule(async () => 'nunca', controller.signal)
  controller.abort()
  await expect(queued).rejects.toMatchObject({ name: 'AbortError' })
  expect(limiter.counts().QUEUED).toBe(0)
  g.release()
  await running
})

test('una tarea en curso cancelada rechaza con la razón de la señal', async () => {
  const limiter = new RequestLimiter()
  const controller = new AbortController()
  const pending = limiter.schedule(() => wait(50).then(() => 'tarde'), controller.signal)
  controller.abort()
  const error = (await pending.catch(e => e)) as DOMException
  expect(error).toBeInstanceOf(DOMException)
  expect(error.name).toBe('AbortError')
})

test('una señal ya cancelada no llega a encolar', async () => {
  const limiter = new RequestLimiter()
  let ran = false
  await expect(limiter.schedule(async () => { ran = true }, AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' })
  expect(ran).toBe(false)
})

test('el error de la tarea llega intacto a quien la programó', async () => {
  const limiter = new RequestLimiter()
  const boom = new Error('del upstream')
  await expect(limiter.schedule(async () => { throw boom })).rejects.toBe(boom)
})

test('drop rechaza lo encolado con su error y deja terminar lo que corre', async () => {
  const limiter = new RequestLimiter({ maxConcurrent: 1 })
  const g = gate()
  const running = limiter.schedule(async () => { await g.done; return 'terminó' })
  const queued = limiter.schedule(async () => 'nunca')
  const reason = new Error('429 del upstream')
  limiter.drop(reason)
  await expect(queued).rejects.toBe(reason)
  g.release()
  expect(await running).toBe('terminó')
})
