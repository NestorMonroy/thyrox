/**
 * Puerta de permisos (T-008, T-025, T-026, T-027).
 *
 * Fuente del porte: la capa de confinamiento espeja
 * `ccb: packages/permission/src/filesystem.ts` (ver `paths.ts`); las capas
 * allow/deny siguen el contrato del cliente. El control que discrimina es que
 * una ruta fuera del árbol se deniegue ANTES de que una regla allow la alcance.
 */

import { describe, expect, test } from 'bun:test'
import { decide, matchesRule, confinedTo, evaluate, type PermissionPolicy } from '../src/permission.ts'

// T-025 modos, T-026 reglas por patron, T-027 confinamiento de rutas.
describe('modos (T-025)', () => {
  test('default: la capacidad manda; sin politica, se permite', () => {
    expect(decide({}, 'read')).toBe('allow')
    expect(decide({ write: 'deny' }, 'write')).toBe('deny')
  })

  test('acceptEdits permite escribir sin preguntar, pero NO ejecutar', () => {
    const p: PermissionPolicy = { defaultMode: 'acceptEdits', write: 'ask', execute: 'ask' }
    expect(decide(p, 'write')).toBe('allow')
    expect(decide(p, 'execute', true)).toBe('ask')
  })

  test('bypass permite todo, incluso lo denegado por capacidad', () => {
    expect(decide({ defaultMode: 'bypass', execute: 'deny' }, 'execute')).toBe('allow')
  })

  test('sin interactividad un ask se deniega: no hay a quien preguntar', () => {
    expect(decide({ write: 'ask' }, 'write', false)).toBe('deny')
    expect(decide({ write: 'ask' }, 'write', true)).toBe('ask')
  })
})

describe('reglas por patron (T-026)', () => {
  test('Bash(git push:*) casa el prefijo del comando, no el nombre suelto', () => {
    expect(matchesRule('Bash(git push:*)', 'Bash', { command: 'git push origin main' })).toBe(true)
    expect(matchesRule('Bash(git push:*)', 'Bash', { command: 'git status' })).toBe(false)
  })

  test('una regla sin parentesis casa la herramienta entera', () => {
    expect(matchesRule('Write', 'Write', { file_path: 'x' })).toBe(true)
    expect(matchesRule('Write', 'Read', {})).toBe(false)
  })

  test('Read(src/**) casa por ruta con glob', () => {
    expect(matchesRule('Read(src/**)', 'Read', { file_path: 'src/a/b.ts' })).toBe(true)
    expect(matchesRule('Read(src/**)', 'Read', { file_path: 'otro/a.ts' })).toBe(false)
  })

  test('deny gana sobre allow aunque las dos casen', () => {
    const p: PermissionPolicy = { allow: ['Bash(git:*)'], deny: ['Bash(git push:*)'] }
    expect(evaluate(p, 'Bash', 'execute', { command: 'git status' }).decision).toBe('allow')
    const r = evaluate(p, 'Bash', 'execute', { command: 'git push origin main' })
    expect(r.decision).toBe('deny')
    expect(r.rule).toBe('Bash(git push:*)')
  })

  test('la regla que decide se nombra: sin eso, un deny es inexplicable', () => {
    const r = evaluate({ allow: ['Read(src/**)'] }, 'Read', 'read', { file_path: 'src/a.ts' })
    expect(r.rule).toBe('Read(src/**)')
    expect(r.decision).toBe('allow')
  })

  test('sin regla que case, decide la capacidad', () => {
    expect(evaluate({ allow: ['Read'], write: 'deny' }, 'Write', 'write', {}).decision).toBe('deny')
  })
})

describe('confinamiento de rutas (T-027)', () => {
  test('una ruta dentro de los directorios declarados pasa', () => {
    expect(confinedTo('/home/user/repo/src/a.ts', ['/home/user/repo'])).toBe(true)
  })

  test('una ruta fuera NO pasa, aunque el prefijo se parezca', () => {
    expect(confinedTo('/home/user/repo-otro/a.ts', ['/home/user/repo'])).toBe(false)
    expect(confinedTo('/etc/passwd', ['/home/user/repo'])).toBe(false)
  })

  test('el escape por .. se resuelve ANTES de comparar', () => {
    expect(confinedTo('/home/user/repo/../../etc/passwd', ['/home/user/repo'])).toBe(false)
  })

  test('varios directorios: basta con estar en uno', () => {
    expect(confinedTo('/tmp/x/a', ['/home/user/repo', '/tmp/x'])).toBe(true)
  })

  test('sin directorios declarados no hay confinamiento que aplicar', () => {
    expect(confinedTo('/cualquier/cosa', [])).toBe(true)
  })

  test('evaluate deniega una ruta fuera del confinamiento y lo dice', () => {
    const r = evaluate({ additionalDirectories: ['/home/user/repo'] }, 'Read', 'read', { file_path: '/etc/passwd' })
    expect(r.decision).toBe('deny')
    expect(r.reason).toContain('fuera de los directorios')
  })
})
