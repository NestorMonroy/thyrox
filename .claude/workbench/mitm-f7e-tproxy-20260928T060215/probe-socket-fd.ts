// Sonda: ¿adopta Bun un socket ya conectado con new net.Socket({ fd })? ¿y un fd con Bun.connect?
import net from 'node:net'
import { connectMarked } from '../../../src/packages/transparent-napi/src/index.ts'
const server = net.createServer(s => { s.on('data', d => { s.write(`eco:${d}`); s.end() }) })
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
const port = (server.address() as net.AddressInfo).port
const fd = connectMarked('127.0.0.1', port, 0x539)
await new Promise(r => setTimeout(r, 100))
const sock = new net.Socket({ fd, readable: true, writable: true })
const reply = await new Promise<string>((resolve) => {
  let data = ''
  const t = setTimeout(() => resolve(`TIMEOUT data=${JSON.stringify(data)}`), 2000)
  sock.on('data', c => (data += c))
  sock.on('end', () => { clearTimeout(t); resolve(data) })
  sock.on('error', e => { clearTimeout(t); resolve(`ERROR ${e.message}`) })
  sock.write('hola')
})
console.log('net.Socket({fd}):', reply)
server.close()
process.exit(0)
