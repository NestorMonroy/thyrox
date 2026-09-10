import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFile, execFileSync } from 'child_process'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  getWorktreePaths,
  setExecFileNoThrowWithCwdFn,
  setGitExeFn,
  setLogEventFn,
  type ExecFileNoThrowResult,
} from '../getWorktreePaths.js'

let parentDir: string
let repoDir: string

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

const realExecFileNoThrowWithCwd: Parameters<
  typeof setExecFileNoThrowWithCwdFn
>[0] = (file, args, opts) =>
  new Promise(resolve => {
    execFile(file, args, { cwd: opts.cwd, encoding: 'utf8' }, (err, stdout, stderr) => {
      resolve({ stdout: err ? '' : stdout, stderr: err ? '' : stderr, code: err ? 1 : 0 })
    })
  })

beforeEach(async () => {
  parentDir = await mkdtemp(join(tmpdir(), 'get-worktree-paths-'))
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
  setGitExeFn(() => 'git')
  setLogEventFn(() => {})
  setExecFileNoThrowWithCwdFn(realExecFileNoThrowWithCwd)
  await rm(parentDir, { recursive: true, force: true })
})

describe('getWorktreePaths', () => {
  test('un solo worktree devuelve exactamente esa ruta', async () => {
    const paths = await getWorktreePaths(repoDir)
    expect(paths).toEqual([await realpath(repoDir)])
  })

  test('el worktree ACTUAL va primero aunque el porcelain lo liste al final', async () => {
    // git ya devuelve el listado con el worktree principal primero y el
    // resto alfabético (verificado con un repo real), así que para probar
    // DE VERDAD el reordenamiento propio de esta función — no el de git —
    // se inyecta un stdout crudo donde el worktree "actual" aparece al
    // final, fuera de orden alfabético.
    setExecFileNoThrowWithCwdFn(async () => ({
      stdout: [
        'worktree /repos/zeta',
        'worktree /repos/alfa',
        'worktree /repos/beta-actual',
        '',
      ].join('\n'),
      stderr: '',
      code: 0,
    }))

    const paths = await getWorktreePaths('/repos/beta-actual')
    expect(paths).toEqual(['/repos/beta-actual', '/repos/alfa', '/repos/zeta'])
  })

  test('sin worktree actual entre los listados, el orden completo es alfabético', async () => {
    setExecFileNoThrowWithCwdFn(async () => ({
      stdout: ['worktree /repos/zeta', 'worktree /repos/alfa', ''].join('\n'),
      stderr: '',
      code: 0,
    }))

    const paths = await getWorktreePaths('/repos/no-es-ninguno-de-estos')
    expect(paths).toEqual(['/repos/alfa', '/repos/zeta'])
  })

  test('un directorio que no es repo git devuelve []', async () => {
    const noGit = join(parentDir, 'no-git')
    await mkdir(noGit, { recursive: true })
    expect(await getWorktreePaths(noGit)).toEqual([])
  })

  test('emite tengu_worktree_detection con success:true y el conteo correcto', async () => {
    const events: Array<[string, Record<string, unknown>]> = []
    setLogEventFn((name, payload) => events.push([name, payload]))

    await getWorktreePaths(repoDir)

    expect(events).toHaveLength(1)
    expect(events[0]?.[0]).toBe('tengu_worktree_detection')
    expect(events[0]?.[1]?.success).toBe(true)
    expect(events[0]?.[1]?.worktree_count).toBe(1)
  })

  test('cuando el comando falla (code != 0), emite success:false y devuelve []', async () => {
    setExecFileNoThrowWithCwdFn(
      async (): Promise<ExecFileNoThrowResult> => ({
        stdout: '',
        stderr: 'boom',
        code: 1,
      }),
    )
    const events: Array<[string, Record<string, unknown>]> = []
    setLogEventFn((name, payload) => events.push([name, payload]))

    const paths = await getWorktreePaths(repoDir)

    expect(paths).toEqual([])
    expect(events[0]?.[1]?.success).toBe(false)
  })

  test('gitExe() resuelve el ejecutable usado — se invoca con el nombre inyectado', async () => {
    const invoked: string[] = []
    setExecFileNoThrowWithCwdFn(async (file): Promise<ExecFileNoThrowResult> => {
      invoked.push(file)
      return { stdout: '', stderr: '', code: 1 }
    })
    setGitExeFn(() => '/usr/bin/git-personalizado')

    await getWorktreePaths(repoDir)

    expect(invoked).toEqual(['/usr/bin/git-personalizado'])
  })
})
