// ¿Verifica BoringSSL una firma cualquiera de `selfsigned`? Un certificado autofirmado como hoja y como ancla.
import selfsigned from 'selfsigned'
import tls from 'node:tls'
const pems = await selfsigned.generate([{ name: 'commonName', value: 'a.example' }], {
  keySize: 2048, algorithm: 'sha256',
  extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'a.example' }] }],
})
const server = tls.createServer({ key: pems.private, cert: pems.cert }, s => s.end())
server.listen(0, '127.0.0.1', () => {
  const socket = tls.connect({ host: '127.0.0.1', port: (server.address() as { port: number }).port, servername: 'a.example', ca: pems.cert, rejectUnauthorized: false }, () => {
    console.log('self-signed anchor:', socket.authorized, socket.authorizationError ?? '')
    process.exit(0)
  })
})
