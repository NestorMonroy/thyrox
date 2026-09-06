/**
 * Tests para parseGitHubRepository — el resolver owner/repo específico
 * de GitHub.com usado por la extensión de VS Code y el bridge para la
 * inferencia de PR/repo.
 *
 * Un emparejamiento incorrecto significa:
 *   - Una URL GHE se filtra como "owner/repo" → el caller construye una
 *     URL github.com que da 404
 *   - Se rechaza una URL de GitHub válida → el usuario no puede vincular
 *     PRs/issues
 *
 * Dos caminos: URL completa vía parseGitRemote, o "owner/repo" plano vía
 * split directo. Ambos deben devolver null para GHE / entrada malformada.
 *
 * Porte verbatim de `ccnmt: packages/storage/src/__tests__/parseGitHubRepository.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { parseGitHubRepository } from '../detectRepository.js'

describe('parseGitHubRepository — parseo de URL completa', () => {
  test('https://github.com/owner/repo → "owner/repo"', () => {
    expect(parseGitHubRepository('https://github.com/anthropics/claude-code-how-works-how-works')).toBe(
      'anthropics/claude-code-how-works-how-works',
    )
  })

  test('https://github.com/owner/repo.git → elimina .git', () => {
    expect(
      parseGitHubRepository('https://github.com/anthropics/claude-code-how-works-how-works.git'),
    ).toBe('anthropics/claude-code-how-works-how-works')
  })

  test('git@github.com:owner/repo.git → "owner/repo"', () => {
    expect(
      parseGitHubRepository('git@github.com:anthropics/claude-code-how-works-how-works.git'),
    ).toBe('anthropics/claude-code-how-works-how-works')
  })

  test('ssh://git@github.com/owner/repo.git → "owner/repo"', () => {
    expect(
      parseGitHubRepository('ssh://git@github.com/anthropics/claude-code-how-works-how-works.git'),
    ).toBe('anthropics/claude-code-how-works-how-works')
  })

  test('git://github.com/owner/repo.git → "owner/repo"', () => {
    expect(
      parseGitHubRepository('git://github.com/anthropics/claude-code-how-works-how-works.git'),
    ).toBe('anthropics/claude-code-how-works-how-works')
  })

  test('host GHE (p. ej. github.example.com) → null', () => {
    // Contrato documentado: las URLs GHE se rechazan. Usar parseGitRemote
    // directamente si se necesita soporte GHE.
    expect(
      parseGitHubRepository('https://github.example.com/owner/repo.git'),
    ).toBeNull()
  })

  test('nombre de repo con punto (p. ej. cc.kurs.web) se preserva', () => {
    expect(parseGitHubRepository('https://github.com/owner/cc.kurs.web')).toBe(
      'owner/cc.kurs.web',
    )
  })
})

describe('parseGitHubRepository — strings owner/repo pelados', () => {
  test('"owner/repo" plano → se devuelve tal cual', () => {
    expect(parseGitHubRepository('anthropics/claude-code-how-works-how-works')).toBe(
      'anthropics/claude-code-how-works-how-works',
    )
  })

  test('"owner/repo.git" → elimina el sufijo .git', () => {
    expect(parseGitHubRepository('anthropics/claude-code-how-works-how-works.git')).toBe(
      'anthropics/claude-code-how-works-how-works',
    )
  })

  test('el espacio en blanco se recorta antes de parsear', () => {
    expect(parseGitHubRepository('  anthropics/claude-code-how-works-how-works  ')).toBe(
      'anthropics/claude-code-how-works-how-works',
    )
  })

  test('solo "owner" (sin slash) → null', () => {
    expect(parseGitHubRepository('anthropics')).toBeNull()
  })

  test('"a/b/c" (3+ segmentos) → null (solo se acepta owner/repo de 2 segmentos)', () => {
    expect(parseGitHubRepository('a/b/c')).toBeNull()
  })

  test('owner vacío ("/repo") → null', () => {
    expect(parseGitHubRepository('/repo')).toBeNull()
  })

  test('repo vacío ("owner/") → null', () => {
    expect(parseGitHubRepository('owner/')).toBeNull()
  })

  test('owner/repo con punto en el nombre del repo se preserva', () => {
    expect(parseGitHubRepository('owner/foo.bar.baz')).toBe('owner/foo.bar.baz')
  })
})

describe('parseGitHubRepository — casos inválidos / null', () => {
  test('cadena vacía → null', () => {
    expect(parseGitHubRepository('')).toBeNull()
  })

  test('solo espacios en blanco → null', () => {
    expect(parseGitHubRepository('   ')).toBeNull()
  })

  test('no es una URL ni un path → null', () => {
    expect(parseGitHubRepository('not a repo')).toBeNull()
  })

  test('URL sin path owner/repo → null', () => {
    expect(parseGitHubRepository('https://github.com')).toBeNull()
  })

  test('URL con @ pero sin patrón git@ (no se maneja como path pelado)', () => {
    // Documentado: '@' dispara el camino de URL-parse que falla, luego el
    // camino de path pelado se salta porque el string recortado contiene
    // '@'. Resultado: null.
    expect(parseGitHubRepository('user@somewhere.com')).toBeNull()
  })

  test('URL con :// dispara el camino de URL-parse; si el host no es GitHub → null', () => {
    expect(parseGitHubRepository('https://gitlab.com/owner/repo')).toBeNull()
  })
})

describe('parseGitHubRepository — sensibilidad a mayúsculas', () => {
  test('el host se reconoce sin importar el prefijo www en github.com', () => {
    // parseGitRemote tiene su propia normalización; aquí solo se verifica
    // que el path pelado funcione tal como viene.
    expect(parseGitHubRepository('Anthropics/Claude-Code')).toBe(
      'Anthropics/Claude-Code',
    )
  })
})

describe('parseGitHubRepository — caracteres de borde', () => {
  test('owner/repo con guiones se preserva', () => {
    expect(parseGitHubRepository('multi-word-owner/multi-word-repo')).toBe(
      'multi-word-owner/multi-word-repo',
    )
  })

  test('owner/repo con guiones bajos se preserva', () => {
    expect(parseGitHubRepository('snake_case_owner/snake_case_repo')).toBe(
      'snake_case_owner/snake_case_repo',
    )
  })

  test('owner/repo numérico se acepta', () => {
    expect(parseGitHubRepository('123/456')).toBe('123/456')
  })
})
