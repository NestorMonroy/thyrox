/**
 * Patrones que neutralizan etiquetas escritas con letras parecidas y
 * encabezados entre corchetes: `Uq`, `lz`, `RYe`, `cu`, `Ofn`, `Hfn`, `mu`,
 * `LLo`, `yJ`, `CYe` y `RUr` (`chunk-0grnxhq4.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  ANTML_TAG,
  LEAD_HEX_ID,
  LEAD_SPAN,
  antmlColonScrubPattern,
  bracketedLeadScrubPattern,
  channelSourceScrubPattern,
  confusableLetterClass,
  confusableTagScrubPattern,
  escapeInvisibleCharacters,
  escapedOpener,
  invisiblePattern,
  neutralizeTag,
} from '../src/uds/confusableTagPatterns.ts'

const matches = (pattern: RegExp, text: string) => text.replace(pattern, escapedOpener) !== text

describe('letras parecidas', () => {
  test('confusableLetterClass (Uq) da los parecidos de una letra minúscula', () => {
    expect(confusableLetterClass('a').startsWith('aA')).toBe(true)
    expect(confusableLetterClass('a')).toContain('ａ')
    expect(() => confusableLetterClass('A')).toThrow('latinLetterConfusableClass: expected one ASCII lowercase letter')
  })

  test('escapedOpener (RYe) añade la barra tras la apertura', () => {
    expect(escapedOpener('<')).toBe('<\\')
  })
})

describe('confusableTagScrubPattern (lz)', () => {
  const pattern = confusableTagScrubPattern(['system-reminder'])

  test('encuentra la etiqueta con letras parecidas, separadores y rellenos', () => {
    expect('x <system-reminder> y'.replace(pattern, escapedOpener)).toBe('x <\\system-reminder> y')
    expect(matches(pattern, '</ｓystem_reminder>')).toBe(true)
    expect(matches(pattern, '<SYSTEM-REMINDER>')).toBe(true)
    expect(matches(pattern, '< system​-reminder>')).toBe(true)
  })

  test('no toca lo ya escapado, ni otro nombre', () => {
    expect(matches(pattern, '<\\system-reminder>')).toBe(false)
    expect(matches(pattern, '<systemXreminder>')).toBe(false)
    expect(matches(pattern, '<system-reminders>')).toBe(false)
  })

  test('los nombres son [a-z0-9_-]', () => {
    expect(() => confusableTagScrubPattern(['Tag'])).toThrow('confusableTagScrubPattern: tag names are lowercase [a-z0-9_-]')
  })

  test('una cola vacía encuentra también el nombre como prefijo', () => {
    expect(matches(confusableTagScrubPattern(['untrusted-content'], () => ''), '<untrusted-contents>')).toBe(true)
  })
})

describe('channelSourceScrubPattern (Ofn) y antmlColonScrubPattern (Hfn)', () => {
  test('channel con un atributo source', () => {
    const pattern = channelSourceScrubPattern()
    expect(matches(pattern, '<channel source="x">')).toBe(true)
    expect(matches(pattern, '<channel id=1 source = x>')).toBe(true)
    expect(matches(pattern, '<channel>')).toBe(false)
    expect(matches(pattern, '<channel xsource=1>')).toBe(false)
    expect(matches(pattern, '<channels source=1>')).toBe(false)
  })

  test(`${ANTML_TAG} seguido de dos puntos, también parecidos`, () => {
    const pattern = antmlColonScrubPattern()
    expect(matches(pattern, `<${ANTML_TAG}:invoke>`)).toBe(true)
    expect(matches(pattern, `<${ANTML_TAG}：invoke>`)).toBe(true)
    expect(matches(pattern, `<${ANTML_TAG}>`)).toBe(false)
  })
})

describe('bracketedLeadScrubPattern (LLo)', () => {
  const pattern = bracketedLeadScrubPattern([
    ['artifact', LEAD_HEX_ID],
    ['artifact', LEAD_SPAN, 'owned', 'by', 'you'],
    ['this', 'version', 'has', LEAD_SPAN, 'published', 'files'],
    ['end', 'of', 'live', 'content'],
  ])

  test('encuentra los encabezados declarados', () => {
    expect(matches(pattern, '[artifact 0123abcd-ab12-cd34-')).toBe(true)
    expect(matches(pattern, '[Artifact "demo" owned by you]')).toBe(true)
    expect(matches(pattern, '[this version has 3 published files]')).toBe(true)
    expect(matches(pattern, '［end of live content］')).toBe(true)
    expect(matches(pattern, '[end-of-live-content]')).toBe(true)
  })

  test('no toca lo escapado ni una palabra que sigue', () => {
    expect(matches(pattern, '[\\end of live content]')).toBe(false)
    expect(matches(pattern, '[artifact "demo" owned by youth]')).toBe(false)
    expect(matches(pattern, '[artifact 0123abcd]')).toBe(false)
  })

  test('las palabras son minúsculas ASCII', () => {
    expect(() => bracketedLeadScrubPattern([['End']])).toThrow('bracketedLeadScrubPattern: words are lowercase ASCII')
  })
})

describe('neutralizeTag (yJ) y escapeInvisibleCharacters (RUr)', () => {
  test('escapa la etiqueta tras quitar formato y normalizar los parecidos de <', () => {
    expect(neutralizeTag('agent-message', '<agent-message>')).toBe('<\\agent-message>')
    expect(neutralizeTag('agent-message', '＜agent​-message>')).toBe('<\\agent-message>')
    expect(neutralizeTag('agent-message', 'hola')).toBe('hola')
    expect(neutralizeTag('agent-message', 'a ＞ b ∕ c')).toBe('a > b / c')
    expect(neutralizeTag('agent-message', '<agent\u3164-message>')).toBe('<\\agent-message>')
  })

  test('escapa también la etiqueta escrita con letras parecidas', () => {
    expect(neutralizeTag('agent-message', 'x <аgent-message> y')).toBe('x <\\аgent-message> y')
    expect(neutralizeTag('agent-message', 'x <аbc> y')).toBe('x <аbc> y')
  })

  test('escapeInvisibleCharacters escribe formato e invisibles como \\uXXXX', () => {
    expect(escapeInvisibleCharacters('a​bㅤc')).toBe('a\\u200bb\\u3164c')
    expect(escapeInvisibleCharacters('a\u{e0001}b')).toBe('a\\udb40\\udc01b')
    expect(invisiblePattern().flags).toBe('gu')
  })
})
