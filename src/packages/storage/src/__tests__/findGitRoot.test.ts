import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  findGitRoot,
  setFindGitRootDiagnosticsFn,
  type FindGitRootLogPayload,
} from '../findGitRoot.js'

let parentDir: string
let repoDir: string

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

beforeEach(async () => {
  parentDir = await mkdtemp(join(tmpdir(), 'find-git-root-'))
  repoDir = join(parentDir, 'repo')
  await mkdir(repoDir, { recursive: true })
  git(['init', '-q'], repoDir)
})

afterEach(async () => {
  setFindGitRootDiagnosticsFn(() => {})
  await rm(parentDir, { recursive: true, force: true })
})

describe('findGitRoot', () => {
  test('desde la raíz misma del repo devuelve esa ruta', async () => {
    expect(findGitRoot(repoDir)).toBe(await realpath(repoDir))
  })

  test('desde un subdirectorio anidado sube hasta encontrar .git', async () => {
    const nested = join(repoDir, 'a', 'b', 'c')
    await mkdir(nested, { recursive: true })
    expect(findGitRoot(nested)).toBe(await realpath(repoDir))
  })

  test('fuera de cualquier repo devuelve null', async () => {
    const outside = join(parentDir, 'sin-git')
    await mkdir(outside, { recursive: true })
    expect(findGitRoot(outside)).toBeNull()
  })

  test('un worktree (.git es ARCHIVO, no directorio) también se detecta', async () => {
    const wt = join(parentDir, 'worktree')
    await writeFile(join(repoDir, 'x.txt'), 'x')
    git(['add', '.'], repoDir)
    git(['-c', 'user.email=t@t.local', '-c', 'user.name=T', 'commit', '-q', '-m', 'x'], repoDir)
    git(['worktree', 'add', '-q', '-b', 'wt-branch', wt], repoDir)
    expect(findGitRoot(wt)).toBe(await realpath(wt))
  })

  test('memoiza — dos llamadas al mismo path sólo emiten diagnósticos una vez', async () => {
    const events: string[] = []
    setFindGitRootDiagnosticsFn((event: string) => events.push(event))
    const fresh = join(parentDir, 'memo-target')
    await mkdir(fresh, { recursive: true })

    findGitRoot(fresh)
    findGitRoot(fresh)

    expect(events.filter(e => e === 'find_git_root_started')).toHaveLength(1)
  })

  test('el diagnóstico de "completed" trae found:true y un stat_count > 0', async () => {
    let payload: FindGitRootLogPayload | undefined
    setFindGitRootDiagnosticsFn((event, p) => {
      if (event === 'find_git_root_completed') payload = p
    })
    const uniqueDir = join(repoDir, 'diag-target')
    await mkdir(uniqueDir, { recursive: true })

    findGitRoot(uniqueDir)

    expect(payload?.found).toBe(true)
    expect(payload?.stat_count).toBeGreaterThan(0)
  })
})
