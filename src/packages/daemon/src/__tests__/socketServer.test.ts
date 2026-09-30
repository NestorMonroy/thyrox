import { afterEach, describe, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getDaemonLockPath, isProcessAlive, readDaemonLock } from '../daemonLock.js'
import { type DaemonServer, startSocketServer } from '../socketServer.js'

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

const dirs: string[] = []
const servers: DaemonServer[] = []

function tmpScope(): { scopeDir: string; socketPath: string } {
  const scopeDir = mkdtempSync(join(tmpdir(), 'socket-server-test-'))
  dirs.push(scopeDir)
  return { scopeDir, socketPath: join(scopeDir, 'control.sock') }
}

afterEach(async () => {
  while (servers.length) {
    const server = servers.pop()
    if (server) await server.close()
  }
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('startSocketServer — daemon.lock', () => {
  test('escribe daemon.lock con el propio pid al arrancar', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const server = await startSocketServer({}, { socketPath })
    servers.push(server)
    const lock = readDaemonLock(getDaemonLockPath(scopeDir))
    expect(lock?.pid).toBe(process.pid)
    expect(lock?.origin).toBe('transient')
  })

  test('escribe control.tokens.json (0600) junto al lock', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const server = await startSocketServer({}, { socketPath })
    servers.push(server)
    const tokensPath = join(scopeDir, 'control.tokens.json')
    expect(existsSync(tokensPath)).toBe(true)
    const parsed = JSON.parse(readFileSync(tokensPath, 'utf8'))
    expect(typeof parsed.controlAuth).toBe('string')
    expect(parsed.controlAuth.length).toBeGreaterThan(0)
  })

  test('close() libera daemon.lock y borra el socket', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const server = await startSocketServer({}, { socketPath })
    const lockPath = getDaemonLockPath(scopeDir)
    expect(existsSync(lockPath)).toBe(true)
    await server.close()
    expect(existsSync(lockPath)).toBe(false)
    expect(existsSync(socketPath)).toBe(false)
  })

  test('un socket residual sin lock se limpia y se puede bindear', async () => {
    const { scopeDir, socketPath } = tmpScope()
    // Simula un socket huérfano de un daemon anterior que sí cerró bien
    // (dejó el archivo del socket, pero nunca dejó daemon.lock detrás).
    Bun.write(socketPath, '')
    const server = await startSocketServer({}, { socketPath })
    servers.push(server)
    expect(server.clientCount).toBe(0)
  })

  test('rehúsa cuando un lock vivo ajeno ya sostiene el scope (no roba el socket)', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const holder = spawnAlive()
    try {
      const lockPath = getDaemonLockPath(scopeDir)
      await Bun.write(
        lockPath,
        JSON.stringify({ pid: holder.pid, startedAt: 1, origin: 'transient' }),
      )
      // El socket de un daemon vivo de verdad — probar que sigue ahí
      // intacto tras el intento rehusado (no se le "roba" el bind).
      await Bun.write(socketPath, '')

      const rival = startSocketServer({}, { socketPath, origin: 'transient' })
      await expect(rival).rejects.toThrow(/daemon lock/)

      expect(existsSync(socketPath)).toBe(true)
      expect(readDaemonLock(lockPath)?.pid).toBe(holder.pid)
    } finally {
      holder.kill()
    }
  })

  test('el mensaje de rechazo nombra "foreground" cuando el holder es origin shell', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const holder = spawnAlive()
    try {
      await Bun.write(
        getDaemonLockPath(scopeDir),
        JSON.stringify({ pid: holder.pid, startedAt: 1, origin: 'shell' }),
      )
      const rival = startSocketServer({}, { socketPath, origin: 'transient' })
      await expect(rival).rejects.toThrow(/foreground/)
    } finally {
      holder.kill()
    }
  })

  test('reemplaza un daemon.lock obsoleto (pid muerto) y arranca normalmente', async () => {
    const { scopeDir, socketPath } = tmpScope()
    const lockPath = getDaemonLockPath(scopeDir)
    const dead = spawnAlive()
    dead.kill()
    await waitForExit(dead.pid)
    await Bun.write(
      lockPath,
      JSON.stringify({ pid: dead.pid, startedAt: 1, origin: 'transient' }),
    )
    const server = await startSocketServer({}, { socketPath })
    servers.push(server)
    expect(readDaemonLock(lockPath)?.pid).toBe(process.pid)
  })
})
