/**
 * El hash del contenido canónico: decide si una reingesta es la misma versión,
 * así que distingue cualquier cambio de texto y también de corte entre chunks.
 */
import { describe, expect, test } from 'bun:test'

import { chunkHash, documentHash } from '../contentHash.ts'

const SHA256_HEX = /^[0-9a-f]{64}$/

describe('documentHash', () => {
  test('es sha256 en hexadecimal y estable para el mismo contenido', () => {
    expect(documentHash(['a', 'b'])).toMatch(SHA256_HEX)
    expect(documentHash(['a', 'b'])).toBe(documentHash(['a', 'b']))
  })

  test('distingue el mismo texto cortado en otros chunks', () => {
    expect(documentHash(['ab'])).not.toBe(documentHash(['a', 'b']))
    expect(documentHash(['a', 'b'])).not.toBe(documentHash(['b', 'a']))
  })
})

describe('chunkHash', () => {
  test('es el sha256 del texto del chunk', () => {
    expect(chunkHash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
