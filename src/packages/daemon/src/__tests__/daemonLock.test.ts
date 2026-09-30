import { afterEach, describe, expect, mock as mockFn, spyOn, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  acquireDaemonLock,
  classifyListenError,
  formatForegroundLockMessage,
  formatLockConflictMessage,
  formatLockRefusalMessage,
  formatUnknownOriginLockMessage,
  getDaemonLockPath,
  isProcessAlive,
  probeProcessSignal,
  readDaemonLock,
  releaseDaemonLock,
  writeSocketTokensFile,
  type DaemonLockInfo,
  type LockConflictResult,
} from '../daemonLock.js'

const dirs: string[] = []

function tmpScope(): string {
  const dir = mkdtempSync(join(tmpdir(), 'daemon-lock-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

/** Lanza un proceso hijo de verdad para simular un pid vivo, ajeno. */
function spawnAlive(): { pid: number; kill: () => void } {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
  })
  if (!child.pid) throw new Error('spawn failed to allocate a pid')
  return { pid: child.pid, kill: () => child.kill('SIGKILL') }
}

async function waitForExit(pid: number, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`pid ${pid} never exited`)
}

describe('getDaemonLockPath', () => {
  test('daemon.lock junto al scopeDir', () => {
    expect(getDaemonLockPath('/scope')).toBe(join('/scope', 'daemon.lock'))
  })
})

describe('readDaemonLock', () => {
  test('null cuando el archivo no existe', () => {
    const scope = tmpScope()
    expect(readDaemonLock(getDaemonLockPath(scope))).toBeNull()
  })

  test('null con JSON inválido', () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    Bun.write(lockPath, '{not json')
    expect(readDaemonLock(lockPath)).toBeNull()
  })

  test('null cuando falta pid o startedAt', () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    Bun.write(lockPath, JSON.stringify({ pid: 1 }))
    expect(readDaemonLock(lockPath)).toBeNull()
  })

  test('parsea un lock válido', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    const info: DaemonLockInfo = { pid: 123, startedAt: 456, origin: 'transient' }
    await Bun.write(lockPath, JSON.stringify(info))
    expect(readDaemonLock(lockPath)).toEqual(info)
  })
})

describe('probeProcessSignal / isProcessAlive', () => {
  test('el propio proceso está vivo', () => {
    expect(probeProcessSignal(process.pid)).toBe('alive')
    expect(isProcessAlive(process.pid)).toBe(true)
  })

  test('pid<=1 se trata como muerto sin sondear', () => {
    expect(probeProcessSignal(1)).toBe('dead')
    expect(probeProcessSignal(0)).toBe('dead')
  })

  test('un pid que ya salió está muerto', async () => {
    const child = spawnAlive()
    child.kill()
    await waitForExit(child.pid)
    expect(isProcessAlive(child.pid)).toBe(false)
  })
})

describe('probeProcessSignal — EPERM', () => {
  test('distingue EPERM de un pid vivo propio', () => {
    // No hay forma de forzar un EPERM real de forma determinista sin un
    // segundo usuario (este contenedor corre como root, que puede señalar
    // cualquier pid) — se simula el syscall en vez de omitir la rama.
    const kill = spyOn(process, 'kill').mockImplementation(() => {
      throw Object.assign(new Error('Operation not permitted'), { code: 'EPERM' })
    })
    try {
      expect(probeProcessSignal(process.pid)).toBe('eperm')
    } finally {
      kill.mockRestore()
    }
  })
})

describe('acquireDaemonLock', () => {
  test('adquiere el lock en un scope limpio', async () => {
    const scope = tmpScope()
    const result = await acquireDaemonLock(scope, 'transient')
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.lock.pid).toBe(process.pid)
    const lock = readDaemonLock(getDaemonLockPath(scope))
    expect(lock?.pid).toBe(process.pid)
    expect(lock?.origin).toBe('transient')
  })

  test('reemplaza un lock obsoleto (pid muerto)', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    const child = spawnAlive()
    child.kill()
    await waitForExit(child.pid)
    await Bun.write(
      lockPath,
      JSON.stringify({ pid: child.pid, startedAt: 1, origin: 'transient' }),
    )
    const result = await acquireDaemonLock(scope, 'transient')
    expect(result.ok).toBe(true)
    expect(readDaemonLock(lockPath)?.pid).toBe(process.pid)
  })

  test('reemplaza un lock ilegible (basura)', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    await Bun.write(lockPath, 'not json at all')
    const result = await acquireDaemonLock(scope, 'transient')
    expect(result.ok).toBe(true)
    expect(readDaemonLock(lockPath)?.pid).toBe(process.pid)
  })

  test('conflicto: lock vivo ajeno da unverified', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    const holder = spawnAlive()
    try {
      await Bun.write(
        lockPath,
        JSON.stringify({ pid: holder.pid, startedAt: 1, origin: 'transient' }),
      )
      const result = await acquireDaemonLock(scope, 'transient')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.lock.pid).toBe(holder.pid)
        expect(result.outcome).toBe('unverified')
      }
    } finally {
      holder.kill()
    }
  })

  test('conflicto: lock vivo ajeno con EPERM en la señal da outcome eperm', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    const holder = spawnAlive()
    try {
      await Bun.write(
        lockPath,
        JSON.stringify({ pid: holder.pid, startedAt: 1, origin: 'transient' }),
      )
      const kill = spyOn(process, 'kill').mockImplementation((pid: number) => {
        if (pid === holder.pid) {
          throw Object.assign(new Error('Operation not permitted'), { code: 'EPERM' })
        }
        return true
      })
      try {
        const result = await acquireDaemonLock(scope, 'transient')
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.outcome).toBe('eperm')
      } finally {
        kill.mockRestore()
      }
    } finally {
      holder.kill()
    }
  })

  test('idempotente: el mismo pid ya sostiene el lock', async () => {
    const scope = tmpScope()
    const first = await acquireDaemonLock(scope, 'transient')
    expect(first.ok).toBe(true)
    const second = await acquireDaemonLock(scope, 'transient')
    expect(second.ok).toBe(true)
  })
})

describe('releaseDaemonLock', () => {
  test('borra el lock sólo si el pid/startedAt coinciden', async () => {
    const scope = tmpScope()
    const lockPath = getDaemonLockPath(scope)
    await acquireDaemonLock(scope, 'transient')
    const lock = readDaemonLock(lockPath)
    expect(lock).not.toBeNull()
    if (!lock) throw new Error('unreachable')
    releaseDaemonLock(scope, lock.pid + 1, lock.startedAt)
    expect(existsSync(lockPath)).toBe(true)
    releaseDaemonLock(scope, lock.pid, lock.startedAt)
    expect(existsSync(lockPath)).toBe(false)
  })
})

describe('mensajes de conflicto', () => {
  test('formatForegroundLockMessage nombra el pid', () => {
    expect(formatForegroundLockMessage('daemon start', 42)).toContain('pid 42')
  })

  test('formatUnknownOriginLockMessage nombra el pid', () => {
    expect(formatUnknownOriginLockMessage('daemon start', 42)).toContain('pid 42')
  })

  test('formatLockConflictMessage varía el consejo por outcome', () => {
    const base: LockConflictResult = {
      ok: false,
      lock: { pid: 42, startedAt: 1, origin: 'transient' },
      outcome: 'eperm',
    }
    expect(formatLockConflictMessage('daemon start', base, '/x/daemon.lock')).toContain(
      'owns it',
    )
    expect(
      formatLockConflictMessage(
        'daemon start',
        { ...base, outcome: 'unverified' },
        '/x/daemon.lock',
      ),
    ).toContain('/x/daemon.lock')
    expect(
      formatLockConflictMessage(
        'daemon start',
        { ...base, outcome: 'timed-out' },
        '/x/daemon.lock',
      ),
    ).toContain('Wait for it')
  })

  test('formatLockRefusalMessage elige por origin', () => {
    const lockPath = '/x/daemon.lock'
    const shell: LockConflictResult = {
      ok: false,
      lock: { pid: 1, startedAt: 1, origin: 'shell' },
      outcome: 'unverified',
    }
    expect(formatLockRefusalMessage('daemon start', shell, lockPath)).toContain('foreground')

    const service: LockConflictResult = {
      ok: false,
      lock: { pid: 2, startedAt: 1, origin: 'service' },
      outcome: 'unverified',
    }
    expect(formatLockRefusalMessage('daemon start', service, lockPath)).toContain(
      'crash-loop',
    )

    const unknown: LockConflictResult = {
      ok: false,
      lock: { pid: 3, startedAt: 1, origin: 'future-origin' as DaemonLockInfo['origin'] },
      outcome: 'unverified',
    }
    expect(formatLockRefusalMessage('daemon start', unknown, lockPath)).toContain(
      'unrecognized origin',
    )
  })
})

describe('classifyListenError', () => {
  function spies() {
    const logErrorFn = mockFn<(error: unknown) => void>()
    const logEventFn = mockFn<(name: string, metadata?: Record<string, unknown>) => void>()
    return { logErrorFn, logEventFn }
  }

  test('EADDRINUSE va a logEvent, no a logError', () => {
    const err = Object.assign(new Error('boom'), { syscall: 'listen', code: 'EADDRINUSE' })
    const { logErrorFn, logEventFn } = spies()
    classifyListenError(err, { logErrorFn, logEventFn })
    expect(logEventFn).toHaveBeenCalledTimes(1)
    expect(logEventFn.mock.calls[0]?.[0]).toBe('tengu_daemon_listen_conflict')
    expect(logErrorFn).not.toHaveBeenCalled()
  })

  test('EACCES va a logEvent, no a logError', () => {
    const err = Object.assign(new Error('boom'), { syscall: 'listen', code: 'EACCES' })
    const { logErrorFn, logEventFn } = spies()
    classifyListenError(err, { logErrorFn, logEventFn })
    expect(logEventFn).toHaveBeenCalledTimes(1)
    expect(logErrorFn).not.toHaveBeenCalled()
  })

  test('un error genérico va a logError, no a logEvent', () => {
    const { logErrorFn, logEventFn } = spies()
    classifyListenError(new Error('boom'), { logErrorFn, logEventFn })
    expect(logErrorFn).toHaveBeenCalledTimes(1)
    expect(logEventFn).not.toHaveBeenCalled()
  })

  test('un ENOENT en listen (no EADDRINUSE/EACCES) también va a logError', () => {
    const err = Object.assign(new Error('boom'), { syscall: 'listen', code: 'ENOENT' })
    const { logErrorFn, logEventFn } = spies()
    classifyListenError(err, { logErrorFn, logEventFn })
    expect(logErrorFn).toHaveBeenCalledTimes(1)
    expect(logEventFn).not.toHaveBeenCalled()
  })
})

describe('writeSocketTokensFile', () => {
  test('escribe el archivo con modo 0600', () => {
    if (process.platform === 'win32') return
    const scope = tmpScope()
    const path = writeSocketTokensFile(scope, { controlAuth: 'secret' })
    expect(path).toBeDefined()
    if (!path) throw new Error('unreachable')
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ controlAuth: 'secret' })
  })
})
