/**
 * `getMemoryPath` decide dónde vive —y dónde se escribe— cada archivo de
 * instrucciones. La ranura es la misma que la del cargador: el archivo que ya
 * existe, o el nombre propio si no hay ninguno.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../index.js'
import { InMemoryConfig } from '../testing/index.js'
import { getMemoryPath } from '../global/config.js'

let base: string
function use(name: string): { cwd: string; home: string } {
  const cwd = join(base, name, 'project')
  const home = join(base, name, 'home')
  mkdirSync(cwd, { recursive: true })
  mkdirSync(home, { recursive: true })
  installConfigHostBindings(new InMemoryConfig({ cwd, configHomeDir: home }).bindings)
  return { cwd, home }
}

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'memory-path-')))
})
afterAll(() => rmSync(base, { recursive: true, force: true }))

describe('getMemoryPath', () => {
  test('sin archivos, los destinos llevan el nombre propio', () => {
    const { cwd, home } = use('vacio')
    expect(getMemoryPath('User')).toBe(join(home, 'THYROX.md'))
    expect(getMemoryPath('Project')).toBe(join(cwd, 'THYROX.md'))
    expect(getMemoryPath('Local')).toBe(join(cwd, 'THYROX.local.md'))
  })

  test('un usuario y un proyecto sin migrar conservan sus archivos heredados', () => {
    const { cwd, home } = use('heredado')
    writeFileSync(join(home, 'CLAUDE.md'), 'u')
    writeFileSync(join(cwd, 'CLAUDE.md'), 'p')
    writeFileSync(join(cwd, 'CLAUDE.local.md'), 'l')
    expect(getMemoryPath('User')).toBe(join(home, 'CLAUDE.md'))
    expect(getMemoryPath('Project')).toBe(join(cwd, 'CLAUDE.md'))
    expect(getMemoryPath('Local')).toBe(join(cwd, 'CLAUDE.local.md'))
  })
})
