/**
 * Insercion de un bloque en un arreglo de contenido, relativa a los bloques
 * `tool_result` — porte de `ccnmt: packages/agent/contentArray.ts`.
 *
 * La colocacion no es libre: el bloque suplementario tiene que quedar DESPUES
 * del ultimo resultado de herramienta, porque un resultado que llega despues
 * de su directiva la deja sin efecto. Y si al insertarlo el bloque queda
 * ultimo, se anade un bloque de texto de continuacion: hay APIs que rechazan
 * una peticion cuyo contenido termina en algo que no es texto.
 */

/**
 * Inserta `block` tras el ultimo `tool_result` del arreglo. Muta en el sitio.
 *
 * Sin ningun `tool_result`, el bloque va ANTES del ultimo elemento — asi el
 * ultimo sigue siendo el que era, que es la razon por la que la rama con
 * resultados necesita el texto de continuacion y esta no.
 */
export function insertBlockAfterToolResults(
  content: unknown[],
  block: unknown,
): void {
  let lastToolResultIndex = -1
  for (let i = 0; i < content.length; i++) {
    const item = content[i]
    if (
      item &&
      typeof item === 'object' &&
      'type' in item &&
      (item as { type: unknown }).type === 'tool_result'
    ) {
      lastToolResultIndex = i
    }
  }

  if (lastToolResultIndex < 0) {
    content.splice(Math.max(0, content.length - 1), 0, block)
    return
  }

  const insertPosition = lastToolResultIndex + 1
  content.splice(insertPosition, 0, block)
  if (insertPosition === content.length - 1) {
    content.push({ type: 'text', text: '.' })
  }
}
