/**
 * Pruebas de las guardas de las herramientas de archivo: `_w` y `Wy` de
 * 2.1.275 (`chunk-9apg35nm.js`). Cada negativo apunta a una ruta que EXISTE,
 * fuera o dentro del trabajo según el caso.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOriginalCwd, setCwdState, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import {
  checkReadPermissionForTool,
  checkWritePermissionForTool,
  getClaudeSkillScope,
} from '../filesystem.js'

let base: string
let work: string
let outside: string
let previousCwd: string
const savedConfig = process.env.CLAUDE_CONFIG_DIR

const Read = { name: 'Read', getPath: (i: { file_path: string }) => i.file_path }
const Edit = { name: 'Edit', getPath: (i: { file_path: string }) => i.file_path }
const Pathless = { name: 'Mystery' }

function touch(path: string): string {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, 'x')
  return path
}
function ctx(extra: Record<string, unknown> = {}) {
  return {
    mode: 'default',
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    ...extra,
  } as never
}

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'file-tool-perms-')))
  work = join(base, 'work')
  outside = join(base, 'outside')
  touch(join(work, 'src', 'a.ts'))
  touch(join(work, '.bashrc'))
  touch(join(work, '.claude', 'skills', 'demo', 'SKILL.md'))
  touch(join(outside, 'secret.txt'))
  symlinkSync(join(outside, 'secret.txt'), join(work, 'escape.txt'))
  process.env.CLAUDE_CONFIG_DIR = join(base, 'config-home')
  previousCwd = getOriginalCwd()
  setOriginalCwd(work)
  setCwdState(work)
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  if (savedConfig === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = savedConfig
  rmSync(base, { recursive: true, force: true })
})

describe('checkReadPermissionForTool (_w)', () => {
  test('una herramienta sin ruta pide permiso', () => {
    expect(checkReadPermissionForTool(Pathless, {}, ctx())).toMatchObject({ behavior: 'ask' })
  })
  test('leer dentro del trabajo se permite', () => {
    expect(checkReadPermissionForTool(Read, { file_path: join(work, 'src', 'a.ts') }, ctx())).toMatchObject({
      behavior: 'allow',
    })
  })
  test('leer fuera del trabajo pide permiso con sugerencia de regla', () => {
    const decision = checkReadPermissionForTool(Read, { file_path: join(outside, 'secret.txt') }, ctx())
    expect(decision).toMatchObject({ behavior: 'ask', decisionReason: { type: 'workingDir' } })
    expect((decision as { suggestions: { type: string }[] }).suggestions[0]?.type).toBe('addRules')
  })
  test('un enlace del trabajo que sale fuera no se lee sin permiso', () => {
    expect(checkReadPermissionForTool(Read, { file_path: join(work, 'escape.txt') }, ctx())).toMatchObject({
      behavior: 'ask',
    })
  })
  test('una regla de negación gana aunque la ruta esté dentro', () => {
    const decision = checkReadPermissionForTool(
      Read,
      { file_path: join(work, 'src', 'a.ts') },
      ctx({ alwaysDenyRules: { session: ['Read(/src/**)'] } }),
    )
    expect(decision).toMatchObject({ behavior: 'deny', decisionReason: { type: 'rule' } })
  })
  test('con lecturas fuera bloqueadas, fuera se niega con la ruta', () => {
    const decision = checkReadPermissionForTool(
      Read,
      { file_path: join(outside, 'secret.txt') },
      ctx({ blockReadsOutsideWorkingDirectories: true }),
    )
    expect(decision).toMatchObject({ behavior: 'deny', blockedPath: join(outside, 'secret.txt') })
  })
  test('en modo restringido, fuera se niega', () => {
    expect(
      checkReadPermissionForTool(Read, { file_path: join(outside, 'secret.txt') }, ctx({ restricted: true })),
    ).toMatchObject({ behavior: 'deny' })
  })
  test('una ruta UNC pide aprobación aunque haya regla que la permita', () => {
    const decision = checkReadPermissionForTool(
      Read,
      { file_path: '//server/share/x' },
      ctx({ alwaysAllowRules: { session: ['Read(//server/**)'] } }),
    )
    expect(decision).toMatchObject({ behavior: 'ask', decisionReason: { type: 'other' } })
  })
})

describe('checkWritePermissionForTool (Wy)', () => {
  test('escribir dentro del trabajo en default pide permiso con acceptEdits sugerido', () => {
    const decision = checkWritePermissionForTool(Edit, { file_path: join(work, 'src', 'a.ts') }, ctx())
    expect(decision).toMatchObject({ behavior: 'ask' })
    expect((decision as { suggestions: { type: string }[] }).suggestions[0]).toMatchObject({ type: 'setMode', mode: 'acceptEdits' })
  })
  test('en acceptEdits, escribir dentro del trabajo se permite', () => {
    expect(
      checkWritePermissionForTool(Edit, { file_path: join(work, 'src', 'a.ts') }, ctx({ mode: 'acceptEdits' })),
    ).toMatchObject({ behavior: 'allow', decisionReason: { type: 'mode' } })
  })
  test('en acceptEdits, escribir fuera del trabajo sigue pidiendo permiso', () => {
    expect(
      checkWritePermissionForTool(Edit, { file_path: join(outside, 'secret.txt') }, ctx({ mode: 'acceptEdits' })),
    ).toMatchObject({ behavior: 'ask', decisionReason: { type: 'workingDir' } })
  })
  test('un archivo sensible del trabajo pide aprobación aun en acceptEdits', () => {
    const decision = checkWritePermissionForTool(Edit, { file_path: join(work, '.bashrc') }, ctx({ mode: 'acceptEdits' }))
    expect(decision).toMatchObject({ behavior: 'ask', decisionReason: { type: 'safetyCheck' } })
  })
  test('en plan mode no se escribe', () => {
    expect(
      checkWritePermissionForTool(Edit, { file_path: join(work, 'src', 'a.ts') }, ctx({ mode: 'plan' })),
    ).toMatchObject({ behavior: 'ask', decisionReason: { type: 'mode', mode: 'plan' } })
  })
  test('una regla de negación gana sobre acceptEdits', () => {
    expect(
      checkWritePermissionForTool(
        Edit,
        { file_path: join(work, 'src', 'a.ts') },
        ctx({ mode: 'acceptEdits', alwaysDenyRules: { session: ['Edit(/src/**)'] } }),
      ),
    ).toMatchObject({ behavior: 'deny' })
  })
  test('en modo restringido, escribir fuera se niega', () => {
    expect(
      checkWritePermissionForTool(Edit, { file_path: join(outside, 'secret.txt') }, ctx({ restricted: true, mode: 'acceptEdits' })),
    ).toMatchObject({ behavior: 'deny' })
  })
  test('la guarda de seguridad sugiere abrir la skill entera', () => {
    const decision = checkWritePermissionForTool(
      Edit,
      { file_path: join(work, '.claude', 'skills', 'demo', 'SKILL.md') },
      ctx({ mode: 'acceptEdits' }),
    )
    expect(decision).toMatchObject({ behavior: 'ask', decisionReason: { type: 'safetyCheck' } })
    expect((decision as { suggestions: { rules: { ruleContent: string }[] }[] }).suggestions[0]?.rules[0]?.ruleContent).toBe(
      '/.claude/skills/demo/**',
    )
  })
})

describe('getClaudeSkillScope (ku)', () => {
  test('una ruta dentro de una skill del proyecto da su patrón', () => {
    expect(getClaudeSkillScope(join(work, '.claude', 'skills', 'demo', 'SKILL.md'))).toEqual({
      skillName: 'demo',
      pattern: '/.claude/skills/demo/**',
    })
  })
  test('fuera de .claude/skills no hay alcance', () => {
    expect(getClaudeSkillScope(join(work, 'src', 'a.ts'))).toBeNull()
  })
})
