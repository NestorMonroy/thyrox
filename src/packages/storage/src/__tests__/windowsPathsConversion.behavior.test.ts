import { describe, expect, test } from 'bun:test'

import {
  posixPathToWindowsPath,
  windowsPathToPosixPath,
} from '../windowsPaths.ts'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Fija `windowsPaths.ts` — conversiones de ruta Windows ↔ POSIX que usan la
 * herramienta Bash, invocaciones de git-bash, y normalización de rutas. Los
 * bugs aquí corrompen rutas de archivo en silencio — se ven "raras pero
 * plausibles" y se cuelan más allá de una revisión visual.
 *
 * Invariantes críticos:
 *  1. windowsPathToPosixPath:
 *     - UNC `\\server\share` → `//server/share`
 *     - `C:\path` → `/c/path` (letra de unidad en minúscula, estilo MSYS2)
 *     - Ya-POSIX o relativo → sólo invierte las barras.
 *  2. posixPathToWindowsPath:
 *     - UNC `//server/share` → `\\server\share`
 *     - `/cygdrive/c/path` → `C:\path` (letra de unidad en mayúscula)
 *     - `/c/path` (MSYS2/Git Bash) → `C:\path` (letra de unidad en mayúscula)
 *     - Ya-Windows o relativo → sólo invierte las barras.
 *  3. Round-trip: posix → windows → posix debe producir el original
 *     (para los casos canónicos).
 *  4. Caché LRU (500 entradas) en cada función — memoización.
 *  5. SEGURIDAD: findExecutable filtra binarios sombreados por CWD (evita
 *     un git.bat malicioso en la raíz del proyecto).
 */
describe('windowsPathToPosixPath', () => {
  test('UNC path \\\\server\\share → //server/share', () => {
    expect(windowsPathToPosixPath('\\\\server\\share')).toBe('//server/share')
    expect(windowsPathToPosixPath('\\\\server\\share\\file.txt')).toBe(
      '//server/share/file.txt',
    )
  })

  test('drive letter C:\\Users → /c/Users (LOWERCASE drive)', () => {
    // Fija: unidad en minúscula. Convención MSYS2. /C/Users sería inusual.
    expect(windowsPathToPosixPath('C:\\Users\\foo')).toBe('/c/Users/foo')
    expect(windowsPathToPosixPath('D:\\Projects\\bar')).toBe('/d/Projects/bar')
  })

  test('drive letter with forward slash C:/ → /c/...', () => {
    // Fija: tolera rutas ya mezcladas (C:/ además de C:\).
    expect(windowsPathToPosixPath('C:/Users/foo')).toBe('/c/Users/foo')
  })

  test('relative path with backslashes → flips to forward slashes', () => {
    expect(windowsPathToPosixPath('foo\\bar\\baz')).toBe('foo/bar/baz')
  })

  test('already-POSIX path → unchanged (no double-conversion)', () => {
    // Fija: la regex tolera entrada ya-POSIX.
    expect(windowsPathToPosixPath('/usr/local/bin')).toBe('/usr/local/bin')
  })

  test('drive letter without path (C:\\) → /c/', () => {
    // Fija: raíz de unidad sin resto.
    expect(windowsPathToPosixPath('C:\\')).toBe('/c/')
  })
})

describe('posixPathToWindowsPath', () => {
  test('UNC path //server/share → \\\\server\\share', () => {
    expect(posixPathToWindowsPath('//server/share')).toBe('\\\\server\\share')
    expect(posixPathToWindowsPath('//server/share/file.txt')).toBe(
      '\\\\server\\share\\file.txt',
    )
  })

  test('cygdrive /cygdrive/c/Users → C:\\Users (UPPERCASE drive)', () => {
    // Fija: unidad en mayúscula — convención Windows. Forma cygdrive.
    expect(posixPathToWindowsPath('/cygdrive/c/Users/foo')).toBe(
      'C:\\Users\\foo',
    )
  })

  test('MSYS2 /c/Users → C:\\Users (UPPERCASE drive)', () => {
    // Fija: unidad en mayúscula. Formato MSYS2/Git Bash /c/ (NO /cygdrive/).
    expect(posixPathToWindowsPath('/c/Users/foo')).toBe('C:\\Users\\foo')
  })

  test('drive letter alone /c → C:\\', () => {
    // Fija: caso especial de raíz de unidad.
    expect(posixPathToWindowsPath('/c')).toBe('C:\\')
  })

  test('cygdrive alone /cygdrive/c → C:\\', () => {
    expect(posixPathToWindowsPath('/cygdrive/c')).toBe('C:\\')
  })

  test('plain POSIX (no drive prefix) → backslash-flipped', () => {
    expect(posixPathToWindowsPath('/usr/local/bin')).toBe('\\usr\\local\\bin')
  })

  test('relative path with forward slashes → backslashes', () => {
    expect(posixPathToWindowsPath('foo/bar/baz')).toBe('foo\\bar\\baz')
  })
})

describe('round-trip conversions', () => {
  test('Windows → POSIX → Windows preserves drive paths', () => {
    // Fija: sin pérdida para el caso canónico de letra de unidad.
    // C:\Users\foo → /c/Users/foo → C:\Users\foo
    const original = 'C:\\Users\\foo'
    expect(posixPathToWindowsPath(windowsPathToPosixPath(original))).toBe(
      original,
    )
  })

  test('POSIX → Windows → POSIX preserves drive paths', () => {
    // /c/Users/foo → C:\Users\foo → /c/Users/foo
    const original = '/c/Users/foo'
    expect(windowsPathToPosixPath(posixPathToWindowsPath(original))).toBe(
      original,
    )
  })

  test('UNC round-trip preserves form', () => {
    expect(
      posixPathToWindowsPath(windowsPathToPosixPath('\\\\server\\share')),
    ).toBe('\\\\server\\share')
  })
})

describe('memoization (LRU cache)', () => {
  test('same input → same reference (cached result)', () => {
    // Fija: memoizeWithLRU retorna el mismo string en cada llamada (string
    // primitivo — la igualdad de referencia puede no aplicar, pero el
    // resultado DEBE ser igual por valor).
    const a = windowsPathToPosixPath('C:\\some\\path')
    const b = windowsPathToPosixPath('C:\\some\\path')
    expect(a).toBe(b)
  })

  test('many different inputs all work (LRU doesn\'t corrupt)', () => {
    // Fija: tamaño de caché = 500. Más allá de eso ocurre desalojo — pero
    // nunca una respuesta incorrecta.
    for (let i = 0; i < 1000; i++) {
      const result = windowsPathToPosixPath(`C:\\path${i}`)
      expect(result).toBe(`/c/path${i}`)
    }
  })
})

describe('source pins', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'windowsPaths.ts'),
    'utf-8',
  )

  test('LRU cache size = 500 for each conversion function', () => {
    // Fija: 500 es el tamaño de caché documentado. Una regresión a 5000 o
    // 50 cambiaría el perfil de memoria/rendimiento.
    const matches = source.match(/memoizeWithLRU\(/g)
    expect(matches?.length).toBe(2)
    // Ambas deben pasar `500` como tercer argumento.
    expect(
      (source.match(/\(p: string\) => p,\s*\n\s*500/g) ?? []).length,
    ).toBe(2)
  })

  test('SECURITY: findExecutable filters CWD-shadowed binaries', () => {
    // Fija: guarda crítica contra un `git.bat` en la raíz del proyecto
    // ejecutándose en lugar del git del sistema. No se puede retirar.
    expect(source).toMatch(
      /Skipping potentially malicious executable in current directory/,
    )
  })

  test('findExecutable for "git" checks default install locations FIRST', () => {
    // Fija: los defaults se revisan antes que where.exe. Una regresión
    // que quite esto ralentizaría la búsqueda de git Y podría elegir un
    // git equivocado en sistemas donde PATH está contaminado.
    expect(source).toMatch(/executable === 'git'/)
    expect(source).toMatch(
      /'C:\\\\Program Files\\\\Git\\\\cmd\\\\git\.exe'/,
    )
  })

  test('64-bit Program Files BEFORE Program Files (x86)', () => {
    // Fija: preferir 64-bit. El comentario lo dice; fija el orden.
    const sixtyFour = source.indexOf("'C:\\\\Program Files\\\\Git\\\\cmd\\\\git.exe'")
    const thirtyTwo = source.indexOf(
      "'C:\\\\Program Files (x86)\\\\Git\\\\cmd\\\\git.exe'",
    )
    expect(sixtyFour).toBeGreaterThan(-1)
    expect(thirtyTwo).toBeGreaterThan(sixtyFour)
  })

  test('SHELL env set only on windows (NOT on macOS/Linux)', () => {
    // Fija: guarda sobre platform === 'windows'. Una regresión que fije
    // SHELL en macOS sobreescribiría la elección del usuario.
    expect(source).toMatch(
      /if \(getPlatform\(\) === 'windows'\) \{[\s\S]+?process\.env\.SHELL = gitBashPath/,
    )
  })

  test('CLAUDE_CODE_GIT_BASH_PATH env var checked first (user override)', () => {
    // Fija: variable de entorno → ubicaciones por defecto → where.exe.
    expect(source).toMatch(
      /findGitBashPath = memoize[\s\S]+?process\.env\.CLAUDE_CODE_GIT_BASH_PATH/,
    )
  })

  test('bashPath derived from gitPath via ../../bin/bash.exe', () => {
    // Fija: relación estructural entre el directorio de instalación de git
    // y bash.exe.
    expect(source).toMatch(
      /pathWin32\.join\(gitPath, '\.\.', '\.\.', 'bin', 'bash\.exe'\)/,
    )
  })
})
