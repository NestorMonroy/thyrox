// Sonda: una COPIA de los exports tomada antes del mock, re-registrada al salir.
import { afterEach, expect, mock, test } from 'bun:test'
const real = { ...(await import('./target.ts')) }
afterEach(() => { mock.module('./target.ts', () => real) })
test('d registra el mock', async () => {
  mock.module('./target.ts', () => ({ answer: () => 'mock' }))
  expect((await import('./target.ts')).answer()).toBe('mock')
})
