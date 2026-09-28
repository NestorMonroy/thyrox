// Sonda: ¿expone Bun el fd de un socket aceptado, y devuelve getsockopt(SO_PEERCRED) el pid del par?
import { dlopen, FFIType, ptr } from 'bun:ffi'
import { createServer, connect } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const libc = dlopen('libc.so.6', { getsockopt: { args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.ptr, FFIType.ptr], returns: FFIType.i32 } })
const path = join(mkdtempSync(join(tmpdir(), 'peer-')), 's.sock')
const server = createServer(socket => {
  const fd = (socket as unknown as { _handle?: { fd?: unknown } })._handle?.fd
  const cred = new Int32Array(3)
  const len = new Uint32Array([12])
  const rc = typeof fd === 'number' ? libc.symbols.getsockopt(fd, 1, 17, ptr(cred), ptr(len)) : -99
  console.log(JSON.stringify({ fdType: typeof fd, fd, rc, peerPid: cred[0], peerUid: cred[1], ownPid: process.pid }))
  socket.destroy(); server.close()
})
server.listen(path, () => { connect(path) })
