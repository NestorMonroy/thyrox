/**
 * `git.ts` — lo que el árbol sabe del repositorio donde corre.
 *
 * Procedencia del sujeto: `ccnmt: packages/storage/src/git.ts` (856 líneas,
 * 28 exports). El puerto vigente declara CINCO y llama al resto «divergencia
 * de alcance» por dependencias que ya no faltan.
 *
 * Las dos mitades que estas aserciones vigilan no son simétricas:
 *
 * - `findCanonicalGitRoot` e `isCurrentDirectoryBareGitRepo` son GUARDAS DE
 *   SEGURIDAD. Los archivos que leen —`.git`, `commondir`, `gitdir`— vienen
 *   dentro del repositorio clonado, o sea que los controla quien lo publica.
 *   Sin las dos validaciones estructurales, un repo malicioso apunta su
 *   `commondir` a cualquier ruta que la víctima ya haya confiado y se salta
 *   el diálogo de confianza. Por eso hay más casos de ataque que de camino
 *   feliz.
 * - El resto son envoltorios de `git` que se miden contra repositorios
 *   REALES creados en un temporal, no contra un sustituto: un envoltorio
 *   probado contra su propio sustituto no mide nada.
 *
 * *Métrica:* la conducta observable de cada símbolo sobre repositorios reales
 * creados en un temporal, más las tres formas de ataque contra las guardas.
 * *Ciega a:* `getWorktreeCount`, `getHead`, `getBranch`, `getDefaultBranch` y
 * `getRemoteUrl`, que son pasos directos a la capa CACHEADA de
 * `config/gitFilesystem`. Medido al escribir esto: esa capa memoiza por
 * proceso, así que un worktree creado a mitad del caso no cambia su conteo, y
 * la URL de remoto que reporta puede ser la del árbol donde corre la suite y
 * no la del repositorio recién creado. No es un defecto de `git.ts` —es su
 * contrato con esa capa— pero sí acota lo que estos casos pueden afirmar.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let base: string
let cwdOriginal: string

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'T',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 'T',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  })
}

/** Un repositorio real con un commit: lo mínimo que git considera repo. */
function makeRepo(name: string): string {
  const dir = join(base, name)
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q', '-b', 'main')
  writeFileSync(join(dir, 'a.txt'), 'uno\n')
  git(dir, 'add', 'a.txt')
  git(dir, 'commit', '-q', '-m', 'inicial')
  return dir
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'git-'))
  cwdOriginal = process.cwd()
})

afterEach(() => {
  // El cwd se restaura SIEMPRE: los casos que lo cambian corren comandos de
  // git, y `execFileNoThrow` con `preserveOutputOnError` explícito pierde el
  // default `useCwd` de la fuente — así que el comando sale en el cwd del
  // proceso, no en el sobrepuesto. Es fiel a la fuente, y obliga a esto.
  process.chdir(cwdOriginal)
  rmSync(base, { recursive: true, force: true })
})

describe('findCanonicalGitRoot — la identidad estable del proyecto', () => {
  test('1. en un repo normal devuelve su propia raíz', async () => {
    const { findCanonicalGitRoot } = await import('../git.ts')
    const repo = makeRepo('normal')
    expect(findCanonicalGitRoot(repo)).toBe(repo)
  })

  test('2. fuera de un repositorio devuelve null', async () => {
    const { findCanonicalGitRoot } = await import('../git.ts')
    const suelto = join(base, 'suelto')
    mkdirSync(suelto)
    expect(findCanonicalGitRoot(suelto)).toBeNull()
  })

  test('3. un worktree legítimo resuelve al repo PRINCIPAL', async () => {
    // Es la razón de ser de la función: dos worktrees del mismo repo tienen
    // que compartir identidad de proyecto, o cada uno estrena su estado.
    const { findCanonicalGitRoot } = await import('../git.ts')
    const repo = makeRepo('principal')
    const wt = join(base, 'wt')
    git(repo, 'worktree', 'add', '-q', wt, '-b', 'rama')
    expect(findCanonicalGitRoot(wt)).toBe(repo)
  })

  test('4. ATAQUE: un `commondir` fuera de `<común>/worktrees` no promueve', async () => {
    // Sin esta validación, un repo publicado por un tercero apunta su
    // commondir a un directorio que la víctima ya confió, y hereda su
    // confianza.
    const { findCanonicalGitRoot } = await import('../git.ts')
    const victima = makeRepo('victima')
    const malo = join(base, 'malo')
    mkdirSync(join(malo, 'falso'), { recursive: true })
    writeFileSync(join(malo, '.git'), 'gitdir: ./falso\n')
    // `commondir` apunta al `.git` de la víctima, pero `falso` NO cuelga de
    // `<victima>/.git/worktrees`.
    writeFileSync(join(malo, 'falso', 'commondir'), join(victima, '.git'))
    writeFileSync(join(malo, 'falso', 'gitdir'), join(malo, '.git'))
    expect(findCanonicalGitRoot(malo)).toBe(malo)
  })

  test('5. ATAQUE: sin el back-link correcto tampoco promueve', async () => {
    // La primera validación sola no basta: si la víctima ya tiene un
    // worktree del repo confiado, un atacante puede tomar prestada esa
    // entrada adivinando su ruta. El `gitdir` de vuelta lo impide.
    const { findCanonicalGitRoot } = await import('../git.ts')
    const victima = makeRepo('victima2')
    const wt = join(base, 'wt2')
    git(victima, 'worktree', 'add', '-q', wt, '-b', 'r2')
    // Un directorio distinto que apunta a la entrada de worktree AJENA.
    const ladron = join(base, 'ladron')
    mkdirSync(ladron, { recursive: true })
    writeFileSync(
      join(ladron, '.git'),
      `gitdir: ${join(victima, '.git', 'worktrees', 'wt2')}\n`,
    )
    expect(findCanonicalGitRoot(ladron)).toBe(ladron)
  })

  test('6. un submódulo NO se promueve: es otro repositorio', async () => {
    // `.git` es un archivo pero no hay `commondir`. La fuente cae al root de
    // entrada, y es lo correcto — un submódulo tiene identidad propia.
    const { findCanonicalGitRoot } = await import('../git.ts')
    const padre = makeRepo('padre')
    const sub = join(padre, 'sub')
    mkdirSync(join(padre, '.git', 'modules', 'sub'), { recursive: true })
    mkdirSync(sub)
    writeFileSync(
      join(sub, '.git'),
      `gitdir: ${join(padre, '.git', 'modules', 'sub')}\n`,
    )
    expect(findCanonicalGitRoot(sub)).toBe(sub)
  })

  test('7. el resultado se cachea, y la caché se puede vaciar', async () => {
    const { findCanonicalGitRoot } = await import('../git.ts')
    const repo = makeRepo('cacheado')
    expect(findCanonicalGitRoot(repo)).toBe(repo)
    expect(typeof findCanonicalGitRoot.cache.clear).toBe('function')
  })
})

describe('isCurrentDirectoryBareGitRepo — la guarda contra el repo desnudo', () => {
  test('8. un repo normal NO se marca', async () => {
    const { isCurrentDirectoryBareGitRepo } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const repo = makeRepo('sano')
    expect(runWithCwdOverride(repo, isCurrentDirectoryBareGitRepo)).toBe(false)
  })

  test('9. un directorio con HEAD, objects y refs SÍ se marca', async () => {
    // El ataque: git trata ese directorio como repositorio desnudo y ejecuta
    // `hooks/pre-commit` desde ahí.
    const { isCurrentDirectoryBareGitRepo } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const d = join(base, 'desnudo')
    mkdirSync(join(d, 'objects'), { recursive: true })
    mkdirSync(join(d, 'refs'))
    writeFileSync(join(d, 'HEAD'), 'ref: refs/heads/main\n')
    expect(runWithCwdOverride(d, isCurrentDirectoryBareGitRepo)).toBe(true)
  })

  test('10. un `.git/HEAD` que es DIRECTORIO no salva al repo', async () => {
    // Una comprobación de existencia a secas pasaría. Git exige un HEAD que
    // sea archivo regular; si no, vuelve a descubrir desde el cwd — que es
    // justo el camino que esta guarda vigila.
    const { isCurrentDirectoryBareGitRepo } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const d = join(base, 'head-dir')
    mkdirSync(join(d, '.git', 'HEAD'), { recursive: true })
    mkdirSync(join(d, 'objects'), { recursive: true })
    expect(runWithCwdOverride(d, isCurrentDirectoryBareGitRepo)).toBe(true)
  })

  test('11. un `.git` que es ARCHIVO (worktree) no se marca', async () => {
    const { isCurrentDirectoryBareGitRepo } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const d = join(base, 'wt-como-archivo')
    mkdirSync(d)
    writeFileSync(join(d, '.git'), 'gitdir: /donde/sea\n')
    // Y con los tres indicadores presentes: el `.git` archivo gana.
    mkdirSync(join(d, 'objects'))
    expect(runWithCwdOverride(d, isCurrentDirectoryBareGitRepo)).toBe(false)
  })

  test('12. un directorio pelado no se marca', async () => {
    const { isCurrentDirectoryBareGitRepo } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const d = join(base, 'pelado')
    mkdirSync(d)
    expect(runWithCwdOverride(d, isCurrentDirectoryBareGitRepo)).toBe(false)
  })
})

describe('los envoltorios de git, contra repositorios reales', () => {
  test('13. `gitExe` resuelve el binario y se memoiza', async () => {
    const { gitExe } = await import('../git.ts')
    const uno = gitExe()
    expect(uno.length).toBeGreaterThan(0)
    expect(gitExe()).toBe(uno)
  })

  test('14. un repo recién commiteado está limpio y sin cambios', async () => {
    const { getIsClean, getChangedFiles } = await import('../git.ts')
    process.chdir(makeRepo('limpio'))
    expect(await getIsClean()).toBe(true)
    expect(await getChangedFiles()).toEqual([])
  })

  test('15. `getFileStatus` separa lo seguido de lo no seguido', async () => {
    const { getFileStatus } = await import('../git.ts')
    const repo = makeRepo('estado')
    writeFileSync(join(repo, 'a.txt'), 'dos\n')
    writeFileSync(join(repo, 'nuevo.txt'), 'x\n')
    process.chdir(repo)
    const { tracked, untracked } = await getFileStatus()
    expect(tracked).toEqual(['a.txt'])
    expect(untracked).toEqual(['nuevo.txt'])
  })

  test('16. `ignoreUntracked` cambia el veredicto, y sin él no', async () => {
    // Es el par que discrimina: con sólo un archivo sin seguir, el mismo
    // repositorio está sucio o limpio según la opción.
    const { getIsClean } = await import('../git.ts')
    const repo = makeRepo('sucio')
    writeFileSync(join(repo, 'suelto.txt'), 'x\n')
    process.chdir(repo)
    expect(await getIsClean()).toBe(false)
    expect(await getIsClean({ ignoreUntracked: true })).toBe(true)
  })

  test('17. sin remoto, `findRemoteBase` devuelve null', async () => {
    const { findRemoteBase } = await import('../git.ts')
    process.chdir(makeRepo('sin-remoto'))
    expect(await findRemoteBase()).toBeNull()
  })

  test('18. sin remoto, `getIsHeadOnRemote` es false y no lanza', async () => {
    const { getIsHeadOnRemote, hasUnpushedCommits } = await import('../git.ts')
    process.chdir(makeRepo('sin-upstream'))
    expect(await getIsHeadOnRemote()).toBe(false)
    expect(await hasUnpushedCommits()).toBe(false)
  })

  test('19. `stashToCleanState` guarda TAMBIÉN lo no seguido', async () => {
    // Sin el `git add` previo, `git stash` deja los archivos sin seguir en
    // el árbol: se perderían al cambiar de rama. Ése es el defecto que el
    // paso extra evita.
    const { stashToCleanState, getIsClean } = await import('../git.ts')
    const repo = makeRepo('guardado')
    writeFileSync(join(repo, 'a.txt'), 'cambiado\n')
    writeFileSync(join(repo, 'nuevo.txt'), 'x\n')
    process.chdir(repo)
    expect(await stashToCleanState('prueba')).toBe(true)
    expect(await getIsClean()).toBe(true)
  })

  test('20. `getChangedFiles` quita el prefijo de estado de cada línea', async () => {
    // La salida de `status --porcelain` trae dos columnas de estado antes de
    // la ruta. Sin quitarlas, el consumidor recibe ` M archivo` y no encuentra
    // el archivo — el defecto no se ve en el conteo, sólo en el nombre.
    const { getChangedFiles } = await import('../git.ts')
    const repo = makeRepo('prefijo')
    writeFileSync(join(repo, 'a.txt'), 'cambiado\n')
    writeFileSync(join(repo, 'z.txt'), 'nuevo\n')
    process.chdir(repo)
    const cambiados = await getChangedFiles()
    expect(cambiados).toContain('a.txt')
    expect(cambiados).toContain('z.txt')
    expect(cambiados.every(f => !f.startsWith(' ') && !f.includes('?'))).toBe(
      true,
    )
  })

  test('21. `isAtGitRoot` distingue la raíz de un subdirectorio', async () => {
    const { isAtGitRoot } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    const repo = makeRepo('raiz')
    const hijo = join(repo, 'sub')
    mkdirSync(hijo)
    expect(await runWithCwdOverride(repo, isAtGitRoot)).toBe(true)
    expect(await runWithCwdOverride(hijo, isAtGitRoot)).toBe(false)
  })

  test('22. `dirIsInGitRepo` responde por el directorio que se le da', async () => {
    const { dirIsInGitRepo } = await import('../git.ts')
    const repo = makeRepo('dentro')
    expect(await dirIsInGitRepo(join(repo, 'no-existe-aun'))).toBe(true)
    expect(await dirIsInGitRepo(base)).toBe(false)
  })

  test('23. `getGitDir` devuelve el directorio de git del cwd', async () => {
    const { getGitDir } = await import('../git.ts')
    const repo = makeRepo('gitdir')
    expect(await getGitDir(repo)).toBe(join(repo, '.git'))
    expect(await getGitDir(base)).toBeNull()
  })

  test('24. fuera de un repo, `preserveGitStateForIssue` devuelve null', async () => {
    const { preserveGitStateForIssue } = await import('../git.ts')
    const { runWithCwdOverride } = await import(
      '@thyrox/app-host/bootstrap/cwd.js'
    )
    process.chdir(base)
    expect(await runWithCwdOverride(base, preserveGitStateForIssue)).toBeNull()
  })
})

describe('getRepoRemoteHash — la identidad del remoto, sin el remoto', () => {
  test('25. el hash sale de la URL NORMALIZADA, no de la cruda', async () => {
    // Las cuatro formas de nombrar el mismo repositorio tienen que dar el
    // mismo hash, o el estado por proyecto se fragmenta según cómo se clonó.
    const { normalizeGitRemoteUrl } = await import('../git.ts')
    const formas = [
      'git@github.com:owner/repo.git',
      'https://github.com/owner/repo.git',
      'ssh://git@github.com/owner/repo',
      'https://github.com/owner/repo/',
    ]
    const normalizadas = new Set(formas.map(f => normalizeGitRemoteUrl(f)))
    expect(normalizadas.size).toBe(1)
    expect([...normalizadas][0]).toBe('github.com/owner/repo')
  })

  test('26. el hash es sha256 de la URL normalizada, recortado a 16', async () => {
    // Se compone contra la URL que el propio módulo reporta, no contra una
    // inventada: así el caso mide la COMPOSICIÓN —normalizar, luego hashear,
    // luego recortar— que es lo que git.ts aporta. Hashear la URL cruda, o
    // recortar a otra longitud, lo rompe.
    const { getRepoRemoteHash, getRemoteUrl, normalizeGitRemoteUrl } =
      await import('../git.ts')
    const url = await getRemoteUrl()
    const hash = await getRepoRemoteHash()
    if (url === null) {
      expect(hash).toBeNull()
      return
    }
    const esperado = createHash('sha256')
      .update(normalizeGitRemoteUrl(url)!)
      .digest('hex')
      .substring(0, 16)
    expect(hash).toBe(esperado)
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })
})
