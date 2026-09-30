/**
 * El bind del buzón: `me`, `ne`, `tn`, `sn`, `rn` y el cierre `B`/`H` de
 * 2.1.283 (`chunk-yg53q7yp.js`), con sockets reales en un directorio propio.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { connect, createServer, type Server } from 'node:net'
import { join } from 'node:path'

import { MAX_SOCKET_PATH_BYTES } from '../src/uds/socketPath.ts'
import {
  bindAutoSocket,
  closeInbox,
  isSocketLive,
  listenOn,
  movedAsidePath,
  reapMovedAsideSockets,
} from '../src/uds/bind.ts'
import { createInboxState } from '../src/uds/inboxState.ts'

const dirs: string[] = []
const servers: Server[] = []
function tempDir(): string {
  const dir = mkdtempSync('/tmp/uds-bind-')
  dirs.push(dir)
  return dir
}
async function liveServer(path: string, onClient?: () => void): Promise<Server> {
  const server = createServer(socket => {
    onClient?.()
    socket.end()
  })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(path, resolve))
  return server
}
function reach(path: string): Promise<void> {
  return new Promise(resolve => {
    const socket = connect({ path }, () => {
      socket.end()
      setTimeout(resolve, 30)
    })
    socket.on('error', () => resolve())
  })
}
afterEach(() => {
  for (const server of servers.splice(0)) server.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('isSocketLive (me)', () => {
  test('un servidor escuchando está vivo', async () => {
    const path = join(tempDir(), 'a.sock')
    await liveServer(path)
    expect(await isSocketLive(path)).toBe('live')
  })

  test('una ruta sin nada, o un archivo que no escucha, está muerta', async () => {
    const dir = tempDir()
    expect(await isSocketLive(join(dir, 'nada.sock'))).toBe('dead')
    writeFileSync(join(dir, 'archivo.sock'), '')
    expect(await isSocketLive(join(dir, 'archivo.sock'))).toBe('dead')
  })
})

describe('listenOn (ne)', () => {
  test('una ruta libre se escucha', async () => {
    const path = join(tempDir(), 'libre.sock')
    const server = createServer()
    servers.push(server)
    expect(await listenOn(server, path)).toBe(true)
  })

  test('no le roba la ruta a un socket vivo: Bun no da EADDRINUSE (H-THYROX-239)', async () => {
    const path = join(tempDir(), 'vivo.sock')
    const reached: string[] = []
    await liveServer(path, () => reached.push('dueño'))
    const intruder = createServer(socket => {
      reached.push('intruso')
      socket.end()
    })
    servers.push(intruder)
    expect(await listenOn(intruder, path)).toBe(false)
    // La sonda de vida de listenOn ya conectó con el dueño; cuenta sólo lo que sigue.
    reached.length = 0
    await reach(path)
    expect(reached).toEqual(['dueño'])
  })
})

describe('movedAsidePath (tn)', () => {
  test('añade ocho dígitos hexadecimales antes de .sock', () => {
    expect(movedAsidePath('/run/cc-socks/42.sock')).toMatch(/^\/run\/cc-socks\/42-[0-9a-f]{8}\.sock$/)
  })

  test('si no cabe, usa un nombre corto dentro del límite', () => {
    const base = `/${'d'.repeat(90)}/42.sock`
    const aside = movedAsidePath(base)
    expect(Buffer.byteLength(aside)).toBeLessThanOrEqual(MAX_SOCKET_PATH_BYTES)
    expect(aside.startsWith(`/${'d'.repeat(90)}/`)).toBe(true)
    expect(aside.endsWith('.sock')).toBe(true)
  })
})

describe('reapMovedAsideSockets (sn)', () => {
  test('borra los apartados muertos, conserva los vivos y los que no siguen el patrón', async () => {
    const dir = tempDir()
    const own = join(dir, '42.sock')
    writeFileSync(join(dir, '42-0123abcd.sock'), '')
    await liveServer(join(dir, '42-89abcdef.sock'))
    writeFileSync(join(dir, '42-notahexx.sock'), '')
    writeFileSync(join(dir, '43-0123abcd.sock'), '')
    await reapMovedAsideSockets(own)
    expect(readdirSync(dir).sort()).toEqual(['42-89abcdef.sock', '42-notahexx.sock', '43-0123abcd.sock'])
  })
})

describe('bindAutoSocket (rn)', () => {
  test('un archivo muerto en la ruta se retira y se escucha ahí', async () => {
    const path = join(tempDir(), '42.sock')
    writeFileSync(path, '')
    const server = createServer()
    servers.push(server)
    expect(await bindAutoSocket(server, path)).toBe(path)
    expect(await isSocketLive(path)).toBe('live')
  })

  test('si la ruta es el socket vivo de otra sesión, escucha en una apartada', async () => {
    const path = join(tempDir(), '42.sock')
    await liveServer(path)
    const server = createServer()
    servers.push(server)
    const bound = await bindAutoSocket(server, path)
    expect(bound).not.toBe(path)
    expect(bound).toMatch(/42-[0-9a-f]{8}\.sock$/)
    expect(await isSocketLive(bound)).toBe('live')
  })
})

describe('closeInbox (B, H)', () => {
  test('cierra clientes y servidor, borra el socket y limpia el estado', async () => {
    const path = join(tempDir(), '42.sock')
    const state = createInboxState()
    const server = createServer(socket => state.connectedClients.add(socket))
    await bindAutoSocket(server, path)
    state.activeSocketPath = path
    const client = connect({ path })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(state.connectedClients.size).toBe(1)
    await closeInbox(state, server, path)
    expect(state.connectedClients.size).toBe(0)
    expect(state.activeSocketPath).toBeUndefined()
    expect(existsSync(path)).toBe(false)
    client.destroy()
  })
})
