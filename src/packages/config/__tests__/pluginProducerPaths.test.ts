/**
 * Las rutas productoras de comandos de un plugin instalado
 * (`sourceProducerPath`, `previousProducerPaths` de `installed_plugins.json`,
 * ≙ `Ue`/`U7n` de 2.1.275): el esquema las admite y el registro las lee del
 * disco sin que una entrada mal formada rompa el resto.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CommandProducerEntrySchema, PluginInstallationEntrySchema } from '../plugin/schemas.js'
import { collectCommandProducerPaths } from '../plugin/installedPluginsManager.js'

let base: string
beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'producer-paths-'))
})
afterAll(() => {
  rmSync(base, { recursive: true, force: true })
})

function writeInstalledPlugins(dir: string, entries: unknown[]): string {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'tool@market': entries } }))
  return dir
}

describe('PluginInstallationEntrySchema', () => {
  test('admite las dos claves productoras y filtra lo que no es string', () => {
    const parsed = PluginInstallationEntrySchema().safeParse({
      scope: 'user',
      installPath: '/cache/tool/1.0.0',
      sourceProducerPath: '/producers/current',
      previousProducerPaths: ['/producers/old', 7, null],
    })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.sourceProducerPath).toBe('/producers/current')
    expect(parsed.data?.previousProducerPaths).toEqual(['/producers/old'])
  })
  test('una entrada sin claves productoras sigue siendo válida', () => {
    const parsed = PluginInstallationEntrySchema().safeParse({ scope: 'user', installPath: '/cache/tool/1.0.0' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.sourceProducerPath).toBeUndefined()
  })
})

describe('CommandProducerEntrySchema (Ue)', () => {
  test('conserva las claves ajenas y descarta un productor que no es string', () => {
    const parsed = CommandProducerEntrySchema().safeParse({
      scope: 'user',
      sourceProducerPath: 42,
      previousProducerPaths: ['/producers/old'],
    })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.sourceProducerPath).toBeUndefined()
    expect(parsed.data?.previousProducerPaths).toEqual(['/producers/old'])
    expect(parsed.data?.scope).toBe('user')
  })
})

describe('collectCommandProducerPaths (U7n)', () => {
  test('devuelve la ruta actual y las anteriores, absolutas y sin repetir', () => {
    const dir = writeInstalledPlugins(join(base, 'plugins-a'), [
      { scope: 'user', installPath: '/x', sourceProducerPath: '/producers/current', previousProducerPaths: ['/producers/old', '/producers/current', 'relative/one', 3] },
    ])
    expect(collectCommandProducerPaths([dir]).sort()).toEqual(['/producers/current', '/producers/old'])
  })
  test('un directorio sin archivo, o con JSON roto, aporta nada y no lanza', () => {
    const broken = join(base, 'plugins-broken')
    mkdirSync(broken, { recursive: true })
    writeFileSync(join(broken, 'installed_plugins.json'), '{not json')
    expect(collectCommandProducerPaths([join(base, 'no-such'), broken])).toEqual([])
  })
  test('una entrada que no parsea se salta sin perder las demás', () => {
    const dir = writeInstalledPlugins(join(base, 'plugins-b'), ['not-an-object', { sourceProducerPath: '/producers/b' }])
    expect(collectCommandProducerPaths([dir])).toEqual(['/producers/b'])
  })
})
