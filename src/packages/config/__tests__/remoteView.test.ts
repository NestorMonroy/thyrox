/**
 * `remote/view.ts` porta las lecturas sobre el estado de carga remota que
 * alimentan la composición de política: `Xk` (la vista servida), `um`/`ja`
 * (la vista sin verificar: sin `managedMcpServers` y con el `env` acotado a
 * la lista de transporte `Ha`), `Ka`, `Ta`, `ls`/`fa`/`ha`, `Cne`/`Yo`/`hg`
 * (la cadena de plataforma) y `agn` (los servidores MCP retenidos).
 *
 * Ciega a: la proyección `om`/`X3n` — declarada como divergencia en el
 * módulo, aquí la vista proyectada es el propio crudo; la prueba 9 mide
 * exactamente eso, y cae el día que `om` se porte.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import { getRemoteLoadState, isServedSnapshot, replaceRemoteSessionCache, setEvalPolicySnapshotOnly } from '../remote/loadState.js'
import { setEligibility } from '../remote/syncCacheState.js'
import {
  getProjectedRemoteSettings,
  hasManagedMcpServers,
  hasWithheldManagedMcpServers,
  helperSlotPlatform,
  platformChain,
  policyHelperSlots,
  TRANSPORT_ENV_ALLOWLIST,
  unverifiedView,
} from '../remote/view.js'
import { InMemoryConfig } from '../testing/index.js'

const home = mkdtempSync(join(tmpdir(), 'remote-view-'))

beforeEach(() => {
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
})

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

const servers: Record<string, unknown> = { managedMcpServers: { corp: { command: 'x' } } }

describe('unverifiedView (ja)', () => {
  test('1. sin env ni managedMcpServers devuelve el mismo objeto', () => {
    const raw = { model: 'a' }
    expect(unverifiedView(raw)).toBe(raw)
    expect(unverifiedView(null)).toBeNull()
  })

  test('2. retira managedMcpServers y deja el resto', () => {
    const raw: Record<string, unknown> = { model: 'a', ...servers }
    expect(unverifiedView(raw)).toEqual({ model: 'a' })
  })

  test('3. acota env a la lista de transporte, sin distinguir caja', () => {
    const raw: Record<string, unknown> = { env: { https_proxy: 'p', SECRET_TOKEN: 's', AWS_REGION: 'r', ANTHROPIC_BASE_URL: 'u' }, ...servers }
    const view = unverifiedView(raw)
    expect(view).toEqual({ env: { https_proxy: 'p', ANTHROPIC_BASE_URL: 'u' } })
    expect(TRANSPORT_ENV_ALLOWLIST.has('CLAUDE_CODE_USE_BEDROCK')).toBe(true)
    expect(TRANSPORT_ENV_ALLOWLIST.has('AWS_ROLE_ARN')).toBe(true)
  })
})

describe('getProjectedRemoteSettings (Xk)', () => {
  test('4. sin elegibilidad no hay crudo: null', () => {
    replaceRemoteSessionCache({ model: 'a' })
    expect(getProjectedRemoteSettings()).toBeNull()
  })

  test('5. un crudo sin verificar sirve la vista acotada, memoizada por identidad (um)', () => {
    setEligibility(true)
    const raw = { model: 'a', ...servers }
    replaceRemoteSessionCache(raw)
    const first = getProjectedRemoteSettings()
    expect(first).toEqual({ model: 'a' })
    expect(getProjectedRemoteSettings()).toBe(first)
    expect(getRemoteLoadState().unverifiedView?.raw).toBe(raw)
    expect(getRemoteLoadState().projectedView).toBeNull()
  })

  test('6. un crudo verificado se sirve tal cual (Ka)', () => {
    setEligibility(true)
    const raw = { model: 'a', ...servers }
    replaceRemoteSessionCache(raw, { verified: true })
    expect(getProjectedRemoteSettings()).toBe(raw)
    expect(isServedSnapshot(raw)).toBe(false)
  })

  test('7. en modo instantánea se proyecta y la vista queda registrada como servida (S$o)', () => {
    setEligibility(true)
    setEvalPolicySnapshotOnly(true)
    const raw = { model: 'a' }
    replaceRemoteSessionCache(raw, { verified: true })
    const view = getProjectedRemoteSettings()
    expect(view).not.toBeNull()
    expect(isServedSnapshot(view)).toBe(true)
    expect(getRemoteLoadState().projectedView?.raw).toBe(raw)
    expect(getProjectedRemoteSettings()).toBe(view)
  })

  test('8. en modo instantánea, un crudo nuevo rehace la proyección', () => {
    setEligibility(true)
    setEvalPolicySnapshotOnly(true)
    replaceRemoteSessionCache({ model: 'a' }, { verified: true })
    const first = getProjectedRemoteSettings()
    replaceRemoteSessionCache({ model: 'b' }, { verified: true })
    expect(getProjectedRemoteSettings()).not.toBe(first)
  })

  test('9. DIVERGENCIA medida — om no está portada: la vista proyectada es el propio crudo', () => {
    setEligibility(true)
    setEvalPolicySnapshotOnly(true)
    const raw = { model: 'a', permissions: { allow: ['x'] } }
    replaceRemoteSessionCache(raw, { verified: true })
    expect(getProjectedRemoteSettings()).toBe(raw)
  })
})

describe('la cadena de plataforma (Cne/Yo/hg)', () => {
  test('10. una plataforma simple es su propia cadena; unknown queda vacía', () => {
    expect(platformChain('macos', () => false)).toEqual({ platform: 'macos', chain: ['macos'] })
    expect(platformChain('unknown', () => true)).toEqual({ platform: 'unknown', chain: [] })
  })

  test('11. wsl confirmada por el kernel encadena wsl y linux; sin confirmar es linux', () => {
    expect(platformChain('wsl', () => true)).toEqual({ platform: 'wsl', chain: ['wsl', 'linux'] })
    expect(platformChain('wsl', () => false)).toEqual({ platform: 'linux', chain: ['linux'] })
  })
})

describe('las ranuras del asistente (ls/fa/ha)', () => {
  test('12. extrae policyHelpers.<plataforma>.defaultSettings y policyHelpers.default sin sus claves de asistente', () => {
    const slots = policyHelperSlots({
      policyHelpers: {
        linux: { defaultSettings: { model: 'l', policyHelper: 'x' } },
        default: { model: 'd', policyHelpers: {} },
        windows: { defaultSettings: 'not an object' },
      },
    })
    expect(slots).toEqual([
      ['policyHelpers.linux.defaultSettings', { model: 'l' }],
      ['policyHelpers.default', { model: 'd' }],
    ])
    expect(policyHelperSlots({ model: 'a' })).toEqual([])
  })

  test('13. helperSlotPlatform lee la plataforma de la ruta, y default no tiene', () => {
    expect(helperSlotPlatform('policyHelpers.wsl.defaultSettings')).toBe('wsl')
    expect(helperSlotPlatform('policyHelpers.default')).toBeUndefined()
  })

  test('14. hasManagedMcpServers exige un objeto con al menos un servidor', () => {
    expect(hasManagedMcpServers(servers)).toBe(true)
    expect(hasManagedMcpServers({ managedMcpServers: {} })).toBe(false)
    expect(hasManagedMcpServers({ managedMcpServers: ['x'] })).toBe(false)
    expect(hasManagedMcpServers({})).toBe(false)
  })
})

describe('hasWithheldManagedMcpServers (agn)', () => {
  const linux = { platform: 'linux' as const, chain: ['linux' as const] }

  test('15. sin crudo, o con el crudo verificado, no hay nada retenido', () => {
    expect(hasWithheldManagedMcpServers(linux)).toBe(false)
    setEligibility(true)
    replaceRemoteSessionCache(servers, { verified: true })
    expect(hasWithheldManagedMcpServers(linux)).toBe(false)
  })

  test('16. un crudo sin verificar con servidores en la raíz los retiene', () => {
    setEligibility(true)
    replaceRemoteSessionCache({ model: 'a', ...servers })
    expect(hasWithheldManagedMcpServers(linux)).toBe(true)
    replaceRemoteSessionCache({ model: 'a', managedMcpServers: {} })
    expect(hasWithheldManagedMcpServers(linux)).toBe(false)
  })

  test('17. los servidores de una ranura del asistente cuentan si la ranura es default o está en la cadena', () => {
    setEligibility(true)
    replaceRemoteSessionCache({ policyHelpers: { default: servers } })
    expect(hasWithheldManagedMcpServers(linux)).toBe(true)
    replaceRemoteSessionCache({ policyHelpers: { linux: { defaultSettings: servers } } })
    expect(hasWithheldManagedMcpServers(linux)).toBe(true)
    replaceRemoteSessionCache({ policyHelpers: { windows: { defaultSettings: servers } } })
    expect(hasWithheldManagedMcpServers(linux)).toBe(false)
    expect(hasWithheldManagedMcpServers({ platform: 'wsl', chain: ['wsl', 'linux'] })).toBe(false)
    replaceRemoteSessionCache({ policyHelpers: { linux: { defaultSettings: servers } } })
    expect(hasWithheldManagedMcpServers({ platform: 'wsl', chain: ['wsl', 'linux'] })).toBe(true)
  })
})
