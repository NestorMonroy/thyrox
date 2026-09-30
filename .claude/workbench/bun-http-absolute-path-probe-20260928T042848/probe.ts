// ¿El cliente node:http de Bun respeta host/port cuando `path` es una URL absoluta?
import http from 'node:http'
const hits: string[] = []
const upstream = http.createServer((_q, r) => { hits.push('upstream'); r.end('hello') })
const proxy = http.createServer((q, r) => { hits.push(`proxy ${q.url}`); r.end('from-proxy') })
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r))
await new Promise<void>(r => proxy.listen(0, '127.0.0.1', r))
const up = (upstream.address() as { port: number }).port
const px = (proxy.address() as { port: number }).port
const body = await new Promise<string>((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: px, method: 'GET', path: `http://127.0.0.1:${up}/test`, headers: { host: `127.0.0.1:${up}` } }, res => {
    const c: Buffer[] = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c).toString()))
  })
  req.once('error', reject); req.end()
})
console.log(`runtime=${process.versions.bun ? 'bun ' + process.versions.bun : 'node ' + process.versions.node} body=${body} hits=${JSON.stringify(hits)}`)
upstream.close(); proxy.close()
