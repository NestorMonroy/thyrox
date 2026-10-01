/**
 * Quién está al otro lado de una conexión del buzón: `lsn`, `te`, `Yce` y
 * `aUr` (`chunk-qcy58j4w.js`, `chunk-x5vr5vwm.js`) de 2.1.283. La referencia
 * lee el pid con `Bun.ant.getPeerPid`, que su Bun propio trae y el de este
 * árbol no; aquí sale de `getsockopt(SO_PEERCRED)` por `bun:ffi`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parentPidChain, peerCredentialQuery, peerPid, readPeerCredentials, readStartTokenSync, socketFd } from '../src/uds/peerCredentials.ts'

const STAT = (ppid: number) => `9 (cmd) S ${ppid} 9 9 0 -1 4194560 100 0 0 0 1 2 0 0 20 0 1 0 555 1000 200`

describe('socketFd (te)', () => {
  test('el fd del handle, o -1 si no hay', () => {
    expect(socketFd({ _handle: { fd: 7 } } as unknown as Socket)).toBe(7)
    expect(socketFd({ _handle: {} } as unknown as Socket)).toBe(-1)
    expect(socketFd({} as unknown as Socket)).toBe(-1)
  })
})

describe('peerPid (lsn)', () => {
  const socket = (fd: number) => ({ _handle: { fd } }) as unknown as Socket

  test('en Windows no hay pid del par', () => {
    let called = false
    expect(peerPid(socket(3), { platform: 'windows', getPeerPid: () => ((called = true), 5) })).toBeUndefined()
    expect(called).toBe(false)
  })

  test('un pid positivo es el del par; cero, nulo o un fd inválido no, y se avisa', () => {
    const warnings: string[] = []
    const warn = (message: string) => warnings.push(message)
    expect(peerPid(socket(3), { platform: 'linux', getPeerPid: () => 42, warn })).toBe(42)
    expect(peerPid(socket(3), { platform: 'linux', getPeerPid: () => 0, warn })).toBeUndefined()
    expect(peerPid(socket(3), { platform: 'linux', getPeerPid: () => null, warn })).toBeUndefined()
    let asked = false
    expect(peerPid(socket(-1), { platform: 'linux', getPeerPid: () => ((asked = true), 42), warn })).toBeUndefined()
    expect(asked).toBe(false)
    expect(warnings).toEqual([
      '[peer-cred] peer pid unavailable (fd=3, got=0)',
      '[peer-cred] peer pid unavailable (fd=3, got=null)',
      '[peer-cred] peer pid unavailable (fd=-1, got=null)',
    ])
  })

  test('una consulta que lanza no deja pid y se avisa con el mensaje', () => {
    const warnings: string[] = []
    const pid = peerPid(socket(3), { platform: 'linux', getPeerPid: () => { throw new Error('boom') }, warn: m => warnings.push(m) })
    expect(pid).toBeUndefined()
    expect(warnings).toEqual(['[peer-cred] peer pid lookup failed: boom'])
  })
})

describe('readPeerCredentials contra un socket real', () => {
  let server: Server | undefined
  let dir: string | undefined
  afterEach(() => {
    server?.close()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test.skipIf(process.platform !== 'linux')('el pid del par es el del proceso hijo que conecta, y el uid el nuestro', async () => {
    dir = mkdtempSync(join(tmpdir(), 'uds-peer-'))
    const path = join(dir, 's.sock')
    const accepted = new Promise<Socket>(resolve => {
      server = createServer(resolve)
      server.listen(path)
    })
    await new Promise(resolve => server!.once('listening', resolve))
    const child = Bun.spawn(['bun', '-e', `const s=require('node:net').connect(${JSON.stringify(path)});setTimeout(()=>s.destroy(),2000)`], { stdout: 'ignore', stderr: 'ignore' })
    const socket = await accepted
    const credentials = readPeerCredentials(socketFd(socket))
    expect(credentials).toEqual({ pid: child.pid, uid: process.getuid!(), gid: process.getgid!() })
    expect(peerPid(socket)).toBe(child.pid)
    socket.destroy()
    child.kill()
    await child.exited
  })

  test('un fd que no es un socket no da credenciales', () => {
    expect(readPeerCredentials(-1)).toBeNull()
    expect(readPeerCredentials(0x7ffffff0)).toBeNull()
  })
})

describe('readStartTokenSync (Yce) y parentPidChain (aUr)', () => {
  test('el token de inicio síncrono sale del campo 22; ilegible o vacío no hay token', () => {
    expect(readStartTokenSync(9, () => STAT(1))).toBe('555')
    expect(readStartTokenSync(9, () => { throw new Error('ENOENT') })).toBeUndefined()
    expect(readStartTokenSync(9, () => '9 (cmd) S')).toBeUndefined()
    expect(readStartTokenSync(9, () => `9 (cmd) ${'x '.repeat(19)}`)).toBeUndefined()
  })

  test('la cadena de padres sube hasta 1, incluido', () => {
    // init tiene padre legible en el doble: sólo el corte en 1 impide seguir subiendo
    const tree: Record<number, number> = { 50: 40, 40: 30, 30: 1, 1: 77 }
    expect(parentPidChain(50, 12, path => STAT(tree[Number(path.split('/')[2])]!))).toEqual([40, 30, 1])
  })

  test('se corta en la profundidad pedida, en un padre ilegible y en un ppid inválido', () => {
    const chain = (pid: number) => STAT(pid - 1)
    expect(parentPidChain(100, 3, path => chain(Number(path.split('/')[2])))).toEqual([99, 98, 97])
    expect(parentPidChain(50, 12, path => (path === '/proc/50/stat' ? STAT(40) : (() => { throw new Error('x') })()))).toEqual([40])
    expect(parentPidChain(50, 12, () => STAT(0))).toEqual([])
  })

  test.skipIf(process.platform !== 'linux')('la cadena real del proceso propio empieza por su padre', () => {
    expect(parentPidChain(process.pid)[0]).toBe(process.ppid)
  })
})

describe('peerCredentialQuery: la consulta de getsockopt por plataforma', () => {
  test('Linux pide SO_PEERCRED en SOL_SOCKET a libc.so.6, un ucred de 12 bytes', () => {
    expect(peerCredentialQuery('linux')).toEqual({ library: 'libc.so.6', level: 1, option: 17, bytes: 12 })
  })

  test('macOS pide LOCAL_PEERPID en SOL_LOCAL a libSystem, un pid de 4 bytes', () => {
    expect(peerCredentialQuery('darwin')).toEqual({ library: '/usr/lib/libSystem.B.dylib', level: 0, option: 2, bytes: 4 })
  })

  test('en el resto de plataformas no hay consulta', () => {
    expect(peerCredentialQuery('win32')).toBeNull()
    expect(peerCredentialQuery('freebsd')).toBeNull()
  })
})
