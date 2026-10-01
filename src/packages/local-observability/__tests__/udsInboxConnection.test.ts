/**
 * Una conexión al buzón: `en` (`chunk-yg53q7yp.js`) de 2.1.283, sobre un
 * socket Unix real. El enrutado (`Qe`) y la decisión de confiar en la
 * ancestría (`unr`) se inyectan: son F4c.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { connect, createServer, type Server, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { authFrameLine, createInboxTokens } from '../src/uds/inboxAuth.ts'
import { handleInboxConnection, type InboxConnectionDeps, LINE_LIMIT_CHARS, type PeerIdentity } from '../src/uds/inboxConnection.ts'
import { createInboxState, type InboxState } from '../src/uds/inboxState.ts'

type Routed = { message: unknown; peer: PeerIdentity }

let dir: string
let server: Server
let path: string
let state: InboxState
let routed: Routed[]
let warnings: string[]
let logs: string[]
let events: Array<[string, string, unknown?]>
let serverSockets: Socket[]
let serverClosed: Array<Promise<unknown>>
let overrides: Partial<InboxConnectionDeps>

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'uds-conn-'))
  path = join(dir, 's.sock')
  state = createInboxState()
  routed = []
  warnings = []
  logs = []
  events = []
  serverSockets = []
  serverClosed = []
  overrides = {}
  server = createServer(socket => {
    serverSockets.push(socket)
    serverClosed.push(new Promise(resolve => socket.once('close', resolve)))
    handleInboxConnection(socket, {
      state,
      route: (message, peer) => void routed.push({ message, peer }),
      trustsAncestry: () => false,
      ownPid: 4242,
      peerPid: () => 77,
      startTokenOf: () => 'start-77',
      parentChain: () => [4242, 1],
      log: message => void logs.push(message),
      warn: message => void warnings.push(message),
      telemetry: {
        ok: feature => void events.push(['ok', feature]),
        bad: (feature, code) => void events.push(['bad', feature, code]),
        sad: (feature, code) => void events.push(['sad', feature, code]),
      },
      ...overrides,
    })
  })
  await new Promise<void>(resolve => server.listen(path, resolve))
})

afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
  rmSync(dir, { recursive: true, force: true })
})

/**
 * Conecta, escribe `chunks` y espera a que el lado del servidor se cierre, o
 * a `waitMs`. Se espera al servidor y no al cliente: en Bun el `close` del
 * cliente puede llegar antes de que el servidor procese sus `data`.
 */
async function exchange(chunks: string[], { end = true, waitMs = 150 } = {}): Promise<{ closedByServer: boolean }> {
  const accepted = serverClosed.length
  const client = connect(path)
  await new Promise(resolve => client.once('connect', resolve))
  client.on('error', () => {})
  for (const chunk of chunks) client.write(chunk)
  if (end) client.end()
  let closedByServer = false
  const deadline = Date.now() + waitMs
  while (serverClosed.length <= accepted && Date.now() < deadline) await Bun.sleep(5)
  const serverSide = serverClosed[accepted]
  if (serverSide) {
    const remaining = Math.max(0, deadline - Date.now())
    closedByServer = await Promise.race([serverSide.then(() => true), Bun.sleep(remaining).then(() => false)])
  }
  client.destroy()
  return { closedByServer }
}

const line = (value: unknown) => `${JSON.stringify(value)}\n`

describe('sin autenticación exigida', () => {
  test('enruta cada línea JSON en orden con la identidad del par', async () => {
    await exchange([line({ type: 'user', text: 'a' }), line({ type: 'user', text: 'b' })])
    expect(routed.map(entry => entry.message)).toEqual([{ type: 'user', text: 'a' }, { type: 'user', text: 'b' }])
    expect(routed[0]!.peer).toEqual({ pid: 77, startToken: 'start-77', ancestry: undefined, origin: undefined })
  })

  test('una línea partida en dos escrituras se reúne antes de enrutarse', async () => {
    await exchange(['{"type":"us', 'er"}\n'])
    expect(routed.map(entry => entry.message)).toEqual([{ type: 'user' }])
  })

  test('las líneas en blanco se saltan y una ilegible se avisa sin cortar la conexión', async () => {
    await exchange(['\n', '  \n', 'no-json\n', line({ type: 'user' })])
    expect(routed).toHaveLength(1)
    expect(warnings).toContain('[uds-messaging] Failed to parse JSON line: no-json')
  })

  test('el fragmento final sin salto de línea también se enruta', async () => {
    await exchange(['{"type":"user","text":"fin"}'])
    expect(routed.map(entry => entry.message)).toEqual([{ type: 'user', text: 'fin' }])
  })

  test('una línea que excede el tope cierra la conexión', async () => {
    const { closedByServer } = await exchange(['x'.repeat(LINE_LIMIT_CHARS + 1)], { end: false, waitMs: 1000 })
    expect(closedByServer).toBe(true)
    expect(warnings).toContain(`[uds-messaging] Line exceeded ${LINE_LIMIT_CHARS} chars; dropping connection`)
  })

  test('un fallo al enrutar se avisa y la conexión sigue', async () => {
    overrides.route = message => {
      if ((message as { text?: string }).text === 'boom') throw new Error('route failed')
      routed.push({ message, peer: {} as PeerIdentity })
    }
    await exchange([line({ type: 'user', text: 'boom' }), line({ type: 'user', text: 'ok' })])
    expect(warnings).toContain('[uds-messaging] Failed to handle line: Error: route failed')
    expect(routed.map(entry => (entry.message as { text: string }).text)).toEqual(['ok'])
  })
})

describe('plazo de la primera línea', () => {
  test('una conexión muda se cierra al vencer el plazo y se reporta una sola vez', async () => {
    state.firstLineDeadlineMs = 40
    expect((await exchange(['{"type":'], { end: false, waitMs: 500 })).closedByServer).toBe(true)
    expect((await exchange([], { end: false, waitMs: 500 })).closedByServer).toBe(true)
    expect(events.filter(event => event[0] === 'sad')).toEqual([['sad', 'cross_session_inbox_auth', 'silent_connection_deadline']])
    expect(logs).toContain('[uds-messaging] Closing a connection that sent no complete line within 40 ms')
  })

  test('una línea completa desarma el plazo', async () => {
    state.firstLineDeadlineMs = 60
    const { closedByServer } = await exchange([line({ type: 'user' })], { end: false, waitMs: 250 })
    expect(closedByServer).toBe(false)
  })
})

describe('con autenticación exigida', () => {
  beforeEach(() => {
    state.authRequired = true
    state.activeTokens = createInboxTokens()
  })

  test('una primera línea con el token de par autentica, se reporta una vez, y lo siguiente se enruta con su origen', async () => {
    await exchange([authFrameLine(state.activeTokens!.peerToken), line({ type: 'user' })])
    await exchange([authFrameLine(state.activeTokens!.childToken), line({ type: 'user', n: 2 })])
    expect(routed.map(entry => entry.peer.origin)).toEqual(['peer', 'child'])
    expect(events).toEqual([['ok', 'cross_session_inbox_auth']])
  })

  test('un token equivocado cierra la conexión y la caída se reporta una sola vez', async () => {
    expect((await exchange([authFrameLine('0'.repeat(32)), line({ type: 'user' })], { waitMs: 400 })).closedByServer).toBe(true)
    await exchange([authFrameLine('1'.repeat(32))], { waitMs: 400 })
    expect(routed).toEqual([])
    expect(events).toEqual([['bad', 'cross_session_inbox_auth', 'unauthed_drop']])
    expect(warnings).toContain('[uds-messaging] Dropped a bad auth frame from a connection that did not authenticate; closing it')
  })

  test('sin marco de auth, la primera línea cierra la conexión y nombra su tipo', async () => {
    await exchange([line({ type: 'user' })], { waitMs: 400 })
    expect(routed).toEqual([])
    expect(warnings).toContain("[uds-messaging] Dropped a 'user' line from a connection that did not authenticate; closing it")
  })

  test('una línea en blanco, una ilegible o un fragmento final ilegible cierran la conexión', async () => {
    await exchange(['\n'], { waitMs: 400 })
    await exchange(['nope\n'], { waitMs: 400 })
    await exchange(['nope'], { waitMs: 400 })
    const drops = warnings.filter(message => message.startsWith('[uds-messaging] Dropped'))
    expect(drops).toEqual([
      '[uds-messaging] Dropped a blank line from a connection that did not authenticate; closing it',
      '[uds-messaging] Dropped an unparseable line from a connection that did not authenticate; closing it',
      '[uds-messaging] Dropped an unparseable final fragment from a connection that did not authenticate; closing it',
    ])
  })

  test('un marco de auth que no es la primera línea se ignora', async () => {
    await exchange([authFrameLine(state.activeTokens!.peerToken), authFrameLine('x'), line({ type: 'user' })])
    expect(routed).toHaveLength(1)
  })
})

describe('identidad y ancestría del par', () => {
  test('la identidad se calcula una vez, en el primer mensaje enrutado', async () => {
    let lookups = 0
    overrides.peerPid = () => (lookups++, 77)
    await exchange([line({ type: 'user' }), line({ type: 'user' })])
    expect(lookups).toBe(1)
  })

  test('confiando en la ancestría, el par capturado al conectar lleva su cadena de padres', async () => {
    overrides.trustsAncestry = () => true
    await exchange([line({ type: 'user' })])
    expect(routed[0]!.peer).toEqual({ pid: 77, startToken: 'start-77', ancestry: [4242, 1], origin: undefined })
  })

  test('si el par cambió de inicio entre la conexión y el mensaje, no hay token ni cadena', async () => {
    overrides.trustsAncestry = () => true
    let calls = 0
    overrides.startTokenOf = () => (calls++ === 0 ? 'start-a' : 'start-b')
    await exchange([line({ type: 'user' })])
    expect(routed[0]!.peer).toEqual({ pid: 77, startToken: 'start-a', ancestry: [], origin: undefined })
  })

  test('siendo init (pid 1) nunca se confía en la ancestría', async () => {
    overrides.trustsAncestry = () => true
    overrides.ownPid = 1
    await exchange([line({ type: 'user' })])
    expect(routed[0]!.peer.ancestry).toBeUndefined()
  })
})
