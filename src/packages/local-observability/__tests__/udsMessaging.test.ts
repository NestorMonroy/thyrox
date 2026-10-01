/**
 * `udsMessaging.ts`: el buzón por defecto de la sesión (`mn`, con las
 * dependencias por defecto de este proceso) y los dos accesores que
 * `chunk-9d7mkc64.js` exporta junto a él y que TASK-THYROX-0450 completa
 * porque ya tienen consumidor real: `getUdsMessagingSocketPath` (`Dqo`,
 * `@thyrox/agent/messages/systemInit.ts`) y `setOnEnqueue` (`Mqo`,
 * `@thyrox/cli: headless/sdk/session/run-streaming.ts`). Los dos escriben y
 * leen sobre el MISMO `InboxState` singleton que usa `startUdsMessaging`
 * —`state`—, así que la prueba mide justamente eso: que el accesor de este
 * módulo alcanza el mismo estado que arranca el buzón, no una copia.
 */
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getCommandQueue, resetCommandQueue } from '@thyrox/agent/messageQueueManager.js'
import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'

import {
  getDefaultUdsSocketPath,
  getUdsMessagingSocketPath,
  setOnEnqueue,
  startUdsMessaging,
  udsMessagingStateForTesting,
  type MessagingStop,
} from '../src/uds/udsMessaging.ts'
import { processInboxKeyDeps } from '../src/uds/inboxKeys.ts'
import { MAIN_THREAD_AGENT_ID, toQueuedCommand, type QueuedPrompt } from '../src/uds/inboxDelivery.ts'
import { formatEnvelope } from '../src/uds/peerEnvelope.ts'
import { resetIdleNotificationState } from '../src/uds/idleNotification.ts'
import { artifactYieldState } from '../src/uds/artifactReplyYield.ts'
import { messagingState } from '../src/uds/messagingState.ts'
import { sessionNameState } from '../src/uds/sessionNameState.ts'

const dirs: string[] = []
const stops: MessagingStop[] = []

function tempSocketPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uds-messaging-'))
  dirs.push(dir)
  return join(dir, 'session.sock')
}

/** Lo que el bootstrap instala en producción: la política de entrada lee settings por `@thyrox/config`. */
beforeAll(() => installConfigHostBindings(new InMemoryConfig().bindings))

afterEach(async () => {
  for (const stop of stops.splice(0)) await stop().catch(() => {})
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  setOnEnqueue(undefined)
  resetCommandQueue()
  resetIdleNotificationState()
  artifactYieldState().reset()
  sessionNameState().reset()
  messagingState().inbound.reset()
  messagingState().ingress.reset()
})

describe('getDefaultUdsSocketPath (W1o)', () => {
  test('devuelve una ruta bajo el tmpdir de esta sesión', () => {
    expect(getDefaultUdsSocketPath().length).toBeGreaterThan(0)
  })
})

describe('getUdsMessagingSocketPath (Dqo)', () => {
  test('sin buzón arrancado, undefined', () => {
    expect(getUdsMessagingSocketPath()).toBeUndefined()
  })

  test('con el buzón arrancado, la ruta bindeada de ESTE módulo; tras cerrarlo, undefined de nuevo', async () => {
    const socketPath = tempSocketPath()
    const stop = await startUdsMessaging(socketPath, { isExplicit: true },
      { inboxKeyDeps: { ...processInboxKeyDeps, sessionsDir: () => join(dirs.at(-1)!, 'sessions') } })
    expect(stop).toBeDefined()
    if (stop) stops.push(stop)
    expect(getUdsMessagingSocketPath()).toBe(socketPath)
    await stop?.()
    stops.pop()
    expect(getUdsMessagingSocketPath()).toBeUndefined()
  })
})

describe('setOnEnqueue (Mqo)', () => {
  test('fija el handler sobre el InboxState que startUdsMessaging usa de verdad', () => {
    let called = 0
    setOnEnqueue(() => { called += 1 })
    udsMessagingStateForTesting.onEnqueue?.()
    expect(called).toBe(1)
  })

  test('undefined retira el handler', () => {
    setOnEnqueue(() => {})
    setOnEnqueue(undefined)
    expect(udsMessagingStateForTesting.onEnqueue).toBeUndefined()
  })
})

/** Un marco `user` por el socket del buzón, tras la línea de auth; resuelve cuando `settled()` lo confirma o falla a los 2 s. */
function sendUserFrame(socketPath: string, content: string, settled: () => boolean): Promise<void> {
  const token = process.env.THYROX_CODE_MESSAGING_TOKEN
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('el mensaje no se asentó a tiempo')), 2000)
    const socket = connect({ path: socketPath }, () => {
      socket.write(`${JSON.stringify({ type: 'auth', token })}\n`)
      socket.write(`${JSON.stringify({ type: 'user', from: 'uds:/run/peer/7.sock', message: { role: 'user', content } })}\n`)
    })
    const poll = setInterval(() => {
      if (!settled()) return
      clearInterval(poll)
      clearTimeout(timeout)
      socket.end()
      resolve()
    }, 20)
    socket.on('error', error => {
      clearInterval(poll)
      clearTimeout(timeout)
      reject(error)
    })
  })
}

async function startDefaultInbox(): Promise<string> {
  const socketPath = tempSocketPath()
  const stop = await startUdsMessaging(socketPath, { isExplicit: true, requireAuth: true },
    { inboxKeyDeps: { ...processInboxKeyDeps, sessionsDir: () => join(dirs.at(-1)!, 'sessions') } })
  expect(stop).toBeDefined()
  if (stop) stops.push(stop)
  return socketPath
}

describe('entrega real a la cola de la sesión (ze → gE)', () => {
  const envelope = formatEnvelope({ from: 'uds:/run/peer/7.sock', body: 'hola desde el par' })

  test('sin deps de entrega, un marco user aterriza en getCommandQueue() como cross-session-message del hilo principal', async () => {
    messagingState().inbound.getCurrentMode = () => ({ mode: 'default' })
    let enqueueNotices = 0
    setOnEnqueue(() => { enqueueNotices += 1 })
    const socketPath = await startDefaultInbox()
    await sendUserFrame(socketPath, envelope, () => getCommandQueue().length > 0)
    const [command] = getCommandQueue()
    expect(command).toMatchObject({ mode: 'prompt', value: envelope, skipSlashCommands: true, isMeta: true, priority: 'next' })
    expect(command!.value).toStartWith('<cross-session-message from="uds:')
    expect(command!.origin).toMatchObject({ kind: 'peer', from: 'uds:/run/peer/7.sock', body: 'hola desde el par' })
    expect(command!.agentId).toBeUndefined()
    expect(enqueueNotices).toBe(1)
  })

  test('sin el lector del modo de permisos cableado, el marco se retiene (mode-unknown) y la cola queda vacía', async () => {
    const socketPath = await startDefaultInbox()
    const inbound = messagingState().inbound
    await sendUserFrame(socketPath, envelope, () => inbound.held.length > 0)
    expect(getCommandQueue()).toEqual([])
    expect(inbound.held[0]).toMatchObject({ value: envelope, origin: { kind: 'peer' } })
  })
})

describe('toQueuedCommand: de la forma D de la referencia al QueuedCommand de este árbol', () => {
  const prompt: QueuedPrompt = {
    mode: 'prompt',
    agentId: MAIN_THREAD_AGENT_ID,
    value: 'hola',
    uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
    priority: 'now',
    origin: { kind: 'peer', from: 'uds:/x.sock' },
    skipSlashCommands: true,
    isMeta: true,
    skipAttachments: true,
  }

  test('el hilo principal va sin agentId, que es como lo filtra el drenaje', () => {
    const command = toQueuedCommand(prompt)
    expect(command).toEqual({
      mode: 'prompt',
      value: 'hola',
      uuid: '0f8fad5b-d9cb-469f-a165-70867728950e',
      priority: 'now',
      origin: { kind: 'peer', from: 'uds:/x.sock' },
      skipSlashCommands: true,
      isMeta: true,
    })
    expect('agentId' in command).toBe(false)
    expect('skipAttachments' in command).toBe(false)
  })

  test('un subagente conserva su agentId', () => {
    expect(toQueuedCommand({ ...prompt, agentId: 'a0123456789abcdef' }).agentId).toBe('a0123456789abcdef')
  })
})
