/**
 * Los ajustes del MITM y la superficie de CLI de antigravity: el estado con
 * sus destinos y estadísticas, encender y apagar con la misma compuerta de
 * sudo que el resto, regenerar el certificado sólo con el servidor parado, y
 * los alias por herramienta con su esfuerzo de razonamiento validado.
 *
 * Porte del contrato de `omniroute: src/app/api/settings/mitm/route.ts` y
 * `src/app/api/cli-tools/antigravity-mitm/{,alias/}route.ts` (MIT), con el
 * gestor, el certificado y la clave como dobles.
 */
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApiHandler } from '../../src/api/router.ts'
import {
  ANTIGRAVITY_MITM_BASE,
  createAntigravityCliRoutes,
  type AntigravityCliRouteDeps,
} from '../../src/api/routes/settings/antigravityCli.ts'
import { createMitmAliasRoutes } from '../../src/api/routes/settings/mitmAliases.ts'
import { MITM_SETTINGS_PATH, createSettingsRoutes, type SettingsRouteDeps } from '../../src/api/routes/settings/mitmSettings.ts'
import { getMitmAlias, setMitmAliasAll } from '../../src/state/mitmAlias.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

const CERT = '/data/mitm/ca.crt'
let dataDir: string
let db: Database
let calls: string[]
let cachedPassword: string | null
let running: boolean
let certOnDisk: boolean
let deps: SettingsRouteDeps & AntigravityCliRouteDeps & { db: Database }
let handle: (request: Request) => Promise<Response>

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-settings-'))
})
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }))

beforeEach(() => {
  fs.rmSync(path.join(dataDir, 'stats.json'), { force: true })
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  calls = []
  cachedPassword = null
  running = false
  certOnDisk = true
  deps = {
    db,
    platform: 'linux',
    dataDir: () => dataDir,
    sudo: {
      cached: () => cachedPassword,
      remember: password => {
        cachedPassword = password
      },
      required: password => password === '',
    },
    server: {
      start: async (apiKey, password, options) => {
        calls.push(`start:${apiKey}:${password}:${options.port}`)
        running = true
        return { running: true, pid: 7, certTrusted: true }
      },
      stop: async password => {
        calls.push(`stop:${password}`)
        running = false
        return { running: false, pid: null }
      },
      status: async () => ({
        running,
        pid: running ? 7 : null,
        dnsConfigured: false,
        certExists: certOnDisk,
        orphanedStateDetected: false,
      }),
    },
    cert: {
      activePath: () => CERT,
      exists: () => certOnDisk,
      read: () => '-----BEGIN CERTIFICATE-----\n',
      regenerate: async () => {
        calls.push('regenerate')
      },
    },
    lookupKeyById: async id => (id === 'key-1' ? 'sk-from-store' : null),
    sudoPasswordRequired: () => true,
  }
  handle = createApiHandler([...createSettingsRoutes(deps), ...createAntigravityCliRoutes(deps), ...createMitmAliasRoutes(db)], { peerAddress: () => '127.0.0.1' })
})
afterEach(() => db.close())

function call(method: string, route: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { host: '127.0.0.1' }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return handle(new Request(`http://127.0.0.1${route}`, init))
}

async function json(res: Response): Promise<Record<string, any>> {
  return (await res.json()) as Record<string, any>
}

// ── settings/mitm ────────────────────────────────────────────────────────

test('GET settings reports status, the fixed port, the antigravity and kiro targets and empty stats', async () => {
  const body = await json(await call('GET', MITM_SETTINGS_PATH))
  expect(body).toMatchObject({ running: false, pid: null, certExists: true, hasCachedPassword: false, port: 443 })
  expect(body.targets.map((t: { id: string }) => t.id)).toEqual(['antigravity', 'kiro'])
  expect(body.targets[0]).toMatchObject({ localPort: 443, enabled: true })
  expect(body.targets[1]).toMatchObject({ enabled: false })
  expect(body.stats).toEqual({
    startedAt: null,
    totalRequests: 0,
    interceptedRequests: 0,
    activeConnections: 0,
    lastRequestAt: null,
    lastInterceptAt: null,
  })
})

test('GET settings reads the stats the MITM server writes', async () => {
  fs.writeFileSync(
    path.join(dataDir, 'stats.json'),
    JSON.stringify({ startedAt: '2030-01-01T00:00:00.000Z', totalRequests: 5, interceptedRequests: 3, lastRequestAt: 7 }),
  )
  const { stats } = await json(await call('GET', MITM_SETTINGS_PATH))
  expect(stats).toMatchObject({ startedAt: '2030-01-01T00:00:00.000Z', totalRequests: 5, interceptedRequests: 3 })
  expect(stats.lastRequestAt).toBeNull()
})

test('GET settings?download=cert serves the active certificate, or 404', async () => {
  const res = await call('GET', `${MITM_SETTINGS_PATH}?download=cert`)
  expect(res.headers.get('content-type')).toBe('application/x-pem-file')
  expect(await res.text()).toStartWith('-----BEGIN CERTIFICATE-----')
  certOnDisk = false
  expect((await call('GET', `${MITM_SETTINGS_PATH}?download=cert`)).status).toBe(404)
})

test('PUT settings refuses any port but 443', async () => {
  const res = await call('PUT', MITM_SETTINGS_PATH, { port: 8443 })
  expect(res.status).toBe(400)
  expect((await json(res)).error.message).toContain('port 443')
  expect((await call('PUT', MITM_SETTINGS_PATH, { port: 443 })).status).toBe(200)
})

test('PUT settings enabled starts with the resolved key and caches the password', async () => {
  const body = await json(await call('PUT', MITM_SETTINGS_PATH, { enabled: true, keyId: 'key-1', sudoPassword: 'pw' }))
  expect(body.running).toBe(true)
  expect(calls).toEqual(['start:sk-from-store:pw:443'])
  expect(cachedPassword).toBe('pw')
})

test('PUT settings with a key id that does not resolve and no key is a 400', async () => {
  const res = await call('PUT', MITM_SETTINGS_PATH, { enabled: true, keyId: 'missing', sudoPassword: 'pw' })
  expect(res.status).toBe(400)
  expect(calls).toEqual([])
})

test('PUT settings without a password when one is required is a 400 and starts nothing', async () => {
  expect((await call('PUT', MITM_SETTINGS_PATH, { enabled: true })).status).toBe(400)
  expect((await call('PUT', MITM_SETTINGS_PATH, { enabled: false })).status).toBe(400)
  expect(calls).toEqual([])
})

test('PUT settings disabled stops with the cached password', async () => {
  cachedPassword = 'cached'
  await call('PUT', MITM_SETTINGS_PATH, { enabled: false })
  expect(calls).toEqual(['stop:cached'])
})

test('POST settings regenerates the certificate only while the server is stopped', async () => {
  expect((await call('POST', MITM_SETTINGS_PATH, { action: 'regenerate-cert' })).status).toBe(200)
  expect(calls).toEqual(['regenerate'])
  running = true
  expect((await call('POST', MITM_SETTINGS_PATH, {})).status).toBe(409)
  expect(calls).toEqual(['regenerate'])
  expect((await call('POST', MITM_SETTINGS_PATH, { action: 'other' })).status).toBe(400)
})

// ── cli-tools/antigravity-mitm ───────────────────────────────────────────

test('GET antigravity-mitm reports the status and whether a password will be asked', async () => {
  expect(await json(await call('GET', ANTIGRAVITY_MITM_BASE))).toEqual({
    running: false,
    pid: null,
    dnsConfigured: false,
    certExists: true,
    hasCachedPassword: false,
    isWin: false,
    needsSudoPassword: true,
  })
  cachedPassword = 'x'
  expect((await json(await call('GET', ANTIGRAVITY_MITM_BASE))).needsSudoPassword).toBe(false)
})

test('POST antigravity-mitm starts with the given key and caches the password', async () => {
  expect(await json(await call('POST', ANTIGRAVITY_MITM_BASE, { apiKey: 'sk-given', sudoPassword: 'pw' }))).toEqual({
    success: true,
    running: true,
    pid: 7,
  })
  expect(calls).toEqual(['start:sk-given:pw:443'])
  expect(cachedPassword).toBe('pw')
})

test('POST antigravity-mitm without a password when one is required is a 400', async () => {
  expect((await call('POST', ANTIGRAVITY_MITM_BASE, { apiKey: 'sk-given' })).status).toBe(400)
  expect((await call('POST', ANTIGRAVITY_MITM_BASE, '{bad')).status).toBe(400)
  expect(calls).toEqual([])
})

test('DELETE antigravity-mitm stops and caches only a password the request gave', async () => {
  cachedPassword = 'cached'
  expect(await json(await call('DELETE', ANTIGRAVITY_MITM_BASE, {}))).toEqual({ success: true, running: false })
  expect(calls).toEqual(['stop:cached'])
})

// ── cli-tools/antigravity-mitm/alias ─────────────────────────────────────

test('alias PUT normalizes the mappings and stores them for the tool', async () => {
  const res = await call('PUT', `${ANTIGRAVITY_MITM_BASE}/alias`, {
    tool: 'antigravity',
    mappings: { 'gemini-pro': 'openai/gpt-4o', 'gemini-flash': { reasoningEffort: 'extra' } },
  })
  const body = await json(res)
  expect(body.success).toBe(true)
  expect(body.aliases).toEqual({
    'gemini-pro': { model: 'openai/gpt-4o' },
    'gemini-flash': { reasoningEffort: 'xhigh' },
  })
  expect(getMitmAlias(db, 'antigravity')).toEqual(body.aliases)
})

test('alias PUT rejects an unknown reasoning effort and an unknown tool', async () => {
  const effort = await call('PUT', `${ANTIGRAVITY_MITM_BASE}/alias`, {
    tool: 'antigravity',
    mappings: { a: { reasoningEffort: 'turbo' } },
  })
  expect(effort.status).toBe(400)
  expect((await json(effort)).error.message).toBe('Invalid reasoning effort')
  expect((await call('PUT', `${ANTIGRAVITY_MITM_BASE}/alias`, { tool: 'windsurf', mappings: {} })).status).toBe(404)
  expect(getMitmAlias(db, 'antigravity')).toEqual({})
})

test('alias GET upgrades the legacy strings of one tool, and without a tool lists them all', async () => {
  setMitmAliasAll(db, 'antigravity', { 'gemini-pro': 'openai/gpt-4o' })
  setMitmAliasAll(db, 'kiro', { a: 'b' })
  expect(await json(await call('GET', `${ANTIGRAVITY_MITM_BASE}/alias?tool=antigravity`))).toEqual({
    aliases: { 'gemini-pro': { model: 'openai/gpt-4o' } },
  })
  expect((await json(await call('GET', `${ANTIGRAVITY_MITM_BASE}/alias`))).aliases).toEqual({
    antigravity: { 'gemini-pro': 'openai/gpt-4o' },
    kiro: { a: 'b' },
  })
})
