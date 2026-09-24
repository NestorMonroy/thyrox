/**
 * Pruebas de `validatePath`, `isPathAllowed` y `validateGlobPattern`: `yS`,
 * `$k` y `mTo` de 2.1.275 (`chunk-q2gh92k2.js`). Cada negativo apunta a una
 * ruta que EXISTE, fuera o dentro del trabajo según el caso.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getOriginalCwd, setCwdState, setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { isPathAllowed, validateGlobPattern, validatePath } from '../pathValidation.js'

let base: string
let work: string
let outside: string
let previousCwd: string
const savedConfig = process.env.CLAUDE_CONFIG_DIR

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
  }
}

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'validate-path-')))
  work = join(base, 'work')
  outside = join(base, 'outside')
  touch(join(work, 'src', 'a.ts'))
  touch(join(work, '.bashrc'))
  touch(join(outside, 'secret.txt'))
  symlinkSync(outside, join(work, 'escape'))
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

describe('validatePath (yS)', () => {
  test('leer dentro del trabajo se permite', () => {
    expect(validatePath('src/a.ts', work, ctx(), 'read')).toMatchObject({ allowed: true, resolvedPath: join(work, 'src', 'a.ts') })
  })
  test('escribir dentro del trabajo pide acceptEdits', () => {
    expect(validatePath('src/a.ts', work, ctx(), 'write')).toMatchObject({ allowed: false, isInWorkingDir: true })
    expect(validatePath('src/a.ts', work, ctx({ mode: 'acceptEdits' }), 'write').allowed).toBe(true)
  })
  test('leer fuera del trabajo, sin regla, no se permite', () => {
    expect(validatePath(join(outside, 'secret.txt'), work, ctx(), 'read')).toMatchObject({ allowed: false, isInWorkingDir: false })
  })
  test('una regla de denegación gana dentro del trabajo', () => {
    const r = validatePath('src/a.ts', work, ctx({ alwaysDenyRules: { session: [`Read(/${work}/src/**)`] } }), 'read')
    expect(r.allowed).toBe(false)
    expect(r.decisionReason).toMatchObject({ type: 'rule' })
  })
  test('el enlace que sale del trabajo lleva la denegación al destino real', () => {
    const r = validatePath('escape/secret.txt', work, ctx({ alwaysDenyRules: { session: [`Read(/${outside}/**)`] } }), 'read')
    expect(r).toMatchObject({ allowed: false, decisionReason: { type: 'rule' } })
  })
  test('una regla de permiso abre fuera del trabajo', () => {
    const r = validatePath(join(outside, 'secret.txt'), work, ctx({ alwaysAllowRules: { session: [`Read(/${outside}/**)`] } }), 'read')
    expect(r).toMatchObject({ allowed: true, decisionReason: { type: 'rule' } })
  })
  test('las variantes de tilde piden aprobación manual', () => {
    expect(validatePath('~root/x', work, ctx(), 'read').decisionReason).toMatchObject({
      reason: 'Tilde expansion variants (~user, ~+, ~-) in paths require manual approval',
    })
  })
  test('la sintaxis de expansión del shell pide aprobación manual', () => {
    expect(validatePath('$HOME/x', work, ctx(), 'read').decisionReason).toMatchObject({
      reason: 'Shell expansion syntax in paths requires manual approval',
    })
  })
  test('llaves en un destino de escritura piden aprobación', () => {
    expect(validatePath('src/{a,b}.ts', work, ctx({ mode: 'acceptEdits' }), 'write').allowed).toBe(false)
  })
  test('un glob en escritura se rechaza', () => {
    expect(validatePath('src/*.ts', work, ctx({ mode: 'acceptEdits' }), 'write').decisionReason).toMatchObject({
      reason: 'Glob patterns are not allowed in write operations. Please specify an exact file path.',
    })
  })
  test('un glob de lectura se valida por su directorio base', () => {
    expect(validatePath('src/*.ts', work, ctx(), 'read')).toMatchObject({ allowed: true, resolvedPath: join(work, 'src') })
  })
  test('`..` tras un directorio pide aprobación aunque el destino esté dentro', () => {
    const r = validatePath('src/../src/a.ts', work, ctx(), 'read')
    expect(r.allowed).toBe(false)
    expect(r.decisionReason).toMatchObject({ type: 'other' })
  })
  test('un archivo sensible del trabajo corta la escritura aun con acceptEdits', () => {
    const r = validatePath('.bashrc', work, ctx({ mode: 'acceptEdits' }), 'write')
    expect(r).toMatchObject({ allowed: false, decisionReason: { type: 'safetyCheck', classifierApprovable: true } })
  })
  test('con lecturas fuera bloqueadas, leer fuera se corta con su interruptor', () => {
    const r = validatePath(join(outside, 'secret.txt'), work, ctx({ blockReadsOutsideWorkingDirectories: true }), 'read')
    expect(r.decisionReason).toMatchObject({ type: 'safetyCheck', circuitBreaker: 'outsideReadsBlocked', classifierApprovable: false })
  })
})

describe('isPathAllowed ($k)', () => {
  test('en modo restringido, el corte de seguridad no lo aprueba el clasificador', () => {
    const r = isPathAllowed(join(work, '.bashrc'), ctx({ mode: 'acceptEdits', restricted: true }), 'write')
    expect(r.decisionReason).toMatchObject({ type: 'safetyCheck', classifierApprovable: false, circuitBreaker: 'restrictedMode' })
  })
})

describe('validateGlobPattern (mTo)', () => {
  test('resuelve el directorio base y lo valida', () => {
    expect(validateGlobPattern(join(outside, '*.txt'), work, ctx(), 'read')).toMatchObject({ allowed: false, resolvedPath: outside })
  })
})
