/**
 * El archivo de instrucciones migra a `THYROX.md` (decisión del ejecutor
 * 2026-09-27, «Migrar a .thyrox»). En cada ranura se lee el nombre propio y,
 * si no existe, el heredado: un proyecto que sólo tiene `CLAUDE.md` sigue
 * cargándolo, y uno que tiene los dos carga sólo el propio.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { getOriginalCwd, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'
import { resetSettingsCache } from '@thyrox/config/settings/settingsCache.js'
import {
  getMemoryFiles,
  getMemoryFilesForNestedDirectory,
  isMemoryFilePath,
  resetGetMemoryFilesCache,
} from '../claudemd.js'

let base: string
let previousCwd: string
let previousConfigDir: string | undefined

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

async function loadedUnder(root: string): Promise<Array<[string, string]>> {
  resetGetMemoryFilesCache('test')
  const files = await getMemoryFiles()
  return files.filter(f => f.path.startsWith(root)).map(f => [f.path.slice(root.length + 1), f.type])
}

beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
  base = realpathSync(mkdtempSync(join(tmpdir(), 'instruction-files-')))
  previousCwd = getOriginalCwd()
  previousConfigDir = process.env.THYROX_CONFIG_DIR
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  if (previousConfigDir === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = previousConfigDir
  resetGetMemoryFilesCache('test')
  // Los settings se leyeron con los bindings de esta suite; sin limpiar la
  // caché, la siguiente suite del proceso los hereda aunque instale otros.
  resetSettingsCache()
  rmSync(base, { recursive: true, force: true })
})

let project: string
let user: string
let n = 0
beforeEach(() => {
  n += 1
  project = join(base, `p${n}`)
  user = join(base, `u${n}`)
  mkdirSync(project, { recursive: true })
  mkdirSync(user, { recursive: true })
  setOriginalCwd(project)
  process.env.THYROX_CONFIG_DIR = user
})

describe('ranuras del archivo de instrucciones', () => {
  test('un proyecto que sólo tiene CLAUDE.md lo sigue cargando', async () => {
    write(join(project, 'CLAUDE.md'), 'heredado')
    expect(await loadedUnder(project)).toEqual([['CLAUDE.md', 'Project']])
  })

  test('con THYROX.md y CLAUDE.md, carga sólo el propio', async () => {
    write(join(project, 'THYROX.md'), 'propio')
    write(join(project, 'CLAUDE.md'), 'heredado')
    expect(await loadedUnder(project)).toEqual([['THYROX.md', 'Project']])
  })

  test('.thyrox/THYROX.md gana a .claude/CLAUDE.md en la ranura anidada', async () => {
    write(join(project, '.thyrox', 'THYROX.md'), 'propio')
    write(join(project, '.claude', 'CLAUDE.md'), 'heredado')
    expect(await loadedUnder(project)).toEqual([['.thyrox/THYROX.md', 'Project']])
  })

  test('THYROX.local.md es la ranura local, con CLAUDE.local.md de respaldo', async () => {
    write(join(project, 'CLAUDE.local.md'), 'heredado')
    expect(await loadedUnder(project)).toEqual([['CLAUDE.local.md', 'Local']])
    write(join(project, 'THYROX.local.md'), 'propio')
    expect(await loadedUnder(project)).toEqual([['THYROX.local.md', 'Local']])
  })

  test('las reglas de .thyrox/rules y de .claude/rules se cargan las dos', async () => {
    write(join(project, '.thyrox', 'rules', 'a.md'), 'a')
    write(join(project, '.claude', 'rules', 'b.md'), 'b')
    const loaded = (await loadedUnder(project)).map(([p]) => p).sort()
    expect(loaded).toEqual(['.claude/rules/b.md', '.thyrox/rules/a.md'])
  })

  test('el archivo del usuario es THYROX.md en su directorio de configuración', async () => {
    write(join(user, 'THYROX.md'), 'usuario')
    write(join(user, 'CLAUDE.md'), 'heredado')
    expect(await loadedUnder(user)).toEqual([['THYROX.md', 'User']])
  })
})

describe('isMemoryFilePath', () => {
  test('reconoce los nombres propios y los heredados', () => {
    for (const p of ['/r/THYROX.md', '/r/THYROX.local.md', '/r/.thyrox/rules/x.md', '/r/CLAUDE.md', '/r/.claude/rules/x.md']) {
      expect(isMemoryFilePath(p)).toBe(true)
    }
    expect(isMemoryFilePath('/r/README.md')).toBe(false)
  })
})

describe('getMemoryFilesForNestedDirectory', () => {
  test('aplica las mismas ranuras y las reglas de los dos directorios', async () => {
    const nested = join(project, 'sub')
    write(join(nested, 'THYROX.md'), 'propio')
    write(join(nested, 'CLAUDE.md'), 'heredado')
    write(join(nested, 'CLAUDE.local.md'), 'local heredado')
    write(join(nested, '.thyrox', 'rules', 'a.md'), 'a')
    write(join(nested, '.claude', 'rules', 'b.md'), 'b')
    const files = await getMemoryFilesForNestedDirectory(nested, join(nested, 'x.ts'), new Set())
    const got = files.map(f => [f.path.slice(nested.length + 1), f.type]).sort()
    expect(got).toEqual([
      ['.claude/rules/b.md', 'Project'],
      ['.thyrox/rules/a.md', 'Project'],
      ['CLAUDE.local.md', 'Local'],
      ['THYROX.md', 'Project'],
    ])
  })
})
