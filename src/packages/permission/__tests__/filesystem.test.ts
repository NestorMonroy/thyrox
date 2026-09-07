/**
 * Tests del puerto declarado-parcial de `filesystem.ts` (13 de 29 exports
 * — ver docstring del archivo). Sin host bindings instalados, todo cae a
 * sus respaldos: es el estado en el que estos tests corren (no instalan
 * `installPermissionHostBindings`, a propósito — miden el camino sin
 * binding, que es el que un consumidor sin `app-host` inicializado ve).
 */
import { describe, expect, test } from 'bun:test'
import {
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
  ensureScratchpadDir,
  getClaudeTempDir,
  getClaudeTempDirName,
  getProjectTempDir,
  getScratchpadDir,
  getSessionMemoryDir,
  getSessionMemoryPath,
  isScratchpadEnabled,
  normalizeCaseForComparison,
  relativePath,
  toPosixPath,
} from '../src/filesystem.ts'
import { ContextError } from '../src/errors.ts'

describe('constantes', () => {
  test('DANGEROUS_FILES / DANGEROUS_DIRECTORIES no están vacías', () => {
    expect(DANGEROUS_FILES.length).toBeGreaterThan(0)
    expect(DANGEROUS_DIRECTORIES).toContain('.git')
    expect(DANGEROUS_FILES).toContain('.bashrc')
  })
})

describe('normalizeCaseForComparison / toPosixPath / relativePath', () => {
  test('normaliza a minúsculas', () => {
    expect(normalizeCaseForComparison('MiXeD/CaSe')).toBe('mixed/case')
  })

  test('toPosixPath no toca una ruta ya posix (no estamos en windows)', () => {
    expect(toPosixPath('/a/b/c')).toBe('/a/b/c')
  })

  test('relativePath delega a path.posix.relative fuera de windows', () => {
    expect(relativePath('/a/b', '/a/b/c/d')).toBe('c/d')
  })
})

describe('getSessionMemoryDir / getSessionMemoryPath', () => {
  test('componen cwd + sessionId + session-memory, con separador final', () => {
    const dir = getSessionMemoryDir()
    expect(dir.endsWith('session-memory/')).toBe(true)
    expect(dir).toContain(process.cwd())
    expect(getSessionMemoryPath()).toBe(dir + 'summary.md')
  })
})

describe('isScratchpadEnabled', () => {
  test('sin binding de feature-flags disponible, respaldo fail-closed (false)', () => {
    // No hay `@thyrox/config/feature-flags.js` resoluble en este árbol
    // (falta "workspaces"); el respaldo documentado es `false`.
    expect(isScratchpadEnabled()).toBe(false)
  })
})

describe('getClaudeTempDirName / getClaudeTempDir (memoizado)', () => {
  test('el nombre incluye el uid en POSIX', () => {
    const name = getClaudeTempDirName()
    expect(name.startsWith('claude')).toBe(true)
  })

  test('getClaudeTempDir es estable entre llamadas (memoize de aridad cero)', () => {
    expect(getClaudeTempDir()).toBe(getClaudeTempDir())
  })

  test('getClaudeTempDir termina en separador y contiene el nombre por-usuario', () => {
    const dir = getClaudeTempDir()
    expect(dir.endsWith('/')).toBe(true)
    expect(dir).toContain(getClaudeTempDirName())
  })
})

describe('getProjectTempDir / getScratchpadDir — cadena completa', () => {
  test('getProjectTempDir anida bajo getClaudeTempDir, sanitizando el cwd', () => {
    const projectDir = getProjectTempDir()
    expect(projectDir.startsWith(getClaudeTempDir())).toBe(true)
    expect(projectDir.endsWith('/')).toBe(true)
  })

  test('getScratchpadDir anida sessionId + "scratchpad" bajo el proyecto', () => {
    const scratchDir = getScratchpadDir()
    expect(scratchDir.startsWith(getProjectTempDir())).toBe(true)
    expect(scratchDir.endsWith('scratchpad')).toBe(true)
  })
})

describe('ensureScratchpadDir', () => {
  test('lanza ContextError cuando la feature está deshabilitada (fail-closed)', async () => {
    await expect(ensureScratchpadDir()).rejects.toBeInstanceOf(ContextError)
  })

  test('el mensaje del error nombra la causa', async () => {
    try {
      await ensureScratchpadDir()
      expect.unreachable('debía lanzar')
    } catch (error) {
      expect((error as Error).message).toMatch(/scratchpad.*not enabled/i)
    }
  })
})
