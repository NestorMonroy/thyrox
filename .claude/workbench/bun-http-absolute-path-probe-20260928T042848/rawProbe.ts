// ¿Qué devuelve el proxy del inspector a una petición en forma absoluta por socket crudo?
import http from 'node:http'
import net from 'node:net'
import { startHttpProxyServer } from '../../../src/packages/mitm/src/inspector/httpProxyServer.ts'
import { globalTrafficBuffer } from '../../../src/packages/mitm/src/inspector/buffer.ts'
const upstream = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/plain' }); r.end('hello') })
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r))
const up = (upstream.address() as { port: number }).port
const proxy = await startHttpProxyServer(0)
const socket = net.connect(proxy.port, '127.0.0.1')
let got = ''
socket.on('data', d => { got += d.toString() })
socket.on('connect', () => socket.write(`GET http://127.0.0.1:${up}/test HTTP/1.1\r\nHost: 127.0.0.1:${up}\r\nConnection: close\r\n\r\n`))
await new Promise(r => setTimeout(r, 800))
console.log(JSON.stringify({ got, ended: socket.readableEnded, buffer: globalTrafficBuffer.list().map(e => [e.status, e.error ?? null]) }))
socket.destroy(); upstream.close(); await proxy.stop()
