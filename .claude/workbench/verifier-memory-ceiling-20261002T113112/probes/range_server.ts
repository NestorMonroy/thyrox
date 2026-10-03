/**
 * Servidor mínimo de un archivo que respeta `Range: bytes=a-b` con 206, como
 * el CDN de un registry; Bun.serve con Bun.file lo ignora y responde 200 entero.
 * Uso: bun range_server.ts <ruta>; imprime el puerto.
 */
const [path] = process.argv.slice(2) as [string]
const file = Bun.file(path)
const server = Bun.serve({
  port: 0,
  fetch(request) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('range') ?? '')
    if (!match) return new Response(file)
    const start = Number(match[1])
    if (start >= file.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${file.size}` } })
    const end = Math.min(match[2] === '' ? file.size - 1 : Number(match[2]), file.size - 1)
    return new Response(file.slice(start, end + 1), { status: 206, headers: { 'content-range': `bytes ${start}-${end}/${file.size}` } })
  },
})
console.log(server.port)
