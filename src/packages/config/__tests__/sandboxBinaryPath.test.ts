// Contrato de `Ysn`/`Nvo` del binario 2.1.281: `sandbox.bwrapPath` y
// `sandbox.socatPath` sólo se honran desde user, managed/policy o `--settings`
// (descripción del propio esquema); project y local los controla el repositorio
// y se ignoran. Gana el primero no nulo, con policy por delante.
import { describe, expect, test } from 'bun:test'
import { getSandboxBinaryPath } from '../settings/settings.ts'

type Sources = Record<string, { sandbox?: { bwrapPath?: string; socatPath?: string } } | null>
const reader = (sources: Sources) => (source: string) => sources[source] ?? null

describe('getSandboxBinaryPath', () => {
  test('sin la clave en ninguna fuente devuelve undefined', () => {
    expect(getSandboxBinaryPath('bwrapPath', reader({}))).toBeUndefined()
  })
  test('project y local se ignoran', () => {
    const r = reader({
      projectSettings: { sandbox: { bwrapPath: '/repo/bwrap' } },
      localSettings: { sandbox: { socatPath: '/repo/socat' } },
    })
    expect(getSandboxBinaryPath('bwrapPath', r)).toBeUndefined()
    expect(getSandboxBinaryPath('socatPath', r)).toBeUndefined()
  })
  test('user se honra', () => {
    const r = reader({ userSettings: { sandbox: { socatPath: '/u/socat' } } })
    expect(getSandboxBinaryPath('socatPath', r)).toBe('/u/socat')
  })
  test('policy gana sobre flag y user', () => {
    const r = reader({
      userSettings: { sandbox: { bwrapPath: '/u/bwrap' } },
      flagSettings: { sandbox: { bwrapPath: '/f/bwrap' } },
      policySettings: { sandbox: { bwrapPath: '/p/bwrap' } },
    })
    expect(getSandboxBinaryPath('bwrapPath', r)).toBe('/p/bwrap')
  })
})
