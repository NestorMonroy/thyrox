/**
 * Porte de `ccnmt: packages/agent/__tests__/fileStateCache.test.ts`.
 * `cloneFileStateCache` clona una cache LRU vía dump/load, preservando la
 * clase concreta del original — un stub duck-typed permite probarlo sin
 * traer la implementación real de la cache.
 */
import { describe, expect, test } from 'bun:test'
import { cloneFileStateCache } from '../internal/fileStateCache.ts'

// Stub de la clase FileStateCache — implementa el contrato duck-type:
// `max`, `maxSize`, `dump()`, `load()`, más un constructor de 2 argumentos.
class StubCache {
  readonly max: number
  readonly maxSize: number
  private state: Map<string, string>

  constructor(max: number, maxSize: number) {
    this.max = max
    this.maxSize = maxSize
    this.state = new Map()
  }

  set(key: string, value: string): void {
    this.state.set(key, value)
  }

  get(key: string): string | undefined {
    return this.state.get(key)
  }

  dump(): unknown {
    return Array.from(this.state.entries())
  }

  load(entries: unknown): void {
    this.state = new Map(entries as [string, string][])
  }
}

describe('cloneFileStateCache', () => {
  test('devuelve una instancia nueva (no la misma referencia)', () => {
    const original = new StubCache(10, 1024)
    const cloned = cloneFileStateCache(original)
    expect(cloned).not.toBe(original)
  })

  test('devuelve una instancia del mismo constructor', () => {
    const original = new StubCache(10, 1024)
    const cloned = cloneFileStateCache(original)
    expect(cloned).toBeInstanceOf(StubCache)
  })

  test('preserva max y maxSize del original', () => {
    const original = new StubCache(50, 4096)
    const cloned = cloneFileStateCache(original)
    expect(cloned.max).toBe(50)
    expect(cloned.maxSize).toBe(4096)
  })

  test('el clon recibe las entradas volcadas', () => {
    const original = new StubCache(10, 1024)
    original.set('foo', 'bar')
    original.set('baz', 'qux')
    const cloned = cloneFileStateCache(original) as StubCache
    expect(cloned.get('foo')).toBe('bar')
    expect(cloned.get('baz')).toBe('qux')
  })

  test('el clon es independiente — mutar el clon no afecta al original', () => {
    const original = new StubCache(10, 1024)
    original.set('a', '1')
    const cloned = cloneFileStateCache(original) as StubCache
    cloned.set('b', '2')
    expect(original.get('b')).toBeUndefined()
    expect(cloned.get('b')).toBe('2')
  })

  test('el clon es independiente — mutar el original tras clonar no afecta al clon', () => {
    const original = new StubCache(10, 1024)
    original.set('a', 'first')
    const cloned = cloneFileStateCache(original) as StubCache
    original.set('a', 'changed')
    expect(cloned.get('a')).toBe('first')
  })

  test('maneja una cache original vacía', () => {
    const original = new StubCache(10, 1024)
    const cloned = cloneFileStateCache(original) as StubCache
    expect(cloned.get('anything')).toBeUndefined()
    expect(cloned.max).toBe(10)
    expect(cloned.maxSize).toBe(1024)
  })

  test('clona vía el constructor de la instancia original (preserva la identidad de subclase)', () => {
    // Test de subclase — la función usa `cache.constructor as new (...) => ...`
    // así que las subclases se clonan al MISMO tipo de subclase, no al padre.
    class SubCache extends StubCache {
      readonly subclassMarker = 'sub'
    }
    const original = new SubCache(10, 512)
    const cloned = cloneFileStateCache(original)
    expect(cloned).toBeInstanceOf(SubCache)
    expect((cloned as SubCache).subclassMarker).toBe('sub')
  })
})
