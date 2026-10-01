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
import { denySymlinkLeafWrite } from '../fileToolPermissions.js'
import { resolvePathForPermission } from '@thyrox/storage/fsOperations.js'

let base: string
let work: string
let outside: string
let previousCwd: string
const savedConfig = process.env.THYROX_CONFIG_DIR

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
  symlinkSync(join(work, '.bashrc'), join(work, 'link-to-bashrc'))
  symlinkSync(join(work, 'loop-b'), join(work, 'loop-a'))
  symlinkSync(join(work, 'loop-a'), join(work, 'loop-b'))
  process.env.THYROX_CONFIG_DIR = join(base, 'config-home')
  previousCwd = getOriginalCwd()
  setOriginalCwd(work)
  setCwdState(work)
})
afterAll(() => {
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  if (savedConfig === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = savedConfig
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

describe('aterrizaje de enlaces en las guardas (kl, xl, Ml, WGn de 2.1.283)', () => {
  test('leer un enlace irresoluble se niega nombrando que su destino no se pudo determinar', () => {
    const decision = checkReadPermissionForTool(Read, { file_path: join(work, 'loop-a') }, ctx())
    expect(decision).toMatchObject({ behavior: 'deny', decisionReason: { type: 'other' } })
    expect((decision as { message: string }).message).toContain('where it leads on disk could not be determined')
  })
  test('escribir un enlace irresoluble se niega igual, aun en acceptEdits', () => {
    const decision = checkWritePermissionForTool(Edit, { file_path: join(work, 'loop-a') }, ctx({ mode: 'acceptEdits' }))
    expect(decision).toMatchObject({ behavior: 'deny' })
    expect((decision as { message: string }).message).toContain('Refusing to write')
  })
  test('en modo restringido, un enlace irresoluble se niega con la razon del modo', () => {
    const decision = checkReadPermissionForTool(Read, { file_path: join(work, 'loop-a') }, ctx({ restricted: true }))
    expect(decision).toMatchObject({ behavior: 'deny' })
    expect((decision as { message: string }).message).toContain('Where')
    expect((decision as { message: string }).message).toContain('--restricted')
  })
  test('leer un enlace del trabajo que aterriza fuera pide permiso con el aterrizaje como ruta bloqueada', () => {
    const decision = checkReadPermissionForTool(Read, { file_path: join(work, 'escape.txt') }, ctx())
    expect(decision).toMatchObject({
      behavior: 'ask',
      blockedPath: join(outside, 'secret.txt'),
      decisionReason: { type: 'workingDir' },
    })
    const message = (decision as { message: string }).message
    expect(message).toContain('resolves through a symlink to')
    expect(message).toContain('which is outside the allowed working directories')
  })
  test('con lecturas fuera bloqueadas, el enlace que sale se niega con el aterrizaje como ruta bloqueada', () => {
    const decision = checkReadPermissionForTool(
      Read,
      { file_path: join(work, 'escape.txt') },
      ctx({ blockReadsOutsideWorkingDirectories: true }),
    )
    expect(decision).toMatchObject({ behavior: 'deny', blockedPath: join(outside, 'secret.txt') })
    expect((decision as { message: string }).message).toContain('resolves through a symlink to')
  })
  test('escribir por un enlace que sale del trabajo es consulta solo para una persona', () => {
    const decision = checkWritePermissionForTool(Edit, { file_path: join(work, 'escape.txt') }, ctx({ mode: 'acceptEdits' }))
    expect(decision).toMatchObject({
      behavior: 'ask',
      blockedPath: join(outside, 'secret.txt'),
      decisionReason: { type: 'safetyCheck', classifierApprovable: false },
    })
  })
  test('la guarda de seguridad anade la frase de aterrizaje cuando el peligro llega por el enlace', () => {
    const decision = checkWritePermissionForTool(Edit, { file_path: join(work, 'link-to-bashrc') }, ctx({ mode: 'acceptEdits' }))
    expect(decision).toMatchObject({
      behavior: 'ask',
      blockedPath: join(work, '.bashrc'),
      decisionReason: { type: 'safetyCheck', classifierApprovable: false },
    })
    expect((decision as { message: string }).message).toContain('resolves through a symlink to')
  })
  test('una ruta sin enlace no lleva ruta bloqueada ni frase de aterrizaje', () => {
    const decision = checkReadPermissionForTool(Read, { file_path: join(outside, 'secret.txt') }, ctx())
    expect((decision as { blockedPath?: string }).blockedPath).toBeUndefined()
    expect((decision as { message: string }).message).not.toContain('resolves through a symlink')
  })
})

describe('denySymlinkLeafWrite (Zlt)', () => {
  test('una hoja simbolica resuelta se niega nombrando el destino como ruta bloqueada', () => {
    const path = join(work, 'escape.txt')
    const decision = denySymlinkLeafWrite(path, resolvePathForPermission(path))
    expect(decision).toMatchObject({ behavior: 'deny', blockedPath: join(outside, 'secret.txt') })
    expect((decision as { message: string }).message).toContain("Write to the link's target path instead")
  })
  test('una hoja simbolica irresoluble se niega sin ruta bloqueada', () => {
    const path = join(work, 'loop-a')
    const decision = denySymlinkLeafWrite(path, resolvePathForPermission(path))
    expect(decision).toMatchObject({ behavior: 'deny' })
    expect((decision as { blockedPath?: string }).blockedPath).toBeUndefined()
    expect((decision as { message: string }).message).toContain('a target that could not be determined')
  })
  test('un archivo que no es enlace no se niega', () => {
    const path = join(work, 'src', 'a.ts')
    expect(denySymlinkLeafWrite(path, resolvePathForPermission(path))).toBeNull()
  })
})
