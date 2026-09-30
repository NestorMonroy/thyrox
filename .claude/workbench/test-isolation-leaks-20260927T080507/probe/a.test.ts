// Sonda: ¿mock.restore() deshace un mock.module registrado en este archivo?
import { afterEach, expect, mock, test } from 'bun:test'
afterEach(() => { mock.restore() })
test('a registra el mock', async () => {
  mock.module('./target.ts', () => ({ answer: () => 'mock' }))
  expect((await import('./target.ts')).answer()).toBe('mock')
})
