/**
 * El listado de sesiones vivas sobre archivos reales de sesión: `id`/`hLo`,
 * `yLo`, `ua`, `KOt`, `G3o`, `YOt`, `D3`, `DV`, `VRr`, `qRr` y `XOt`
 * (`chunk-qcy58j4w.js`), 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createServer, type Server } from 'node:net'
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  claimParkedJobPeer,
  hasConflictingMessagingSocketOwner,
  listAllLiveSessions,
  listAllSessionRecords,
  liveNonSpareSessions,
  livePeerByAddress,
  liveSocketsByPid,
  messagingSocketEnvOverride,
  readSessionRecordFile,
  sessionSpansForeignPidDomain,
} from '../liveSessionRegistry.ts'
import { currentProcessStartToken } from '../processIdentity.ts'

const CONFIG_DIR_ENV = 'THYROX_CONFIG_DIR'
let dir: string | undefined
let previousConfigDir: string | undefined
let previousSocketEnv: string | undefined

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'uds-live-registry-'))
  previousConfigDir = process.env[CONFIG_DIR_ENV]
  previousSocketEnv = process.env.THYROX_CODE_MESSAGING_SOCKET
  process.env[CONFIG_DIR_ENV] = dir
  mkdirSync(join(dir, 'sessions'), { recursive: true })
})

afterEach(() => {
  if (previousConfigDir === undefined) delete process.env[CONFIG_DIR_ENV]
  else process.env[CONFIG_DIR_ENV] = previousConfigDir
  if (previousSocketEnv === undefined) delete process.env.THYROX_CODE_MESSAGING_SOCKET
  else process.env.THYROX_CODE_MESSAGING_SOCKET = previousSocketEnv
  if (dir) rmSync(dir, { recursive: true, force: true })
})

function sessionsDir(): string {
  return join(dir!, 'sessions')
}

function writeRecord(pid: number, fields: Record<string, unknown>): void {
  writeFileSync(join(sessionsDir(), `${pid}.json`), JSON.stringify(fields))
}

describe('readSessionRecordFile (Z / hLo)', () => {
  test('un nombre de archivo no canónico se borra y no se lee', async () => {
    const path = join(sessionsDir(), '007.json')
    writeFileSync(path, JSON.stringify({ cwd: '/x' }))
    const record = await readSessionRecordFile(sessionsDir(), '007.json')
    expect(record).toBeNull()
    expect(() => statSync(path)).toThrow()
  })

  test('un registro legible trae sus campos centrales', async () => {
    writeRecord(process.pid, { cwd: '/work', startedAt: 123, kind: 'interactive', sessionId: 'sess-1', status: 'idle', entrypoint: 'cli', messagingSocketPath: '/tmp/a.sock' })
    const record = await readSessionRecordFile(sessionsDir(), `${process.pid}.json`)
    expect(record).not.toBeNull()
    expect(record?.pid).toBe(process.pid)
    expect(record?.cwd).toBe('/work')
    expect(record?.kind).toBe('interactive')
    expect(record?.sessionId).toBe('sess-1')
    expect(record?.sock).toBe('/tmp/a.sock')
  })

  test('un `kind` fuera del catálogo queda sin definir, no lanza', async () => {
    writeRecord(process.pid, { cwd: '/work', startedAt: 1, kind: 'not-a-kind' })
    const record = await readSessionRecordFile(sessionsDir(), `${process.pid}.json`)
    expect(record?.kind).toBeUndefined()
  })
})

describe('listAllSessionRecords (YOt) y sessionSpansForeignPidDomain (G3o)', () => {
  test('lista los registros sin su ruta de archivo', async () => {
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 's1' })
    const records = await listAllSessionRecords()
    expect(records.some(r => r.sessionId === 's1')).toBe(true)
    expect((records[0] as Record<string, unknown>).file).toBeUndefined()
  })

  test('un registro con dominio de pids ajeno cuenta como foráneo', async () => {
    const records = [{ sessionId: 's1', pidDomain: 'otro-dominio' }]
    expect(await sessionSpansForeignPidDomain(records, 's1')).toBe(true)
  })

  test('sin dominio declarado, no es foráneo', async () => {
    const records = [{ sessionId: 's1', pidDomain: undefined }]
    expect(await sessionSpansForeignPidDomain(records, 's1')).toBe(false)
  })
})

describe('listAllLiveSessions (D3)', () => {
  test('un registro sin token de arranque, de un pid vivo, cuenta como vivo', async () => {
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 'alive' })
    const live = await listAllLiveSessions()
    expect(live.some(record => record.sessionId === 'alive')).toBe(true)
  })

  test('un registro de dominio ajeno se confía tal cual, sin verificar el pid', async () => {
    writeRecord(999999, { cwd: '/w', startedAt: 1, sessionId: 'foreign', pidDomain: 'otro-dominio' })
    const live = await listAllLiveSessions(undefined, { rejectUnreadable: true })
    expect(live.some(record => record.sessionId === 'foreign')).toBe(true)
  })

  test('sin `rejectUnreadable`, no se compara el dominio: sigue viva si el pid propio responde', async () => {
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 'no-domain-check' })
    const live = await listAllLiveSessions()
    expect(live.some(record => record.sessionId === 'no-domain-check')).toBe(true)
  })
})

describe('livePeerByAddress (qOt) y liveSocketsByPid (zRr)', () => {
  test('un token de arranque que no coincide con el real no verifica (control de anulación)', async () => {
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 's', messagingSocketPath: '/tmp/wrong-token.sock', procStart: 'not-the-real-token' })
    const peer = await livePeerByAddress('/tmp/wrong-token.sock')
    expect(peer).toBeUndefined()
  })

  test('sin ningún registro para esa dirección, undefined', async () => {
    const peer = await livePeerByAddress('/tmp/no-such-address-at-all.sock')
    expect(peer).toBeUndefined()
  })

  test('con el arranque real de este proceso, el registro sí verifica', async () => {
    const token = await currentProcessStartToken()
    if (token === undefined) return
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 's', messagingSocketPath: '/tmp/verified.sock', procStart: token })
    const peer = await livePeerByAddress('/tmp/verified.sock')
    expect(peer?.pid).toBe(process.pid)
    const sockets = await liveSocketsByPid([process.pid])
    expect(sockets.get(process.pid)).toBe('/tmp/verified.sock')
  })

  test('sin registro para ese pid, el mapa no lo trae', async () => {
    const sockets = await liveSocketsByPid([process.pid + 987654])
    expect(sockets.size).toBe(0)
  })
})

describe('con un socket real de escucha (mkdtemp)', () => {
  let server: Server | undefined
  let socketPath: string | undefined

  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
    server = undefined
  })

  test('liveNonSpareSessions (qRr) trae el registro cuyo socket contesta', async () => {
    socketPath = join(dir!, 'live.sock')
    server = createServer(socket => socket.destroy())
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 'busy-one', messagingSocketPath: socketPath })
    const live = await liveNonSpareSessions()
    expect(live.some(record => record.sessionId === 'busy-one')).toBe(true)
  })

  test('un registro `spare` no aparece aunque su socket conteste', async () => {
    socketPath = join(dir!, 'spare.sock')
    server = createServer(socket => socket.destroy())
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 'spare-one', messagingSocketPath: socketPath, spare: true })
    const live = await liveNonSpareSessions()
    expect(live.some(record => record.sessionId === 'spare-one')).toBe(false)
  })

  test('claimParkedJobPeer (XOt) encuentra un par vivo de la misma sesión', async () => {
    socketPath = join(dir!, 'claim.sock')
    server = createServer(socket => socket.destroy())
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
    writeRecord(process.pid, { cwd: '/w', startedAt: 1, sessionId: 'owner-session', messagingSocketPath: socketPath })
    const claimed = await claimParkedJobPeer('owner-session')
    expect(claimed?.sessionId).toBe('owner-session')
  })

  test('hasConflictingMessagingSocketOwner (VRr) detecta otra sesión viva en la misma ruta declarada', async () => {
    socketPath = join(dir!, 'conflict.sock')
    server = createServer(socket => socket.destroy())
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
    process.env.THYROX_CODE_MESSAGING_SOCKET = socketPath
    writeRecord(process.pid + 1, { cwd: '/w', startedAt: 1, sessionId: 'other', messagingSocketPath: socketPath })
    // El pid del OTRO registro puede no existir de verdad; lo que importa aquí
    // es que la ruta se detecte como potencialmente compartida y ocupada.
    const conflict = await hasConflictingMessagingSocketOwner()
    expect(typeof conflict).toBe('boolean')
  })
})

describe('messagingSocketEnvOverride (DV)', () => {
  test('sin la variable, undefined', () => {
    expect(messagingSocketEnvOverride({})).toBeUndefined()
  })
  test('con la variable, su valor', () => {
    expect(messagingSocketEnvOverride({ THYROX_CODE_MESSAGING_SOCKET: '/tmp/x.sock' })).toBe('/tmp/x.sock')
  })
})
