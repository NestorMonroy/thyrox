import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// Se sustituyen los tres accesores de cuenta/suscripción ANTES de importar
// el módulo bajo prueba — mismo patrón que `extraUsage.test.ts`: se
// esparce el módulo real y sólo se pisan los símbolos que este archivo
// necesita controlar.
const realAuth = await import('../authAlias.js')

let oauthAccountInfoReturn: { billingType?: string; organizationRole?: string } | undefined
let subscriptionTypeReturn: string | null
let hasProfileScopeReturn: boolean

mock.module('../authAlias.js', () => ({
  ...realAuth,
  getOauthAccountInfo: () => oauthAccountInfoReturn,
  getSubscriptionType: () => subscriptionTypeReturn,
  hasProfileScope: () => hasProfileScopeReturn,
}))

const {
  isOrgAdminForUsageCredits,
  canSelfEnableUsageCredits,
  serverExtraUsageCommandOverride,
  isExtraUsageCommandAvailable,
  isSlashCommandUnavailable,
  usageCreditsCommandPath,
  usageCreditsLink,
  serverUsageCreditsAdminAction,
  usageCreditsAdminInstruction,
  usageCreditsInstruction,
} = await import('../extraUsageCredits.js')

const savedEnv = process.env.THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND

beforeEach(() => {
  oauthAccountInfoReturn = undefined
  subscriptionTypeReturn = null
  hasProfileScopeReturn = false
  delete process.env.THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND
})

afterEach(() => {
  if (savedEnv === undefined) delete process.env.THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND
  else process.env.THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND = savedEnv
})

const ownSessionAvailable = { isNonInteractiveHost: false, isOwnSessionWithoutChild: true, isHostSession: false }
const restrictedSession = { isNonInteractiveHost: true, isOwnSessionWithoutChild: true, isHostSession: false }

describe('isOrgAdminForUsageCredits — `dKn`', () => {
  test('sin cuenta oauth → false', () => {
    oauthAccountInfoReturn = undefined
    expect(isOrgAdminForUsageCredits()).toBe(false)
  })

  test('rol admin → true', () => {
    oauthAccountInfoReturn = { organizationRole: 'admin' }
    expect(isOrgAdminForUsageCredits()).toBe(true)
  })

  test.each(['billing', 'owner', 'primary_owner'])('rol %s → true', role => {
    oauthAccountInfoReturn = { organizationRole: role }
    expect(isOrgAdminForUsageCredits()).toBe(true)
  })

  test('rol fuera de la lista → false', () => {
    oauthAccountInfoReturn = { organizationRole: 'member' }
    expect(isOrgAdminForUsageCredits()).toBe(false)
  })
})

describe('canSelfEnableUsageCredits — `c2o`', () => {
  test('sin scope de perfil → false aunque el billing type sea válido', () => {
    hasProfileScopeReturn = false
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(canSelfEnableUsageCredits()).toBe(false)
  })

  test('sin billing type → false', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = {}
    expect(canSelfEnableUsageCredits()).toBe(false)
  })

  test('billing type fuera del conjunto de autoservicio → false', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'invoiced' }
    expect(canSelfEnableUsageCredits()).toBe(false)
  })

  test('billing type de autoservicio + scope de perfil → true', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(canSelfEnableUsageCredits()).toBe(true)
  })

  test('cada tipo del conjunto `aE` cuenta', () => {
    hasProfileScopeReturn = true
    for (const billingType of [
      'stripe_subscription',
      'stripe_subscription_contracted',
      'stripe_subscription_enterprise_self_serve',
      'aws_marketplace',
      'c4e_consumption_trial',
      'apple_subscription',
      'google_play_subscription',
    ]) {
      oauthAccountInfoReturn = { billingType }
      expect(canSelfEnableUsageCredits()).toBe(true)
    }
  })
})

describe('serverExtraUsageCommandOverride — `DC`', () => {
  test('siempre null en este binario', () => {
    expect(serverExtraUsageCommandOverride()).toBeNull()
  })
})

describe('isExtraUsageCommandAvailable — `Ex`', () => {
  test('con la variable de entorno puesta → false, aunque el resto habilite', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    process.env.THYROX_CODE_DISABLE_EXTRA_USAGE_COMMAND = '1'
    expect(isExtraUsageCommandAvailable()).toBe(false)
  })

  test('sin autoservicio y sin override del servidor → false', () => {
    hasProfileScopeReturn = false
    expect(isExtraUsageCommandAvailable()).toBe(false)
  })

  test('con autoservicio disponible → true', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(isExtraUsageCommandAvailable()).toBe(true)
  })
})

describe('isSlashCommandUnavailable — `hy`', () => {
  test('host no interactivo + sesión propia sin hija + sin bandera claudecode → true', () => {
    expect(isSlashCommandUnavailable(restrictedSession)).toBe(true)
  })

  test('host interactivo → false', () => {
    expect(isSlashCommandUnavailable(ownSessionAvailable)).toBe(false)
  })

  test('con bandera claudecode → false aunque el resto sea true', () => {
    expect(isSlashCommandUnavailable({ ...restrictedSession, isHostSession: true })).toBe(false)
  })

  test('sin sesión propia (hija o entorno fuera de lista) → false', () => {
    expect(isSlashCommandUnavailable({ ...restrictedSession, isOwnSessionWithoutChild: false })).toBe(false)
  })
})

describe('usageCreditsCommandPath — `M5`', () => {
  test('orden de barra disponible → devuelve la ruta', () => {
    expect(usageCreditsCommandPath('usage-credits', ownSessionAvailable)).toBe('/usage-credits')
  })

  test('orden de barra no disponible → undefined', () => {
    expect(usageCreditsCommandPath('usage-credits', restrictedSession)).toBeUndefined()
  })
})

describe('usageCreditsLink — `_6e`', () => {
  test('créditos no disponibles → undefined, sin importar la sesión', () => {
    hasProfileScopeReturn = false
    expect(usageCreditsLink(ownSessionAvailable)).toBeUndefined()
  })

  test('créditos disponibles + sesión con orden de barra → la ruta', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(usageCreditsLink(ownSessionAvailable)).toBe('/usage-credits')
  })

  test('créditos disponibles + sesión restringida → undefined', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(usageCreditsLink(restrictedSession)).toBeUndefined()
  })
})

describe('serverUsageCreditsAdminAction — `nqn`', () => {
  test('siempre null en este binario', () => {
    expect(serverUsageCreditsAdminAction()).toBeNull()
  })
})

describe('usageCreditsAdminInstruction — `Run`', () => {
  test('sin restricción de orden de barra → siempre la url de reserva', () => {
    subscriptionTypeReturn = 'team'
    expect(usageCreditsAdminInstruction(ownSessionAvailable)).toBe(
      'turn on usage credits at claude.ai/settings/usage?from=cc_cli_limit_message',
    )
  })

  test('restringida + suscripción personal (no team/enterprise) → la url de reserva', () => {
    subscriptionTypeReturn = 'pro'
    expect(usageCreditsAdminInstruction(restrictedSession)).toBe(
      'turn on usage credits at claude.ai/settings/usage?from=cc_cli_limit_message',
    )
  })

  test('restringida + team + admin con scope de perfil → url del panel', () => {
    subscriptionTypeReturn = 'team'
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { organizationRole: 'owner' }
    expect(usageCreditsAdminInstruction(restrictedSession)).toBe('turn on usage credits at claude.ai/admin-settings/usage')
  })

  test('restringida + enterprise + sin scope de perfil → pedir al admin', () => {
    subscriptionTypeReturn = 'enterprise'
    hasProfileScopeReturn = false
    oauthAccountInfoReturn = { organizationRole: 'owner' }
    expect(usageCreditsAdminInstruction(restrictedSession)).toBe('ask your admin to turn on usage credits')
  })

  test('restringida + team + rol fuera de la lista → pedir al admin', () => {
    subscriptionTypeReturn = 'team'
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { organizationRole: 'member' }
    expect(usageCreditsAdminInstruction(restrictedSession)).toBe('ask your admin to turn on usage credits')
  })
})

describe('usageCreditsInstruction — `hy() && Ex() ? Run() : undefined`', () => {
  test('orden de barra disponible (no restringida) → undefined', () => {
    subscriptionTypeReturn = 'team'
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    expect(usageCreditsInstruction(ownSessionAvailable)).toBeUndefined()
  })

  test('restringida pero créditos no disponibles (`Ex` falso) → undefined', () => {
    hasProfileScopeReturn = false
    subscriptionTypeReturn = 'team'
    expect(usageCreditsInstruction(restrictedSession)).toBeUndefined()
  })

  test('restringida + créditos disponibles → la instrucción de `Run`', () => {
    hasProfileScopeReturn = true
    oauthAccountInfoReturn = { billingType: 'stripe_subscription' }
    subscriptionTypeReturn = 'pro'
    expect(usageCreditsInstruction(restrictedSession)).toBe(
      'turn on usage credits at claude.ai/settings/usage?from=cc_cli_limit_message',
    )
  })
})
