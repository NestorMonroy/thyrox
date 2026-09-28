/**
 * La contraseña de sudo de los verbos privilegiados: la primera línea de un
 * flujo, sin su salto. Por stdin no queda a la vista de `ps` ni del historial.
 */
import type { Readable } from 'node:stream'

export async function readFirstLine(stream: Readable): Promise<string> {
  let text = ''
  for await (const chunk of stream) {
    text += String(chunk)
    const end = text.indexOf('\n')
    if (end !== -1) return text.slice(0, end).replace(/\r$/, '')
  }
  return text.replace(/\r$/, '')
}
