import { expect, test } from 'bun:test'
import { valor } from './valor.ts'
test('b ve el modulo real', () => {
  expect(valor).toBe('real')
})
