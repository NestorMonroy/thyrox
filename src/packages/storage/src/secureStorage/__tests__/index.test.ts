import { afterEach, describe, expect, test } from 'bun:test'
import { getSecureStorage } from '../index.js'
import { plainTextStorage } from '../plainTextStorage.js'

let originalPlatform: PropertyDescriptor | undefined

function setPlatform(value: string): void {
  originalPlatform ??= Object.getOwnPropertyDescriptor(process, 'platform')
  Object.defineProperty(process, 'platform', { value, configurable: true })
}

afterEach(() => {
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform)
  }
})

describe('getSecureStorage', () => {
  test("en Linux devuelve plainTextStorage directo (sin fallback de keychain)", () => {
    setPlatform('linux')
    expect(getSecureStorage()).toBe(plainTextStorage)
  })

  test('en darwin devuelve un fallback compuesto keychain-with-plaintext-fallback', () => {
    setPlatform('darwin')
    const storage = getSecureStorage()
    expect(storage.name).toBe('keychain-with-plaintext-fallback')
  })

  test("en win32 (ni darwin ni el TODO de libsecret) tambien cae a plainTextStorage", () => {
    setPlatform('win32')
    expect(getSecureStorage()).toBe(plainTextStorage)
  })
})
