/**
 * Escapes XML de `chunk-0grnxhq4.js` de 2.1.283: `qt`, `AYe`, `AFt`, `Do`, `$w` e `ine`.
 */
import { expect, test } from 'bun:test'

import { escapeXmlAttribute, escapeXmlText, escapeXmlTextCapped, unescapeXmlAttribute, unescapeXmlText } from '../src/uds/xmlText.ts'

test('escapeXmlText (qt) y escapeXmlAttribute (Do)', () => {
  expect(escapeXmlText('a<b>&c')).toBe('a&lt;b&gt;&amp;c')
  expect(escapeXmlAttribute(`"x"'y'<`)).toBe('&quot;x&quot;&apos;y&apos;&lt;')
})

test('unescapeXmlText ($w) y unescapeXmlAttribute (ine) deshacen sólo sus entidades', () => {
  expect(unescapeXmlText('&lt;&gt;&amp;&quot;')).toBe('<>&&quot;')
  expect(unescapeXmlAttribute('&lt;&quot;&apos;&amp;amp;')).toBe(`<"'&amp;`)
})

test('escapeXmlTextCapped (AYe/AFt) recorta el original hasta que el escapado quepa, con marca', () => {
  expect(escapeXmlTextCapped('abc', 10)).toBe('abc')
  const capped = escapeXmlTextCapped('<'.repeat(20), 30)
  expect(capped.endsWith('… [truncated]')).toBe(true)
  expect(capped.length).toBeLessThanOrEqual(30)
  expect(capped.startsWith('&lt;')).toBe(true)
})
