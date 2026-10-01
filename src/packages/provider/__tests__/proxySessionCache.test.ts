/**
 * Caché de sesión → credencial — casos portados de CLIProxyAPI
 * (`sdk/cliproxy/auth/session_cache_test.go`, leído como referencia) más los
 * de caducidad, alias y compactación que la referencia ejerce desde el
 * selector, aquí con el reloj inyectado.
 */
import { describe, expect, test } from 'bun:test'
import { compactAliases, mergeAliases, SessionCache } from '../src/proxy/session/sessionCache.ts'

const cacheWith = (maxEntries: number, now = () => 0) => new SessionCache({ ttlMs: 60 * 60 * 1000, maxEntries, now, cleanup: false })

describe('SessionCache: capacidad', () => {
  test('desaloja el grupo más viejo al superar la capacidad', () => {
    const cache = cacheWith(5)
    for (let i = 1; i <= 5; i++) cache.set(`sess-${i}`, `auth-${i}`)
    expect(cache.size).toBe(5)
    cache.set('sess-6', 'auth-6')
    expect(cache.size).toBeLessThanOrEqual(5)
    expect(cache.get('sess-1')).toBeUndefined()
    for (let i = 2; i <= 6; i++) expect(cache.get(`sess-${i}`)).toBe(`auth-${i}`)
  })

  test('un grupo de varios alias se desaloja entero', () => {
    const cache = cacheWith(4)
    cache.setAliases('auth-1', 's1-a', 's1-b')
    cache.setAliases('auth-2', 's2-a', 's2-b')
    expect(cache.size).toBe(4)
    cache.set('s3', 'auth-3')
    expect(cache.size).toBeLessThanOrEqual(4)
    expect(cache.get('s1-a')).toBeUndefined()
    expect(cache.get('s1-b')).toBeUndefined()
    expect(cache.get('s2-a')).toBe('auth-2')
    expect(cache.get('s3')).toBe('auth-3')
  })

  test('diez mil escrituras sobre capacidad mil conservan las últimas', () => {
    const cache = cacheWith(1000)
    for (let i = 0; i < 10_000; i++) cache.set(`sess-${i}`, `auth-${i % 10}`)
    expect(cache.size).toBeLessThanOrEqual(1000)
    for (let i = 9900; i < 10_000; i++) expect(cache.get(`sess-${i}`)).toBe(`auth-${i % 10}`)
  })

  test('ocho escritores intercalados no superan la capacidad', () => {
    const cache = cacheWith(50)
    for (let i = 0; i < 500; i++) {
      for (let worker = 0; worker < 8; worker++) {
        const key = `worker-${worker}-sess-${i}`
        cache.set(key, `auth-${worker}`)
        cache.get(key)
        if (i % 5 === 0) cache.touch(key, `auth-${worker}`)
        if (i % 7 === 0) cache.compareAndDelete(key, `auth-${worker}`)
      }
    }
    expect(cache.size).toBeLessThanOrEqual(50)
  })
})

describe('SessionCache: caducidad y alias', () => {
  test('get no refresca; getAndRefresh refresca el grupo entero', () => {
    let clock = 0
    const cache = new SessionCache({ ttlMs: 1000, now: () => clock, cleanup: false })
    cache.setAliases('auth-a', 'explicit', 'derived')
    clock = 900
    expect(cache.get('explicit')).toBe('auth-a')
    clock = 1000
    expect(cache.get('derived')).toBeUndefined()
    expect(cache.size).toBe(0)

    clock = 0
    cache.setAliases('auth-b', 'one', 'two')
    clock = 900
    expect(cache.getAndRefresh('one')).toBe('auth-b')
    clock = 1500
    expect(cache.get('two')).toBe('auth-b')
  })

  test('set conserva los alias que ya tenía el grupo al moverlo a otra credencial', () => {
    const cache = cacheWith(10)
    cache.setAliases('auth-a', 'explicit', 'derived')
    cache.set('explicit', 'auth-b')
    expect(cache.get('derived')).toBe('auth-b')
  })

  test('touch y compareAndDelete exigen la credencial esperada', () => {
    const cache = cacheWith(10)
    cache.setAliases('auth-a', 'x', 'y')
    expect(cache.touch('x', 'auth-other')).toBe(false)
    expect(cache.compareAndDelete('x', 'auth-other')).toBe(false)
    expect(cache.compareAndDelete('x', 'auth-a')).toBe(true)
    expect(cache.get('x')).toBeUndefined()
    expect(cache.get('y')).toBe('auth-a')
  })

  test('invalidate retira un alias sin que el grupo lo recree al refrescar', () => {
    const cache = cacheWith(10)
    cache.setAliases('auth-a', 'x', 'y')
    cache.invalidate('x')
    expect(cache.getAndRefresh('y')).toBe('auth-a')
    expect(cache.get('x')).toBeUndefined()
  })

  test('invalidateAuth retira todas las sesiones de una credencial', () => {
    const cache = cacheWith(10)
    cache.setAliases('auth-a', 'x', 'y')
    cache.set('z', 'auth-b')
    cache.invalidateAuth('auth-a')
    expect(cache.size).toBe(1)
    expect(cache.get('z')).toBe('auth-b')
  })

  test('cleanup retira los grupos caducados', () => {
    let clock = 0
    const cache = new SessionCache({ ttlMs: 1000, now: () => clock, cleanup: false })
    cache.set('x', 'auth-a')
    clock = 2000
    cache.cleanup()
    expect(cache.size).toBe(0)
  })

  test('valores vacíos no se registran ni se consultan', () => {
    const cache = cacheWith(10)
    cache.set('', 'auth-a')
    cache.set('x', '')
    expect(cache.size).toBe(0)
    expect(cache.get('')).toBeUndefined()
    expect(cache.touch('', 'auth-a')).toBe(false)
    cache.stop()
    cache.stop()
  })
})

describe('alias', () => {
  test('mergeAliases conserva el orden y quita vacíos y repetidos', () => {
    expect(mergeAliases(['a', 'b'], 'b', '', 'c', 'a')).toEqual(['a', 'b', 'c'])
  })

  test('compactAliases deja una sola clave de caché de prompt y 64 estables', () => {
    expect(compactAliases(['pck:1', 'x', 'pck:2', 'm::pck:3', 'y'])).toEqual(['pck:1', 'x', 'y'])
    const many = Array.from({ length: 70 }, (_, i) => `s${i}`)
    expect(compactAliases(many)).toHaveLength(64)
  })
})
