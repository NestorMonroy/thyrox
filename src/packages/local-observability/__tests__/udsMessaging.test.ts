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
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  getDefaultUdsSocketPath,
  getUdsMessagingSocketPath,
  setOnEnqueue,
  startUdsMessaging,
  udsMessagingStateForTesting,
  type MessagingStop,
} from '../src/uds/udsMessaging.ts'
import { processInboxKeyDeps } from '../src/uds/inboxKeys.ts'
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

afterEach(async () => {
  for (const stop of stops.splice(0)) await stop().catch(() => {})
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  setOnEnqueue(undefined)
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
