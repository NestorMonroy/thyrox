// El mismo apretón de manos con el TLS de Node (OpenSSL) sobre los PEM de emitPair.ts.
import fs from 'node:fs'
import tls from 'node:tls'
const dir = process.argv[2]
const server = tls.createServer({ key: fs.readFileSync(`${dir}/leaf.key`), cert: fs.readFileSync(`${dir}/leaf.crt`) }, s => s.end())
server.listen(0, '127.0.0.1', () => {
  const socket = tls.connect({ host: '127.0.0.1', port: server.address().port, servername: 'a.example', ca: fs.readFileSync(`${dir}/ca.crt`, 'utf8'), rejectUnauthorized: false }, () => {
    console.log(`${process.release.name}:`, socket.authorized, socket.authorizationError ?? '')
    process.exit(0)
  })
})
