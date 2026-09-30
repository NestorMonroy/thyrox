import { afterEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

import {
  CLI_VERSION_PATTERN,
  hasBinaryChanged,
  isManagedVersionedBuild,
  respawnDaemonOnUpgrade,
  resolveBinaryStat,
  sanitizeCliVersion,
  shutdownWithDrainGrace,
  trackPending,
} from '../upgradeProbe.js'

const dirsToClean: string[] = []

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'thyrox-upgrade-probe-'))
  dirsToClean.push(dir)
  return dir
}

afterEach(async () => {
  while (dirsToClean.length > 0) {
    const dir = dirsToClean.pop()
    if (dir) await rm(dir, { recursive: true, force: true })
  }
})

describe('CLI_VERSION_PATTERN / sanitizeCliVersion', () => {
  test('accepts a normal semver-ish version', () => {
    expect(CLI_VERSION_PATTERN.test('2.1.283')).toBe(true)
    expect(sanitizeCliVersion('2.1.283')).toBe('2.1.283')
  })

  test('rejects control characters and shell metacharacters', () => {
    expect(sanitizeCliVersion('2.1.283; rm -rf /')).toBe('unrecognized')
    expect(sanitizeCliVersion('\x1b[31mred\x1b[0m')).toBe('unrecognized')
  })

  test('rejects an empty string and one over 100 chars', () => {
    expect(sanitizeCliVersion('')).toBe('unrecognized')
    expect(sanitizeCliVersion('a'.repeat(101))).toBe('unrecognized')
  })
})

describe('resolveBinaryStat', () => {
  test('returns target + mtimeMs for a readable file', async () => {
    const dir = await makeTempDir()
    const file = join(dir, 'bin')
    await writeFile(file, 'x')
    const result = await resolveBinaryStat(file)
    expect(result).not.toBeNull()
    expect(result?.target).toBe(file)
    expect(typeof result?.mtimeMs).toBe('number')
  })

  test('follows a symlink to its real target', async () => {
    const dir = await makeTempDir()
    const real = join(dir, 'real-bin')
    const link = join(dir, 'link-bin')
    await writeFile(real, 'x')
    await symlink(real, link)
    const result = await resolveBinaryStat(link)
    expect(result?.target).toBe(real)
  })

  test('ENOENT resolves to null, not a throw', async () => {
    const dir = await makeTempDir()
    const missing = join(dir, 'does-not-exist')
    const result = await resolveBinaryStat(missing)
    expect(result).toBeNull()
  })

  test('a non-ENOENT error rethrows for the caller to classify', async () => {
    const deps = {
      realpath: async () => {
        throw Object.assign(new Error('denied'), { code: 'EACCES' })
      },
      stat: async () => ({ mtimeMs: 0 }),
    }
    await expect(resolveBinaryStat('/whatever', deps)).rejects.toThrow('denied')
  })
})

describe('isManagedVersionedBuild', () => {
  test('false when not a bundled/standalone build', () => {
    expect(isManagedVersionedBuild('/home/user/.local/share/ccb/versions/2.1.283/ccb', false)).toBe(false)
  })

  test('true only when bundled AND execPath sits under the managed versions dir', () => {
    const dataHome = process.env.XDG_DATA_HOME ?? join(process.env.HOME ?? '/root', '.local', 'share')
    const managed = join(dataHome, 'ccb', 'versions', '2.1.283', 'ccb')
    expect(isManagedVersionedBuild(managed, true)).toBe(true)
  })

  test('bundled but outside the managed versions dir is false', () => {
    expect(isManagedVersionedBuild('/opt/homebrew/bin/ccb', true)).toBe(false)
  })
})

describe('hasBinaryChanged', () => {
  test('different target is always a change, regardless of managed build', () => {
    const previous = { target: '/a', mtimeMs: 100 }
    const current = { target: '/b', mtimeMs: 100 }
    expect(hasBinaryChanged(previous, current, true)).toBe(true)
    expect(hasBinaryChanged(previous, current, false)).toBe(true)
  })

  test('same target + different mtime is a change when not a managed build', () => {
    const previous = { target: '/a', mtimeMs: 100 }
    const current = { target: '/a', mtimeMs: 200 }
    expect(hasBinaryChanged(previous, current, false)).toBe(true)
  })

  test('same target + different mtime is NOT a change on a managed build (Kat descuento)', () => {
    const previous = { target: '/a', mtimeMs: 100 }
    const current = { target: '/a', mtimeMs: 200 }
    expect(hasBinaryChanged(previous, current, true)).toBe(false)
  })

  test('same target + same mtime is never a change', () => {
    const previous = { target: '/a', mtimeMs: 100 }
    const current = { target: '/a', mtimeMs: 100 }
    expect(hasBinaryChanged(previous, current, false)).toBe(false)
  })
})

describe('trackPending', () => {
  test('adds the promise and removes it once settled (fulfilled)', async () => {
    const pending = new Set<Promise<unknown>>()
    let resolveIt: () => void = () => {}
    const promise = new Promise<void>(resolve => {
      resolveIt = resolve
    })
    trackPending(pending, promise)
    expect(pending.has(promise)).toBe(true)
    resolveIt()
    await promise
    await Promise.resolve()
    expect(pending.has(promise)).toBe(false)
  })

  test('also removes it on rejection', async () => {
    const pending = new Set<Promise<unknown>>()
    const promise = Promise.reject(new Error('boom'))
    trackPending(pending, promise)
    expect(pending.has(promise)).toBe(true)
    await promise.catch(() => {})
    await Promise.resolve()
    expect(pending.has(promise)).toBe(false)
  })
})

describe('shutdownWithDrainGrace', () => {
  test('exits with the given code once all drain tasks settle', async () => {
    const order: string[] = []
    const exit = mock((code: number) => {
      order.push(`exit:${code}`)
    })
    await shutdownWithDrainGrace(0, {
      drainTasks: [
        async () => {
          order.push('a')
        },
        async () => {
          order.push('b')
        },
      ],
      exit,
    })
    expect(exit).toHaveBeenCalledWith(0)
    expect(order).toEqual(['a', 'b', 'exit:0'])
  })

  test('exits after graceMs even if a drain task never settles', async () => {
    const exit = mock((_code: number) => {})
    const start = Date.now()
    await shutdownWithDrainGrace(1, {
      drainTasks: [() => new Promise(() => {})],
      exit,
      graceMs: 20,
    })
    expect(Date.now() - start).toBeLessThan(500)
    expect(exit).toHaveBeenCalledWith(1)
  })

  test('a rejecting drain task does not prevent exit', async () => {
    const exit = mock((_code: number) => {})
    await shutdownWithDrainGrace(2, {
      drainTasks: [async () => Promise.reject(new Error('drain failed'))],
      exit,
    })
    expect(exit).toHaveBeenCalledWith(2)
  })
})

describe('respawnDaemonOnUpgrade', () => {
  function baseDeps() {
    return {
      spawnDaemon: mock(async () => ({ err: null as unknown, stderrPath: undefined as string | undefined })),
      waitReachable: mock(async () => true),
      readStderrTail: mock(async () => ''),
      openSuccessorLog: mock(async () => ({
        write: mock((_source: string, _line: string) => {}),
        close: mock(async () => {}),
      })),
      removeStderrCaptureDir: mock(async () => {}),
      logError: mock((_e: unknown) => {}),
      logEvent: mock((_n: string, _m?: Record<string, unknown>) => {}),
    }
  }

  test('happy path: spawns with the right flags, becomes reachable, no logging at all', async () => {
    const deps = baseDeps()
    await respawnDaemonOnUpgrade('/j.json', '/log.txt', 'transient', 'parent-x', deps)
    expect(deps.spawnDaemon).toHaveBeenCalledWith([
      'daemon',
      'run',
      '--json-path',
      '/j.json',
      '--log-file',
      '/log.txt',
      '--origin',
      'transient',
      '--spawned-by',
      'parent-x',
    ])
    expect(deps.waitReachable).toHaveBeenCalledWith(45_000)
    expect(deps.openSuccessorLog).not.toHaveBeenCalled()
    expect(deps.logError).not.toHaveBeenCalled()
    expect(deps.logEvent).not.toHaveBeenCalled()
  })

  test('omits --spawned-by when there is no parent', async () => {
    const deps = baseDeps()
    await respawnDaemonOnUpgrade('/j.json', '/log.txt', 'transient', undefined, deps)
    expect(deps.spawnDaemon).toHaveBeenCalledWith([
      'daemon',
      'run',
      '--json-path',
      '/j.json',
      '--log-file',
      '/log.txt',
      '--origin',
      'transient',
    ])
  })

  test('spawn failure: writes to the successor log, cleans up stderr, logError + tengu_bg_daemon_spawn_failed — no unreachable event', async () => {
    const deps = baseDeps()
    deps.spawnDaemon = mock(async () => ({
      err: Object.assign(new Error('spawn EACCES'), { code: 'EACCES' }),
      stderrPath: '/tmp/xx/stderr.log',
    }))
    await respawnDaemonOnUpgrade('/j.json', '/log.txt', 'auto', undefined, deps)
    expect(deps.openSuccessorLog).toHaveBeenCalledWith('/log.txt')
    expect(deps.removeStderrCaptureDir).toHaveBeenCalledWith('/tmp/xx/stderr.log')
    expect(deps.logError).toHaveBeenCalledTimes(1)
    expect(deps.logEvent).toHaveBeenCalledWith('tengu_bg_daemon_spawn_failed', {
      respawn: true,
      errno_enoent: false,
      errno_eacces: true,
      errno: 'EACCES',
    })
    expect(deps.logEvent).not.toHaveBeenCalledWith(
      'tengu_daemon_upgrade_respawn_unreachable',
      expect.anything(),
    )
  })

  test('spawned but unreachable: logs tengu_daemon_upgrade_respawn_unreachable, no logError (spawn itself succeeded)', async () => {
    const deps = baseDeps()
    deps.waitReachable = mock(async () => false)
    await respawnDaemonOnUpgrade('/j.json', '/log.txt', 'auto', undefined, deps)
    expect(deps.logEvent).toHaveBeenCalledWith('tengu_daemon_upgrade_respawn_unreachable', {
      stderr_captured: false,
    })
    expect(deps.logError).not.toHaveBeenCalled()
  })

  test('redacts the random daemon temp-dir id out of the captured stderr tail', async () => {
    const deps = baseDeps()
    deps.waitReachable = mock(async () => false)
    deps.spawnDaemon = mock(async () => ({ err: null, stderrPath: '/tmp/cc-daemon-abc123/stderr.log' }))
    deps.readStderrTail = mock(async () => 'boom in /tmp/cc-daemon-0123456789abcdef/x\n')
    let written = ''
    deps.openSuccessorLog = mock(async () => ({
      write: mock((_source: string, line: string) => {
        written = line
      }),
      close: mock(async () => {}),
    }))
    await respawnDaemonOnUpgrade('/j.json', '/log.txt', 'auto', undefined, deps)
    expect(written).toContain('cc-daemon-*')
    expect(written).not.toContain('0123456789abcdef')
  })
})
