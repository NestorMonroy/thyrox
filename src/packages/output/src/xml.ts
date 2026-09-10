/**
 * Puerto de `ccnmt: packages/output/src/xml.ts` (verbatim — sin imports en
 * la fuente). Escape de XML/HTML para interpolar texto no confiable
 * (stdout de un proceso, entrada del usuario, datos externos) dentro de
 * un tag SVG/XML — lo consume `capture/ansi-to-svg.ts` de este mismo
 * paquete.
 */

/**
 * Escapa los caracteres especiales de XML/HTML para interpolacion segura
 * en el contenido de texto de un elemento (entre tags). Usar cuando una
 * cadena no confiable (stdout de un proceso, entrada del usuario, datos
 * externos) va dentro de `<tag>${aqui}</tag>`.
 */
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Escapa para interpolacion dentro de un valor de atributo entre comillas
 * dobles o simples: `<tag attr="${aqui}">`. Ademas de `& < >`, escapa las
 * comillas.
 */
export function escapeXmlAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
