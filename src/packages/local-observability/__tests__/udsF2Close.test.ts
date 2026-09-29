/**
 * El cierre del buzón, `B` y `H` de 2.1.283 (`chunk-yg53q7yp.js`): `B`
 * expira los mensajes retenidos con `dbt` cuando `settleHeld` (su valor por
 * defecto); `H` desregistra los cinco cables que `mn` tiende hacia el resto
 * de la sesión (`anr`, `lnr`, `JEn`, `mlr`, `ZEn`) y borra la variable y el
 * token publicados. Sockets reales bajo `os.tmpdir()`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { respondToYieldRequest, setArtifactReplySender, type YieldArtifactRepliesFrame } from '../src/uds/artifactReplyYield.ts'
import {
  bindAutoSocket,
  clearActiveInbox,
  closeInbox,
  defaultInboundGateDeps,
  MESSAGING_SOCKET_ENV,
  MESSAGING_TOKEN_ENV,
} from '../src/uds/bind.ts'
import { flushIdleNotices, resetIdleNotificationState, setRegisteredInboxOfPid, setSendNotice, subscribeToIdleNotice } from '../src/uds/idleNotification.ts'
import { wireRecordCorrespondent, wireSendPeerReceipt, type InboundGateDeps } from '../src/uds/inboundGate.ts'
import { createInboxState } from '../src/uds/inboxState.ts'
import { messagingState } from '../src/uds/messagingState.ts'
import { sessionNameState } from '../src/uds/sessionNameState.ts'

const dirs: string[] = []
const servers: Server[] = []
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uds-f2-close-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const server of servers.splice(0)) server.close()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  delete process.env[MESSAGING_SOCKET_ENV]
  delete process.env[MESSAGING_TOKEN_ENV]
  resetIdleNotificationState()
  messagingState().inbound.reset()
  sessionNameState().reset()
})

describe('closeInbox (B)', () => {
  test('con settleHeld (por defecto), expira lo retenido con dbt antes de cerrar', async () => {
    const path = join(tempDir(), '42.sock')
    const state = createInboxState()
    const server = createServer(socket => state.connectedClients.add(socket))
    servers.push(server)
    await bindAutoSocket(server, path)
    state.activeSocketPath = path

    const inboundState = messagingState().inbound
    const receipts: [unknown, string][] = []
    wireSendPeerReceipt((message, status) => void receipts.push([message, status as string]), inboundState)
    const held = { origin: { kind: 'peer', from: 'uds:whoever' } }
    inboundState.held.push(held)

    const inboundGateDeps: InboundGateDeps = { ...defaultInboundGateDeps(), state: inboundState }
    await closeInbox(state, server, path, { inboundGateDeps })

    expect(receipts).toEqual([[held, 'expired']])
    expect(inboundState.held).toEqual([])
    expect(inboundState.shuttingDown).toBe(true)
    expect(existsSync(path)).toBe(false)
    expect(state.activeSocketPath).toBeUndefined()
  })

  test('sin settleHeld, no expira lo retenido, pero cierra igual', async () => {
    const path = join(tempDir(), '43.sock')
    const state = createInboxState()
    const server = createServer(socket => state.connectedClients.add(socket))
    servers.push(server)
    await bindAutoSocket(server, path)

    const inboundState = messagingState().inbound
    const receipts: unknown[] = []
    wireSendPeerReceipt(message => void receipts.push(message), inboundState)
    inboundState.held.push({ origin: { kind: 'peer', from: 'uds:whoever' } })

    const inboundGateDeps: InboundGateDeps = { ...defaultInboundGateDeps(), state: inboundState }
    await closeInbox(state, server, path, { settleHeld: false, inboundGateDeps })

    expect(receipts).toEqual([])
    expect(inboundState.held).toHaveLength(1)
    expect(existsSync(path)).toBe(false)
  })
})

describe('clearActiveInbox (H)', () => {
  test('borra la variable, el token, y desregistra los cinco setters a null', async () => {
    process.env[MESSAGING_SOCKET_ENV] = '/tmp/whichever.sock'
    const state = createInboxState()
    state.activeTokens = { peerToken: 'peer-token', childToken: 'child-token' }
    const unset: string[] = []
    const childEnv = { set: () => {}, unset: (name: string) => void unset.push(name) }

    const inboundState = messagingState().inbound
    const receipts: unknown[] = []
    wireSendPeerReceipt(message => void receipts.push(message), inboundState)
    const correspondents: unknown[] = []
    wireRecordCorrespondent(message => void correspondents.push(message), inboundState)
    sessionNameState().senderMode = () => 'bypass'
    const idleSent: unknown[] = []
    setSendNotice(async (...args) => void idleSent.push(args))
    const registeredCalls: unknown[] = []
    setRegisteredInboxOfPid(async pids => {
      registeredCalls.push(pids)
      return new Map()
    })
    const artifactSent: unknown[] = []
    setArtifactReplySender(async (...args) => void artifactSent.push(args))

    // Antes de `H`: cada cable produce efecto.
    inboundState.sendPeerReceipt?.({ origin: {} }, 'held')
    inboundState.recordCorrespondent?.({ origin: {} })
    expect(receipts).toHaveLength(1)
    expect(correspondents).toHaveLength(1)
    expect(sessionNameState().senderMode?.()).toBe('bypass')
    // `JEn` (sendNotice) y `ZEn` (registeredInboxOfPid) sólo se leen JUNTOS en
    // `deliverIdleNotices`: si `sendNotice` es `null` la función vuelve antes
    // de mirar `registeredInboxOfPid`, así que no hay forma observable de
    // probar la nulidad de uno sin la del otro. La comprobación de abajo
    // mide los dos a la vez.
    // Métrica: cuántas veces se llama cada uno al disparar un aviso con un
    // suscriptor de pid verificado, antes y después de `H`.
    // Ciega a: si `H` sólo desregistrara `sendNotice` y dejara
    // `registeredInboxOfPid` con su valor, este control no lo distinguiría.
    subscribeToIdleNotice('uds:reply', 'uds:reply', '11111111-1111-1111-1111-111111111111', 4242, undefined, true, undefined, false)
    await flushIdleNotices('exited')
    expect(idleSent).toHaveLength(1)
    expect(registeredCalls).toHaveLength(1)
    const yieldFrame: YieldArtifactRepliesFrame = {
      action: 'yield_artifact_replies',
      from: 'uds:reply',
      msg_id: '22222222-2222-2222-2222-222222222222',
      session_id: 'session',
      slugs: ['a'],
      reason: 'resume',
      sent_at: Date.now(),
    }
    respondToYieldRequest(yieldFrame, 'uds:reply', undefined, Date.now(), { refuse: true }, { isDefinitelyUndelivered: () => false })
    expect(artifactSent).toHaveLength(1)

    clearActiveInbox(state, childEnv)

    expect(process.env[MESSAGING_SOCKET_ENV]).toBeUndefined()
    expect(unset).toContain(MESSAGING_TOKEN_ENV)
    expect(state.activeTokens).toBeUndefined()
    expect(state.activeSocketPath).toBeUndefined()
    expect(inboundState.sendPeerReceipt).toBeNull()
    expect(inboundState.recordCorrespondent).toBeNull()
    expect(sessionNameState().senderMode).toBeNull()

    // Después de `H`: los mismos disparos ya no producen nada.
    inboundState.sendPeerReceipt?.({ origin: {} }, 'held')
    inboundState.recordCorrespondent?.({ origin: {} })
    expect(receipts).toHaveLength(1)
    expect(correspondents).toHaveLength(1)
    subscribeToIdleNotice('uds:reply', 'uds:reply', '33333333-3333-3333-3333-333333333333', 4242, undefined, true, undefined, false)
    await flushIdleNotices('exited')
    respondToYieldRequest(yieldFrame, 'uds:reply', undefined, Date.now(), { refuse: true }, { isDefinitelyUndelivered: () => false })
    expect(idleSent).toHaveLength(1)
    expect(registeredCalls).toHaveLength(1)
    expect(artifactSent).toHaveLength(1)
  })
})
