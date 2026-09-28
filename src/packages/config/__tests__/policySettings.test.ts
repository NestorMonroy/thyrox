/**
 * La composición de `policySettings` — porte de `UP` y de sus consumidores
 * `Zy`, `Jy` y `Gy`, con `BL` (el asistente de política), `lft` (el padre) y
 * `aft` (la rama WSL), de `chunk-379zyrv7.js` en el ejecutable 2.1.283
 * (extracción en `.claude/workbench/policy-settings-port-20260927T083804/`).
 * Las fuentes se inyectan; el archivo se lee de un directorio temporal.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const U = (await import(
  process.env.POLICY_SETTINGS_MODULE ?? '../settings/policySettings.ts'
)) as typeof import('../settings/policySettings.ts')

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function managedDir(document?: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'policy-settings-'))
  dirs.push(dir)
  if (document) writeFileSync(join(dir, 'managed-settings.json'), JSON.stringify(document))
  return dir
}
const SONNET = 'claude-sonnet-5'
const OPUS = 'claude-opus-5'
function context(extra: Partial<Parameters<typeof U.composePolicySettings>[0]> = {}): Parameters<typeof U.composePolicySettings>[0] {
  return { platform: 'linux', remote: () => null, managedDirectory: managedDir(), store: U.createPolicyStore(), ...extra }
}

describe('sin fuentes', () => {
  test('no hay administrador ni escalones', () => {
    const composed = U.composePolicySettings(context())
    expect(composed).toMatchObject({ tiers: [], tierSources: [], admin: null, present: { remote: false, mdm: false, file: false }, heldEmpty: false, merged: false })
    expect(U.policySettingsDocument(context())).toBeNull()
  })
})

describe('qué fuente ata', () => {
  test('el archivo solo es el administrador', () => {
    const composed = U.composePolicySettings(context({ managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: SONNET })
    expect(composed.tierSources).toEqual(['file'])
    expect(composed.present.file).toBe(true)
  })
  test('la remota gana al archivo y, sin merge, el archivo no aporta', () => {
    const composed = U.composePolicySettings(context({ remote: () => ({ model: OPUS }), managedDirectory: managedDir({ model: SONNET, disableAllHooks: true }) }))
    expect(composed.admin).toEqual({ model: OPUS })
    expect(composed.tierSources).toEqual(['remote', 'file'])
    expect(composed.merged).toBe(false)
  })
  test('con merge en la fuente que ata, se funden y gana lo más restrictivo', () => {
    const composed = U.composePolicySettings(context({
      remote: () => ({ model: OPUS, managedSourcesBehavior: 'merge' }),
      managedDirectory: managedDir({ model: SONNET, disableAllHooks: true }),
    }))
    expect(composed.merged).toBe(true)
    expect(composed.mode).toBe('merge')
    expect(composed.admin).toEqual({ model: OPUS, disableAllHooks: true })
    expect(U.policyMergedSources(context({ remote: () => ({ model: OPUS, managedSourcesBehavior: 'merge' }), managedDirectory: managedDir({ disableAllHooks: true }) })))
      .toEqual(['remote', 'file'])
  })
  test('una fuente fundida que sólo trae claves del escalón superior no cuenta como aporte', () => {
    expect(U.policyMergedSources(context({ remote: () => ({ model: OPUS, managedSourcesBehavior: 'merge' }), managedDirectory: managedDir({ env: { A: '1' } }) })))
      .toEqual(['remote'])
  })
  test('sin fusión no hay fuentes fundidas', () => {
    expect(U.policyMergedSources(context({ managedDirectory: managedDir({ model: SONNET }) }))).toBeNull()
  })
  test('el modo de una fuente que no ata no decide si ata otra', () => {
    const composed = U.composePolicySettings(context({ remote: () => ({ model: OPUS }), managedDirectory: managedDir({ model: SONNET, managedSourcesBehavior: 'merge' }) }))
    expect(composed.mode).toBeUndefined()
  })
  test('una remota con sólo objetos vacíos no ata frente a un archivo con valores', () => {
    const composed = U.composePolicySettings(context({ remote: () => ({ permissions: {} }), managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: SONNET })
    expect(composed.tierSources).toEqual(['file', 'remote'])
    expect(composed.present.remote).toBe(false)
  })
  test('MDM gana al archivo y se nombra por plataforma', () => {
    const mdm = () => ({ settings: { model: OPUS }, errors: [] })
    const composed = U.composePolicySettings(context({ platform: 'macos', mdm, managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: OPUS })
    expect(composed.tierSources).toEqual(['plist', 'file'])
    expect(U.composePolicySettings(context({ platform: 'windows', mdm })).tierSources).toEqual(['hklm'])
  })
  test('una MDM de sólo sustitutos que no ata avisa que el archivo la suple', () => {
    const composed = U.composePolicySettings(context({
      platform: 'macos',
      mdm: () => ({ settings: { model: OPUS }, errors: [], onlySubstitutes: true }),
      managedDirectory: managedDir({ model: SONNET }),
    }))
    expect(composed.admin).toEqual({ model: SONNET })
    expect(composed.errors).toContainEqual({
      file: 'the managed preferences plist',
      path: 'model',
      message: 'the managed preferences plist holds only values that could not be applied as written, so managed-settings.json supplies the managed settings while that fail-closed reading still binds beside it (the most restrictive value of each such key applies), until it is fixed.',
      severity: 'warning',
      statusOnly: true,
    })
  })
  test('una fuente con contenido de política sin settings ata vacía', () => {
    const composed = U.composePolicySettings(context({ mdm: () => ({ settings: {}, errors: [], documentHasPolicyContent: true }) }))
    expect(composed.admin).toEqual({})
    expect(composed.heldEmpty).toBe(true)
    expect(composed.present.mdm).toBe(true)
  })
})

describe('el proceso padre (lft, J2o, Z2o)', () => {
  test('sin administrador, la porción del padre entra', () => {
    const composed = U.composePolicySettings(context({ parentManaged: { allowManagedHooksOnly: true, model: SONNET } }))
    expect(composed.parentSlice).toEqual({ allowManagedHooksOnly: true })
    expect(composed.parentIncluded).toBe(true)
    expect(U.policySettingsDocument(context({ parentManaged: { allowManagedHooksOnly: true } }))).toBeNull()
    expect(U.policyTierDocuments(context({ parentManaged: { allowManagedHooksOnly: true } }))).toEqual([{ allowManagedHooksOnly: true }])
  })
  test('un padre sin nada que restrinja no deja porción', () => {
    expect(U.composePolicySettings(context({ parentManaged: { model: SONNET } })).parentSlice).toBeNull()
  })
  test('con porción del padre y sin administrador, HKCU no se usa', () => {
    expect(U.policySettingsDocument(context({ parentManaged: { allowManagedHooksOnly: true }, hkcu: () => ({ settings: { model: SONNET } }) }))).toBeNull()
  })
  test('con un administrador autorado y el padre en first-wins, el padre queda fuera', () => {
    const composed = U.composePolicySettings(context({ managedDirectory: managedDir({ model: SONNET }), parentManaged: { allowManagedHooksOnly: true } }))
    expect(composed.parentIncluded).toBe(false)
    expect(composed.parentSlice).toBeNull()
  })
  test('parentSettingsBehavior merge lo incluye igual', () => {
    const composed = U.composePolicySettings(context({ managedDirectory: managedDir({ model: SONNET, parentSettingsBehavior: 'merge' }), parentManaged: { allowManagedHooksOnly: true } }))
    expect(composed.parentSlice).toEqual({ allowManagedHooksOnly: true })
  })
  test('el anfitrión que administra el gateway pone merge por defecto', () => {
    const composed = U.composePolicySettings(context({ managedDirectory: managedDir({ model: SONNET }), parentManaged: { allowManagedHooksOnly: true }, hostManagesGateway: () => true }))
    expect(composed.parentIncluded).toBe(true)
  })
  test('managedMcpServers del padre se avisa como ignorado', () => {
    const composed = U.composePolicySettings(context({ parentManaged: { managedMcpServers: { a: { command: 'x' } } } }))
    expect(composed.errors).toContainEqual({
      file: 'parent managed settings',
      path: 'managedMcpServers',
      message: '"managedMcpServers" is only honored from the organization\'s managed settings sources (server-managed, MDM, managed-settings.json), not from settings a host passes in, and was ignored here.',
      severity: 'warning',
      statusOnly: true,
    })
  })
  test('el modelo del padre sólo si el anfitrión administra el proveedor', () => {
    expect(U.composePolicySettings(context({ parentManaged: { model: SONNET }, hostManagedProvider: true })).hostModelOverlay).toEqual({ model: SONNET })
    expect(U.composePolicySettings(context({ parentManaged: { model: SONNET } })).hostModelOverlay).toBeNull()
  })
})

describe('el asistente de política (BL)', () => {
  test('armado desde la remota, ocupa la ranura remota', () => {
    const composed = U.composePolicySettings(context({ helper: () => ({ model: OPUS }), managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: OPUS })
    expect(composed.tierSources).toEqual(['remote', 'file'])
  })
  test('armado desde otra fuente, es un escalón propio y el documento es el suyo', () => {
    const helper = { model: OPUS }
    expect(U.policySettingsDocument(context({ helper: () => helper, helperArmedFromRemote: () => false }))).toBe(helper)
    expect(U.policyTierDocuments(context({ helper: () => helper, helperArmedFromRemote: () => false }))).toEqual([helper])
    expect(U.policyMergedSources(context({ helper: () => helper, helperArmedFromRemote: () => false }))).toBeNull()
  })
  test('como escalón propio, la composición no lo cuenta', () => {
    const composed = U.composePolicySettings(context({ helper: () => ({ model: OPUS }), helperArmedFromRemote: () => false, managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: SONNET })
  })
  test('si funde su salida, lo hace sobre la remota y lo recuerda en la sesión', () => {
    const store = U.createPolicyStore()
    let helper: Record<string, unknown> = { permissions: { allow: ['Edit'] }, env: { a: '2', B: '3' } }
    const ctx = context({ store, helperMergesOutput: () => true, helper: () => helper, remote: () => ({ permissions: { allow: ['Read'] }, env: { A: '1', c: '4', b: '5' }, policyHelper: { path: '/h' } }) })
    const slot = U.helperSlot(ctx) as { helper: unknown }
    expect(slot).toEqual({ composes: 'remoteSlot', mergedOver: 'remote', helper: { permissions: { allow: ['Edit', 'Read'] }, env: { A: '2', c: '4', b: '3', a: '2', B: '3' } } })
    helper = { model: OPUS }
    expect((U.helperSlot(ctx) as { helper: unknown }).helper).toEqual(slot.helper)
  })
  test('sin base con política, no dice sobre qué fundió', () => {
    const slot = U.helperSlot(context({ helperMergesOutput: () => true, helper: () => ({ model: OPUS }) })) as { mergedOver: unknown }
    expect(slot.mergedOver).toBeNull()
  })
})

describe('la rama WSL (aft)', () => {
  test('una MDM que ata deja fuera el archivo de Linux', () => {
    const composed = U.composePolicySettings(context({ platform: 'wsl', mdm: () => ({ settings: { model: OPUS }, errors: [] }), managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.tierSources).toEqual(['hklm'])
  })
  test('heredando de Windows, el archivo de Windows gana si trae política', () => {
    const composed = U.composePolicySettings(context({
      platform: 'wsl', wslInherits: () => true,
      windowsManagedDirectory: managedDir({ model: OPUS }), managedDirectory: managedDir({ model: SONNET }),
    }))
    expect(composed.admin).toEqual({ model: OPUS })
  })
  test('heredando sin archivo de Windows, cae al de Linux', () => {
    const composed = U.composePolicySettings(context({ platform: 'wsl', wslInherits: () => true, windowsManagedDirectory: managedDir(), managedDirectory: managedDir({ model: SONNET }) }))
    expect(composed.admin).toEqual({ model: SONNET })
  })
})

describe('HKCU como último recurso (Zy)', () => {
  test('sin administrador ni padre, HKCU con contenido', () => {
    expect(U.policySettingsDocument(context({ hkcu: () => ({ settings: { model: SONNET } }) }))).toEqual({ model: SONNET })
    expect(U.policySettingsDocument(context({ hkcu: () => ({ settings: {} }) }))).toBeNull()
  })
})

describe('rutas de Windows vistas desde WSL', () => {
  test('la unidad pasa a /mnt/<letra> y las barras se invierten', () => {
    expect(U.wslMountOf('C:\\Program Files\\Tool')).toBe('/mnt/c/Program Files/Tool')
  })
})
