/**
 * Los verbos privilegiados de `thyrox mitm` hablan con la API que sirve
 * `thyrox mitm serve`: ella es la dueña del proceso del servidor MITM, y una
 * CLI de vida corta se llevaría al hijo al salir. `serve` publica su URL en
 * el directorio de datos y la retira al parar; sin ella, estos verbos
 * rehúsan. La contraseña de sudo sólo entra por stdin, nunca por argv.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { publishApiUrl, readApiUrl, withdrawApiUrl } from '../src/commands/mitm/apiEndpoint.ts'
import { privilegedVerbRequest, runPrivilegedVerb, type PrivilegedVerbDeps } from '../src/commands/mitm/privilegedVerbs.ts'
import type { ApiRequest } from '../src/commands/mitm/inProcessApi.ts'

let dir: string
let sent: ApiRequest[]
let out: string[]
let deps: PrivilegedVerbDeps

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-endpoint-'))
  sent = []
  out = []
  deps = {
    apiUrl: () => 'http://127.0.0.1:4455',
    connect: () => async request => {
      sent.push(request)
      return Response.json({ ok: true })
    },
    readSecret: async () => 's3cret',
    write: text => out.push(text),
  }
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

test('the API URL is published, read back and withdrawn', () => {
  expect(readApiUrl(dir)).toBeNull()
  publishApiUrl(dir, 'http://127.0.0.1:4455')
  expect(readApiUrl(dir)).toBe('http://127.0.0.1:4455')
  withdrawApiUrl(dir)
  expect(readApiUrl(dir)).toBeNull()
})

test('server actions, dns, reset, repair and the capture map to their API requests', () => {
  expect(privilegedVerbRequest(['start'])).toEqual({ method: 'POST', path: '/api/tools/agent-bridge/server', body: { action: 'start' } })
  expect(privilegedVerbRequest(['trust-cert'])).toEqual({
    method: 'POST',
    path: '/api/tools/agent-bridge/server',
    body: { action: 'trust-cert' },
  })
  expect(privilegedVerbRequest(['dns', 'codex', 'on'])).toEqual({
    method: 'POST',
    path: '/api/tools/agent-bridge/agents/codex/dns',
    body: { enabled: true },
  })
  expect(privilegedVerbRequest(['reset', 'codex'])).toEqual({ method: 'POST', path: '/api/tools/agent-bridge/agents/codex/reset', body: {} })
  expect(privilegedVerbRequest(['diagnose'])).toEqual({ method: 'GET', path: '/api/tools/agent-bridge/diagnose' })
  expect(privilegedVerbRequest(['upstream-ca', 'test', '/ca.pem'])).toEqual({
    method: 'POST',
    path: '/api/tools/agent-bridge/upstream-ca/test',
    body: { path: '/ca.pem' },
  })
  expect(privilegedVerbRequest(['tproxy', 'start', '--on-port', '9443'])).toEqual({
    method: 'POST',
    path: '/api/tools/agent-bridge/tproxy',
    body: { onPort: 9443 },
  })
  expect(privilegedVerbRequest(['tproxy', 'stop'])).toEqual({ method: 'DELETE', path: '/api/tools/agent-bridge/tproxy' })
})

test('the sudo password travels only from stdin into the body', async () => {
  expect(await runPrivilegedVerb(['start', '--sudo-password-stdin'], deps)).toBe(0)
  expect(sent[0]!.body).toEqual({ action: 'start', sudoPassword: 's3cret' })
  expect(await runPrivilegedVerb(['start', '--sudo-password', 'visible'], deps)).toBe(2)
  expect(sent).toHaveLength(1)
})

test('without a running API the verb refuses, naming serve', async () => {
  deps.apiUrl = () => null
  expect(await runPrivilegedVerb(['start'], deps)).toBe(2)
  expect(out.join('')).toContain('thyrox mitm serve')
  expect(sent).toHaveLength(0)
})

test('missing arguments refuse without calling the API', async () => {
  for (const args of [['dns', 'codex'], ['dns', 'codex', 'maybe'], ['reset'], ['upstream-ca', 'set'], ['tproxy', 'start', '--on-port', 'x']]) {
    expect(await runPrivilegedVerb(args, deps)).toBe(2)
  }
  expect(sent).toHaveLength(0)
})
