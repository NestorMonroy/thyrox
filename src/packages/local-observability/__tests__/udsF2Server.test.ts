/**
 * El arranque del buzón `mn` de 2.1.283 (`chunk-yg53q7yp.js`): la ruta
 * rechazada, el socket ya vivo, el respaldo por uid cuando el directorio de
 * sockets se rehúsa, el arranque correcto con autenticación y despacho, y el
 * fallo al publicar la clave. Sockets reales bajo `os.tmpdir()`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { connect, createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { artifactYieldState } from '../src/uds/artifactReplyYield.ts'
import { resetIdleNotificationState } from '../src/uds/idleNotification.ts'
import { createInboxState } from '../src/uds/inboxState.ts'
import {
  MessagingStartError,
  processMessagingStartDeps,
  startMessagingInbox,
  type MessagingStartDeps,
  type MessagingStop,
} from '../src/uds/inboxServer.ts'
import { processInboxKeyDeps } from '../src/uds/inboxKeys.ts'
import { messagingState } from '../src/uds/messagingState.ts'
import { sessionNameState } from '../src/uds/sessionNameState.ts'

const dirs: string[] = []
const stops: MessagingStop[] = []
const servers: ReturnType<typeof createServer>[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uds-f2-server-'))
  dirs.push(dir)
  return dir
}

function baseDeps(overrides: Partial<MessagingStartDeps> = {}): { state: ReturnType<typeof createInboxState>; deps: MessagingStartDeps } {
  const state = createInboxState()
  const keysDir = join(tempDir(), 'sessions')
  const deps: MessagingStartDeps = {
    ...processMessagingStartDeps(state),
    inboxKeyDeps: { ...processInboxKeyDeps, sessionsDir: () => keysDir },
    ...overrides,
  }
  return { state, deps }
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop().catch(() => {})
  for (const server of servers.splice(0)) server.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  rmSync('/tmp/cc-socks-0', { recursive: true, force: true })
  resetIdleNotificationState()
  artifactYieldState().reset()
  sessionNameState().reset()
  messagingState().inbound.reset()
  messagingState().ingress.reset()
})

describe('startMessagingInbox — ruta rechazada (IL)', () => {
  const badPath = '//server/share/sock'

  test('ruta automática: no lanza, registra path_refused', async () => {
    const { state, deps } = baseDeps()
    const stop = await startMessagingInbox(badPath, { isExplicit: false }, deps)
    expect(stop).toBeUndefined()
    expect(state.lastStartFailureCause).toBe('path_refused')
  })

  test('ruta explícita: lanza MessagingStartError, registra path_refused', async () => {
    const { state, deps } = baseDeps()
    await expect(startMessagingInbox(badPath, { isExplicit: true }, deps)).rejects.toThrow(MessagingStartError)
    expect(state.lastStartFailureCause).toBe('path_refused')
  })
})

describe('startMessagingInbox — ruta explícita con socket vivo', () => {
  test('lanza MessagingStartError', async () => {
    const dir = tempDir()
    const path = join(dir, 'live.sock')
    const server = createServer()
    servers.push(server)
    await new Promise<void>(resolve => server.listen(path, resolve))
    const { deps } = baseDeps()
    await expect(startMessagingInbox(path, { isExplicit: true }, deps)).rejects.toThrow(/points to a live socket/)
  })
})

describe('startMessagingInbox — directorio de sockets rechazado', () => {
  test('usa el respaldo por uid y registra primary_dir_refused_fell_back', async () => {
    const dir = tempDir()
    const socketsDirPath = join(dir, 'cc-socks')
    writeFileSync(socketsDirPath, '') // un archivo, no un directorio: `Re` lo rehúsa como `leaf_shape`
    const socketPath = join(socketsDirPath, 'session.sock')
    const { state, deps } = baseDeps()
    const stop = await startMessagingInbox(socketPath, { isExplicit: false }, deps)
    expect(stop).not.toBeUndefined()
    if (stop) stops.push(stop)
    expect(state.lastStartDegradedCause).toBe('primary_dir_refused_fell_back')
    expect(state.activeSocketPath).toStartWith('/tmp/cc-socks-0/')
  })
})

describe('startMessagingInbox — arranque correcto', () => {
  test('el socket queda en 0600, la ruta se publica, y un cliente autenticado llega al despachador', async () => {
    const dir = tempDir()
    const socketPath = join(dir, 'session.sock')
    const delivered: unknown[] = []
    const { state, deps } = baseDeps({
      requireAuth: true,
      deliverUserMessage: async (message, _peer) => {
        delivered.push(message)
      },
    } as Partial<MessagingStartDeps>)
    const stop = await startMessagingInbox(socketPath, { isExplicit: false, requireAuth: true }, deps)
    expect(stop).not.toBeUndefined()
    if (stop) stops.push(stop)
    expect(state.activeSocketPath).toBe(socketPath)
    expect(existsSync(socketPath)).toBe(true)
    expect(statSync(socketPath).mode & 0o777).toBe(0o600)
    expect(process.env.THYROX_CODE_MESSAGING_SOCKET).toBe(socketPath)
    const token = process.env.THYROX_CODE_MESSAGING_TOKEN
    expect(token).not.toBeUndefined()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('el mensaje no llegó al despachador a tiempo')), 2000)
      const socket = connect({ path: socketPath }, () => {
        socket.write(`${JSON.stringify({ type: 'auth', token })}\n`)
        socket.write(`${JSON.stringify({ type: 'user', message: { role: 'user', content: 'hello' } })}\n`)
      })
      const poll = setInterval(() => {
        if (delivered.length > 0) {
          clearInterval(poll)
          clearTimeout(timeout)
          socket.end()
          resolve()
        }
      }, 20)
      socket.on('error', error => {
        clearInterval(poll)
        clearTimeout(timeout)
        reject(error)
      })
    })
    expect(delivered).toHaveLength(1)
    expect((delivered[0] as { type: string }).type).toBe('user')
  })
})

describe('startMessagingInbox — fallo al publicar la clave', () => {
  test('con authRequired, cierra y registra key_publish_failed', async () => {
    const dir = tempDir()
    const socketPath = join(dir, 'session.sock')
    const blockedSessionsDir = join(dir, 'blocked-sessions')
    writeFileSync(blockedSessionsDir, '') // un archivo en el lugar del directorio de sesiones: `mkdir` falla con ENOTDIR
    const { state, deps } = baseDeps({
      requireAuth: true,
      inboxKeyDeps: { ...processInboxKeyDeps, sessionsDir: () => blockedSessionsDir },
    } as Partial<MessagingStartDeps>)
    const stop = await startMessagingInbox(socketPath, { isExplicit: false, requireAuth: true }, deps)
    expect(stop).toBeUndefined()
    expect(state.lastStartFailureCause).toBe('key_publish_failed')
    expect(existsSync(socketPath)).toBe(false)
    expect(state.activeSocketPath).toBeUndefined()
  })
})
