import { describe, expect, test } from 'bun:test'

import { isDangerousBashPermission } from '../permissionSetup.ts'

const BASH = 'Bash'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/dangerousBashPermission.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija `isDangerousBashPermission` — la puerta de seguridad del modo
 * automático. Marca las reglas de allow que auto-ejecutarían código arbitrario
 * (python, ruby, perl, envoltorios de shell, etc.) sin que el clasificador lo
 * revise.
 *
 * Un falso negativo → el usuario habilita el modo automático con un allow de
 *   `Bash(python:*)`, el modelo puede correr Python arbitrario → ejecución de
 *   código arbitrario.
 * Un falso positivo → el `Bash(git:*)` legítimo del usuario se retira del modo
 *   automático: fricción.
 */
describe('isDangerousBashPermission (auto-mode safety gate)', () => {
  test('Non-Bash tool → always false', () => {
    expect(isDangerousBashPermission('Write', '*')).toBe(false)
    expect(isDangerousBashPermission('Edit', 'python')).toBe(false)
  })

  test('Bash with no content (tool-level allow) → DANGEROUS', () => {
    // Una regla `Bash` sin contenido casa con todos los comandos.
    expect(isDangerousBashPermission(BASH, undefined)).toBe(true)
    expect(isDangerousBashPermission(BASH, '')).toBe(true)
  })

  test('Standalone "*" wildcard → DANGEROUS', () => {
    expect(isDangerousBashPermission(BASH, '*')).toBe(true)
  })

  test('Bare dangerous pattern (e.g. "python") → DANGEROUS', () => {
    expect(isDangerousBashPermission(BASH, 'python')).toBe(true)
  })

  test('Prefix syntax "python:*" → DANGEROUS (allows any python invocation)', () => {
    expect(isDangerousBashPermission(BASH, 'python:*')).toBe(true)
  })

  test('Wildcard "python*" → DANGEROUS (matches python3, python2.7, etc.)', () => {
    expect(isDangerousBashPermission(BASH, 'python*')).toBe(true)
  })

  test('Wildcard with space "python *" → DANGEROUS (matches "python script.py")', () => {
    expect(isDangerousBashPermission(BASH, 'python *')).toBe(true)
  })

  test('Option-prefix wildcard "python -*" → DANGEROUS (matches "python -c \'code\'")', () => {
    expect(isDangerousBashPermission(BASH, 'python -c *')).toBe(true)
  })

  test('Case-insensitive matching ("PYTHON*" → DANGEROUS)', () => {
    expect(isDangerousBashPermission(BASH, 'PYTHON*')).toBe(true)
    expect(isDangerousBashPermission(BASH, 'Python:*')).toBe(true)
  })

  test('Whitespace-only rule trimmed and treated as bare dangerous-pattern check', () => {
    // Tras el trim queda "" → no casa con ningún patrón peligroso
    expect(isDangerousBashPermission(BASH, '   ')).toBe(false)
  })

  test('SAFE: explicit pinned command (e.g. "python script.py") → false', () => {
    // Fijado a un archivo de comando concreto, no a una clase de operaciones.
    expect(isDangerousBashPermission(BASH, 'python script.py')).toBe(false)
  })

  test('SAFE: git commands (not in dangerous patterns)', () => {
    expect(isDangerousBashPermission(BASH, 'git:*')).toBe(false)
    expect(isDangerousBashPermission(BASH, 'git status')).toBe(false)
  })

  test('SAFE: ls / cat / grep (read-only commands)', () => {
    expect(isDangerousBashPermission(BASH, 'ls')).toBe(false)
    expect(isDangerousBashPermission(BASH, 'cat:*')).toBe(false)
    expect(isDangerousBashPermission(BASH, 'grep')).toBe(false)
  })

  test('SAFE: npm/yarn/bun/pnpm package managers (specific tools)', () => {
    // Los gestores de paquetes NO están en la lista de patrones peligrosos
    // porque tienen su propio acotamiento de permisos y no ejecutan
    // directamente caminos de código arbitrario del usuario, como sí hace
    // `python -c`.
    expect(isDangerousBashPermission(BASH, 'npm install')).toBe(false)
    expect(isDangerousBashPermission(BASH, 'bun:*')).toBe(false)
  })
})
