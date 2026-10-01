// Puerto fiel de `ccnmt: packages/daemon/src/__tests__/bgAdopt.test.ts`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ISOLATED_HOME = mkdtempSync(join(tmpdir(), 'ccb-bgadopt-test-'))
const ORIGINAL_CONFIG_DIR = process.env.THYROX_CONFIG_DIR

beforeAll(() => {
  process.env.THYROX_CONFIG_DIR = ISOLATED_HOME
})
afterAll(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) {
    delete process.env.THYROX_CONFIG_DIR
  } else {
    process.env.THYROX_CONFIG_DIR = ORIGINAL_CONFIG_DIR
  }
  rmSync(ISOLATED_HOME, { recursive: true, force: true })
})

import { createServer, type Server } from 'node:net'

import {
  adoptFromRoster,
  adoptRunningPtyRecords,
  reapOrphanPtySockets,
  terminateOrphanPtyHost,
} from '../bgAdopt.js'
import { encodeCtrlFrame } from '../internal/ptyFrame.js'
import { getDaemonScopeDir } from '../socketPaths.js'
import {
  type WorkerRecord,
  readWorkerRecord,
  writeWorkerRecord,
} from '../bgWorkerRegistry.js'
import { writeRoster, emptyRoster } from '../roster.js'
import type { WorkerVm } from '../workerVm.js'

const JOBS_DIR = join(ISOLATED_HOME, 'jobs')

function clearAll(): void {
  try {
    for (const f of readdirSync(JOBS_DIR)) {
      rmSync(join(JOBS_DIR, f), { recursive: true, force: true })
    }
  } catch {}
  try {
    for (const f of readdirSync(join(ISOLATED_HOME, 'daemon'))) {
      if (f.startsWith('roster.json')) {
        rmSync(join(ISOLATED_HOME, 'daemon', f), { force: true })
      }
    }
  } catch {}
  mkdirSync(JOBS_DIR, { recursive: true, mode: 0o700 })
  mkdirSync(join(ISOLATED_HOME, 'daemon'), { recursive: true, mode: 0o700 })
}

beforeEach(clearAll)
afterEach(clearAll)

const baseRecord = (short: string, pid: number): WorkerRecord => ({
  short,
  pid,
  cmd: ['/bin/sh'],
  cwd: '/tmp',
  startedAt: 1_700_000_000_000,
  status: 'running',
  mode: 'pty',
  ptySocket: '/tmp/nonexistent-fake-socket-for-test.sock',
})

describe('adoptRunningPtyRecords', () => {
  test('skips records with status != running', () => {
    const r = baseRecord('abc11111', 99999)
    r.status = 'exited'
    mkdirSync(join(JOBS_DIR, 'abc11111'), { recursive: true })
    writeWorkerRecord(r)
    const workers = new Map<string, WorkerVm>()
    adoptRunningPtyRecords(workers)
    expect(workers.size).toBe(0)
  })

  test('skips records with mode != pty', () => {
    const r = baseRecord('abc22222', 99999)
    r.mode = 'detached'
    mkdirSync(join(JOBS_DIR, 'abc22222'), { recursive: true })
    writeWorkerRecord(r)
    const workers = new Map<string, WorkerVm>()
    adoptRunningPtyRecords(workers)
    expect(workers.size).toBe(0)
  })

  test('marks dead-pid worker as failed with reason', () => {
    const r = baseRecord('abc33333', 99999) // pid 99999 — casi seguro muerto
    mkdirSync(join(JOBS_DIR, 'abc33333'), { recursive: true })
    writeWorkerRecord(r)
    const workers = new Map<string, WorkerVm>()
    adoptRunningPtyRecords(workers)
    expect(workers.size).toBe(0)
    const after = readWorkerRecord('abc33333')
    expect(after?.status).toBe('failed')
    expect(after?.failedReason).toBe('process gone while supervisor was down')
    expect(after?.exitedAt).toBeGreaterThan(0)
  })

  test('skips workers already in workers map', () => {
    const r = baseRecord('abc44444', 99999)
    mkdirSync(join(JOBS_DIR, 'abc44444'), { recursive: true })
    writeWorkerRecord(r)
    const workers = new Map<string, WorkerVm>()
    workers.set('abc44444', {} as WorkerVm)
    adoptRunningPtyRecords(workers)
    // La entrada ya-presente no se siega
    const after = readWorkerRecord('abc44444')
    expect(after?.status).toBe('running')
  })
})

describe('adoptFromRoster', () => {
  test('parseFailed roster is a no-op', async () => {
    writeFileSync(join(ISOLATED_HOME, 'daemon', 'roster.json'), '{not json')
    // readRoster pondrá en cuarentena + devolverá parseFailed:true;
    // adoptFromRoster vuelve de inmediato sin tocar workers.
    const workers = new Map<string, WorkerVm>()
    await adoptFromRoster(workers)
    expect(workers.size).toBe(0)
  })

  test('empty roster is a no-op', async () => {
    const workers = new Map<string, WorkerVm>()
    await adoptFromRoster(workers)
    expect(workers.size).toBe(0)
  })

  test('roster entry with dead pid is counted dead + marked failed', async () => {
    const roster = emptyRoster()
    roster.workers['ros11111'] = {
      pid: 99999,
      startedAt: 1,
      attempt: 0,
      cwd: '/tmp',
      ptySock: '/tmp/nonexistent-fake-socket-for-test.sock',
    }
    await writeRoster(roster)
    // Pre-puebla jobs/<short>/meta.json para que markAdoptionFailed tenga
    // algo que mutar.
    mkdirSync(join(JOBS_DIR, 'ros11111'), { recursive: true })
    writeWorkerRecord({ ...baseRecord('ros11111', 99999), status: 'running' })
    const workers = new Map<string, WorkerVm>()
    await adoptFromRoster(workers)
    expect(workers.size).toBe(0)
    const after = readWorkerRecord('ros11111')
    expect(after?.status).toBe('failed')
    expect(after?.failedReason).toContain('process gone')
  })

  test('roster orphan adoption: missing meta.json is auto-created', async () => {
    // Una entrada de roster que no tiene árbol jobs/<short>/ (entrada
    // cross-cwd de un supervisor anterior). Se usa el pid del test runner
    // porque está garantizado vivo — pero igual se espera que
    // markAdoptionFailed no dispare porque el pid SÍ está vivo. La
    // escritura de adopción huérfana disparará porque no existe
    // meta.json; pero el chequeo de existencia del socket fallará (se
    // apunta a un socket inexistente), así que esta entrada de todos
    // modos cuenta como muerta. La ruta de código de adopción huérfana
    // sólo corre en la rama de ÉXITO (pid vivo Y socket existe), que no
    // se puede fixturar fácilmente en un test unitario. Se ejercita el
    // negativo: una entrada de roster con pid vivo pero socket ido NO se
    // adopta.
    const roster = emptyRoster()
    roster.workers['ros22222'] = {
      pid: process.pid,
      startedAt: 1,
      attempt: 0,
      cwd: '/tmp',
      ptySock: '/tmp/nonexistent-fake-socket-for-test.sock',
    }
    await writeRoster(roster)
    const workers = new Map<string, WorkerVm>()
    await adoptFromRoster(workers)
    expect(workers.size).toBe(0)
    // La rama socket-ido crea un meta.json con status='failed'.
    const after = readWorkerRecord('ros22222')
    if (after) {
      expect(after.status).toBe('failed')
      expect(after.failedReason).toContain('socket')
    }
  })

  test('roster entry already in workers map is skipped', async () => {
    const roster = emptyRoster()
    roster.workers['ros33333'] = {
      pid: process.pid,
      startedAt: 1,
      attempt: 0,
      cwd: '/tmp',
    }
    await writeRoster(roster)
    const workers = new Map<string, WorkerVm>()
    workers.set('ros33333', {} as WorkerVm)
    await adoptFromRoster(workers)
    expect(workers.size).toBe(1) // sin cambios
  })
})

/** Levanta un host de PTY falso en `path` que registra lo recibido y cierra al primer frame. */
function listenFakePtyHost(path: string): Promise<{ server: Server; received: Promise<Buffer> }> {
  return new Promise(resolveListen => {
    let deliver: (data: Buffer) => void = () => {}
    const received = new Promise<Buffer>(resolveData => {
      deliver = resolveData
    })
    const server = createServer(conn => {
      conn.once('data', data => {
        deliver(data)
        conn.end()
      })
    })
    server.listen(path, () => resolveListen({ server, received }))
  })
}

/** Borra del scope del daemon todo archivo de host de PTY, para que un caso no herede residuos de otro. */
function clearPtyHostFiles(): void {
  const scope = getDaemonScopeDir()
  mkdirSync(scope, { recursive: true })
  for (const f of readdirSync(scope)) {
    if (f.includes('.pty.sock')) rmSync(join(scope, f), { force: true })
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise(resolveClose => server.close(() => resolveClose()))
}

describe('terminateOrphanPtyHost — ref NIe (chunk-kc04kkkd.js)', () => {
  beforeEach(clearPtyHostFiles)
  afterEach(clearPtyHostFiles)

  test('un host vivo recibe el frame kill SIGTERM y la promesa resuelve true al cerrar', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    const sockPath = join(scope, 'nie11111.pty.sock')
    const { server, received } = await listenFakePtyHost(sockPath)
    const outcome = await terminateOrphanPtyHost(sockPath)
    expect(outcome).toBe(true)
    expect(await received).toEqual(encodeCtrlFrame({ t: 'kill', sig: 'SIGTERM' }))
    await closeServer(server)
    rmSync(sockPath, { force: true })
  })

  test('un socket muerto resuelve false y borra el socket con sus breadcrumbs .err/.err.read/.late', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    const sockPath = join(scope, 'nie22222.pty.sock')
    const doomed = [sockPath, `${sockPath}.err`, `${sockPath}.err.read`, `${sockPath}.late`]
    for (const path of doomed) writeFileSync(path, '')
    const outcome = await terminateOrphanPtyHost(sockPath)
    expect(outcome).toBe(false)
    for (const path of doomed) expect(existsSync(path)).toBe(false)
  })
})

describe('reapOrphanPtySockets — ref pr (chunk-92tvramn.js), rama POSIX', () => {
  beforeEach(clearPtyHostFiles)
  afterEach(clearPtyHostFiles)

  test('reapa un .pty.sock muerto sin handle: lo borra y marca el record failed', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    mkdirSync(join(JOBS_DIR, 'orp11111'), { recursive: true })
    writeWorkerRecord(baseRecord('orp11111', process.pid))
    const sockPath = join(scope, 'orp11111.pty.sock')
    writeFileSync(sockPath, '')
    const logs: string[] = []
    await reapOrphanPtySockets(new Map<string, WorkerVm>(), (m) => logs.push(m))
    expect(existsSync(sockPath)).toBe(false)
    const after = readWorkerRecord('orp11111')
    expect(after?.status).toBe('failed')
    expect(after?.failedReason).toBe('reaped (roster gap)')
    expect(logs).toEqual(['bg orphan-reap: 1 roster-less pty host(s)'])
  })

  test('un host vivo sin handle recibe SIGTERM, se marca failed y pierde .late y .exec-exit', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    mkdirSync(join(JOBS_DIR, 'orp33333'), { recursive: true })
    writeWorkerRecord(baseRecord('orp33333', process.pid))
    const sockPath = join(scope, 'orp33333.pty.sock')
    const { server, received } = await listenFakePtyHost(sockPath)
    writeFileSync(`${sockPath}.late`, '')
    writeFileSync(`${sockPath}.exec-exit`, '0')
    const logs: string[] = []
    await reapOrphanPtySockets(new Map<string, WorkerVm>(), (m) => logs.push(m))
    expect(await received).toEqual(encodeCtrlFrame({ t: 'kill', sig: 'SIGTERM' }))
    expect(readWorkerRecord('orp33333')?.failedReason).toBe('reaped (roster gap)')
    expect(existsSync(`${sockPath}.late`)).toBe(false)
    expect(existsSync(`${sockPath}.exec-exit`)).toBe(false)
    expect(logs).toEqual(['bg orphan-reap: 1 roster-less pty host(s)'])
    await closeServer(server)
    rmSync(sockPath, { force: true })
  })

  test('no pisa un record que ya terminó por su cuenta', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    mkdirSync(join(JOBS_DIR, 'orp44444'), { recursive: true })
    writeWorkerRecord({ ...baseRecord('orp44444', process.pid), status: 'stopped' })
    writeFileSync(join(scope, 'orp44444.pty.sock'), '')
    await reapOrphanPtySockets(new Map<string, WorkerVm>(), () => {})
    expect(readWorkerRecord('orp44444')?.status).toBe('stopped')
  })

  test('borra los breadcrumbs cuyo .pty.sock ya no existe y conserva los de un socket con handle', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    const orphanBase = join(scope, 'gone5555.pty.sock')
    const orphans = ['.err', '.late', '.exec-exit', '.err.read'].map(s => `${orphanBase}${s}`)
    for (const path of orphans) writeFileSync(path, '')
    const liveSock = join(scope, 'live5555.pty.sock')
    writeFileSync(liveSock, '')
    writeFileSync(`${liveSock}.err`, '')
    const workers = new Map<string, WorkerVm>()
    workers.set('live5555', {} as WorkerVm)
    const logs: string[] = []
    await reapOrphanPtySockets(workers, (m) => logs.push(m))
    for (const path of orphans) expect(existsSync(path)).toBe(false)
    expect(existsSync(`${liveSock}.err`)).toBe(true)
    expect(logs).toEqual([])
    rmSync(liveSock, { force: true })
    rmSync(`${liveSock}.err`, { force: true })
  })

  test('omite un .pty.sock cuyo short ya está en el mapa de workers vivos', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    const sockPath = join(scope, 'orp22222.pty.sock')
    writeFileSync(sockPath, '')
    const workers = new Map<string, WorkerVm>()
    workers.set('orp22222', {} as WorkerVm)
    const logs: string[] = []
    await reapOrphanPtySockets(workers, (m) => logs.push(m))
    expect(existsSync(sockPath)).toBe(true)
    expect(logs).toEqual([])
    rmSync(sockPath, { force: true })
  })

  test('sin archivos .pty.sock no se emite log', async () => {
    const scope = getDaemonScopeDir()
    mkdirSync(scope, { recursive: true })
    for (const f of readdirSync(scope)) {
      if (f.includes('.pty.sock')) rmSync(join(scope, f), { force: true })
    }
    const logs: string[] = []
    await reapOrphanPtySockets(new Map<string, WorkerVm>(), (m) => logs.push(m))
    expect(logs).toEqual([])
  })
})
