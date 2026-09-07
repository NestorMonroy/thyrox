/**
 * Tests del puerto de `which`/`whichSync` (`../which.js`). Este runtime es
 * Bun, así que ambos resuelven vía el camino `bunWhich` (`Bun.which`); el
 * camino `whichNodeAsync`/`whichNodeSync` (código muerto aquí) no se
 * ejerce desde estos tests.
 */
import { describe, expect, test } from 'bun:test'
import { which, whichSync } from '../which.js'

describe('which', () => {
  test('encuentra un binario presente (bash) y devuelve una ruta absoluta', async () => {
    const path = await which('bash')
    expect(path).not.toBeNull()
    expect(path?.startsWith('/')).toBe(true)
  })

  test('devuelve null para un comando inexistente', async () => {
    const path = await which('definitely-not-a-real-cmd-xyz')
    expect(path).toBeNull()
  })
})

describe('whichSync', () => {
  test('encuentra un binario presente (bash) y devuelve una ruta absoluta', () => {
    const path = whichSync('bash')
    expect(path).not.toBeNull()
    expect(path?.startsWith('/')).toBe(true)
  })

  test('devuelve null para un comando inexistente', () => {
    const path = whichSync('definitely-not-a-real-cmd-xyz')
    expect(path).toBeNull()
  })
})
