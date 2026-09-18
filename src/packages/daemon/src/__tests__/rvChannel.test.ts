/**
 * Test end-to-end del canal de rendezvous: rvServer (lado worker, ant
 * 4291.js) hablando con rvClient (lado supervisor, ant naK / 5016.js) sobre
 * un socket de dominio Unix real, en un tmpdir aislado.
 *
 * Sin mocks: el baile del socket —descartar el handshake, una sola conexion
 * con last-write-wins, framing JSON por linea, backoff de reconexion— ES la
 * logica bajo test. Mockearlo no probaria nada.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createRvClient } from '../rvClient.js'
import type { RvServerMessage } from '../rvClient.js'
import {
  startRendezvousServer,
  stopRendezvousServer,
  sendRv,
  pushRvState,
  isRendezvousServerRunning,
  type RvServerHost,
} from '@thyrox/agent/background/fleet/rvServer.js'

const ISOLATED_HOME = mkdtempSync(join(tmpdir(), 'ccb-rv-test-'))
const ORIGINAL_CONFIG_HOME = process.env.CLAUDE_CONFIG_HOME
const ORIGINAL_RV_SOCK = process.env.CLAUDE_BG_RENDEZVOUS_SOCK
const ORIGINAL_JOB_DIR = process.env.CLAUDE_JOB_DIR

let sockSeq = 0

beforeAll(() => {
  process.env.CLAUDE_CONFIG_HOME = ISOLATED_HOME
})
afterAll(() => {
  if (ORIGINAL_CONFIG_HOME === undefined) delete process.env.CLAUDE_CONFIG_HOME
  else process.env.CLAUDE_CONFIG_HOME = ORIGINAL_CONFIG_HOME
  rmSync(ISOLATED_HOME, { recursive: true, force: true })
})

/** Una ruta de socket nueva por test, para que un bind que quede colgando
 *  nunca se filtre de un caso a otro. */
function freshSockPath(): string {
  return join(ISOLATED_HOME, `rv-${process.pid}-${sockSeq++}.sock`)
}

beforeEach(() => {
  delete process.env.CLAUDE_JOB_DIR
})
afterEach(() => {
  stopRendezvousServer()
  if (ORIGINAL_RV_SOCK === undefined) delete process.env.CLAUDE_BG_RENDEZVOUS_SOCK
  else process.env.CLAUDE_BG_RENDEZVOUS_SOCK = ORIGINAL_RV_SOCK
  if (ORIGINAL_JOB_DIR === undefined) delete process.env.CLAUDE_JOB_DIR
  else process.env.CLAUDE_JOB_DIR = ORIGINAL_JOB_DIR
})

/** Espera hasta que `pred()` sea cierto o venza el plazo. */
async function until(pred: () => boolean, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (pred()) return
    await new Promise(r => setTimeout(r, 10))
  }
  throw new Error(`condition was not met within ${ms}ms`)
}

describe('rv channel — server start/stop', () => {
  test('start is a no-op without CLAUDE_BG_RENDEZVOUS_SOCK', async () => {
    delete process.env.CLAUDE_BG_RENDEZVOUS_SOCK
    await startRendezvousServer()
    expect(isRendezvousServerRunning()).toBe(false)
  })

  test('start binds when the env var is set, stop tears down', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    await startRendezvousServer()
    expect(isRendezvousServerRunning()).toBe(true)
    // La variable de entorno se consume para que un spawn anidado no pueda
    // volver a hacer bind.
    expect(process.env.CLAUDE_BG_RENDEZVOUS_SOCK).toBeUndefined()
    stopRendezvousServer()
    expect(isRendezvousServerRunning()).toBe(false)
  })
})

describe('rv channel — supervisor ↔ worker', () => {
  test('client connects, handshake is discarded by the worker handler', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    // Un hook de respuesta que registra: si la trama del handshake llegara
    // al manejador de comandos, NO encajaria como respuesta, pero una trama
    // malformada con `role` tiene que descartarse en silencio (ant kb3).
    const replies: string[] = []
    const hostCbs: RvServerHost = {
      enqueueReply: t => replies.push(t),
      isRendererReady: () => true,
    }
    await startRendezvousServer(hostCbs)

    let connected = false
    const client = createRvClient(
      sock,
      () => {},
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)
    expect(connected).toBe(true)
    // El handshake no encolo ninguna respuesta.
    expect(replies).toEqual([])
    client.close()
  })

  test('worker pushes heartbeat; client receives it', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    await startRendezvousServer({ isRendererReady: () => true })

    const received: RvServerMessage[] = []
    let connected = false
    const client = createRvClient(
      sock,
      m => received.push(m),
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)

    // sendRv es el empuje de bajo nivel worker→supervisor. El heartbeat
    // periodico de 30 s es la misma trama; aqui se dispara una de forma
    // sincrona en vez de esperar los 30 s.
    expect(sendRv({ type: 'heartbeat' })).toBe(true)
    await until(() => received.some(m => m.type === 'heartbeat'))
    expect(received.some(m => m.type === 'heartbeat')).toBe(true)
    client.close()
  })

  test('client onDisconnect fires when an established connection drops', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    await startRendezvousServer({ isRendererReady: () => true })

    let connected = false
    let disconnects = 0
    const client = createRvClient(
      sock,
      () => {},
      () => {
        disconnects++
      },
      () => {
        connected = true
      },
    )
    await until(() => connected)
    // Derribar el servidor tira la conexion viva → onDisconnect.
    stopRendezvousServer()
    await until(() => disconnects > 0)
    expect(disconnects).toBeGreaterThan(0)
    client.close()
  })

  test('supervisor reply reaches the worker enqueueReply hook', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    const replies: string[] = []
    await startRendezvousServer({
      enqueueReply: t => replies.push(t),
      isRendererReady: () => true,
    })

    let connected = false
    const client = createRvClient(
      sock,
      () => {},
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)
    expect(client.send({ type: 'reply', text: 'continue please' })).toBe(true)
    await until(() => replies.length > 0)
    expect(replies).toEqual(['continue please'])
    client.close()
  })

  test('reply answering an open question short-circuits enqueue', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    const replies: string[] = []
    await startRendezvousServer({
      enqueueReply: t => replies.push(t),
      answersOpenQuestion: t => t === 'yes',
      isRendererReady: () => true,
    })
    let connected = false
    const client = createRvClient(
      sock,
      () => {},
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)
    client.send({ type: 'reply', text: 'yes' })
    // Se le da tiempo a la trama para aterrizar; NO tiene que encolarse.
    await new Promise(r => setTimeout(r, 100))
    expect(replies).toEqual([])
    client.close()
  })

  test('supervisor repaint triggers forceRedraw + repaint-done ack', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    let redrawCount = 0
    await startRendezvousServer({
      forceRedraw: () => {
        redrawCount++
        return true
      },
      isRendererReady: () => true,
    })
    const received: RvServerMessage[] = []
    let connected = false
    const client = createRvClient(
      sock,
      m => received.push(m),
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)
    client.send({ type: 'repaint' })
    await until(() => received.some(m => m.type === 'repaint-done'))
    expect(redrawCount).toBe(1)
    expect(received.some(m => m.type === 'repaint-done')).toBe(true)
    client.close()
  })

  test('shutdown frame acks shutting-down + calls onShutdown', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    let shutdownCalled = false
    await startRendezvousServer({
      onShutdown: () => {
        shutdownCalled = true
      },
      isRendererReady: () => true,
    })
    const received: RvServerMessage[] = []
    let connected = false
    const client = createRvClient(
      sock,
      m => received.push(m),
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)
    client.send({ type: 'shutdown' })
    // onShutdown corre de forma sincrona despues de que sendRv encole el
    // ack, mientras que el supervisor observa ese ack en un evento de socket
    // posterior. Se espera a los dos efectos independientes en vez de tratar
    // el callback como prueba de que el mensaje ya cruzo el socket Unix.
    await until(
      () =>
        shutdownCalled && received.some(m => m.type === 'shutting-down'),
    )
    expect(shutdownCalled).toBe(true)
    expect(received.some(m => m.type === 'shutting-down')).toBe(true)
    client.close()
  })

  test('only one connection lives — a second connect drops the first', async () => {
    const sock = freshSockPath()
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    await startRendezvousServer({ isRendererReady: () => true })

    let firstConnected = false
    const first = createRvClient(
      sock,
      () => {},
      () => {},
      () => {
        firstConnected = true
      },
    )
    await until(() => firstConnected)

    let secondConnected = false
    const second = createRvClient(
      sock,
      () => {},
      () => {},
      () => {
        secondConnected = true
      },
    )
    await until(() => secondConnected)

    // Cuando el segundo conecta, un empuje llega exactamente al socket vivo.
    // El `conn` del servidor es ahora el segundo, y sendRv escribe en el.
    expect(sendRv({ type: 'heartbeat' })).toBe(true)
    first.close()
    second.close()
  })
})

describe('rv channel — state + done persist to disk', () => {
  test('pushRvState writes state.json and pushes the patch', async () => {
    const sock = freshSockPath()
    const jobDir = join(ISOLATED_HOME, 'job-state')
    process.env.CLAUDE_BG_RENDEZVOUS_SOCK = sock
    process.env.CLAUDE_JOB_DIR = jobDir
    // Seed a baseline state.json so pushRvState has something to merge.
    const { writeJobState, readJobState } = await import(
      '@thyrox/agent/background/fleet/fleetStore.js'
    )
    const now = new Date().toISOString()
    await writeJobState(jobDir, {
      state: 'working',
      tempo: 'active',
      detail: 'seed',
      output: null,
      children: null,
      linkScanOffset: 0,
      template: 'bg',
      respawnFlags: [],
      intent: 'do a thing',
      sessionId: '',
      daemonShort: 'state01',
      cwd: jobDir,
      createdAt: now,
      updatedAt: now,
      firstTerminalAt: null,
      backend: 'daemon',
    })
    await startRendezvousServer({ isRendererReady: () => true })

    const received: RvServerMessage[] = []
    let connected = false
    const client = createRvClient(
      sock,
      m => received.push(m),
      () => {},
      () => {
        connected = true
      },
    )
    await until(() => connected)

    await pushRvState({ state: 'done', tempo: 'idle', detail: 'finished' })
    await until(() => received.some(m => m.type === 'state'))

    // El disco refleja el patch fusionado.
    const onDisk = await readJobState(jobDir)
    expect(onDisk?.state).toBe('done')
    expect(onDisk?.tempo).toBe('idle')
    expect(onDisk?.detail).toBe('finished')
    expect(onDisk?.intent).toBe('do a thing') // preservado de la semilla

    // El patch tambien se empujo por el cable.
    const statePush = received.find(m => m.type === 'state') as
      | { type: 'state'; patch: Record<string, unknown> }
      | undefined
    expect(statePush?.patch.state).toBe('done')
    client.close()
  })
})
