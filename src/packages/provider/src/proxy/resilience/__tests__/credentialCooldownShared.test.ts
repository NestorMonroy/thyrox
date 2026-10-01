/**
 * El enfriamiento de una credencial visto entre dos proxies que comparten
 * el mismo `SharedStateStore` (ADR-THYROX-006). Cada instancia de
 * `CredentialCooldown` simula un proxy distinto, con su propio objeto
 * `ProxyCredential` para el mismo id: lo que una marca no disponible sólo
 * se ve en la otra a través del store, nunca por referencia compartida.
 */
import { describe, expect, test } from 'bun:test'
import { createMemorySharedStateStore } from '@thyrox/shared-state/memory.ts'
import type { ProxyCredential } from '../../credentialSelectors.ts'
import type { ProviderTraits } from '../errorClassifier.ts'
import { CredentialCooldown } from '../credentialCooldown.ts'

const TRAITS: Record<string, ProviderTraits> = { openai: { authType: 'apikey' } }
const NOW = new Date('2026-09-27T12:00:00Z')

describe('CredentialCooldown con estado compartido', () => {
  test('lo que una instancia enfría, la otra lo ve enfriado a través del store', async () => {
    let clock = NOW.getTime()
    const store = createMemorySharedStateStore({ now: () => clock })
    const cooldownA = new CredentialCooldown({ traitsOf: p => TRAITS[p] }, store)
    const cooldownB = new CredentialCooldown({ traitsOf: p => TRAITS[p] }, store)
    const credentialA: ProxyCredential = { id: 'shared-1' }
    const credentialB: ProxyCredential = { id: 'shared-1' }

    const decision = cooldownA.markUnavailable({
      credential: credentialA, provider: 'openai', model: 'gpt-4o', status: 429,
      errorText: 'Rate limit hit', headers: null, now: new Date(clock),
    })
    expect(decision.cooldownMs).toBeGreaterThan(0)

    // B no comparte el objeto credencial, así que sólo el store puede decírselo.
    expect(await cooldownB.isCoolingDown(credentialB)).toBe(true)

    clock += decision.cooldownMs + 1
    expect(await cooldownB.isCoolingDown(credentialB)).toBe(false)
  })

  test('sin sharedState la conducta es la de hoy: una instancia no ve el enfriamiento de otra', async () => {
    const cooldownA = new CredentialCooldown({ traitsOf: p => TRAITS[p] })
    const cooldownB = new CredentialCooldown({ traitsOf: p => TRAITS[p] })
    const credentialA: ProxyCredential = { id: 'local-1' }
    const credentialB: ProxyCredential = { id: 'local-1' }

    cooldownA.markUnavailable({
      credential: credentialA, provider: 'openai', model: 'gpt-4o', status: 429,
      errorText: 'Rate limit hit', headers: null, now: NOW,
    })

    expect(await cooldownB.isCoolingDown(credentialB, NOW)).toBe(false)
    expect(await cooldownA.isCoolingDown(credentialA, NOW)).toBe(true)
  })
})
