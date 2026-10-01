/**
 * Tests for word slug generation. Used as plan filenames, session
 * identifiers, and similar memorable IDs.
 *
 * Wrong format (e.g., trailing dash) creates files with unexpected
 * names; wrong randomness produces duplicates that overwrite each
 * other.
 */
import { describe, expect, test } from 'bun:test'
import { createHash } from 'crypto'

import { PRODUCT_NAME } from '@thyrox/config/product'

import {
  ADJECTIVES,
  NOUNS,
  VERBS,
  derivedSessionName,
  generateShortWordSlug,
  generateWordSlug,
  isShortWordSlug,
  shortWordSlugFromSeed,
  slugFromText,
} from '../words.js'

describe('generateWordSlug — adjective-verb-noun shape', () => {
  test('returns a string', () => {
    expect(typeof generateWordSlug()).toBe('string')
  })

  test('exactly 3 hyphen-separated parts', () => {
    const parts = generateWordSlug().split('-')
    expect(parts).toHaveLength(3)
    for (const p of parts) {
      expect(p.length).toBeGreaterThan(0)
    }
  })

  test('lowercase only (no uppercase letters)', () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateWordSlug()
      expect(slug).toBe(slug.toLowerCase())
    }
  })

  test('100 calls produce variety (not all identical)', () => {
    const slugs = new Set<string>()
    for (let i = 0; i < 100; i++) slugs.add(generateWordSlug())
    // With ADJECTIVES * VERBS * NOUNS combinations, 100 samples
    // should produce many distinct slugs.
    expect(slugs.size).toBeGreaterThan(50)
  })

  test('no leading or trailing hyphen', () => {
    const slug = generateWordSlug()
    expect(slug.startsWith('-')).toBe(false)
    expect(slug.endsWith('-')).toBe(false)
  })

  test('only alphanumeric + hyphen characters', () => {
    for (let i = 0; i < 30; i++) {
      const slug = generateWordSlug()
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

describe('generateShortWordSlug — adjective-noun shape', () => {
  test('exactly 2 hyphen-separated parts', () => {
    const parts = generateShortWordSlug().split('-')
    expect(parts).toHaveLength(2)
    for (const p of parts) {
      expect(p.length).toBeGreaterThan(0)
    }
  })

  test('lowercase only', () => {
    for (let i = 0; i < 30; i++) {
      const slug = generateShortWordSlug()
      expect(slug).toBe(slug.toLowerCase())
    }
  })

  test('shorter (in average) than full slug', () => {
    // Both adjective and noun pools are large enough that the average
    // short slug is fewer hyphens, but no strict character-count
    // guarantee. Lock the structural difference (2 parts vs 3).
    expect(generateShortWordSlug().split('-')).toHaveLength(2)
    expect(generateWordSlug().split('-')).toHaveLength(3)
  })
})

describe('isShortWordSlug (ADo) — reconoce adjetivo-sustantivo de estas listas', () => {
  test('lo que genera generateShortWordSlug se reconoce', () => {
    for (let i = 0; i < 50; i++) expect(isShortWordSlug(generateShortWordSlug())).toBe(true)
  })

  test('exactamente dos partes, en su orden y de sus listas', () => {
    expect(isShortWordSlug(`${ADJECTIVES[0]}-${NOUNS[0]}`)).toBe(true)
    expect(isShortWordSlug(`${NOUNS[0]}-${ADJECTIVES[0]}`)).toBe(false)
    expect(isShortWordSlug(`${ADJECTIVES[0]}-${NOUNS[0]}-x`)).toBe(false)
    expect(isShortWordSlug(ADJECTIVES[0])).toBe(false)
    expect(isShortWordSlug(`${ADJECTIVES[0]}-zzzz`)).toBe(false)
  })
})

describe('shortWordSlugFromSeed (TDo) — el slug corto que una semilla fija', () => {
  test('toma el adjetivo y el sustantivo de los dos primeros u32 big-endian', () => {
    const seed = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 2])
    expect(shortWordSlugFromSeed(seed)).toBe(`${ADJECTIVES[1]}-${NOUNS[2]}`)
    const wrap = new Uint8Array(8)
    new DataView(wrap.buffer).setUint32(0, ADJECTIVES.length + 3)
    new DataView(wrap.buffer).setUint32(4, NOUNS.length * 2)
    expect(shortWordSlugFromSeed(wrap)).toBe(`${ADJECTIVES[3]}-${NOUNS[0]}`)
  })

  test('respeta el desplazamiento de la vista y exige ocho bytes', () => {
    const backing = new Uint8Array([9, 9, 0, 0, 0, 4, 0, 0, 0, 5])
    expect(shortWordSlugFromSeed(backing.subarray(2))).toBe(`${ADJECTIVES[4]}-${NOUNS[5]}`)
    expect(() => shortWordSlugFromSeed(new Uint8Array(7))).toThrow('shortWordSlugFromSeed needs at least 8 seed bytes')
    expect(isShortWordSlug(shortWordSlugFromSeed(backing.subarray(2)))).toBe(true)
  })
})

describe('slugFromText (E$t) — un slug a partir de texto libre', () => {
  test('primeras cuatro palabras, en minúsculas, con guiones, sin marcas de pegado', () => {
    expect(slugFromText('Fix the Login Bug in production now')).toBe('fix-the-login-bug')
    expect(slugFromText('[Pasted text #1 +3 lines] Revisa esto [Image #2] ya')).toBe('revisa-esto-ya')
    expect(slugFromText('[...Truncated text #4 +10 lines...] [Audio #1] hola')).toBe('hola')
    expect(slugFromText('  ¡Hola, mundo!  ')).toBe('hola-mundo')
  })

  test('opciones de palabras y largo, sin guiones en los bordes', () => {
    expect(slugFromText('uno dos tres', { words: 2 })).toBe('uno-dos')
    expect(slugFromText('abcdefghij klm', { maxLen: 11 })).toBe('abcdefghij')
    expect(slugFromText('---')).toBe('')
  })
})

describe('generateWordSlug (M4n)', () => {
  test('adjetivo-verbo-sustantivo de estas listas', () => {
    const [adjective, verb, noun, ...rest] = generateWordSlug().split('-')
    expect(rest).toEqual([])
    expect(ADJECTIVES as readonly string[]).toContain(adjective!)
    expect(VERBS as readonly string[]).toContain(verb!)
    expect(NOUNS as readonly string[]).toContain(noun!)
  })
})

describe('derivedSessionName (xs)', () => {
  test('con dirección estable: el slug de la carpeta y el del sha256 de la sesión', () => {
    const seed = createHash('sha256').update('sess_1').digest()
    expect(derivedSessionName('/home/u/Mi Proyecto', 'sess_1', true)).toBe(`mi-proyecto-${shortWordSlugFromSeed(seed)}`)
    expect(derivedSessionName('/home/u/Mi Proyecto', 'sess_1', true)).toBe(derivedSessionName('/otra/Mi Proyecto/', 'sess_1', true))
  })

  test('sin dirección estable: un byte aleatorio en hexadecimal', () => {
    expect(derivedSessionName('/tmp/app', 's', false)).toMatch(/^app-[0-9a-f]{2}$/)
  })

  test('una carpeta sin slug toma el nombre del producto', () => {
    expect(derivedSessionName('/', 's', false)).toMatch(new RegExp(`^${PRODUCT_NAME}-[0-9a-f]{2}$`))
    expect(derivedSessionName('/tmp/---', 's', true).startsWith(`${PRODUCT_NAME}-`)).toBe(true)
  })
})
