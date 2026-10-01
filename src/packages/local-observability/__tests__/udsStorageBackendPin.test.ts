/**
 * La bandera que decide si hay backend de storage: `N`, `DBo` y `dVn`
 * (`chunk-8nz62976.js`, `chunk-w1vp9f7e.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { StorageBackendPin } from '../src/uds/storageBackendPin.ts'

describe('StorageBackendPin (N/DBo/dVn)', () => {
  test('sin fijar, el backend está inactivo', () => {
    expect(new StorageBackendPin().isActive()).toBe(false)
  })

  test('el primer valor queda fijado; repetirlo es unchanged y contradecirlo es conflict sin cambiarlo', () => {
    const pin = new StorageBackendPin()
    expect(pin.pin(true)).toBe('pinned')
    expect(pin.isActive()).toBe(true)
    expect(pin.pin(true)).toBe('unchanged')
    expect(pin.pin(false)).toBe('conflict')
    expect(pin.isActive()).toBe(true)
  })

  test('sólo el booleano true activa; cualquier otro valor servido cuenta como apagado y se avisa', () => {
    const warnings: string[] = []
    const pin = new StorageBackendPin(message => warnings.push(message))
    expect(pin.pinServed('true')).toBe('pinned')
    expect(pin.isActive()).toBe(false)
    expect(warnings[0]).toContain('served a string, not a boolean; treating it as off')
  })

  test('un segundo valor servido que contradice al primero se avisa y se conserva la primera decisión', () => {
    const warnings: string[] = []
    const pin = new StorageBackendPin(message => warnings.push(message))
    pin.pinServed(false)
    expect(pin.pinServed(true)).toBe('conflict')
    expect(warnings.at(-1)).toContain('at a second pin in this process; keeping the first decision')
    expect(pin.isActive()).toBe(false)
  })
})
