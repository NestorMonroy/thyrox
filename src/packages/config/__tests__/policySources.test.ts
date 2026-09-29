/**
 * La lectura de cada fuente administrada de `policySettings` — porte de
 * `Qq` (remota), `Os` (MDM) y `njr` (el archivo y su directorio de
 * fragmentos) de `chunk-379zyrv7.js` en el ejecutable 2.1.283 (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`). La remota y la
 * MDM se inyectan; el archivo se lee de un directorio temporal real.
 *
 * Los casos del rescate campo a campo (`os`/`Ho`/`Ed`, en
 * `./policyFieldRescue.ts`) están aquí y no en `policyFieldRescue.test.ts`
 * porque lo que este archivo prueba es su EFECTO en `readPolicyDocument`/
 * `readFilePolicy`: que un campo roto no tira el documento, que una puerta
 * sustituida se ve en `documentHasPolicyContent`, y que el suelo (`pd`)
 * protege un valor real ya escrito por un fragmento anterior.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const S = (await import(
  process.env.POLICY_SOURCES_MODULE ?? '../settings/policySources.ts'
)) as typeof import('../settings/policySources.ts')

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function denied(): Error {
  return Object.assign(new Error('EACCES'), { code: 'EACCES' })
}
function managedDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'policy-sources-'))
  dirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), content)
  }
  return dir
}

describe('un documento de política (HRe)', () => {
  test('uno válido carga con su contenido de política', () => {
    const read = S.readPolicyDocument({ model: 'claude-sonnet-5' }, 'f')
    expect(read).toMatchObject({ settings: { model: 'claude-sonnet-5' }, errors: [], loadState: 'loaded', documentHasPolicyContent: true })
  })
  test('uno vacío carga sin settings ni contenido', () => {
    expect(S.readPolicyDocument({}, 'f')).toMatchObject({ settings: null, loadState: 'loaded', documentHasPolicyContent: false })
  })
  test('un campo inválido se rescata: el documento carga y el campo se descarta (os)', () => {
    const read = S.readPolicyDocument({ permissions: 'nope' }, 'f')
    expect(read.settings).toBeNull()
    // Antes de portar el rescate campo a campo, un campo roto invalidaba el
    // documento entero (`loadState: 'didNotLoad'`). Ahora el documento SÍ
    // carga — el campo roto sólo se descarta — y por eso cuenta como intento
    // de escribir política (`Ed`): un `permissions` inválido sigue siendo un
    // intento de fijar `permissions`, no un documento vacío.
    expect(read.loadState).toBe('loaded')
    expect(read.documentHasPolicyContent).toBe(true)
    expect(read.errors.length).toBeGreaterThan(0)
    expect(read.errors.every(error => error.file === 'f')).toBe(true)
    expect(read.errors[0]!.substituted).toBeUndefined()
  })
  test('un campo con puerta inválido se sustituye por su valor restrictivo (Zo)', () => {
    const read = S.readPolicyDocument({ allowManagedMcpServersOnly: 'nope' }, 'f')
    expect(read.settings).toEqual({ allowManagedMcpServersOnly: true })
    expect(read.loadState).toBe('loaded')
    expect(read.documentHasPolicyContent).toBe(true)
    expect(read.errors).toEqual([{
      file: 'f',
      path: 'allowManagedMcpServersOnly',
      message: '"allowManagedMcpServersOnly" was present but invalid; treating it as true (its restrictive value) until it is fixed.',
      substituted: true,
    }])
  })
  test('un "false" válido en una puerta "disable" es un no-op: se retira y no cuenta como política (Ho/Ed)', () => {
    const read = S.readPolicyDocument({ disableAutoMode: false }, 'f')
    expect(read.settings).toBeNull()
    expect(read.documentHasPolicyContent).toBe(false)
    expect(read.errors).toEqual([{
      file: 'f',
      path: 'disableAutoMode',
      message: '"disableAutoMode" was set to false; reading it as absent (the key\'s only value is "disable"). Remove the key instead.',
      removed: true,
    }])
  })
  test('cada lectura recibe su copia de la caché', () => {
    const document = { permissions: { allow: ['Read'] } }
    const first = S.readPolicyDocument(document, 'f')
    ;(first.settings!.permissions as { allow: string[] }).allow.push('Edit')
    first.errors.push({ file: 'f', path: 'x', message: 'm' })
    const second = S.readPolicyDocument(document, 'f')
    expect(second.settings).toEqual({ permissions: { allow: ['Read'] } })
    expect(second.errors).toEqual([])
  })
  test('el resultado es una copia: mutarlo no toca el documento', () => {
    const document = { permissions: { allow: ['Read'] } }
    const read = S.readPolicyDocument(document, 'f')
    ;(read.settings!.permissions as { allow: string[] }).allow.push('Edit')
    expect(document.permissions.allow).toEqual(['Read'])
  })
})

describe('la capa remota (Qq)', () => {
  test('sin caché remota no hay settings ni contenido', () => {
    expect(S.readRemotePolicy({ remote: () => null })).toEqual({ settings: null, errors: [], servedSnapshot: false, documentHasPolicyContent: false })
    expect(S.readRemotePolicy({ remote: () => ({}) }).settings).toBeNull()
  })
  test('la caché remota se valida con el nombre de su fuente', () => {
    const read = S.readRemotePolicy({ remote: () => ({ model: 'claude-sonnet-5' }) })
    expect(read).toMatchObject({ settings: { model: 'claude-sonnet-5' }, documentHasPolicyContent: true, servedSnapshot: false })
    const bad = S.readRemotePolicy({ remote: () => ({ permissions: 'nope' }) })
    expect(bad.errors[0]!.file).toBe('remote managed settings')
  })
})

describe('la capa MDM (Os)', () => {
  test('sin lector MDM la fuente está ausente', () => {
    expect(S.readMdmPolicy({})).toEqual({ settings: null, errors: [], documentHasPolicyContent: false, loadState: 'absent' })
  })
  test('unos settings vacíos quedan en null y cargados', () => {
    expect(S.readMdmPolicy({ mdm: () => ({ settings: {}, errors: [] }) })).toMatchObject({ settings: null, loadState: 'loaded', documentHasPolicyContent: false })
  })
  test('el fatal de wslInheritsWindowsSettings baja a aviso si la remota trae política', () => {
    const fatal = { file: 'plist', path: 'wslInheritsWindowsSettings', message: 'm', severity: 'fatal' as const }
    const mdm = () => ({ settings: { model: 'claude-sonnet-5' }, errors: [fatal] })
    expect(S.readMdmPolicy({ mdm, remote: () => ({ model: 'claude-opus-5' }) }).errors[0]!.severity).toBe('warning')
    expect(S.readMdmPolicy({ mdm, remote: () => null }).errors[0]!.severity).toBe('fatal')
  })
})

describe('el archivo administrado (njr)', () => {
  test('sin archivo ni directorio la fuente está ausente', () => {
    expect(S.readFilePolicy(managedDir({}))).toEqual({ settings: null, errors: [], documentHasPolicyContent: false, loadState: 'absent' })
  })
  test('los fragmentos se funden sobre la base en orden de nombre, y sólo los .json visibles', () => {
    const dir = managedDir({
      'managed-settings.json': JSON.stringify({ model: 'claude-fable-5', permissions: { allow: ['Read'] } }),
      'managed-settings.d/20-b.json': JSON.stringify({ model: 'claude-opus-4-8' }),
      'managed-settings.d/10-a.json': JSON.stringify({ model: 'claude-haiku-4-5', permissions: { allow: ['Edit', 'Read'] } }),
      'managed-settings.d/.hidden.json': JSON.stringify({ model: 'claude-fable-5-1', cleanupPeriodDays: 3 }),
      'managed-settings.d/notes.txt': 'x',
    })
    const read = S.readFilePolicy(dir)
    expect(read.settings).toEqual({ model: 'claude-opus-4-8', permissions: { allow: ['Read', 'Edit'] } })
    expect(read.loadState).toBe('loaded')
    expect(read.documentHasPolicyContent).toBe(true)
  })
  test('un fragmento ilegible deja la fuente sin cargar, para fallar cerrado', () => {
    const dir = managedDir({ 'managed-settings.json': JSON.stringify({ model: 'claude-sonnet-5' }), 'managed-settings.d/a.json': '{no json' })
    const read = S.readFilePolicy(dir)
    expect(read.loadState).toBe('didNotLoad')
    expect(read.settings).toEqual({ model: 'claude-sonnet-5' })
    expect(read.errors).toContainEqual({
      file: join(dir, 'managed-settings.d', 'a.json'),
      path: '',
      message: 'Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.',
      startupFatal: true,
    })
  })
  test('un documento que es JSON pero no objeto no se valida: se declara', () => {
    const dir = managedDir({ 'managed-settings.json': '[]' })
    expect(S.readFilePolicy(dir).errors).toEqual([{
      file: join(dir, 'managed-settings.json'),
      path: '',
      message: 'Managed settings document could not be parsed as a JSON object; none of its settings are in effect. Fix or remove it.',
      startupFatal: true,
    }])
  })
  test('los fragmentos se aplican en orden de nombre aunque el directorio los liste en otro', () => {
    const dir = managedDir({
      'managed-settings.d/10-a.json': JSON.stringify({ model: 'claude-haiku-4-5' }),
      'managed-settings.d/20-b.json': JSON.stringify({ model: 'claude-opus-4-8' }),
    })
    const reversed = { ...S.NODE_POLICY_FILES, listDirectory: (path: string) => S.NODE_POLICY_FILES.listDirectory(path).reverse() }
    expect(S.readFilePolicy(dir, reversed).settings).toEqual({ model: 'claude-opus-4-8' })
  })
  test('los mapas de servidores MCP administrados se funden por servidor, sin mezclar su contenido', () => {
    const dir = managedDir({
      'managed-settings.json': JSON.stringify({ managedMcpServers: { a: { command: 'x', args: ['1'] }, b: { command: 'y' } } }),
      'managed-settings.d/a.json': JSON.stringify({ managedMcpServers: { a: { command: 'z' } } }),
    })
    expect(S.readFilePolicy(dir).settings).toEqual({ managedMcpServers: { a: { command: 'z' }, b: { command: 'y' } } })
  })
  test('un archivo vacío carga sin aportar nada', () => {
    const read = S.readFilePolicy(managedDir({ 'managed-settings.json': '  ' }))
    expect(read).toMatchObject({ settings: null, loadState: 'loaded' })
  })
  test('un archivo que no se puede leer no carga y lo declara como fatal', () => {
    const dir = managedDir({ 'managed-settings.json': '{}' })
    const read = S.readFilePolicy(dir, { ...S.NODE_POLICY_FILES, readFile: () => { throw denied() } })
    expect(read.loadState).toBe('didNotLoad')
    expect(read.errors).toEqual([{ file: join(dir, 'managed-settings.json'), path: '', message: 'Settings file could not be read: EACCES', severity: 'fatal', errorClass: 'unreadable' }])
  })
  test('un directorio de fragmentos que no se puede leer se declara', () => {
    const dir = managedDir({ 'managed-settings.json': JSON.stringify({ model: 'claude-sonnet-5' }) })
    writeFileSync(join(dir, 'managed-settings.d'), 'no soy un directorio')
    expect(S.readFilePolicy(dir).loadState).toBe('loaded')
    const read = S.readFilePolicy(dir, { ...S.NODE_POLICY_FILES, listDirectory: () => { throw denied() } })
    expect(read.loadState).toBe('didNotLoad')
    expect(read.settings).toEqual({ model: 'claude-sonnet-5' })
    expect(read.errors[0]).toMatchObject({ file: join(dir, 'managed-settings.d'), severity: 'fatal', errorClass: 'unreadable' })
    expect(read.errors[0]!.message).toBe('Managed settings drop-in directory could not be read: EACCES')
  })
  test('un documento con sólo claves de control no aporta settings', () => {
    const read = S.readFilePolicy(managedDir({ 'managed-settings.json': JSON.stringify({ managedSourcesBehavior: 'merge' }) }))
    expect(read.settings).toBeNull()
    expect(read.loadState).toBe('loaded')
  })
  test('el suelo (pd): un sustituto no desplaza el valor real que ya escribió un fragmento anterior', () => {
    const dir = managedDir({
      'managed-settings.json': JSON.stringify({ allowManagedHooksOnly: false }),
      // Inválido: sin la puerta, este valor se sustituiría por `true` — el
      // más restrictivo — y pisaría el `false` real de arriba.
      'managed-settings.d/a.json': JSON.stringify({ allowManagedHooksOnly: 'nope' }),
    })
    const read = S.readFilePolicy(dir)
    expect(read.settings).toEqual({ allowManagedHooksOnly: false })
    expect(read.errors).toContainEqual({
      file: join(dir, 'managed-settings.d', 'a.json'),
      path: 'allowManagedHooksOnly',
      message: 'That substitute is not applied: "allowManagedHooksOnly" keeps the value an earlier managed-settings document of this folder wrote.',
      statusOnly: true,
    })
  })
  test('el suelo (pd): dos sustitutos seguidos en la misma ruta no se avisan entre sí', () => {
    const dir = managedDir({
      'managed-settings.d/10-a.json': JSON.stringify({ allowManagedHooksOnly: 'nope' }),
      'managed-settings.d/20-b.json': JSON.stringify({ allowManagedHooksOnly: 'tampoco' }),
    })
    const read = S.readFilePolicy(dir)
    expect(read.settings).toEqual({ allowManagedHooksOnly: true })
    expect(read.errors.filter(error => error.message.startsWith('That substitute is not applied'))).toEqual([])
  })
})
