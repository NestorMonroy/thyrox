import { describe, expect, test } from 'bun:test'
import { MemoryStorageBackend } from '../index.js'

describe('MemoryStorageBackend', () => {
  test('read() de un path nunca escrito devuelve null', async () => {
    const backend = new MemoryStorageBackend()
    expect(await backend.read('a')).toBeNull()
  })

  test('write() + read() hacen round trip, con string y con Uint8Array', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('s.txt', 'hola')
    expect(await backend.read('s.txt')).toBe('hola')

    await backend.write('b.bin', new Uint8Array([1, 2, 3]))
    expect(await backend.read('b.bin')).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('append() sobre un path nunca escrito lo crea', async () => {
    const backend = new MemoryStorageBackend()
    await backend.append('a.txt', 'primero')
    expect(await backend.read('a.txt')).toBe('primero')
  })

  test('append() concatena decodificando string y Uint8Array por igual', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('a.txt', 'uno-')
    await backend.append('a.txt', new TextEncoder().encode('dos'))
    expect(await backend.read('a.txt')).toBe('uno-dos')
  })

  test('delete() saca la entrada; read() posterior devuelve null', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('x', 'y')
    await backend.delete('x')
    expect(await backend.read('x')).toBeNull()
  })

  test('list() devuelve las entradas inmediatas bajo un prefijo tipo directorio', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('dir/a.txt', '1')
    await backend.write('dir/b.txt', '2')
    await backend.write('dir/sub/c.txt', '3')
    await backend.write('otro/d.txt', '4')

    const entries = (await backend.list('dir')).sort()
    // 'a.txt', 'b.txt' (archivos directos) y 'sub' (UNA vez, no duplicado
    // por c.txt) — nunca la ruta completa 'sub/c.txt'.
    expect(entries).toEqual(['a.txt', 'b.txt', 'sub'])
  })

  test('list() acepta el prefijo con o sin barra final, con el mismo resultado', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('dir/a.txt', '1')
    expect(await backend.list('dir')).toEqual(await backend.list('dir/'))
  })

  test('getData() es la vista directa para aserciones de test', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('k', 'v')
    expect(backend.getData('k')).toBe('v')
    expect(backend.getData('no-existe')).toBeNull()
  })

  test('reset() vacia todo el backend', async () => {
    const backend = new MemoryStorageBackend()
    await backend.write('k1', 'v1')
    await backend.write('k2', 'v2')
    backend.reset()
    expect(await backend.read('k1')).toBeNull()
    expect(await backend.list('')).toEqual([])
  })
})
