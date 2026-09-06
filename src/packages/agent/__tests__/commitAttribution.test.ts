/**
 * Porte de `ccnmt: packages/agent/__tests__/sanitizeModelName.test.ts` y
 * `computeContentHash.test.ts`, que miden el mismo modulo y aqui viven
 * juntos: la atribucion de un cambio a una sesion y a una superficie.
 *
 * Divergencia declarada: la tabla de familias es PARAMETRO, no mecanismo.
 * La de la referencia se porta verbatim y se le anaden las familias de
 * este catalogo (opus-5, sonnet-5, fable-5-1, mythos-5-1), que la
 * referencia no conoce. Ninguna asercion portada las nombra.
 */
import { describe, expect, test } from 'bun:test'
import {
  buildSurfaceKey,
  computeContentHash,
  sanitizeModelName,
  sanitizeSurfaceKey,
} from '../src/attribution/commitAttribution.ts'

describe('sanitizeModelName — familia Opus', () => {
  test('las variantes de opus-4-7 colapsan a claude-opus-4-7', () => {
    expect(sanitizeModelName('opus-4-7')).toBe('claude-opus-4-7')
    expect(sanitizeModelName('opus-4-7-fast')).toBe('claude-opus-4-7')
    expect(sanitizeModelName('opus-4-7-internal')).toBe('claude-opus-4-7')
  })
  test('opus-4-6 colapsa a claude-opus-4-6', () => {
    expect(sanitizeModelName('opus-4-6')).toBe('claude-opus-4-6')
  })
  test('opus-4-5 colapsa a claude-opus-4-5', () => {
    expect(sanitizeModelName('opus-4-5-fast')).toBe('claude-opus-4-5')
  })
  test('opus-4-1 colapsa a claude-opus-4-1', () => {
    expect(sanitizeModelName('opus-4-1')).toBe('claude-opus-4-1')
  })
  test('opus-4 a secas colapsa a claude-opus-4', () => {
    expect(sanitizeModelName('opus-4')).toBe('claude-opus-4')
  })
  test('gana el mas especifico: opus-4-7 no cae en opus-4', () => {
    expect(sanitizeModelName('opus-4-7')).not.toBe('claude-opus-4')
  })
})

describe('sanitizeModelName — familia Sonnet', () => {
  test('sonnet-4-6', () => { expect(sanitizeModelName('sonnet-4-6')).toBe('claude-sonnet-4-6') })
  test('sonnet-4-5', () => { expect(sanitizeModelName('sonnet-4-5')).toBe('claude-sonnet-4-5') })
  test('sonnet-4 a secas', () => { expect(sanitizeModelName('sonnet-4')).toBe('claude-sonnet-4') })
  test('sonnet-3-7', () => { expect(sanitizeModelName('sonnet-3-7')).toBe('claude-sonnet-3-7') })
})

describe('sanitizeModelName — familia Haiku', () => {
  test('haiku-4-5', () => { expect(sanitizeModelName('haiku-4-5')).toBe('claude-haiku-4-5') })
  test('haiku-3-5', () => { expect(sanitizeModelName('haiku-3-5')).toBe('claude-haiku-3-5') })
})

describe('sanitizeModelName — lo desconocido', () => {
  test('un nombre que no es de familia colapsa a claude', () => {
    expect(sanitizeModelName('gpt-4')).toBe('claude')
    expect(sanitizeModelName('llama-3')).toBe('claude')
    expect(sanitizeModelName('')).toBe('claude')
  })
})

describe('sanitizeModelName — las familias de ESTE catalogo (divergencia declarada)', () => {
  test('las cuatro que la referencia no conoce se reconocen', () => {
    expect(sanitizeModelName('claude-opus-5')).toBe('claude-opus-5')
    expect(sanitizeModelName('claude-sonnet-5')).toBe('claude-sonnet-5')
    expect(sanitizeModelName('claude-fable-5-1')).toBe('claude-fable-5-1')
    expect(sanitizeModelName('claude-mythos-5-1')).toBe('claude-mythos-5-1')
  })
  test('anadirlas no cambia el veredicto de ninguna forma portada', () => {
    expect(sanitizeModelName('opus-4-7')).toBe('claude-opus-4-7')
    expect(sanitizeModelName('sonnet-4')).toBe('claude-sonnet-4')
  })
})

describe('sanitizeSurfaceKey', () => {
  test('sustituye solo el tramo de modelo, tras la ULTIMA barra', () => {
    expect(sanitizeSurfaceKey('cli/opus-4-5-fast')).toBe('cli/claude-opus-4-5')
    expect(sanitizeSurfaceKey('repl/sonnet-4-6')).toBe('repl/claude-sonnet-4-6')
  })
  test('conserva las superficies de varios tramos', () => {
    expect(sanitizeSurfaceKey('cli/sub/opus-4-7')).toBe('cli/sub/claude-opus-4-7')
  })
  test('pasa verbatim cuando no hay barra: no hay tramo de modelo', () => {
    expect(sanitizeSurfaceKey('plain')).toBe('plain')
  })
  test('un modelo desconocido en la superficie colapsa a claude', () => {
    expect(sanitizeSurfaceKey('cli/unknown-model')).toBe('cli/claude')
  })
  test('el modelo vacio tras la barra colapsa a claude', () => {
    expect(sanitizeSurfaceKey('cli/')).toBe('cli/claude')
  })
})

describe('computeContentHash', () => {
  test('devuelve SHA-256 en hexadecimal de 64 caracteres', () => {
    expect(computeContentHash('hello')).toMatch(/^[0-9a-f]{64}$/)
  })
  test('es determinista', () => {
    expect(computeContentHash('hello')).toBe(computeContentHash('hello'))
  })
  test('entradas distintas dan digest distinto', () => {
    expect(computeContentHash('a')).not.toBe(computeContentHash('b'))
  })
  test('la cadena vacia tiene su SHA-256 conocido', () => {
    expect(computeContentHash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  test('hashea los bytes UTF-8, no los puntos de codigo', () => {
    expect(computeContentHash('hello')).not.toBe(computeContentHash('héllo'))
  })
  test('el hexadecimal sale en minusculas', () => {
    const r = computeContentHash('test')
    expect(r).toBe(r.toLowerCase())
  })
  test('cien mil caracteres siguen dando 64', () => {
    expect(computeContentHash('x'.repeat(100_000))).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('buildSurfaceKey', () => {
  test('une la superficie y el modelo canonico con barra', () => {
    const r = buildSurfaceKey('cli', 'claude-opus-4-7')
    expect(r).toMatch(/^cli\//)
    expect(r.length).toBeGreaterThan(4)
  })
  test('la superficie pasa verbatim', () => {
    expect(buildSurfaceKey('vscode', 'claude-opus-4-7')).toMatch(/^vscode\//)
    expect(buildSurfaceKey('sdk', 'claude-opus-4-7')).toMatch(/^sdk\//)
  })
  test('superficies distintas dan claves distintas con el mismo modelo', () => {
    expect(buildSurfaceKey('cli', 'claude-opus-4-7')).not.toBe(buildSurfaceKey('vscode', 'claude-opus-4-7'))
  })
  test('su salida es punto fijo de sanitizeSurfaceKey', () => {
    const k = buildSurfaceKey('cli', 'claude-opus-4-7')
    expect(sanitizeSurfaceKey(k)).toBe(k)
  })
})
