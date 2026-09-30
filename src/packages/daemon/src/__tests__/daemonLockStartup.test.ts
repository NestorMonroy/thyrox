import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  acquireDaemonLockStoppingTransient,
  getDaemonLockPath,
  isProcessAlive,
  probeLockDisplacement,
  readDaemonLock,
  requestTransientYield,
  stopDaemonHolder,
  stopTransientLockHolder,
  type DaemonLockInfo,
} from '../daemonLock.js'
import type { Response } from '../socketProto.js'

const SHORT_GRACE_MS = 150
const dirs: string[] = []
const children: ChildProcess[] = []

afterEach(() => {
  while (children.length) children.pop()?.kill('SIGKILL')
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function tmpScope(): string {
  const dir = mkdtempSync(join(tmpdir(), 'daemon-lock-startup-'))
  dirs.push(dir)
  return dir
}

/** Proceso hijo real; con `ignoreSigterm` sobrevive a SIGTERM como un daemon atascado. */
async function spawnHolder(ignoreSigterm = false): Promise<number> {
  const script = ignoreSigterm
    ? "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)"
    : "console.log('ready'); setInterval(() => {}, 1000)"
  const child = spawn(process.execPath, ['-e', script], { stdio: ['ignore', 'pipe', 'ignore'] })
  children.push(child)
  await new Promise<void>(resolve => child.stdout?.once('data', () => resolve()))
  if (!child.pid) throw new Error('spawn failed to allocate a pid')
  return child.pid
}

async function writeLock(scope: string, lock: DaemonLockInfo): Promise<string> {
  const lockPath = getDaemonLockPath(scope)
  await Bun.write(lockPath, JSON.stringify(lock))
  return lockPath
}

describe('stopDaemonHolder (kyt)', () => {
  test('a holder that honours SIGTERM exits', async () => {
    const pid = await spawnHolder()
    expect(await stopDaemonHolder(pid, { gracefulMs: 2_000 })).toBe('exited')
    expect(isProcessAlive(pid)).toBe(false)
  })

  test('a holder that ignores SIGTERM times out', async () => {
    const pid = await spawnHolder(true)
    expect(await stopDaemonHolder(pid, { gracefulMs: SHORT_GRACE_MS })).toBe('timed-out')
    expect(isProcessAlive(pid)).toBe(true)
  })

  test('EPERM on SIGTERM is reported as eperm', async () => {
    const kill = spyOn(process, 'kill').mockImplementation(() => {
      throw Object.assign(new Error('Operation not permitted'), { code: 'EPERM' })
    })
    try {
      expect(await stopDaemonHolder(424242, { gracefulMs: SHORT_GRACE_MS })).toBe('eperm')
    } finally {
      kill.mockRestore()
    }
  })
})

describe('stopTransientLockHolder (Ayt)', () => {
  test('no lock means nothing to stop', async () => {
    const lockPath = getDaemonLockPath(tmpScope())
    expect(await stopTransientLockHolder(lockPath)).toEqual({ kind: 'none' })
  })

  test('a shell holder is never signalled', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'shell' })
    const result = await stopTransientLockHolder(lockPath)
    expect(result.kind).toBe('shell')
    expect(isProcessAlive(pid)).toBe(true)
  })

  test('a transient holder that exits is stopped', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    expect(await stopTransientLockHolder(lockPath)).toEqual({ kind: 'stopped', pid })
  })

  test('a transient holder that ignores SIGTERM is not-stopped / timed-out', async () => {
    const pid = await spawnHolder(true)
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const result = await stopTransientLockHolder(lockPath, { gracefulMs: SHORT_GRACE_MS })
    expect(result).toMatchObject({ kind: 'not-stopped', outcome: 'timed-out' })
  })
})

describe('acquireDaemonLockStoppingTransient', () => {
  test('the timed-out outcome is reachable from acquisition', async () => {
    const scope = tmpScope()
    const pid = await spawnHolder(true)
    await writeLock(scope, { pid, startedAt: 1, origin: 'transient' })
    const result = await acquireDaemonLockStoppingTransient(scope, 'service', { gracefulMs: SHORT_GRACE_MS })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.outcome).toBe('timed-out')
      expect(result.lock.pid).toBe(pid)
    }
  })

  test('a stopped transient holder hands the lock over', async () => {
    const scope = tmpScope()
    const pid = await spawnHolder()
    await writeLock(scope, { pid, startedAt: 1, origin: 'transient' })
    const result = await acquireDaemonLockStoppingTransient(scope, 'service')
    expect(result.ok).toBe(true)
    expect(readDaemonLock(getDaemonLockPath(scope))?.pid).toBe(process.pid)
  })

  test('a service holder keeps the original conflict (unverified)', async () => {
    const scope = tmpScope()
    const pid = await spawnHolder()
    await writeLock(scope, { pid, startedAt: 1, origin: 'service' })
    const result = await acquireDaemonLockStoppingTransient(scope, 'service')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.outcome).toBe('unverified')
    expect(isProcessAlive(pid)).toBe(true)
  })
})

describe('probeLockDisplacement', () => {
  const lock = (pid: number): DaemonLockInfo => ({ pid, startedAt: 1, origin: 'service' })

  test('no lock or our own lock is not a displacement', async () => {
    expect(await probeLockDisplacement('/x', 10, { readLock: () => null, retryDelayMs: 0 })).toBeNull()
    expect(await probeLockDisplacement('/x', 10, { readLock: () => lock(10), retryDelayMs: 0 })).toBeNull()
  })

  test('another pid holding the lock is the displacer', async () => {
    expect(await probeLockDisplacement('/x', 10, { readLock: () => lock(77), retryDelayMs: 0 })).toBe(77)
  })

  test('a single read failure is retried', async () => {
    let calls = 0
    const readLock = (): DaemonLockInfo | null => {
      calls++
      if (calls === 1) throw new Error('EIO')
      return lock(77)
    }
    expect(await probeLockDisplacement('/x', 10, { readLock, retryDelayMs: 0 })).toBe(77)
    expect(calls).toBe(2)
  })

  test('two read failures warn and count as not displaced', async () => {
    const events: string[] = []
    const readLock = (): DaemonLockInfo | null => {
      throw new Error('EIO')
    }
    const result = await probeLockDisplacement('/x', 10, {
      readLock,
      retryDelayMs: 0,
      logEventFn: name => events.push(name),
    })
    expect(result).toBeNull()
    expect(events).toEqual(['tengu_daemon_displacement_probe_failed'])
  })
})

describe('requestTransientYield (handshake yield → takeover)', () => {
  const unused = async (): Promise<Response> => {
    throw new Error('sendYield must not be called')
  }
  const yielding: Response = { ok: true, op: 'yield', yielding: true, origin: 'transient' }

  test('not needed when this daemon is transient', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const result = await requestTransientYield({ lockPath, origin: 'transient', sendYield: unused })
    expect(result.kind).toBe('not-needed')
  })

  test('not needed when the holder is not transient', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'service' })
    const result = await requestTransientYield({ lockPath, origin: 'shell', sendYield: unused })
    expect(result.kind).toBe('not-needed')
  })

  test('not needed when the lock holder is dead or absent', async () => {
    const lockPath = getDaemonLockPath(tmpScope())
    expect((await requestTransientYield({ lockPath, origin: 'shell', sendYield: unused })).kind).toBe('not-needed')
  })

  test('a yielding holder that releases the lock is taken over', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const events: Array<Record<string, unknown> | undefined> = []
    const result = await requestTransientYield({
      lockPath,
      origin: 'shell',
      sendYield: async () => {
        setTimeout(() => unlinkSync(lockPath), 30)
        return yielding
      },
      pollIntervalMs: 10,
      logEventFn: (_name, metadata) => events.push(metadata),
    })
    expect(result.kind).toBe('taken-over')
    expect(events).toEqual([{ ok: 'true', new_origin: 'shell' }])
  })

  test('a yielding holder that keeps the lock is still-held', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const events: Array<Record<string, unknown> | undefined> = []
    const result = await requestTransientYield({
      lockPath,
      origin: 'shell',
      sendYield: async () => yielding,
      pollIntervalMs: 10,
      takeoverTimeoutMs: SHORT_GRACE_MS,
      logEventFn: (_name, metadata) => events.push(metadata),
    })
    expect(result.kind).toBe('still-held')
    expect(events).toEqual([{ ok: 'false', new_origin: 'shell' }])
  })

  test('a holder that answers yielding:false refused', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const result = await requestTransientYield({
      lockPath,
      origin: 'shell',
      sendYield: async () => ({ ok: true, op: 'yield', yielding: false, origin: 'service' }),
    })
    expect(result.kind).toBe('refused')
  })

  test('an unreachable control socket is reported with its cause', async () => {
    const pid = await spawnHolder()
    const lockPath = await writeLock(tmpScope(), { pid, startedAt: 1, origin: 'transient' })
    const result = await requestTransientYield({
      lockPath,
      origin: 'shell',
      sendYield: async () => ({ ok: false, code: 'ENOCONN', error: 'connect ENOENT' }),
    })
    expect(result.kind).toBe('unreachable')
    expect(result.message).toContain('connect ENOENT')
  })
})
