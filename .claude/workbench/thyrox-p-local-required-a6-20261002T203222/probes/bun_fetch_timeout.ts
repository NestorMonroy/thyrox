// ¿Aborta el fetch de Bun una respuesta lenta sin que nadie declare un plazo?
// Servidor local que responde a los 320 s; dos clientes: por defecto y con
// `timeout: false`. Imprime qué termina, cómo y en cuántos segundos.
const DELAY_MS = 320_000
const server = Bun.serve({ port: 0, idleTimeout: 0, fetch: async () => { await Bun.sleep(DELAY_MS); return new Response('ok') } })
const url = `http://127.0.0.1:${server.port}/`
async function probe(label: string, init: RequestInit & { timeout?: boolean }) {
  const started = Date.now()
  try {
    const text = await (await fetch(url, init)).text()
    console.log(`${label}: ok body=${text} seconds=${Math.round((Date.now() - started) / 1000)}`)
  } catch (error) {
    console.log(`${label}: error ${(error as Error).name}: ${(error as Error).message} seconds=${Math.round((Date.now() - started) / 1000)}`)
  }
}
console.log(`bun=${Bun.version}`)
await Promise.all([probe('default', {}), probe('timeout-false', { timeout: false })])
server.stop(true)
