/**
 * Adaptado de
 * `ccnmt: packages/swarm/src/worktree/__tests__/worktreeBranchAndSession.test.ts`.
 *
 * Tests de generateTmuxSessionName + worktreeBranchName — helpers de
 * nombrado puros usados por el subsistema de worktree.
 *
 * Un nombrado de sesión incorrecto = los panes de compañeros colisionan
 * en tmux (varias sesiones compartiendo el mismo nombre → tmux rehúsa
 * crear o se une en silencio).
 *
 * Un nombrado de rama incorrecto = conflicto D/F (los refs de git no
 * pueden ser a la vez un archivo y un directorio en la misma ruta), la
 * creación del worktree falla.
 */
import { describe, expect, test } from 'bun:test'
import { generateTmuxSessionName, worktreeBranchName } from '../index.js'

describe('generateTmuxSessionName', () => {
  test('básico: repo + branch unidos con _', () => {
    expect(generateTmuxSessionName('/path/to/myrepo', 'feature')).toBe('myrepo_feature')
  })

  test('usa basename, no la ruta completa', () => {
    expect(generateTmuxSessionName('/Users/alice/code/repo', 'main')).toBe('repo_main')
  })

  test('slashes en la rama reemplazados por _', () => {
    // Los nombres de sesión tmux no pueden contener slashes (se
    // interpretarían como parte de la sintaxis de target).
    expect(generateTmuxSessionName('/path/to/repo', 'feature/foo')).toBe('repo_feature_foo')
  })

  test('puntos en la rama reemplazados por _', () => {
    expect(generateTmuxSessionName('/path/to/repo', 'v1.2.3')).toBe('repo_v1_2_3')
  })

  test('puntos en el nombre del repo reemplazados por _', () => {
    expect(generateTmuxSessionName('/path/to/my.repo', 'main')).toBe('my_repo_main')
  })

  test('ruta relativa: basename se extrae igual', () => {
    expect(generateTmuxSessionName('./myrepo', 'main')).toBe('myrepo_main')
  })

  test('slash final en la ruta: basename devuelve el nombre del directorio', () => {
    // path.basename('/path/to/repo/') devuelve 'repo' en POSIX.
    expect(generateTmuxSessionName('/path/to/repo/', 'main')).toBe('repo_main')
  })

  test('guiones en la rama preservados', () => {
    expect(generateTmuxSessionName('/path/repo', 'feat-add-auth')).toBe('repo_feat-add-auth')
  })

  test('puntos + slashes mezclados: todos convertidos', () => {
    expect(generateTmuxSessionName('/path/my.repo', 'feat/v1.0')).toBe('my_repo_feat_v1_0')
  })
})

describe('worktreeBranchName', () => {
  test('slug simple → "worktree-slug"', () => {
    expect(worktreeBranchName('foo')).toBe('worktree-foo')
  })

  test('slug anidado: / → + (evita conflicto D/F)', () => {
    // Contrato documentado: "user/feature" NO debe producir un ref de
    // rama que entre en conflicto con el directorio padre "worktree-user".
    expect(worktreeBranchName('user/feature')).toBe('worktree-user+feature')
  })

  test('múltiples slashes todos aplanados', () => {
    expect(worktreeBranchName('a/b/c')).toBe('worktree-a+b+c')
  })

  test('guiones en el slug preservados', () => {
    expect(worktreeBranchName('feat-add-auth')).toBe('worktree-feat-add-auth')
  })

  test('guiones bajos en el slug preservados', () => {
    expect(worktreeBranchName('snake_case')).toBe('worktree-snake_case')
  })

  test('puntos en el slug preservados', () => {
    expect(worktreeBranchName('v1.0')).toBe('worktree-v1.0')
  })

  test('el resultado siempre empieza con el prefijo "worktree-"', () => {
    for (const slug of ['x', 'a/b', 'feat', 'v1.0']) {
      expect(worktreeBranchName(slug).startsWith('worktree-')).toBe(true)
    }
  })

  test('el mapeo slug-a-rama es INYECTIVO para slugs VÁLIDOS', () => {
    // Contrato documentado: + NO está en la lista blanca del slug
    // ([a-zA-Z0-9._-]). Así que los slugs que pasan validateWorktreeSlug
    // producen nombres de rama únicos.
    // 'user+feature' es INVÁLIDO (+ no permitido), así que no se incluye.
    const validSlugs = ['user/feature', 'user-feature', 'user']
    const branches = validSlugs.map(worktreeBranchName)
    expect(new Set(branches).size).toBe(branches.length)
  })
})

describe('worktreeBranchName + generateTmuxSessionName: composición', () => {
  test('la rama generada puede pasar por el nombrado de sesión tmux', () => {
    const branch = worktreeBranchName('feat/v1.0')
    // = 'worktree-feat+v1.0'
    const session = generateTmuxSessionName('/path/repo', branch)
    // Los puntos se reemplazan por _ en la sesión tmux, pero el + sobrevive.
    expect(session).toBe('repo_worktree-feat+v1_0')
  })
})
