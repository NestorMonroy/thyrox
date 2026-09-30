import { test, expect } from 'bun:test'
test('b: otro archivo, sin mock propio', async () => {
  const { who } = await import('./pkg/dep.ts')
  console.log('b ve:', who())
})
