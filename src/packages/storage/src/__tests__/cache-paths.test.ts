import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { CACHE_PATHS, setCwdFn, setDjb2HashFn } from '../cache-paths.js'

const realCwd = process.cwd

beforeEach(() => {
  // Restaura a los valores por defecto antes de cada test.
  setCwdFn(() => '/users/test-home/myproject')
})

afterEach(() => {
  // Restaura la función real de cwd tras cada test.
  setCwdFn(() => realCwd.call(process))
})

describe('CACHE_PATHS — estructura básica', () => {
  test('baseLogs returns a path containing the sanitized project dir', () => {
    setCwdFn(() => '/users/test/myproject')
    const result = CACHE_PATHS.baseLogs()
    expect(result).toContain('users-test-myproject')
  })

  test('errors path is baseLogs + /errors', () => {
    setCwdFn(() => '/proj')
    expect(CACHE_PATHS.errors()).toMatch(/proj.*[/\\]errors$/)
  })

  test('messages path is baseLogs + /messages', () => {
    setCwdFn(() => '/proj')
    expect(CACHE_PATHS.messages()).toMatch(/proj.*[/\\]messages$/)
  })

  test('mcpLogs returns a path with mcp-logs-<server> suffix', () => {
    setCwdFn(() => '/proj')
    expect(CACHE_PATHS.mcpLogs('myserver')).toMatch(/mcp-logs-myserver$/)
  })
})

describe('sanitizePath via CACHE_PATHS — reemplazo de caracteres', () => {
  test('replaces / with -', () => {
    setCwdFn(() => '/a/b/c')
    expect(CACHE_PATHS.baseLogs()).toContain('-a-b-c')
  })

  test('replaces special chars with -', () => {
    setCwdFn(() => '/path with spaces/a@b#c')
    expect(CACHE_PATHS.baseLogs()).toMatch(/-path-with-spaces-a-b-c/)
  })

  test('replaces unicode with -', () => {
    setCwdFn(() => '/path/世界')
    expect(CACHE_PATHS.baseLogs()).toContain('-path---')
  })

  test('preserves alphanumeric', () => {
    setCwdFn(() => '/abc123XYZ')
    expect(CACHE_PATHS.baseLogs()).toContain('-abc123XYZ')
  })

  test('mcpLogs sanitizes server name (Windows colon compat)', () => {
    setCwdFn(() => '/proj')
    // El nombre del servidor con dos puntos (letras de unidad de Windows)
    // debe sanearse porque ':' está reservado en el filesystem de Windows.
    expect(CACHE_PATHS.mcpLogs('foo:bar:baz')).toMatch(/mcp-logs-foo-bar-baz$/)
  })

  test('mcpLogs sanitizes server name with spaces', () => {
    setCwdFn(() => '/proj')
    expect(CACHE_PATHS.mcpLogs('my server')).toMatch(/mcp-logs-my-server$/)
  })
})

describe('sanitizePath via CACHE_PATHS — límite de longitud + hash de respaldo', () => {
  // Contrato crítico: rutas de más de 200 caracteres se les apenda un hash
  // djb2 en base 36 para desambiguar nombres truncados. Sin esto, dos rutas
  // largas que compartan los primeros 200 caracteres colisionarían.

  test('paths under 200 chars are NOT hash-suffixed', () => {
    // cwd distintivo: el nombre saneado queda bien por debajo de 200 y es
    // fácil de verificar.
    setCwdFn(() => '/short/project')
    const path = CACHE_PATHS.baseLogs()
    const segments = path.split(/[/\\]/)
    const projectDirName = segments[segments.length - 1]!
    // Debe ser exactamente "-short-project" (saneado — slash inicial → -).
    expect(projectDirName).toBe('-short-project')
    // Sin sufijo de hash adicional.
    expect(projectDirName.length).toBeLessThan(200)
  })

  test('paths exactly 200 sanitized chars are NOT hash-suffixed (≤ check)', () => {
    setCwdFn(() => 'a'.repeat(200))
    const path = CACHE_PATHS.baseLogs()
    // El nombre saneado es "a"*200 = exactamente 200, que es ≤ 200 →
    // sin hash. Verifica el manejo del límite.
    const segments = path.split(/[/\\]/)
    const projectDirName = segments[segments.length - 1]
    // Sin sufijo -<base36> esperado.
    expect(projectDirName).toBe('a'.repeat(200))
  })

  test('paths over 200 sanitized chars ARE hash-suffixed', () => {
    const longInput = 'a'.repeat(250)
    setCwdFn(() => longInput)
    const path = CACHE_PATHS.baseLogs()
    const segments = path.split(/[/\\]/)
    const projectDirName = segments[segments.length - 1]!
    // Debe ser prefijo de 200 chars + "-<hash-base36>".
    expect(projectDirName.startsWith('a'.repeat(200))).toBe(true)
    expect(projectDirName).toMatch(/^a{200}-[0-9a-z]+$/)
  })

  test('different long paths with same 200-char prefix get DIFFERENT hash suffixes', () => {
    // Desambiguación crítica: dos repos que compartan un prefijo de 200
    // chars NO deben colisionar en el directorio de caché. El hash captura
    // el nombre COMPLETO.
    const a = 'a'.repeat(200) + 'X'
    const b = 'a'.repeat(200) + 'Y'
    setCwdFn(() => a)
    const aPath = CACHE_PATHS.baseLogs()
    setCwdFn(() => b)
    const bPath = CACHE_PATHS.baseLogs()
    expect(aPath).not.toBe(bPath)
  })

  test('djb2 hash override works (DI verified)', () => {
    setDjb2HashFn(() => 0xdeadbeef)
    setCwdFn(() => 'a'.repeat(250))
    const path = CACHE_PATHS.baseLogs()
    // 0xdeadbeef = 3735928559 en base 36.
    const expected = (0xdeadbeef).toString(36)
    expect(path).toContain(`-${expected}`)
    // Vuelve al valor por defecto.
    setDjb2HashFn(s => {
      let h = 5381
      for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
      return h >>> 0
    })
  })

  test('hash uses base 36 (not hex)', () => {
    setCwdFn(() => 'a'.repeat(250))
    const path = CACHE_PATHS.baseLogs()
    const match = path.match(/-([0-9a-z]+)$/)!
    // Verifica que es una cadena base-36 válida (sólo 0-9 y a-z).
    expect(match[1]).toMatch(/^[0-9a-z]+$/)
    // No debe contener mayúsculas.
    expect(match[1]).toBe(match[1]!.toLowerCase())
  })
})

describe('CACHE_PATHS — DI', () => {
  test('setCwdFn changes the resolved path', () => {
    setCwdFn(() => '/path-a')
    const a = CACHE_PATHS.baseLogs()
    setCwdFn(() => '/path-b')
    const b = CACHE_PATHS.baseLogs()
    expect(a).not.toBe(b)
    expect(a).toContain('-path-a')
    expect(b).toContain('-path-b')
  })

  test('CACHE_PATHS calls cwd() each time (NOT memoized)', () => {
    // Crítico: evaluación perezosa. Si estuviera memoizado, cambiar de cwd
    // a mitad de sesión (modo worktree) dejaría a los siguientes
    // CACHE_PATHS.* usando rutas obsoletas.
    let cwdValue = '/initial'
    setCwdFn(() => cwdValue)
    const initial = CACHE_PATHS.baseLogs()
    cwdValue = '/changed'
    const changed = CACHE_PATHS.baseLogs()
    expect(initial).not.toBe(changed)
    expect(changed).toContain('-changed')
  })
})
