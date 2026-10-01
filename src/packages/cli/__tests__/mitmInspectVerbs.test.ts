/**
 * `thyrox mitm inspect`: los verbos del inspector de tráfico. El búfer vive
 * en el proceso de `thyrox mitm serve`, así que van a la API publicada; sin
 * ella rehúsan. Cada verbo se traduce a su petición, y un argumento que no
 * alcanza rehúsa con exit 2 sin llamar a la API.
 */
import { beforeEach, expect, test } from 'bun:test'

import type { ApiRequest } from '../src/commands/mitm/inProcessApi.ts'
import { inspectVerbRequest, runInspectVerb, type InspectVerbDeps } from '../src/commands/mitm/inspectVerbs.ts'

const I = '/api/tools/traffic-inspector'

let sent: ApiRequest[]
let out: string[]
let deps: InspectVerbDeps

beforeEach(() => {
  sent = []
  out = []
  deps = {
    apiUrl: () => 'http://127.0.0.1:4455',
    connect: () => async request => {
      sent.push(request)
      return request.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ ok: true })
    },
    write: text => out.push(text),
    waitForStop: async () => {},
  }
})

test('the request verbs map to their API requests, with the list filters as the query', () => {
  expect(inspectVerbRequest(['requests'])).toEqual({ method: 'GET', path: `${I}/requests` })
  expect(inspectVerbRequest(['requests', '--host', 'api.example.com', '--status', '5xx'])).toEqual({
    method: 'GET',
    path: `${I}/requests?host=api.example.com&status=5xx`,
  })
  expect(inspectVerbRequest(['clear'])).toEqual({ method: 'DELETE', path: `${I}/requests` })
  expect(inspectVerbRequest(['show', 'r/1'])).toEqual({ method: 'GET', path: `${I}/requests/r%2F1` })
  expect(inspectVerbRequest(['annotate', 'r1', 'slow', 'upstream'])).toEqual({
    method: 'PUT',
    path: `${I}/requests/r1/annotation`,
    body: { annotation: 'slow upstream' },
  })
  expect(inspectVerbRequest(['replay', 'r1'])).toEqual({ method: 'POST', path: `${I}/requests/r1/replay` })
  expect(inspectVerbRequest(['export-har', '--agent', 'codex'])).toEqual({ method: 'GET', path: `${I}/export.har?agent=codex` })
})

test('the session verbs map to their API requests', () => {
  expect(inspectVerbRequest(['sessions'])).toEqual({ method: 'GET', path: `${I}/sessions` })
  expect(inspectVerbRequest(['sessions', 'start', 'night'])).toEqual({ method: 'POST', path: `${I}/sessions`, body: { name: 'night' } })
  expect(inspectVerbRequest(['sessions', 'start'])).toEqual({ method: 'POST', path: `${I}/sessions`, body: {} })
  expect(inspectVerbRequest(['sessions', 'show', 's1'])).toEqual({ method: 'GET', path: `${I}/sessions/s1` })
  expect(inspectVerbRequest(['sessions', 'stop', 's1'])).toEqual({ method: 'PATCH', path: `${I}/sessions/s1`, body: { action: 'stop' } })
  expect(inspectVerbRequest(['sessions', 'rename', 's1', 'day'])).toEqual({
    method: 'PATCH',
    path: `${I}/sessions/s1`,
    body: { action: 'rename', name: 'day' },
  })
  expect(inspectVerbRequest(['sessions', 'delete', 's1'])).toEqual({ method: 'DELETE', path: `${I}/sessions/s1` })
  expect(inspectVerbRequest(['sessions', 'export-har', 's1'])).toEqual({ method: 'GET', path: `${I}/sessions/s1/export.har` })
})

test('the host and capture-mode verbs map to their API requests', () => {
  expect(inspectVerbRequest(['hosts'])).toEqual({ method: 'GET', path: `${I}/hosts` })
  expect(inspectVerbRequest(['hosts', 'add', 'api.example.com', '--label', 'Example', '--kind', 'llm'])).toEqual({
    method: 'POST',
    path: `${I}/hosts`,
    body: { host: 'api.example.com', label: 'Example', kind: 'llm' },
  })
  expect(inspectVerbRequest(['hosts', 'enable', 'api.example.com'])).toEqual({
    method: 'PATCH',
    path: `${I}/hosts/api.example.com`,
    body: { enabled: true },
  })
  expect(inspectVerbRequest(['hosts', 'disable', 'h.example'])).toEqual({ method: 'PATCH', path: `${I}/hosts/h.example`, body: { enabled: false } })
  expect(inspectVerbRequest(['hosts', 'remove', 'h.example'])).toEqual({ method: 'DELETE', path: `${I}/hosts/h.example` })
  expect(inspectVerbRequest(['capture-modes'])).toEqual({ method: 'GET', path: `${I}/capture-modes` })
  expect(inspectVerbRequest(['capture-modes', 'http-proxy', 'start'])).toEqual({
    method: 'POST',
    path: `${I}/capture-modes/http-proxy`,
    body: { action: 'start' },
  })
  expect(inspectVerbRequest(['capture-modes', 'system-proxy', 'apply', '--port', '8080', '--guard-minutes', '5'])).toEqual({
    method: 'POST',
    path: `${I}/capture-modes/system-proxy`,
    body: { action: 'apply', port: 8080, guardMinutes: 5 },
  })
  expect(inspectVerbRequest(['capture-modes', 'system-proxy', 'revert'])).toEqual({
    method: 'POST',
    path: `${I}/capture-modes/system-proxy`,
    body: { action: 'revert' },
  })
  expect(inspectVerbRequest(['capture-modes', 'tls-intercept', 'on'])).toEqual({
    method: 'POST',
    path: `${I}/capture-modes/tls-intercept`,
    body: { enabled: true },
  })
})

test('an argument that does not reach refuses with a usage exit and never calls the API', async () => {
  const cases = [
    ['show'],
    ['annotate', 'r1'],
    ['requests', '--color', 'red'],
    ['requests', '--host'],
    ['hosts', 'enable'],
    ['hosts', 'add', 'h', '--kind'],
    ['sessions', 'rename', 's1'],
    ['capture-modes', 'tls-intercept', 'maybe'],
    ['capture-modes', 'http-proxy', 'pause'],
    ['capture-modes', 'system-proxy', 'apply', '--port', 'x'],
    ['launch'],
  ]
  for (const args of cases) {
    out.length = 0
    expect([args, await runInspectVerb(args, deps)]).toEqual([args, 2])
    expect(out.join('')).toContain('thyrox mitm inspect')
  }
  expect(sent).toEqual([])
})

test('without a running API the verb refuses, naming serve', async () => {
  deps.apiUrl = () => null
  expect(await runInspectVerb(['requests'], deps)).toBe(2)
  expect(out.join('')).toContain('thyrox mitm serve')
  expect(sent).toEqual([])
})

test('an answer without content prints nothing', async () => {
  expect(await runInspectVerb(['clear'], deps)).toBe(0)
  expect(out).toEqual([])
})
