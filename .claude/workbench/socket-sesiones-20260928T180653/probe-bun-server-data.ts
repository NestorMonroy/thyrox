// Sonda: ¿qué eventos ve un socket aceptado por node:net en Bun cuando el cliente escribe y cierra?
import { connect, createServer } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const path = join(mkdtempSync(join(tmpdir(), 'probe-')), 's.sock')
const seen: string[] = []
const server = createServer(socket => {
  seen.push('accept')
  socket.setEncoding('utf8')
  socket.on('data', d => seen.push(`data:${JSON.stringify(d)}`))
  socket.on('end', () => seen.push('end'))
  socket.on('close', () => seen.push('close'))
})
server.listen(path, async () => {
  const client = connect(path)
  await new Promise(r => client.once('connect', r))
  client.write('{"a":1}\n')
  client.end()
  await Bun.sleep(200)
  console.log(JSON.stringify(seen))
  server.close()
})
