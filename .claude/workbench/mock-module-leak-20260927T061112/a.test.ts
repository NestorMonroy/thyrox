import { mock, test, expect } from 'bun:test'
mock.module('./pkg/dep.ts', () => ({ who: () => 'mock' }))
test('a: el archivo que pide el mock lo ve', async () => {
  const { who } = await import('./pkg/dep.ts')
  expect(who()).toBe('mock')
})
