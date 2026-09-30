/**
 * Las piezas puras de la composición de `policySettings` — porte de las
 * funciones auxiliares de `UP` en `chunk-379zyrv7.js` del ejecutable 2.1.283
 * (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/symbol-UP-helpers.txt`
 * y `symbol-UP-level2.txt`). Cada caso nombra el símbolo que ejerce.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const P = (await import(
  process.env.POLICY_COMPOSITION_MODULE ?? '../settings/policyComposition.ts'
)) as typeof import('../settings/policyComposition.ts')

describe('claves y valores de política (cft, Lt, ggn, _s)', () => {
  test('las claves de control no cuentan como política', () => {
    expect(P.hasPolicyKeys({ managedSourcesBehavior: 'merge', wslInheritsWindowsSettings: true })).toBe(false)
    expect(P.hasPolicyKeys({ model: 'x' })).toBe(true)
  })
  test('un árbol de objetos vacíos no es un valor de política', () => {
    expect(P.hasPolicyValues({ permissions: {} })).toBe(false)
    expect(P.hasPolicyValues({ sandbox: { network: {} } })).toBe(false)
    expect(P.hasPolicyValues({ managedSourcesBehavior: 'merge' })).toBe(false)
    expect(P.hasPolicyValues({ sandbox: { network: { allowedDomains: [] } } })).toBe(true)
    expect(P.hasPolicyValues({ model: 'x' })).toBe(true)
  })
  test('la política se conserva sólo si trae claves de política', () => {
    expect(P.policyOrNull(null)).toBeNull()
    expect(P.policyOrNull({ managedSourcesBehavior: 'merge' })).toBeNull()
    const settings = { model: 'x' }
    expect(P.policyOrNull(settings)).toBe(settings)
  })
})

describe('resultados de lectura (mUe, bs, gUe, WUt, Yye, dft)', () => {
  test('una lectura es autorada si trae valores y no sólo sustitutos', () => {
    expect(P.isAuthoredPolicy({ settings: { model: 'x' } })).toBe(true)
    expect(P.isAuthoredPolicy({ settings: { model: 'x' }, onlySubstitutes: true })).toBe(false)
    expect(P.isAuthoredPolicy({ settings: { permissions: {} } })).toBe(false)
    expect(P.isAuthoredPolicy({ settings: null })).toBe(false)
  })
  test('el rango ordena ausente, vacía, con valores y autorada', () => {
    expect(P.policyRank(null, true)).toBe(-1)
    expect(P.policyRank({ permissions: {} }, false)).toBe(0)
    expect(P.policyRank({ model: 'x' }, false)).toBe(1)
    expect(P.policyRank({ permissions: {} }, true)).toBe(2)
  })
  test('el contenido de política declarado gana sobre el inferido', () => {
    expect(P.documentHasPolicyContent({ settings: null, documentHasPolicyContent: true })).toBe(true)
    expect(P.documentHasPolicyContent({ settings: { model: 'x' }, documentHasPolicyContent: false })).toBe(false)
    expect(P.documentHasPolicyContent({ settings: { model: 'x' } })).toBe(true)
    expect(P.documentHasPolicyContent({ settings: { managedSourcesBehavior: 'merge' } })).toBe(false)
  })
  test('el estado de carga declarado gana; si no, sale de los settings', () => {
    expect(P.loadStateOf({ settings: null, loadState: 'didNotLoad' })).toBe('didNotLoad')
    expect(P.loadStateOf({ settings: {} })).toBe('loaded')
    expect(P.loadStateOf({ settings: null })).toBe('absent')
  })
  test('al combinar, «no cargó» domina y «cargado» gana a «ausente»', () => {
    expect(P.combineLoadState('loaded', 'didNotLoad')).toBe('didNotLoad')
    expect(P.combineLoadState('didNotLoad', 'absent')).toBe('didNotLoad')
    expect(P.combineLoadState('absent', 'loaded')).toBe('loaded')
    expect(P.combineLoadState('absent', 'absent')).toBe('absent')
  })
  test('una fuente ata como administrada si no es del usuario y trae política o no cargó', () => {
    expect(P.bindsAsAdminSource({ settings: { model: 'x' } })).toBe(true)
    expect(P.bindsAsAdminSource({ settings: null, loadState: 'didNotLoad' })).toBe(true)
    expect(P.bindsAsAdminSource({ settings: { model: 'x' }, userWritable: true })).toBe(false)
    expect(P.bindsAsAdminSource({ settings: null })).toBe(false)
  })
})

describe('servidores MCP administrados (uUe, h8e)', () => {
  test('cualquier escalón que exija sólo servidores administrados lo exige', () => {
    expect(P.requiresManagedMcpServersOnly({ slot: null, adminTiers: [{}, { allowManagedMcpServersOnly: true }] })).toBe(true)
    expect(P.requiresManagedMcpServersOnly({ slot: { allowManagedMcpServersOnly: true }, adminTiers: [] })).toBe(true)
    expect(P.requiresManagedMcpServersOnly({ slot: {}, adminTiers: [{}] })).toBe(false)
  })
  test('la lista sale de la ranura o, si no, del primer escalón que la declara', () => {
    const slotList = [{ serverName: 'a' }]
    const tierList = [{ serverName: 'b' }]
    expect(P.managedAllowedMcpServers({ slot: { allowedMcpServers: slotList }, adminTiers: [{ allowedMcpServers: tierList }] })).toBe(slotList)
    expect(P.managedAllowedMcpServers({ slot: null, adminTiers: [{}, { allowedMcpServers: tierList }] })).toBe(tierList)
    expect(P.managedAllowedMcpServers({ slot: null, adminTiers: [{}] })).toBeUndefined()
  })
})

describe('capa de modelo del anfitrión (Z2o)', () => {
  test('sin proveedor del anfitrión o sin ajustes del padre, no hay capa', () => {
    expect(P.hostModelOverlay({ model: 'x' }, false)).toBeNull()
    expect(P.hostModelOverlay(null, true)).toBeNull()
  })
  test('copia sólo las claves de modelo que el padre declara', () => {
    expect(P.hostModelOverlay({ model: 'x', fallbackModel: 'y', permissions: { allow: [] } }, true)).toEqual({ model: 'x', fallbackModel: 'y' })
    expect(P.hostModelOverlay({ deniedModels: [] }, true)).toBeNull()
    expect(P.hostModelOverlay({ deniedModels: ['m'] }, true)).toEqual({ deniedModels: ['m'] })
  })
  test('availableModelsMatch viaja si es exact o si acompaña a availableModels', () => {
    expect(P.hostModelOverlay({ availableModelsMatch: 'exact' }, true)).toEqual({ availableModelsMatch: 'exact' })
    expect(P.hostModelOverlay({ availableModelsMatch: 'prefix' }, true)).toBeNull()
    expect(P.hostModelOverlay({ availableModelsMatch: 'prefix', availableModels: ['a'] }, true)).toEqual({ availableModels: ['a'], availableModelsMatch: 'prefix' })
  })
})

describe('rutas en objetos (Ee, Ve)', () => {
  test('lee una ruta y da undefined si se corta', () => {
    expect(P.getAtPath({ a: { b: 1 } }, ['a', 'b'])).toBe(1)
    expect(P.getAtPath({ a: 1 }, ['a', 'b'])).toBeUndefined()
    expect(P.getAtPath(null, ['a'])).toBeUndefined()
  })
  test('escribe copiando cada nivel sin tocar el objeto compartido', () => {
    const shared = { b: 1 }
    const target: Record<string, unknown> = { a: shared }
    P.setAtPath(target, ['a', 'c'], 2)
    expect(target).toEqual({ a: { b: 1, c: 2 } })
    expect(shared).toEqual({ b: 1 })
  })
  test('borrar deja de pie sólo los padres que aún tienen algo', () => {
    const target: Record<string, unknown> = { a: { b: { c: 1 } }, d: 1 }
    P.setAtPath(target, ['a', 'b', 'c'], undefined)
    expect(target).toEqual({ d: 1 })
    const kept: Record<string, unknown> = { a: { b: { c: 1 }, e: 2 } }
    P.setAtPath(kept, ['a', 'b', 'c'], undefined)
    expect(kept).toEqual({ a: { e: 2 } })
  })
})

describe('herencia de modelOverrides (Ky)', () => {
  test('viaja desde el primer escalón que la declara si no hay availableModels antes', () => {
    const target: Record<string, unknown> = {}
    P.inheritModelOverrides(target, [{}, { modelOverrides: { a: 'b' } }], false)
    expect(target).toEqual({ modelOverrides: { a: 'b' } })
  })
  test('un availableModels anterior la retira', () => {
    const target: Record<string, unknown> = { modelOverrides: { x: 'y' } }
    P.inheritModelOverrides(target, [{ availableModels: [] }, { modelOverrides: { a: 'b' } }], false)
    expect(target).toEqual({})
  })
  test('con la instantánea primero, un availableModels en el escalón 0 no la retira', () => {
    const target: Record<string, unknown> = {}
    P.inheritModelOverrides(target, [{ availableModels: [] }, { modelOverrides: { a: 'b' } }], true)
    expect(target).toEqual({ modelOverrides: { a: 'b' } })
  })
})

describe('el error fatal de wslInheritsWindowsSettings (fd, B5n)', () => {
  const fatal = { file: 'f', path: 'wslInheritsWindowsSettings', message: 'm', severity: 'fatal' as const }
  const other = { file: 'f', path: 'x', message: 'm', severity: 'error' as const }
  test('baja a aviso si la capa remota trae política autorada', () => {
    const errors = P.downgradeWslInheritErrors([fatal, other], () => ({ settings: { model: 'x' } }))
    expect(errors).toEqual([{ ...fatal, severity: 'warning' }, other])
  })
  test('queda fatal si la capa remota no la trae, y la remota no se lee sin fatales', () => {
    expect(P.downgradeWslInheritErrors([fatal], () => ({ settings: null }))).toEqual([fatal])
    let read = false
    P.downgradeWslInheritErrors([other], () => { read = true; return { settings: null } })
    expect(read).toBe(false)
  })
})

describe('listas de permitidos del escalón administrado (By)', () => {
  test('se retiran del escalón las listas que otro escalón declara', () => {
    const tier = { allowedMcpServers: [{ serverName: 'a' }], availableModels: ['m'], model: 'x' }
    expect(P.withoutShadowedAllowlists(tier, true, [{ availableModels: ['n'] }, null])).toEqual({ allowedMcpServers: [{ serverName: 'a' }], model: 'x' })
  })
  test('sin instantánea primero, o sin escalón, queda tal cual', () => {
    const tier = { availableModels: ['m'] }
    expect(P.withoutShadowedAllowlists(tier, false, [{ availableModels: ['n'] }])).toBe(tier)
    expect(P.withoutShadowedAllowlists(null, true, [{ availableModels: ['n'] }])).toBeNull()
    expect(P.withoutShadowedAllowlists(tier, true, [{ model: 'y' }])).toBe(tier)
  })
})

describe('constantes', () => {
  test('las etiquetas de fuente son las del ejecutable', () => {
    expect(P.SOURCE_LABELS).toEqual({ remote: 'server-managed settings', plist: 'the managed preferences plist', hklm: 'the HKLM policy key', file: 'managed-settings.json' })
    expect(P.POLICY_HELPER_KEYS).toEqual(['policyHelper', 'policyHelpers'])
    expect(P.SLOT_FALLBACK_KEYS).toEqual(['allowedMcpServers', 'availableModels', 'strictKnownMarketplaces'])
  })
})

describe('los pares AWS suprimidos (Pd)', () => {
  test('cada variable AWS que abajo se nombra y arriba no, se suprime con un par propio', () => {
    expect(P.suppressedAwsPairs([{ accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: 'AWS_SECRET_ACCESS_KEY' }, { accessKeyIdVar: 'MY_KEY' }], []))
      .toEqual([
        { accessKeyIdVar: 'AWS_ACCESS_KEY_ID', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_1_' },
        { accessKeyIdVar: 'AWS_SECRET_ACCESS_KEY', secretAccessKeyVar: '_PARENT_PAIR_SUPPRESSOR_2_' },
      ])
  })
  test('las que arriba ya se nombran no se suprimen', () => {
    expect(P.suppressedAwsPairs([{ sessionTokenVar: 'AWS_SESSION_TOKEN' }], [{ sessionTokenVar: 'AWS_SESSION_TOKEN' }])).toEqual([])
  })
})
