/**
 * El registro de flujos de inicio de sesión: cada proveedor de la referencia
 * con su flujo, las configuraciones leídas del entorno (los client id sólo de
 * variables `THYROX_*`) y los alias que comparten flujo —`amazon-q` el de
 * `kiro`, `clinepass` el de `cline`, `devin-cli` el de `devin-desktop`—.
 *
 * Porte de `PROVIDERS` en `omniroute: src/lib/oauth/providers/index.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'
import { createOAuthFlowRegistry, OAUTH_LOGIN_PROVIDERS } from '../../../src/accounts/oauth/flowRegistry.ts'

const REFERENCE_PROVIDERS = ['claude', 'codex', 'antigravity', 'agy', 'qoder', 'kimi-coding', 'github', 'ghe-copilot', 'gitlab-duo', 'kiro', 'amazon-q', 'cursor', 'trae', 'kilocode', 'cline', 'clinepass', 'devin-desktop', 'devin-cli', 'grok-cli', 'xai-oauth', 'openference', 'codebuddy-cn', 'zed', 'zed-hosted', 'muse-code']

const registry = (env: Record<string, string | undefined> = {}) => createOAuthFlowRegistry({ env, kimiDeviceIdPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-kimi-')), 'device-id') })

describe('the login flow registry', () => {
  test('carries every provider of the reference, in its order', () => {
    expect<string[]>([...OAUTH_LOGIN_PROVIDERS]).toEqual(REFERENCE_PROVIDERS)
    expect(Object.keys(registry())).toEqual([...REFERENCE_PROVIDERS])
  })

  test('builds without any client id declared; a flow only asks for one when it is used', () => {
    const flows = createOAuthFlows(registry())
    expect(() => flows.generateAuthData('codex', 'http://localhost:1455/auth/callback')).toThrow('THYROX_CODEX_OAUTH_CLIENT_ID is not set')
  })

  test('reads the client id from its THYROX_ variable', () => {
    const flows = createOAuthFlows(registry({ THYROX_CODEX_OAUTH_CLIENT_ID: 'codex-client' }))
    const url = new URL(flows.generateAuthData('codex', 'http://localhost:1455/auth/callback').authUrl!)
    expect(url.searchParams.get('client_id')).toBe('codex-client')
  })

  test('aliases share the flow of the provider they stand for', () => {
    const flows = registry()
    expect(flows['amazon-q']).toBe(flows.kiro!)
    expect(flows.clinepass).toBe(flows.cline!)
    expect(flows['devin-cli']).toBe(flows['devin-desktop']!)
  })

  test('each provider keeps the flow type of the reference', () => {
    const types = Object.fromEntries(Object.entries(registry()).map(([id, flow]) => [id, flow.flowType]))
    expect(types).toMatchObject({
      claude: 'authorization_code_pkce', codex: 'authorization_code_pkce', github: 'device_code', 'kimi-coding': 'device_code',
      kiro: 'device_code', trae: 'import_token', zed: 'import_token', 'devin-desktop': 'import_token',
    })
  })

  test('agy and antigravity are two flows over the same account family', () => {
    const flows = registry()
    expect(flows.agy).not.toBe(flows.antigravity!)
    expect(flows.agy!.flowType).toBe(flows.antigravity!.flowType)
  })

  test('agy logs in with the cli client profile and antigravity with the ide one', () => {
    const flows = registry()
    const profileOf = (id: string) => (flows[id]!.mapTokens!({ access_token: 'a' }, {}) as { providerSpecificData: { clientProfile: string } }).providerSpecificData.clientProfile
    expect(profileOf('agy')).toBe('cli')
    expect(profileOf('antigravity')).toBe('ide')
  })

  test('kimi-coding identifies the device with the id persisted at the declared path', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-kimi-'))
    const deviceIdPath = path.join(dir, 'device-id')
    fs.writeFileSync(deviceIdPath, 'device-from-file')
    const sent: Record<string, string>[] = []
    const fetch = (async (_url: string, init: RequestInit) => {
      sent.push(init.headers as Record<string, string>)
      return Response.json({ device_code: 'd', user_code: 'u', verification_uri_complete: 'https://kimi.test/device' })
    }) as unknown as typeof globalThis.fetch
    const env = { THYROX_KIMI_CODING_OAUTH_CLIENT_ID: 'kimi-client', THYROX_PROVIDERS_DATA_DIR: path.join(dir, 'home') }
    const flows = createOAuthFlowRegistry({ env, fetch, kimiDeviceIdPath: deviceIdPath })
    await flows['kimi-coding']!.requestDeviceCode!(flows['kimi-coding']!.config as never, '')
    expect(sent[0]!['X-Msh-Device-Id']).toBe('device-from-file')
  })
})
