import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'child_process'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { getWorktreePathsPortable } from '../getWorktreePathsPortable.js'

let repoDir: string
let parentDir: string

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

beforeEach(async () => {
  parentDir = await mkdtemp(join(tmpdir(), 'wt-portable-'))
  repoDir = join(parentDir, 'repo')
  await mkdir(repoDir, { recursive: true })
  git(['init', '-q'], repoDir)
  git(['config', 'user.email', 'test@test.local'], repoDir)
  git(['config', 'user.name', 'Test'], repoDir)
  await writeFile(join(repoDir, 'README.md'), 'hola\n')
  git(['add', '.'], repoDir)
  git(['commit', '-q', '-m', 'inicial'], repoDir)
})

afterEach(async () => {
  await rm(parentDir, { recursive: true, force: true })
})

describe('getWorktreePathsPortable', () => {
  test('un repo con un solo worktree devuelve exactamente esa ruta', async () => {
    const paths = await getWorktreePathsPortable(repoDir)
    expect(paths).toHaveLength(1)
    expect(paths[0]).toBe(await realpath(repoDir))
  })

  test('un repo con un worktree adicional devuelve las dos rutas', async () => {
    const extraDir = join(parentDir, 'extra-worktree')
    git(['worktree', 'add', '-q', '-b', 'rama-extra', extraDir], repoDir)

    const paths = await getWorktreePathsPortable(repoDir)
    expect(paths).toHaveLength(2)
    const resolvedRepo = await realpath(repoDir)
    const resolvedExtra = await realpath(extraDir)
    expect(paths).toContain(resolvedRepo)
    expect(paths).toContain(resolvedExtra)
  })

  test('un directorio que NO es repo git devuelve []', async () => {
    const noGitDir = join(parentDir, 'no-git')
    await mkdir(noGitDir, { recursive: true })
    expect(await getWorktreePathsPortable(noGitDir)).toEqual([])
  })

  test('un cwd inexistente no lanza — devuelve []', async () => {
    const missing = join(parentDir, 'no-existe-jamas')
    expect(await getWorktreePathsPortable(missing)).toEqual([])
  })
})
