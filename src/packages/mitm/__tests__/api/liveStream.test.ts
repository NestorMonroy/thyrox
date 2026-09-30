/**
 * El canal en vivo del inspector: un websocket en el servidor de la API local
 * que abre con el estado entero del búfer y luego emite cada cambio. Sólo
 * acepta el loopback, como el resto de la API, y suelta la suscripción al
 * cerrarse.
 *
 * Porte del contrato de `omniroute: src/app/api/tools/traffic-inspector/
 * ws/route.ts` (MIT) sobre los websockets nativos de `Bun.serve`.
 */
import { afterEach, expect, test } from 'bun:test'

import { LIVE_STREAM_PATH } from '../../src/api/liveStream.ts'
import { startMitmApiServer, type MitmApiServer } from '../../src/api/server.ts'
import { TrafficBuffer } from '../../src/inspector/buffer.ts'
import type { InterceptedRequest, WsEvent } from '../../src/inspector/types.ts'

let server: MitmApiServer | undefined
afterEach(() => server?.stop())

function entry(): InterceptedRequest {
  return {
    id: crypto.randomUUID(),
    source: 'agent-bridge',
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.cursor.sh',
    path: '/v1/chat/completions',
    requestHeaders: {},
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: 200,
  }
}

/** Abre el canal y devuelve los eventos recibidos y una espera por el n-ésimo. */
async function connect(port: number) {
  const events: WsEvent[] = []
  const waiters: Array<() => void> = []
  const ws = new WebSocket(`ws://127.0.0.1:${port}${LIVE_STREAM_PATH}`)
  ws.onmessage = message => {
    events.push(JSON.parse(String(message.data)) as WsEvent)
    for (const wake of waiters.splice(0)) wake()
  }
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('websocket failed'))
  })
  const until = async (count: number) => {
    while (events.length < count) await new Promise<void>(resolve => waiters.push(resolve))
  }
  return { ws, events, until }
}

test('the live stream opens with a snapshot and then sends each change', async () => {
  const traffic = new TrafficBuffer(10)
  const first = entry()
  traffic.push(first)
  server = startMitmApiServer({ port: 0, routes: [], liveStream: traffic })
  const { ws, events, until } = await connect(server.port)
  await until(1)
  expect(events[0]).toEqual({ type: 'snapshot', data: [expect.objectContaining({ id: first.id })] })
  const second = entry()
  traffic.push(second)
  traffic.clear()
  await until(3)
  expect(events.slice(1).map(e => e.type)).toEqual(['new', 'clear'])
  ws.close()
})

test('closing the socket drops its subscription', async () => {
  let active = 0
  const stream = {
    subscribe(listener: (ev: WsEvent) => void) {
      active += 1
      listener({ type: 'clear' })
      return () => {
        active -= 1
      }
    },
  }
  server = startMitmApiServer({ port: 0, routes: [], liveStream: stream })
  const { ws, until } = await connect(server.port)
  await until(1)
  expect(active).toBe(1)
  await new Promise<void>(resolve => {
    ws.onclose = () => resolve()
    ws.close()
  })
  for (let i = 0; i < 50 && active > 0; i++) await Bun.sleep(10)
  expect(active).toBe(0)
})

test('a plain GET to the live stream asks for the upgrade with a 426', async () => {
  server = startMitmApiServer({ port: 0, routes: [], liveStream: new TrafficBuffer(10) })
  const res = await fetch(`http://127.0.0.1:${server.port}${LIVE_STREAM_PATH}`)
  expect(res.status).toBe(426)
  expect(res.headers.get('upgrade')).toBe('websocket')
})

test('the live stream refuses a forwarded request like the rest of the API', async () => {
  server = startMitmApiServer({ port: 0, routes: [], liveStream: new TrafficBuffer(10) })
  const res = await fetch(`http://127.0.0.1:${server.port}${LIVE_STREAM_PATH}`, {
    headers: { upgrade: 'websocket', 'x-forwarded-for': '203.0.113.9' },
  })
  expect(res.status).toBe(403)
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe('LOCAL_ONLY')
})

test('without a live stream the path is just another unknown route', async () => {
  server = startMitmApiServer({ port: 0, routes: [] })
  expect((await fetch(`http://127.0.0.1:${server.port}${LIVE_STREAM_PATH}`)).status).toBe(404)
})
