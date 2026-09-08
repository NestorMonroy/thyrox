/**
 * Analizador incremental de tramas SSE — porte de
 * `ccnmt: packages/provider/src/gemini/sseParser.ts` (86 lineas, 1 export).
 *
 * El puerto es COMPLETO: el tipo `SSEFrame` y `parseSSEFrames`. Ninguno queda
 * fuera.
 *
 * La fuente lo declara como codigo INCORPORADO desde el transporte SSE de su
 * paquete de CLI, a proposito, para no crear una dependencia entre paquetes
 * por un analizador de ochenta lineas. El puerto conserva esa decision: vive
 * aqui, no importado del hermano.
 */

type SSEFrame = {
  event?: string
  id?: string
  data?: string
}

/**
 * Analiza tramas SSE de un buffer de texto, devolviendo las completas y el
 * resto incompleto para la siguiente pasada.
 *
 * Segun la norma WHATWG una linea puede terminar en CRLF, LF o CR suelto. Se
 * normaliza todo a LF antes de recorrer, para que las tres formas produzcan la
 * misma frontera `\n\n`. Sin eso, un servidor que emita CRLF —observado en
 * Gemini tras ciertos proxies— nunca produciria una trama y el stream se
 * colgaria.
 */
export function parseSSEFrames(buffer: string): {
  frames: SSEFrame[]
  remaining: string
} {
  // El ORDEN importa: CRLF primero, para que cada par se vuelva un solo LF.
  if (buffer.includes('\r')) {
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  const frames: SSEFrame[] = []
  let pos = 0

  // Las tramas SSE se delimitan con doble salto de linea.
  let idx: number
  while ((idx = buffer.indexOf('\n\n', pos)) !== -1) {
    const rawFrame = buffer.slice(pos, idx)
    pos = idx + 2

    if (!rawFrame.trim()) continue

    const frame: SSEFrame = {}
    let isComment = false

    for (const line of rawFrame.split('\n')) {
      if (line.startsWith(':')) {
        // Comentario SSE, p. ej. `:keepalive`.
        isComment = true
        continue
      }

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue

      const field = line.slice(0, colonIdx)
      // La norma recorta UN espacio tras los dos puntos, si lo hay.
      const value =
        line[colonIdx + 1] === ' ' ? line.slice(colonIdx + 2) : line.slice(colonIdx + 1)

      switch (field) {
        case 'event':
          frame.event = value
          break
        case 'id':
          frame.id = value
          break
        case 'data':
          // La norma manda concatenar varias lineas `data:` con salto.
          frame.data = frame.data ? frame.data + '\n' + value : value
          break
        // El resto de campos —`retry:` y demas— se ignora.
      }
    }

    // Solo salen las tramas con datos, y las de puro comentario, que existen
    // para refrescar la vivacidad. Una con `data` vacio NO sale: la guarda
    // mide veracidad y la cadena vacia es falsy.
    if (frame.data || isComment) {
      frames.push(frame)
    }
  }

  return { frames, remaining: buffer.slice(pos) }
}
