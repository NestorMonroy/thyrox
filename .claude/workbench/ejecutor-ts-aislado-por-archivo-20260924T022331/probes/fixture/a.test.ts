import { expect, mock, test } from 'bun:test'
mock.module('./valor.ts', () => ({ valor: 'simulado' }))
test('a simula el modulo', async () => {
  expect((await import('./valor.ts')).valor).toBe('simulado')
})
