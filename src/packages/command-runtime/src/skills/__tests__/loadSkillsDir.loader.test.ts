import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import type { Command } from '@thyrox/agent/command.js'

import {
  clearSkillCaches,
  getConditionalSkills,
  getSkillDirCommands,
  loadSkillsFromSkillsDir,
} from '../loadSkillsDir.ts'

/**
 * El cargador de directorios de `loadSkillsDir.ts` (fuente: `ccnmt:
 * packages/command-runtime/src/skills/loadSkillsDir.ts`), medido sobre un
 * directorio temporal real. Escrito en rojo antes de portar; su control de
 * anulación está en la cabecera del módulo.
 */

const temps: string[] = []
function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'load-skills-')))
  temps.push(dir)
  return dir
}

function writeSkill(skillsDir: string, name: string, body: string): string {
  const dir = join(skillsDir, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), body)
  return dir
}

/** Estrecha un `Command` a su rama prompt, o falla nombrando el skill. */
function asPrompt(command: Command): Command & { type: 'prompt' } {
  if (command.type !== 'prompt') throw new Error(`${command.name} no es un comando prompt`)
  return command
}

afterEach(() => {
  clearSkillCaches()
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('loadSkillsFromSkillsDir', () => {
  test('carga sólo directorios con SKILL.md, enlaces simbólicos incluidos', async () => {
    const root = tempDir()
    const skillsDir = join(root, 'skills')
    const alphaDir = writeSkill(
      skillsDir,
      'alpha',
      '---\ndescription: Alpha skill\npaths: src/**/*.ts\n---\nAlpha body\n',
    )
    writeSkill(skillsDir, 'beta', '# Beta\n\nDoes beta.\n')
    writeFileSync(join(skillsDir, 'loose.md'), '# loose\n')
    mkdirSync(join(skillsDir, 'empty'))
    const outside = writeSkill(root, 'outside', '---\ndescription: Linked\n---\n')
    symlinkSync(outside, join(skillsDir, 'linked'))

    const loaded = await loadSkillsFromSkillsDir(skillsDir, 'projectSettings')
    expect(loaded.map(s => s.skill.name).sort()).toEqual(['alpha', 'beta', 'linked'])

    const alpha = loaded.find(s => s.skill.name === 'alpha')
    if (alpha === undefined) throw new Error('alpha no se cargó')
    const alphaSkill = asPrompt(alpha.skill)
    expect(alpha.filePath).toBe(join(alphaDir, 'SKILL.md'))
    expect(alphaSkill.source).toBe('projectSettings')
    expect(alphaSkill.loadedFrom).toBe('skills')
    expect(alphaSkill.skillRoot).toBe(alphaDir)
    expect(alphaSkill.description).toBe('Alpha skill')
    expect(alphaSkill.paths).toEqual(['src/**/*.ts'])

    const beta = loaded.find(s => s.skill.name === 'beta')
    if (beta === undefined) throw new Error('beta no se cargó')
    expect(beta.skill.description).toBe('Beta')
    expect(asPrompt(beta.skill).paths).toBeUndefined()
  })

  test('un directorio inexistente da lista vacía', async () => {
    expect(await loadSkillsFromSkillsDir(join(tempDir(), 'missing'), 'userSettings')).toEqual([])
  })
})

describe('getSkillDirCommands', () => {
  // El directorio de usuario se aísla por CLAUDE_CONFIG_DIR, igual que en
  // `__tests__/skillHelpers.test.ts`: la memoización va keyed por su valor.
  const savedConfigDir = process.env.CLAUDE_CONFIG_DIR
  let configDir = ''
  beforeAll(() => {
    configDir = realpathSync(mkdtempSync(join(tmpdir(), 'claude-config-')))
    process.env.CLAUDE_CONFIG_DIR = configDir
  })
  afterAll(() => {
    if (savedConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = savedConfigDir
    rmSync(configDir, { recursive: true, force: true })
  })

  test('carga el proyecto, memoiza por cwd y aparta los skills condicionales', async () => {
    const project = tempDir()
    execFileSync('git', ['init', '-q'], { cwd: project })
    const skillsDir = join(project, '.claude', 'skills')
    writeSkill(skillsDir, 'uncond', '---\ndescription: Unconditional\n---\n')
    writeSkill(skillsDir, 'cond', '---\ndescription: Conditional\npaths: docs/**\n---\n')

    clearSkillCaches()
    const first = await getSkillDirCommands(project)
    const names = first.map(c => c.name)
    expect(names).toContain('uncond')
    expect(names).not.toContain('cond')
    expect(getConditionalSkills().map(s => s.name)).toContain('cond')

    const second = await getSkillDirCommands(project)
    expect(second).toBe(first)

    clearSkillCaches()
    const third = await getSkillDirCommands(project)
    expect(third).not.toBe(first)
    expect(third.map(c => c.name)).toContain('uncond')
  })
})
