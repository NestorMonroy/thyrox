/**
 * El neutralizado de etiquetas por forma: `DLo`, `xu`, `_u`, `D`, `$u`, `Au`,
 * `W`, `Su`, `Pfn` y `au` (`chunk-0grnxhq4.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { createTagFormScrubber, foldConfusables } from '../src/uds/tagFormScrub.ts'

const scrubber = createTagFormScrubber([{ tags: ['agent-message', 'teammate-message'] }])

describe('createTagFormScrubber (DLo)', () => {
  test('neutraliza la apertura y el cierre, y deja otro texto intacto', () => {
    expect(scrubber.neutralize('a <agent-message x="1">b</agent-message>')).toBe('a <\\agent-message x="1">b<\\/agent-message>')
    expect(scrubber.neutralize('</teammate-message>')).toBe('<\\/teammate-message>')
    expect(scrubber.neutralize('<b>negrita</b> sin etiqueta')).toBe('<b>negrita</b> sin etiqueta')
    expect(scrubber.neutralize('<agent-messages>')).toBe('<agent-messages>')
    expect(scrubber.neutralize('<\\agent-message>')).toBe('<\\agent-message>')
  })

  test('una letra confundible, un guion parecido o un < de ancho completo siguen contando', () => {
    expect(scrubber.neutralize('<ᴀgent-message>')).toBe('<\\ᴀgent-message>')
    expect(scrubber.neutralize('<agent—message>')).toBe('<\\agent—message>')
    expect(scrubber.neutralize('＜agent-message>')).toBe('<\\agent-message>')
    expect(scrubber.neutralize('<AGENT_MESSAGE>')).toBe('<\\AGENT_MESSAGE>')
    expect(scrubber.neutralize('<agent-​message>')).toBe('<\\agent-​message>')
  })

  test('openerOffsets devuelve la posición en el texto original aunque la lectura se alargue', () => {
    expect(scrubber.openerOffsets('x<agent-message>')).toEqual([1])
    expect(scrubber.openerOffsets('ßß<agent-message>')).toEqual([2])
    expect(scrubber.openerOffsets('sin apertura')).toEqual([])
  })

  test('un carácter del área privada que la lectura usa como marca no finge una letra', () => {
    expect(scrubber.neutralize(`<${String.fromCharCode(0xe000 + 97)}gent-message>`)).toBe(`<${String.fromCharCode(0xe000 + 97)}gent-message>`)
  })

  test('un nombre de etiqueta fuera de [a-z0-9_-] se rehúsa al construir', () => {
    expect(() => createTagFormScrubber([{ tags: ['Agent'] }])).toThrow('createTagFormScrub')
  })
})

describe('foldConfusables (Pfn)', () => {
  test('lleva parecidos cirílicos y griegos, anchos completos y marcas a su letra latina', () => {
    expect(foldConfusables('Ｈеllo')).toBe('Hello')
    expect(foldConfusables('été')).toBe('ete')
    expect(foldConfusables('Αβ')).toBe('aβ')
  })
})
