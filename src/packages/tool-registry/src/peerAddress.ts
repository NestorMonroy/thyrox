/**
 * Puerto de `ccnmt: packages/tool-registry/src/peerAddress.ts` (16 líneas,
 * 1 símbolo). El análisis de una dirección de par en esquema + destino.
 *
 * VIVE SOLO, y no por estética: `SendMessageTool` necesita analizar una
 * dirección al ENUMERAR las herramientas, mucho antes de mandar nada.
 * Si esto viviera junto al registro de pares, esa enumeración arrastraría
 * el cliente HTTP del puente y las capas de socket — trabajo de red en el
 * camino de arranque, para responder «qué herramientas hay».
 */

/** Analiza una dirección con forma de URI en su esquema y su destino. */
export function parseAddress(to: string): {
  scheme: 'uds' | 'bridge' | 'other'
  target: string
} {
  if (to.startsWith('uds:')) return { scheme: 'uds', target: to.slice(4) }
  if (to.startsWith('bridge:')) return { scheme: 'bridge', target: to.slice(7) }
  // Una ruta absoluta ES un socket aunque no lo diga: sin esta rama, un
  // destino escrito como ruta caería en `other` y el mensaje no saldría.
  if (to.startsWith('/')) return { scheme: 'uds', target: to }
  return { scheme: 'other', target: to }
}
