import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  activateConditionalSkillsForPaths,
  addSkillDirectories,
  clearSkillCaches,
  discoverSkillDirsForPaths,
  dynamicSkillKey,
  getConditionalSkills,
  getDynamicSkills,
  onDynamicSkillsLoaded,
  registerConditionalSkill,
  setSkillDirectoryLoader,
  type DynamicPromptSkill,
} from '../loadSkillsDir.ts'

// Contrato portado de 2.1.275 (`chunk-q2gh92k2.js`: Spt, zUt, Ajn, lfs, BFe,
// J$r, Q$r). El cargador de un directorio (`Kz`) es una costura: la prueba
// inyecta uno que devuelve skills fijas.

function skill(name: string, skillRoot: string, paths?: string[]): DynamicPromptSkill {
  return { type: 'prompt', name, skillRoot, paths, source: 'projectSettings' }
}

const temps: string[] = []
function tempRepo(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'skills-')))
  temps.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  return dir
}

afterEach(() => {
  clearSkillCaches()
  setSkillDirectoryLoader(null)
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('dynamic skills (2.1.275)', () => {
  test('la clave es skillRoot + NUL + nombre', () => {
    expect(dynamicSkillKey(skill('a', '/r'))).toBe('/r\u0000a')
  })

  test('activa una condicional cuando un archivo bajo cwd casa sus paths', () => {
    let emitted = 0
    const off = onDynamicSkillsLoaded(() => { emitted++ })
    registerConditionalSkill(skill('ts-helper', '/r', ['src/**/*.ts']))
    expect(activateConditionalSkillsForPaths(['/w/docs/readme.md'], '/w')).toEqual([])
    expect(activateConditionalSkillsForPaths(['/elsewhere/src/a.ts'], '/w')).toEqual([])
    expect(activateConditionalSkillsForPaths(['/w/src/deep/a.ts'], '/w')).toEqual(['ts-helper'])
    expect(getConditionalSkills()).toEqual([])
    expect(getDynamicSkills().map(s => s.name)).toEqual(['ts-helper'])
    expect(emitted).toBe(1)
    off()
  })

  test('getDynamicSkills ordena por nombre y desempata por clave', async () => {
    setSkillDirectoryLoader(async dir => [
      { skill: skill('zeta', dir), filePath: join(dir, 'zeta', 'SKILL.md') },
      { skill: skill('alfa', dir), filePath: join(dir, 'alfa', 'SKILL.md') },
    ])
    await addSkillDirectories(['/b/.claude/skills', '/a/.claude/skills'])
    expect(getDynamicSkills().map(s => `${s.skillRoot}:${s.name}`)).toEqual([
      '/a/.claude/skills:alfa',
      '/b/.claude/skills:alfa',
      '/a/.claude/skills:zeta',
      '/b/.claude/skills:zeta',
    ])
  })

  test('replace retira las skills de esos directorios que ya no están', async () => {
    let names = ['uno', 'dos']
    setSkillDirectoryLoader(async dir => names.map(n => ({ skill: skill(n, dir), filePath: '' })))
    await addSkillDirectories(['/p/.claude/skills'])
    names = ['uno']
    await addSkillDirectories(['/p/.claude/skills'], { replace: true })
    expect(getDynamicSkills().map(s => s.name)).toEqual(['uno'])
  })

  test('descubre .claude/skills existentes entre el archivo y cwd, una sola vez', async () => {
    const cwd = tempRepo()
    mkdirSync(join(cwd, 'pkg', '.claude', 'skills'), { recursive: true })
    mkdirSync(join(cwd, 'pkg', 'src'), { recursive: true })
    mkdirSync(join(cwd, '.claude', 'skills'), { recursive: true })
    const file = join(cwd, 'pkg', 'src', 'x.ts')
    expect(await discoverSkillDirsForPaths([file], cwd)).toEqual([join(cwd, 'pkg', '.claude', 'skills')])
    expect(await discoverSkillDirsForPaths([file], cwd)).toEqual([])
  })

  test('salta un directorio de skills ignorado por git', async () => {
    const cwd = tempRepo()
    mkdirSync(join(cwd, 'vendor', '.claude', 'skills'), { recursive: true })
    writeFileSync(join(cwd, '.gitignore'), 'vendor/\n')
    expect(await discoverSkillDirsForPaths([join(cwd, 'vendor', 'x.ts')], cwd)).toEqual([])
  })

  test('un oyente que lanza no impide a los demás', async () => {
    const seen: string[] = []
    const offA = onDynamicSkillsLoaded(() => { throw new Error('x') })
    const offB = onDynamicSkillsLoaded(() => { seen.push('b') })
    setSkillDirectoryLoader(async () => [])
    await addSkillDirectories(['/q/.claude/skills'])
    expect(seen).toEqual(['b'])
    offA(); offB()
  })

  test('clearSkillCaches vacía el estado dinámico', async () => {
    registerConditionalSkill(skill('c', '/r', ['*.md']))
    setSkillDirectoryLoader(async dir => [{ skill: skill('d', dir), filePath: '' }])
    await addSkillDirectories(['/s/.claude/skills'])
    clearSkillCaches()
    expect(getDynamicSkills()).toEqual([])
    expect(getConditionalSkills()).toEqual([])
  })
})
