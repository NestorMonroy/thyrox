import { expect, test } from 'bun:test'
test('b, en otro archivo, ve el módulo real', async () => {
  expect((await import('./target.ts')).answer()).toBe('real')
})
