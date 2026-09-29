/**
 * El ciclo de vida de `orgStatus` de 2.1.283 (`chunk-t6pwageh.js`): `Vg`
 * (`replaceOrgStatus`, el aviso de créditos agotados una vez por turno),
 * `$Oo` con su guarda de origen, `source: 'server'` cuando el estado se lee
 * del servidor, y el rechazo por excedente `lC`/`UOo`.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installConfigHostBindings } from '@thyrox/config/host'
import { InMemoryConfig } from '@thyrox/config/testing'
import { saveGlobalConfig } from '@thyrox/config'

// `saveGlobalConfig` real no conoce `penguinModeOrgEnabled` (no tiene sitio
// en `GlobalConfig`, ver docstring de `fastMode.ts`) — el mismo motivo por
// el que la propia `fastMode.ts` sigue leyéndolo detrás de un `require()`
// con un tipo local. Aquí, el cast va contra un índice `Record`, no contra
// `GlobalConfig`, para no pasar por alto un excess-property real.
function setCachedPenguinModeOrgEnabled(value: boolean | undefined): void {
  ;(saveGlobalConfig as unknown as (fn: (c: Record<string, unknown>) => Record<string, unknown>) => void)(current => ({
    ...current,
    penguinModeOrgEnabled: value,
  }))
}

const VARIABLES = [
  'THYROX_CODE_DISABLE_FAST_MODE',
  'THYROX_CODE_USE_BEDROCK',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'USER_TYPE',
]
let home: string
let saved: Record<string, string | undefined> = {}
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
  process.env.ANTHROPIC_API_KEY = 'marcador-local-de-prueba'
  home = mkdtempSync(join(tmpdir(), 'fast-mode-org-status-'))
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
  setCachedPenguinModeOrgEnabled(undefined)
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

async function importFresh(): Promise<typeof import('../fastMode.js')> {
  return import(`../fastMode.js?t=${Date.now()}-${Math.random()}`)
}

describe('handleFastModeRejectedByAPI ($Oo)', () => {
  test('desde pending: deshabilita con source server, limpia settings y avisa', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const changes: boolean[] = []
    mod.onOrgFastModeChanged(enabled => changes.push(enabled))
    mod.handleFastModeRejectedByAPI()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'preference',
      source: 'server',
    })
    expect(changes).toEqual([false])
  })

  test('ya deshabilitado por el servidor, razón durable: no-op', async () => {
    const mod = await importFresh()
    mod._setFastModeOrgStatusForTesting({ status: 'disabled', reason: 'free', source: 'server' })
    const changes: boolean[] = []
    mod.onOrgFastModeChanged(enabled => changes.push(enabled))
    mod.handleFastModeRejectedByAPI()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'free',
      source: 'server',
    })
    expect(changes).toEqual([])
  })

  test('ya deshabilitado por el servidor, razón transitoria: sí se pisa', async () => {
    const mod = await importFresh()
    mod._setFastModeOrgStatusForTesting({ status: 'disabled', reason: 'network_error', source: 'server' })
    mod.handleFastModeRejectedByAPI()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'preference',
      source: 'server',
    })
  })

  test('deshabilitado por una adivinanza (sin source server): sí se pisa aunque la razón no sea transitoria', async () => {
    const mod = await importFresh()
    mod._setFastModeOrgStatusForTesting({ status: 'disabled', reason: 'preference' })
    mod.handleFastModeRejectedByAPI()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'preference',
      source: 'server',
    })
  })
})

describe('getOverageDisabledMessage / handleFastModeOverageRejection (lC, $dn, UOo)', () => {
  test('la redacción de 2.1.283 dice "usage credits", no "extra usage"', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const messages: string[] = []
    mod.onFastModeOverageRejection(message => messages.push(message))
    mod.handleFastModeOverageRejection('out_of_credits')
    expect(messages).toEqual(['Fast mode disabled · usage credits exhausted'])
  })

  test('org_spend_cap_reached es una razón de "sin crédito" nueva en 2.1.283', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const messages: string[] = []
    mod.onFastModeOverageRejection(message => messages.push(message))
    mod.handleFastModeOverageRejection('org_spend_cap_reached')
    expect(messages).toEqual(['Fast mode disabled · usage credit limit reached'])
    // No deshabilita permanentemente: es "sin crédito", no "sin permiso".
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'pending' })
  })

  test('overage_not_provisioned reusa extraUsageDisabledMessage (Wg)', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const messages: string[] = []
    mod.onFastModeOverageRejection(message => messages.push(message))
    mod.handleFastModeOverageRejection('overage_not_provisioned')
    expect(messages).toEqual(['Fast mode requires usage credits'])
  })

  test('sin crédito: no toca settings ni orgStatus, sólo notifica', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    mod.handleFastModeOverageRejection('out_of_credits')
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'pending' })
  })

  test('sin crédito: el aviso se suprime si ya se dio este turno, y rearmFastModeCreditsExhaustedNotice lo reabre', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const messages: string[] = []
    mod.onFastModeOverageRejection(message => messages.push(message))
    mod.handleFastModeOverageRejection('out_of_credits')
    mod.handleFastModeOverageRejection('org_level_disabled_until')
    expect(messages).toEqual(['Fast mode disabled · usage credits exhausted'])
    mod.rearmFastModeCreditsExhaustedNotice()
    mod.handleFastModeOverageRejection('out_of_credits')
    expect(messages).toEqual([
      'Fast mode disabled · usage credits exhausted',
      'Fast mode disabled · usage credits exhausted',
    ])
  })

  test('con permiso (no out-of-credits): deshabilita de forma durable con source server', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const changes: boolean[] = []
    mod.onOrgFastModeChanged(enabled => changes.push(enabled))
    mod.handleFastModeOverageRejection('org_level_disabled')
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'extra_usage_disabled',
      source: 'server',
    })
    expect(changes).toEqual([false])
  })
})

describe('resolveFastModeStatusFromCache (lLr)', () => {
  test('pending y caché habilitada: enabled', async () => {
    setCachedPenguinModeOrgEnabled(true)
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    mod.resolveFastModeStatusFromCache()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'enabled' })
  })

  test('pending y sin caché: disabled/unknown, sin source', async () => {
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    mod.resolveFastModeStatusFromCache()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'disabled', reason: 'unknown' })
  })

  test('2.1.283 ya no exime a USER_TYPE=ant (medido: 0 hits en el chunk)', async () => {
    process.env.USER_TYPE = 'ant'
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    mod.resolveFastModeStatusFromCache()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'disabled', reason: 'unknown' })
  })

  test('ya no pending: no-op', async () => {
    const mod = await importFresh()
    mod._setFastModeOrgStatusForTesting({ status: 'enabled' })
    mod.resolveFastModeStatusFromCache()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'enabled' })
  })
})

describe('prefetchFastModeStatus — la lectura del endpoint y el catch de red', () => {
  afterEach(() => {
    mock.restore()
  })

  test('éxito: source server y razón normalizada contra el conjunto conocido', async () => {
    mock.module('axios', () => ({
      default: {
        get: async () => ({ data: { enabled: false, disabled_reason: 'not-a-known-reason' } }),
        isAxiosError: () => false,
      },
    }))
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    await mod.prefetchFastModeStatus()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'unknown',
      source: 'server',
    })
  })

  test('éxito con enabled=true: sin source (sólo aplica al deshabilitado)', async () => {
    mock.module('axios', () => ({
      default: {
        get: async () => ({ data: { enabled: true, disabled_reason: null } }),
        isAxiosError: () => false,
      },
    }))
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    await mod.prefetchFastModeStatus()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({ status: 'enabled' })
  })

  test('dos éxitos con razones distintas: aunque siga disabled, la razón cambió y sí avisa (zl)', async () => {
    let disabledReason = 'free'
    mock.module('axios', () => ({
      default: {
        get: async () => ({ data: { enabled: false, disabled_reason: disabledReason } }),
        isAxiosError: () => false,
      },
    }))
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    const changes: boolean[] = []
    mod.onOrgFastModeChanged(enabled => changes.push(enabled))
    await mod.prefetchFastModeStatus()
    expect(changes).toEqual([])
    disabledReason = 'preference'
    mod._resetFastModeOrgStatusForTesting()
    mod._setFastModeOrgStatusForTesting({ status: 'disabled', reason: 'free', source: 'server' })
    await mod.prefetchFastModeStatus()
    expect(changes).toEqual([false])
  })

  test('catch de red: no pisa un disabled durable del servidor (guarda de origen)', async () => {
    mock.module('axios', () => ({
      default: {
        get: async () => {
          throw new Error('network down')
        },
        isAxiosError: () => false,
      },
    }))
    const mod = await importFresh()
    mod._setFastModeOrgStatusForTesting({ status: 'disabled', reason: 'free', source: 'server' })
    await mod.prefetchFastModeStatus()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'free',
      source: 'server',
    })
  })

  test('catch de red: sin disabled durable, cae a network_error', async () => {
    mock.module('axios', () => ({
      default: {
        get: async () => {
          throw new Error('network down')
        },
        isAxiosError: () => false,
      },
    }))
    const mod = await importFresh()
    mod._resetFastModeOrgStatusForTesting()
    await mod.prefetchFastModeStatus()
    expect(mod.processFastModeAvailabilityContext().orgStatus).toEqual({
      status: 'disabled',
      reason: 'network_error',
    })
  })
})
