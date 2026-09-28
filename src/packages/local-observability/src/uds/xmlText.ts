/**
 * Escapes y desescapes XML para texto y atributos. Porte de `qt`, `AYe`,
 * `AFt`, `Do`, `$w` e `ine` (`chunk-0grnxhq4.js`) de 2.1.283.
 */
import { sliceUnits } from './stringUnits.ts'

const TRUNCATION_MARK = '… [truncated]'
const TRUNCATION_BACKOFF = 0.9

/** `qt`. */
export function escapeXmlText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** `Do`. */
export function escapeXmlAttribute(text: string): string {
  return escapeXmlText(text).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

/** `AFt`: el prefijo más largo que, escapado y con la marca de recorte, cabe en `max`. */
function truncateForEscape(text: string, max: number): string {
  let units = Math.max(0, Math.floor(text.length * (max / escapeXmlText(text).length)))
  for (;;) {
    const head = sliceUnits(text, units)
    if (escapeXmlText(head).length + TRUNCATION_MARK.length <= max || units === 0) return head + TRUNCATION_MARK
    units = Math.floor(units * TRUNCATION_BACKOFF)
  }
}

/** `AYe`: el texto escapado, recortado por el original para que el resultado no pase de `max`. */
export function escapeXmlTextCapped(text: string, max: number): string {
  const escaped = escapeXmlText(text)
  if (escaped.length <= max) return escaped
  return escapeXmlText(truncateForEscape(text, max))
}

const TEXT_ENTITIES: Readonly<Record<string, string>> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' }
const ATTRIBUTE_ENTITIES: Readonly<Record<string, string>> = { ...TEXT_ENTITIES, '&quot;': '"', '&apos;': "'" }

/** `$w`. */
export function unescapeXmlText(text: string): string {
  return text.replace(/&(?:amp|lt|gt);/g, entity => TEXT_ENTITIES[entity] ?? entity)
}

/** `ine`. */
export function unescapeXmlAttribute(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ATTRIBUTE_ENTITIES[entity] ?? entity)
}
