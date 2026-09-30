/**
 * Los verbos de estado de `thyrox mitm`: cada uno es una petición a la misma
 * API del MITM, resuelta en proceso sobre el store, y su salida es el JSON de
 * la respuesta. Un rechazo de la API sale 1 con su mensaje; un argumento que
 * falta sale 2 sin tocar la API.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { TrafficBuffer } from '@thyrox/mitm/inspector/buffer'
import { ensureAgentBridgeSchema } from '@thyrox/mitm/state/schema'

import { inProcessApi } from '../src/commands/mitm/inProcessApi.ts'
import { runStateVerb, stateVerbRequest, type StateVerbDeps } from '../src/commands/mitm/stateVerbs.ts'

let db: Database
let out: string[]
let files: Record<string, string>
let deps: StateVerbDeps

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  out = []
  files = {}
  deps = {
    api: inProcessApi(db, new TrafficBuffer(10)),
    readFile: path => {
      if (!(path in files)) throw new Error(`no such file: ${path}`)
      return files[path]!
    },
    write: text => out.push(text),
  }
})
afterEach(() => db.close())

function patternNames(body: { patterns: Array<{ pattern: string }> }): string[] {
  return body.patterns.map(p => p.pattern)
}

async function run(args: string[]): Promise<{ exit: number; json: any; text: string }> {
  out = []
  const exit = await runStateVerb(args, deps)
  const text = out.join('')
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    // No es JSON: un mensaje de error.
  }
  return { exit, json, text }
}

test('each state verb maps to its API request', () => {
  expect(stateVerbRequest(['status'])).toEqual({ method: 'GET', path: '/api/tools/agent-bridge/state' })
  expect(stateVerbRequest(['agents'])).toEqual({ method: 'GET', path: '/api/tools/agent-bridge/agents' })
  expect(stateVerbRequest(['detect', 'codex'])).toEqual({ method: 'GET', path: '/api/tools/agent-bridge/agents/codex/detect' })
  expect(stateVerbRequest(['bypass', 'remove', 'a b'])).toEqual({
    method: 'DELETE',
    path: '/api/tools/agent-bridge/bypass?pattern=a%20b',
  })
})

test('status and agents print the API JSON', async () => {
  const status = await run(['status'])
  expect(status.exit).toBe(0)
  expect(Array.isArray(status.json.agents)).toBe(true)
  const agents = await run(['agents'])
  expect(agents.exit).toBe(0)
  expect(agents.json.agents.map((a: { id: string }) => a.id)).toContain('codex')
})

test('mappings --set stores source=target pairs that mappings then reads back', async () => {
  const set = await run(['mappings', 'codex', '--set', 'gpt-5=claude-sonnet-5', '--set', 'o3=claude-opus-5'])
  expect(set.exit).toBe(0)
  const read = await run(['mappings', 'codex'])
  expect(read.json.mappings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source_model: 'gpt-5', target_model: 'claude-sonnet-5' }),
      expect.objectContaining({ source_model: 'o3', target_model: 'claude-opus-5' }),
    ]),
  )
})

test('bypass set replaces the user patterns and bypass remove drops one', async () => {
  expect((await run(['bypass', 'set', 'a.example.com', 'b.example.com'])).exit).toBe(0)
  const removed = await run(['bypass', 'remove', 'a.example.com'])
  expect(patternNames(removed.json)).toContain('b.example.com')
  expect(patternNames(removed.json)).not.toContain('a.example.com')
})

test('config export round-trips through config import', async () => {
  await run(['bypass', 'set', 'kept.example.com'])
  const exported = await run(['config', 'export'])
  expect(exported.exit).toBe(0)
  files['/cfg.json'] = JSON.stringify(exported.json)
  await run(['bypass', 'set'])
  const imported = await run(['config', 'import', '/cfg.json'])
  expect(imported.exit).toBe(0)
  expect(patternNames((await run(['bypass'])).json)).toContain('kept.example.com')
})

test('an API refusal exits 1 with its message', async () => {
  const r = await run(['detect', 'not-an-agent'])
  expect(r.exit).toBe(1)
  expect(r.text).toContain('not-an-agent')
})

test('a missing argument exits 2 without calling the API', async () => {
  let called = false
  const api = deps.api
  deps.api = req => ((called = true), api(req))
  for (const args of [['detect'], ['mappings'], ['bypass', 'remove'], ['config', 'import'], ['mappings', 'codex', '--set', 'no-equals']]) {
    const r = await run(args)
    expect(r.exit).toBe(2)
  }
  expect(called).toBe(false)
})
