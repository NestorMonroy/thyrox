// Contrato de `BP` del binario 2.1.275 (`chunk-v49f6nqy.js`): las reglas del
// clasificador de auto mode salen SOLO de user, flag y policy settings — los
// dos origenes que el repositorio controla (project y local) se ignoran, con
// un aviso una sola vez.
import { beforeEach, describe, expect, test } from 'bun:test'
import { installConfigHostBindings } from '../host.ts'
import {
  _resetAutoModeWarningForTesting,
  getAutoModeConfig,
} from '../settings/settings.ts'

type Sources = Record<string, { autoMode?: unknown } | null>
const reader = (sources: Sources) => (source: string) => sources[source] ?? null

let logged: string[] = []
beforeEach(() => {
  logged = []
  installConfigHostBindings({ logDebug: (m: string) => { logged.push(m) } })
  _resetAutoModeWarningForTesting()
})

describe('getAutoModeConfig', () => {
  test('sin reglas en ninguna fuente devuelve undefined', () => {
    expect(getAutoModeConfig(reader({}))).toBeUndefined()
  })

  test('concatena user, flag y policy en ese orden, por seccion', () => {
    const config = getAutoModeConfig(reader({
      userSettings: { autoMode: { allow: ['u1'], environment: ['e1'] } },
      flagSettings: { autoMode: { allow: ['f1'], soft_deny: ['s1'] } },
      policySettings: { autoMode: { hard_deny: ['h1'] } },
    }))
    expect(config).toEqual({
      allow: ['u1', 'f1'], soft_deny: ['s1'], hard_deny: ['h1'], environment: ['e1'],
    })
  })

  test('project y local no aportan reglas: el repositorio no se autoriza a si mismo', () => {
    const config = getAutoModeConfig(reader({
      projectSettings: { autoMode: { allow: ['p1'] } },
      localSettings: { autoMode: { allow: ['l1'] } },
    }))
    expect(config).toBeUndefined()
  })

  test('avisa UNA vez si project o local traen reglas', () => {
    const r = reader({ projectSettings: { autoMode: { allow: ['p1'] } } })
    getAutoModeConfig(r)
    getAutoModeConfig(r)
    expect(logged.filter(m => m.includes('ignored')).length).toBe(1)
  })

  test('un autoMode con forma invalida se salta', () => {
    const config = getAutoModeConfig(reader({
      userSettings: { autoMode: { allow: 'no-es-lista' } },
      policySettings: { autoMode: { allow: ['ok'] } },
    }))
    expect(config).toEqual({ allow: ['ok'] })
  })
})
