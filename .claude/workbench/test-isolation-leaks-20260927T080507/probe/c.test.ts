// Sonda: re-registrar el módulo REAL al salir, ¿devuelve el real al siguiente archivo?
import { afterEach, expect, mock, test } from 'bun:test'
const real = await import('./target.ts')
afterEach(() => { mock.module('./target.ts', () => real) })
test('c registra el mock', async () => {
  mock.module('./target.ts', () => ({ answer: () => 'mock' }))
  expect((await import('./target.ts')).answer()).toBe('mock')
})
