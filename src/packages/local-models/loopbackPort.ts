/**
 * Un puerto libre en `127.0.0.1`, que el sistema elige y se libera al
 * devolverlo: el de una unidad de modelo que se publica sólo en loopback.
 */
import { createServer } from 'node:net'

const LOOPBACK = '127.0.0.1'
const ANY_PORT = 0

export function freeLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(ANY_PORT, LOOPBACK, () => {
      const address = server.address()
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('el sistema no asignó un puerto en loopback'))))
    })
  })
}
