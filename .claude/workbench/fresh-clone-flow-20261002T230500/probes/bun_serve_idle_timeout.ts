// EXPERIMENTAL — medición exploratoria: ¿corta Bun.serve, con su idleTimeout por
// defecto, una respuesta que tarda 15 s en empezar? Cliente con timeout: false.
const DELAY_MS = 15_000
const server = Bun.serve({ port: 0, fetch: async () => { await Bun.sleep(DELAY_MS); return new Response('ok') } })
const started = Date.now()
try {
  const text = await (await fetch(`http://127.0.0.1:${server.port}/`, { method: process.argv[2] ?? 'GET', body: process.argv[2] === 'POST' ? JSON.stringify({ a: 1 }) : undefined, timeout: false } as RequestInit)).text()
  console.log(`bun=${Bun.version} default-idle ${process.argv[2] ?? "GET"}: ok body=${text} seconds=${Math.round((Date.now() - started) / 1000)}`)
} catch (error) {
  console.log(`bun=${Bun.version} default-idle ${process.argv[2] ?? "GET"}: error ${(error as Error).name}: ${(error as Error).message} seconds=${Math.round((Date.now() - started) / 1000)}`)
}
server.stop(true)
