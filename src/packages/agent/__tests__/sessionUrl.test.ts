/**
 * Porte de `ccnmt: packages/agent/__tests__/sessionUrl.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { parseSessionIdentifier } from '../sessionUrl.ts'

describe('parseSessionIdentifier — rutas de archivo JSONL', () => {
  // Contrato crítico: los archivos JSONL se verifican ANTES de parsear como
  // URL. Sin este orden, una ruta absoluta de Windows como
  // C:\path\file.jsonl parsearía como URL con "C:" como protocolo.

  test('nombre de archivo .jsonl plano → isJsonlFile=true', () => {
    const r = parseSessionIdentifier('session.jsonl')
    expect(r?.isJsonlFile).toBe(true)
    expect(r?.jsonlFile).toBe('session.jsonl')
    expect(r?.isUrl).toBe(false)
    expect(r?.ingressUrl).toBeNull()
  })

  test('ruta Unix absoluta .jsonl → isJsonlFile=true', () => {
    const r = parseSessionIdentifier('/users/me/session.jsonl')
    expect(r?.isJsonlFile).toBe(true)
    expect(r?.jsonlFile).toBe('/users/me/session.jsonl')
  })

  test('CRÍTICO — la ruta de Windows C:\\path\\file.jsonl es JSONL (no URL)', () => {
    // Sin la verificación temprana de jsonl, "C:" parsearía como protocolo
    // de URL.
    const r = parseSessionIdentifier('C:\\path\\file.jsonl')
    expect(r?.isJsonlFile).toBe(true)
    expect(r?.isUrl).toBe(false)
  })

  test('.JSONL en mayúsculas también se reconoce (sin distinguir caja)', () => {
    expect(parseSessionIdentifier('SESSION.JSONL')?.isJsonlFile).toBe(true)
  })

  test('.jSoNl en caja mixta también se reconoce', () => {
    expect(parseSessionIdentifier('session.jSoNl')?.isJsonlFile).toBe(true)
  })

  test('una ruta JSONL genera un sessionId fresco (aleatorio, no del nombre)', () => {
    const r1 = parseSessionIdentifier('a.jsonl')
    const r2 = parseSessionIdentifier('a.jsonl')
    expect(r1?.sessionId).not.toBe(r2?.sessionId)
  })

  test('el sessionId de una JSONL es un UUID válido', () => {
    const r = parseSessionIdentifier('test.jsonl')
    expect(r?.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })
})

describe('parseSessionIdentifier — UUID', () => {
  test('un UUID válido → se devuelve el mismo sessionId', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const r = parseSessionIdentifier(uuid)
    expect(r?.sessionId).toBe(uuid)
    expect(r?.isUrl).toBe(false)
    expect(r?.isJsonlFile).toBe(false)
    expect(r?.ingressUrl).toBeNull()
    expect(r?.jsonlFile).toBeNull()
  })

  test('un UUID en mayúsculas se acepta', () => {
    const uuid = '550E8400-E29B-41D4-A716-446655440000'
    const r = parseSessionIdentifier(uuid)
    expect(r?.sessionId).toBe(uuid)
  })

  test('un UUID sin guiones NO se reconoce (requeriría manejo separado)', () => {
    // validateUuid exige guiones. 32 hex sin guiones → cae al parseo de
    // URL → falla → devuelve null.
    expect(
      parseSessionIdentifier('550e8400e29b41d4a716446655440000'),
    ).toBeNull()
  })

  test('un UUID truncado → null', () => {
    expect(parseSessionIdentifier('550e8400-e29b-41d4-a716')).toBeNull()
  })
})

describe('parseSessionIdentifier — URL', () => {
  test('URL https → isUrl=true con la URL completa capturada', () => {
    const url = 'https://api.example.com/v1/session_ingress/abc'
    const r = parseSessionIdentifier(url)
    expect(r?.isUrl).toBe(true)
    expect(r?.ingressUrl).toBe(url)
    expect(r?.isJsonlFile).toBe(false)
    expect(r?.jsonlFile).toBeNull()
  })

  test('URL http se acepta', () => {
    const r = parseSessionIdentifier('http://localhost:8080/session/x')
    expect(r?.isUrl).toBe(true)
    expect(r?.ingressUrl).toBe('http://localhost:8080/session/x')
  })

  test('una URL genera un sessionId fresco (aleatorio, no de la URL)', () => {
    const url = 'https://example.com/session/x'
    const r1 = parseSessionIdentifier(url)
    const r2 = parseSessionIdentifier(url)
    expect(r1?.sessionId).not.toBe(r2?.sessionId)
  })

  test('el sessionId de una URL es un UUID válido', () => {
    const r = parseSessionIdentifier('https://example.com/session/x')
    expect(r?.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  test('una URL con query string + fragmento se preserva en ingressUrl', () => {
    const url = 'https://example.com/session?id=123&token=xyz#anchor'
    const r = parseSessionIdentifier(url)
    expect(r?.ingressUrl).toBe(url)
  })

  test('URL.href normaliza la entrada (p. ej. quita el puerto por defecto)', () => {
    // new URL('https://example.com:443/x').href = 'https://example.com/x'
    // Documenta la normalización de URL.href.
    const r = parseSessionIdentifier('https://example.com:443/x')
    expect(r?.ingressUrl).toBe('https://example.com/x')
  })
})

describe('parseSessionIdentifier — entradas inválidas', () => {
  test('texto plano → null', () => {
    expect(parseSessionIdentifier('not a session')).toBeNull()
  })

  test('cadena vacía → null', () => {
    expect(parseSessionIdentifier('')).toBeNull()
  })

  test('sólo espacios en blanco → null', () => {
    expect(parseSessionIdentifier('   ')).toBeNull()
  })

  test('casi-UUID con un segmento de longitud incorrecta → null', () => {
    // 9 caracteres hex en el último segmento en vez de 12.
    expect(
      parseSessionIdentifier('550e8400-e29b-41d4-a716-44665544000'),
    ).toBeNull()
  })

  test('con forma de URL sin protocolo → null (parsear URL exige esquema)', () => {
    expect(parseSessionIdentifier('example.com/session')).toBeNull()
  })
})

describe('parseSessionIdentifier — orden de las ramas', () => {
  // El orden es: chequeo de jsonl → chequeo de UUID → parseo de URL → null.
  // Se verifica que ese orden produce el resultado correcto en los casos
  // ambiguos.

  test('un UUID con sufijo .jsonl prioriza la rama JSONL', () => {
    // Un patrón real: el archivo se llama <uuid>.jsonl. Gana la rama JSONL.
    const fname = '550e8400-e29b-41d4-a716-446655440000.jsonl'
    const r = parseSessionIdentifier(fname)
    expect(r?.isJsonlFile).toBe(true)
    expect(r?.jsonlFile).toBe(fname)
    expect(r?.isUrl).toBe(false)
  })
})
