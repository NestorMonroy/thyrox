import { describe, expect, test } from 'bun:test'
import { getSecureStorage } from '../secureStorage.js'

describe('secureStorage.ts — barrel', () => {
  test('re-exporta getSecureStorage desde ./secureStorage/index.js', () => {
    expect(typeof getSecureStorage).toBe('function')
    // No inspecciona QUE implementacion resuelve (eso lo cubre
    // secureStorage/__tests__/index.test.ts); solo que el barrel llega.
    expect(getSecureStorage().name).toBeTruthy()
  })
})
