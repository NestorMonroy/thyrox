/**
 * El estado de mensajería por anfitrión de 2.1.283 (`chunk-s7j2aven.js`,
 * `ti`) y las colas por clave (`Fm`, `chunk-r47b55y6.js`).
 */
import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'

import {
  MAILBOX_LEDGER_LIMIT,
  MailboxWriteLedger,
  MessagingState,
  createKeyedLocks,
  mailboxEntryDigest,
  messagingState,
} from '../src/uds/messagingState.ts'

const entry = (msgId: string | undefined, text = 't') => ({ msg_id: msgId, from: 'a', timestamp: '1', text })

describe('mailboxEntryDigest (t)', () => {
  test('sha256 del JSON de remitente, hora, texto, resumen, color y plugin', () => {
    const expected = createHash('sha256').update(JSON.stringify(['a', '1', 't', null, null, null])).digest('hex')
    expect(mailboxEntryDigest(entry('m'))).toBe(expected)
    const full = { ...entry('m'), summary: 's', color: 'red', from_plugin: 'p' }
    expect(mailboxEntryDigest(full)).toBe(createHash('sha256').update(JSON.stringify(['a', '1', 't', 's', 'red', 'p'])).digest('hex'))
  })
})

describe('MailboxWriteLedger (i)', () => {
  test('recuerda lo escrito por buzón y reconoce sólo la misma entrada', () => {
    const ledger = new MailboxWriteLedger()
    ledger.record('box', entry('m1'))
    expect(ledger.wrote('box', entry('m1'))).toBe(true)
    expect(ledger.wrote('box', entry('m1', 'otro'))).toBe(false)
    expect(ledger.wrote('otro', entry('m1'))).toBe(false)
    ledger.record('box', entry(undefined))
    expect(ledger.wrote('box', entry(undefined))).toBe(false)
  })

  test('retire olvida los ids dados; retain conserva sólo los dados; forget el buzón', () => {
    const ledger = new MailboxWriteLedger()
    for (const id of ['a', 'b', 'c']) ledger.record('box', entry(id))
    ledger.retire('box', ['a'])
    expect(['a', 'b', 'c'].map(id => ledger.wrote('box', entry(id)))).toEqual([false, true, true])
    ledger.retain('box', new Set(['c']))
    expect(['b', 'c'].map(id => ledger.wrote('box', entry(id)))).toEqual([false, true])
    ledger.forget('box')
    expect(ledger.wrote('box', entry('c'))).toBe(false)
  })

  test('sin retain, cada buzón guarda como mucho 2048 y olvida el más antiguo', () => {
    expect(MAILBOX_LEDGER_LIMIT).toBe(2048)
    const ledger = new MailboxWriteLedger()
    for (let index = 0; index <= MAILBOX_LEDGER_LIMIT; index++) ledger.record('box', entry(String(index)))
    expect(ledger.wrote('box', entry('0'))).toBe(false)
    expect(ledger.wrote('box', entry('1'))).toBe(true)
    expect(ledger.wrote('box', entry(String(MAILBOX_LEDGER_LIMIT)))).toBe(true)
  })

  test('un buzón retenido no tiene tope', () => {
    const ledger = new MailboxWriteLedger()
    ledger.retain('box', new Set())
    for (let index = 0; index <= MAILBOX_LEDGER_LIMIT; index++) ledger.record('box', entry(String(index)))
    expect(ledger.wrote('box', entry('0'))).toBe(true)
  })
})

describe('createKeyedLocks (Fm)', () => {
  test('serializa por clave, libera la clave al terminar y sigue tras un fallo', async () => {
    const locks = createKeyedLocks()
    const order: string[] = []
    let release!: () => void
    const first = locks.run('k', () => new Promise<void>(resolve => (release = () => (order.push('uno'), resolve()))))
    const second = locks.run('k', async () => void order.push('dos'))
    const other = locks.run('j', async () => void order.push('otra'))
    expect(locks.has('k')).toBe(true)
    await other
    expect(order).toEqual(['otra'])
    release()
    await Promise.all([first, second])
    expect(order).toEqual(['otra', 'uno', 'dos'])
    await locks.settle()
    expect(locks.size).toBe(0)
    await expect(locks.run('k', async () => { throw new Error('x') })).rejects.toThrow('x')
    expect(await locks.run('k', async () => 7)).toBe(7)
  })

  test('drain espera también lo que se encola mientras drena, hasta cinco pasadas', async () => {
    const locks = createKeyedLocks()
    const done: number[] = []
    void locks.run('k', async () => {
      done.push(1)
      void locks.run('k2', () => new Promise<void>(resolve => setTimeout(() => (done.push(2), resolve()), 5)))
    })
    await locks.drain()
    expect(done).toEqual([1, 2])
    expect(locks.size).toBe(0)
    locks.run('z', () => new Promise(() => {}))
    locks.clearForTest()
    expect(locks.size).toBe(0)
  })
})

describe('MessagingState (g) y messagingState (ti)', () => {
  test('un estado por anfitrión', () => {
    const host = {}
    expect(messagingState(host)).toBe(messagingState(host))
    expect(messagingState({})).not.toBe(messagingState(host))
  })

  test('cada parte se reinicia a su estado inicial', () => {
    const state = new MessagingState()
    const released: string[] = []
    state.inbound.held.push({} as never)
    state.inbound.getCurrentMode = () => ({ mode: 'default' })
    state.inbound.shutdownSettleHandle = () => void released.push('settle')
    state.inbound.unsubscribeAvailabilityRefresh = () => void released.push('availability')
    state.inbound.shuttingDown = true
    state.inbound.reset()
    expect(state.inbound.held).toEqual([])
    expect(state.inbound.getCurrentMode).toBeNull()
    expect(state.inbound.shutdownSettleHandle).toBeNull()
    expect(state.inbound.unsubscribeAvailabilityRefresh).toBeNull()
    expect(state.inbound.shuttingDown).toBe(false)
    expect(released).toEqual(['settle', 'availability'])

    state.receipts.outstandingSends.push({ msgId: 'm', to: 'x' })
    state.receipts.awaitingTerminal.push({ msgId: 'n', to: 'y' })
    state.receipts.reset()
    expect([state.receipts.outstandingSends, state.receipts.awaitingTerminal]).toEqual([[], []])

    state.outbound.pacer = {} as never
    state.outbound.reset()
    expect(state.outbound.pacer).toBeNull()

    let heard = 0
    state.ingress.messageDropped.subscribe(() => void heard++)
    state.ingress.ownUdsHopToken = 'h'
    state.ingress.reset()
    state.ingress.messageDropped.emit({} as never)
    expect(state.ingress.ownUdsHopToken).toBeUndefined()
    expect(heard).toBe(0)

    state.swarmPermissions.pending.set('a', {} as never)
    state.swarmPermissions.pendingPlanApproval = {} as never
    state.swarmPermissions.clear()
    expect([state.swarmPermissions.pending.size, state.swarmPermissions.pendingPlanApproval]).toEqual([0, null])
  })

  test('la lista de tareas avisa al soltar el equipo líder, y sólo si había uno', () => {
    const state = new MessagingState()
    let updates = 0
    state.taskList.updated.subscribe(() => void updates++)
    state.taskList.reset()
    expect(updates).toBe(0)
    state.taskList.leaderTeamName = 'eq'
    state.taskList.reset()
    expect(updates).toBe(1)
    expect(state.taskList.leaderTeamName).toBeUndefined()
  })
})
