/**
 * Listado y barrido del registro de sesiones: `Ny`, `Fy`, `zy`, `TCe`, `aD`,
 * `ZKn`, `Ly`, `lpn`, `xut`, `id` y `probeRegistrySweepPermitted` con `gfn`
 * (`chunk-t6pwageh.js`, `chunk-x5vr5vwm.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

import {
  isWindowsPosixCwd,
  parseRegistryRecord,
  readRegistryRecordFromStorage,
  deleteRegistryRecordFromStorage,
  recordInPidDomain,
  REGISTRY_RECORD_MAX_BYTES,
  sweepDeadPidKeys,
  sweepRegistry,
  type RegistrySweepDeps,
  type RegistryStorage,
} from '../src/uds/registrySweep.ts'
import { probeRegistrySweepPermitted, type SweepPermissionDeps } from '../src/uds/registrySweepPermission.ts'
import { SessionRegistryState } from '../src/uds/sessionRegistryState.ts'

const DOMAIN = 'linux:m:ns'
const KEY = (pid: number, fill = 'a') => `${pid}.${fill.repeat(64)}.key`

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'registry-sweep-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

function record(pid: number, extra: Record<string, unknown> = {}) {
  return { pid, sessionId: `s${pid}`, startedAt: 1000, kind: 'interactive' as const, ...extra }
}

function write(name: string, value: unknown): void {
  writeFileSync(join(dir, name), typeof value === 'string' ? value : JSON.stringify(value))
}

type Recorded = { logs: string[]; events: Array<[string, Record<string, unknown>]>; slept: number[] }

function deps(overrides: Partial<RegistrySweepDeps> = {}, dead: number[] = [], alive: number[] = []): RegistrySweepDeps & { recorded: Recorded; state: () => SessionRegistryState } {
  const recorded: Recorded = { logs: [], events: [], slept: [] }
  const state = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false, probeRegistrySweep: async () => true })
  return {
    recorded,
    sessionsDir: () => dir,
    pid: 1,
    platform: () => 'linux',
    isInteractive: () => true,
    homedir: () => '/home/u',
    version: '2.0.0',
    now: () => 61000,
    isProcessGone: pid => dead.includes(pid),
    isProcessAlive: pid => alive.includes(pid),
    ownPidDomain: async () => DOMAIN,
    sleep: async ms => void recorded.slept.push(ms),
    log: message => void recorded.logs.push(message),
    logEvent: (name, fields) => void recorded.events.push([name, fields]),
    isEmbeddedEntrypoint: entrypoint => entrypoint === 'embedded',
    state: () => state,
    ...overrides,
  }
}

describe('parseRegistryRecord (id)', () => {
  test('acepta los campos obligatorios y los opcionales de texto', () => {
    expect(parseRegistryRecord(JSON.stringify({ ...record(5, { cwd: '/x', version: '1', entrypoint: 'cli', pidDomain: DOMAIN }), extra: true }))).toEqual(
      record(5, { cwd: '/x', version: '1', entrypoint: 'cli', pidDomain: DOMAIN }),
    )
  })

  test('rehúsa lo que no tiene la forma', () => {
    expect(parseRegistryRecord('no es json')).toBeNull()
    expect(parseRegistryRecord(JSON.stringify({ ...record(5), kind: 'otro' }))).toBeNull()
    expect(parseRegistryRecord(JSON.stringify({ ...record(5), pid: '5' }))).toBeNull()
    expect(parseRegistryRecord(JSON.stringify({ ...record(5), sessionId: 3 }))).toBeNull()
    expect(parseRegistryRecord(JSON.stringify({ ...record(5), startedAt: 'x' }))).toBeNull()
    expect(parseRegistryRecord(JSON.stringify({ ...record(5), cwd: 7 }))).toBeNull()
    expect(parseRegistryRecord('[]')).toBeNull()
  })

  test('el tope de lectura es 256 KiB', () => {
    expect(REGISTRY_RECORD_MAX_BYTES).toBe(262144)
  })
})

describe('lectura y borrado por el storage (Ny, Fy)', () => {
  const bytes = (text: string) => new TextEncoder().encode(text)

  test('Ny lee una sola vez hasta el tope más uno y descarta lo que lo excede', async () => {
    const requests: unknown[] = []
    const storage = {
      read: async (items: unknown[]) => {
        requests.push(items)
        return { ok: true, value: { items: [{ found: true, value: bytes(JSON.stringify(record(7))) }] } }
      },
    } as unknown as RegistryStorage
    expect(await readRegistryRecordFromStorage(storage, '7.json')).toEqual(record(7))
    expect(requests).toEqual([[{ key: { namespace: 'session', file: '7.json' }, offset: 0, length: REGISTRY_RECORD_MAX_BYTES + 1 }]])
    const padded = bytes(JSON.stringify(record(7)).padEnd(REGISTRY_RECORD_MAX_BYTES + 1, ' '))
    const big = { read: async () => ({ ok: true, value: { items: [{ found: true, value: padded }] } }) } as unknown as RegistryStorage
    expect(await readRegistryRecordFromStorage(big, '7.json')).toBeNull()
    const missing = { read: async () => ({ ok: true, value: { items: [{ found: false, value: new Uint8Array() }] } }) } as unknown as RegistryStorage
    expect(await readRegistryRecordFromStorage(missing, '7.json')).toBeNull()
    const throwing = {
      read: async () => {
        throw new Error('x')
      },
    } as unknown as RegistryStorage
    expect(await readRegistryRecordFromStorage(throwing, '7.json')).toBeNull()
  })

  test('Fy dice si el registro existía; un fallo es false', async () => {
    const storage = (result: unknown) => ({ delete: async () => result }) as unknown as RegistryStorage
    expect(await deleteRegistryRecordFromStorage(storage({ ok: true, value: { existed: true } }), '7.json')).toBe(true)
    expect(await deleteRegistryRecordFromStorage(storage({ ok: true, value: { existed: false } }), '7.json')).toBe(false)
    expect(await deleteRegistryRecordFromStorage(storage({ ok: false, error: { code: 'EIO' } }), '7.json')).toBe(false)
  })
})

describe('recordInPidDomain (lpn) e isWindowsPosixCwd (aD)', () => {
  test('un registro con dominio vale sólo en el suyo', () => {
    const d = deps()
    expect(recordInPidDomain(record(5, { pidDomain: DOMAIN }) as never, DOMAIN, [], d)).toBe(true)
    expect(recordInPidDomain(record(5, { pidDomain: 'otro' }) as never, DOMAIN, [], d)).toBe(false)
  })

  test('sin registro: una clave de otro dominio lo aparta; si no, depende de la plataforma', () => {
    expect(recordInPidDomain(null, DOMAIN, [undefined, 'otro'], deps())).toBe(false)
    expect(recordInPidDomain(null, DOMAIN, [DOMAIN, undefined], deps())).toBe(true)
    expect(recordInPidDomain(null, DOMAIN, [], deps({ platform: () => 'windows' }))).toBe(false)
    expect(recordInPidDomain(null, DOMAIN, [], deps({ platform: () => 'macos', isInteractive: () => false }))).toBe(false)
    expect(recordInPidDomain(null, DOMAIN, [], deps({ platform: () => 'macos' }))).toBe(true)
  })

  test('sin dominio en windows, una ruta POSIX es de otro sistema', () => {
    const windows = deps({ platform: () => 'windows' })
    expect(isWindowsPosixCwd('/home/u', windows)).toBe(true)
    expect(isWindowsPosixCwd('C:\\u', windows)).toBe(false)
    expect(isWindowsPosixCwd(undefined, windows)).toBe(false)
    expect(isWindowsPosixCwd('/home/u', deps())).toBe(false)
    expect(recordInPidDomain(record(5, { cwd: '/home/u' }) as never, DOMAIN, [], windows)).toBe(false)
    expect(recordInPidDomain(record(5, { cwd: 'C:\\u' }) as never, DOMAIN, [], windows)).toBe(true)
  })

  test('sin dominio en macos no interactivo, sólo cuentan las rutas bajo el home', () => {
    const mac = deps({ platform: () => 'macos', isInteractive: () => false })
    expect(recordInPidDomain(record(5, { cwd: `/home/u${sep}p` }) as never, DOMAIN, [], mac)).toBe(true)
    expect(recordInPidDomain(record(5, { cwd: '/home/u' }) as never, DOMAIN, [], mac)).toBe(true)
    expect(recordInPidDomain(record(5) as never, DOMAIN, [], mac)).toBe(true)
    expect(recordInPidDomain(record(5, { cwd: '/home/uv' }) as never, DOMAIN, [], mac)).toBe(false)
    expect(recordInPidDomain(record(5, { cwd: '/otra' }) as never, DOMAIN, [], deps({ platform: () => 'macos' }))).toBe(true)
    expect(recordInPidDomain(record(5, { cwd: '/otra' }) as never, DOMAIN, [], deps())).toBe(true)
  })
})

describe('sweepDeadPidKeys (ZKn, Ly)', () => {
  test('borra las claves de un pid muerto en este dominio o sin dominio', async () => {
    write(KEY(9, 'a'), { peerToken: 'a'.repeat(32), pidDomain: DOMAIN })
    write(KEY(9, 'b'), { peerToken: 'b'.repeat(32) })
    write(KEY(9, 'c'), { peerToken: 'c'.repeat(32), pidDomain: 'otro' })
    write(KEY(19, 'a'), { peerToken: 'a'.repeat(32) })
    write('9.json', record(9))
    await sweepDeadPidKeys(dir, 9, DOMAIN, undefined, deps({}, [9, 19]))
    expect(readdirSync(dir).sort()).toEqual([KEY(19, 'a'), KEY(9, 'c'), '9.json'].sort())
  })

  test('no toca las claves de un pid vivo ni las propias', async () => {
    write(KEY(9), { peerToken: 'a'.repeat(32) })
    write(KEY(1), { peerToken: 'a'.repeat(32) })
    await sweepDeadPidKeys(dir, 9, DOMAIN, undefined, deps())
    await sweepDeadPidKeys(dir, 1, DOMAIN, undefined, deps({}, [1]))
    expect(readdirSync(dir).sort()).toEqual([KEY(1), KEY(9)].sort())
  })

  test('con el backend activo lista y borra por el storage', async () => {
    write(KEY(9), { peerToken: 'a'.repeat(32) })
    const deleted: unknown[] = []
    const storage = {
      listEntries: async () => ({ ok: true, value: { items: [{ kind: 'key', key: { namespace: 'session', file: KEY(9) } }] } }),
      delete: async (key: unknown) => {
        deleted.push(key)
        return { ok: true, value: { existed: true } }
      },
    } as unknown as RegistryStorage
    await sweepDeadPidKeys(dir, 9, DOMAIN, storage, deps({ storageBackendActive: () => true }, [9]))
    expect(deleted).toEqual([{ namespace: 'session', file: KEY(9) }])
    expect(existsSync(join(dir, KEY(9)))).toBe(true)
  })

  test('sin directorio no hace nada', async () => {
    await sweepDeadPidKeys(join(dir, 'no'), 9, DOMAIN, undefined, deps({}, [9]))
  })
})

describe('sweepRegistry (xut)', () => {
  test('cuenta las vivas y la propia; borra los registros muertos del dominio', async () => {
    write('1.json', record(1))
    write('2.json', record(2))
    write('3.json', record(3, { pidDomain: DOMAIN }))
    write('4.json', record(4, { pidDomain: 'otro' }))
    write('5.json', 'roto')
    write('otro.txt', 'x')
    const d = deps({}, [3, 4], [2])
    expect(await sweepRegistry(undefined, d)).toBe(2)
    expect(d.recorded.slept).toEqual([])
    expect(readdirSync(dir).sort()).toEqual(['1.json', '2.json', '4.json', '5.json', 'otro.txt'])
    expect(d.state().uncleanExitsScanned).toBe(true)
  })

  test('declinado: no borra ni avisa, y no marca la exploración', async () => {
    write('3.json', record(3))
    const d = deps({}, [3])
    const state = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false, probeRegistrySweep: async () => false })
    d.state = () => state
    expect(await sweepRegistry(undefined, d)).toBe(0)
    expect(existsSync(join(dir, '3.json'))).toBe(true)
    expect(state.uncleanExitsScanned).toBe(false)
    expect(d.recorded.logs[0]).toContain('declined by isRegistrySweepPermitted()')
  })

  test('reporta una salida sucia interactiva una vez, sin entrypoint embebido', async () => {
    write('3.json', record(3, { version: '2.0.0', entrypoint: 'cli' }))
    write('6.json', record(6, { kind: 'bg' }))
    write('7.json', record(7, { entrypoint: 'embedded' }))
    const d = deps({}, [3, 6, 7])
    await sweepRegistry(undefined, d)
    expect(d.recorded.events).toEqual([
      ['tengu_unclean_exit', { session_age_sec: 60, prior_version: '2.0.0', on_current_version: true, prior_session_id: 's3' }],
    ])
    expect(d.recorded.logs).toContain('Prior session exited uncleanly: s3 (v2.0.0)')
    expect(d.state().reportedUncleanExitPaths.has(join(dir, '3.json'))).toBe(true)
  })

  test('una vez explorado no vuelve a reportar', async () => {
    write('3.json', record(3))
    const d = deps({}, [3])
    d.state().setUncleanExitsScanned(true)
    await sweepRegistry(undefined, d)
    expect(d.recorded.events).toEqual([])
    expect(existsSync(join(dir, '3.json'))).toBe(false)
  })

  test('un registro ilegible se relee tras 25 ms; sin registro decide el dominio de sus claves', async () => {
    write('3.json', 'roto')
    write(KEY(3), { peerToken: 'a'.repeat(32), pidDomain: 'otro' })
    write('8.json', 'roto')
    write(KEY(8), { peerToken: 'a'.repeat(32), pidDomain: DOMAIN })
    const d = deps({}, [3, 8])
    await sweepRegistry(undefined, d)
    expect(d.recorded.slept).toEqual([25, 25])
    expect(readdirSync(dir).sort()).toEqual(['3.json', KEY(3)].sort())
  })

  test('el registro releído tras la espera es el que decide', async () => {
    write('3.json', 'roto')
    const d = deps({ sleep: async () => write('3.json', record(3, { pidDomain: 'otro' })) }, [3])
    await sweepRegistry(undefined, d)
    expect(existsSync(join(dir, '3.json'))).toBe(true)
  })

  test('limpia las claves huérfanas: con dominio si coincide; sin dominio en linux o si su registro se borró', async () => {
    write(KEY(10), { peerToken: 'a'.repeat(32), pidDomain: DOMAIN })
    write(KEY(11), { peerToken: 'a'.repeat(32), pidDomain: 'otro' })
    write(KEY(12), { peerToken: 'a'.repeat(32) })
    write(KEY(13), { peerToken: 'a'.repeat(32) })
    write('13.json', record(13))
    await sweepRegistry(undefined, deps({ platform: () => 'macos' }, [10, 11, 12, 13]))
    expect(readdirSync(dir).sort()).toEqual([KEY(11), KEY(12)].sort())
  })

  test('en linux una clave sin dominio de un pid muerto se borra', async () => {
    write(KEY(12), { peerToken: 'a'.repeat(32) })
    await sweepRegistry(undefined, deps({}, [12]))
    expect(readdirSync(dir)).toEqual([])
  })

  test('no toca los pids que no están muertos ni los apartados por dominio', async () => {
    write('4.json', record(4, { pidDomain: 'otro' }))
    write(KEY(4), { peerToken: 'a'.repeat(32) })
    write('20.json', record(20))
    write(KEY(20), { peerToken: 'a'.repeat(32) })
    await sweepRegistry(undefined, deps({}, [4]))
    expect(readdirSync(dir).sort()).toEqual(['20.json', '4.json', KEY(20), KEY(4)].sort())
  })

  test('sin directorio devuelve 0 y sólo avisa si no es ENOENT', async () => {
    const d = deps({ sessionsDir: () => join(dir, 'no') })
    expect(await sweepRegistry(undefined, d)).toBe(0)
    expect(d.recorded.logs).toEqual([])
  })

  test('por el storage: lista, lee y borra el registro', async () => {
    const files = new Map([['3.json', JSON.stringify(record(3))], ['1.json', JSON.stringify(record(1))]])
    const storage = {
      listEntries: async () => ({ ok: true, value: { items: [...files.keys()].map(file => ({ kind: 'key', key: { namespace: 'session', file } })) } }),
      read: async ([request]: Array<{ key: { file: string } }>) => {
        const text = files.get(request!.key.file)
        return { ok: true, value: { items: [{ found: text !== undefined, value: new TextEncoder().encode(text ?? '') }] } }
      },
      delete: async (key: { file: string }) => ({ ok: true, value: { existed: files.delete(key.file) } }),
    } as unknown as RegistryStorage
    const d = deps({}, [3])
    expect(await sweepRegistry(storage, d)).toBe(1)
    expect([...files.keys()]).toEqual(['1.json'])
    expect(d.recorded.events.length).toBe(1)
  })

  test('un listado del storage que falla devuelve 0', async () => {
    const storage = { listEntries: async () => ({ ok: false, error: { code: 'EIO' } }) } as unknown as RegistryStorage
    const d = deps()
    expect(await sweepRegistry(storage, d)).toBe(0)
    expect(d.recorded.logs).toEqual(['[concurrentSessions] session list failed: EIO'])
  })
})

describe('probeRegistrySweepPermitted', () => {
  function permission(overrides: Partial<SweepPermissionDeps> = {}): SweepPermissionDeps {
    return {
      platform: () => 'linux',
      isInteractive: () => true,
      env: {},
      pid: 42,
      isBubblewrapSandbox: () => false,
      isDocker: async () => false,
      readlink: async () => '42',
      readdirNames: async () => Array.from({ length: 16 }, (_, index) => String(index + 1)).concat(['self', 'net']),
      ...overrides,
    }
  }

  test('linux interactivo, sin sandbox y viendo los pids del anfitrión', async () => {
    expect(await probeRegistrySweepPermitted(permission())).toBe(true)
  })

  test('wsl nunca; linux no interactivo tampoco; windows y macos sí', async () => {
    expect(await probeRegistrySweepPermitted(permission({ platform: () => 'wsl' }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ isInteractive: () => false }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ isInteractive: () => false, platform: () => 'macos' }))).toBe(true)
    expect(await probeRegistrySweepPermitted(permission({ isInteractive: () => false, platform: () => 'windows' }))).toBe(true)
  })

  test('un contenedor de windows, bubblewrap, IS_SANDBOX o docker lo niegan', async () => {
    expect(await probeRegistrySweepPermitted(permission({ platform: () => 'windows', env: { CONTAINER_SANDBOX_MOUNT_POINT: 'C:\\x' } }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ platform: () => 'windows', env: { USERNAME: 'ContainerAdministrator' } }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ platform: () => 'windows', env: { USERNAME: 'ContainerUser' } }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ env: { USERNAME: 'ContainerUser' } }))).toBe(true)
    expect(await probeRegistrySweepPermitted(permission({ isBubblewrapSandbox: () => true }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ env: { IS_SANDBOX: 'yes' } }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ isDocker: async () => true }))).toBe(false)
  })

  test('gfn: /proc/self tiene que ser este pid y /proc tener al menos 16 pids', async () => {
    expect(await probeRegistrySweepPermitted(permission({ readlink: async () => '1' }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ readlink: async () => Promise.reject(new Error('x')) }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ readdirNames: async () => ['1', '2', 'self'] }))).toBe(false)
    const fewPids = Array.from({ length: 15 }, (_, index) => String(index + 1)).concat(['self', 'net', 'sys', 'bus'])
    expect(await probeRegistrySweepPermitted(permission({ readdirNames: async () => fewPids }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ readdirNames: async () => Promise.reject(new Error('x')) }))).toBe(false)
    expect(await probeRegistrySweepPermitted(permission({ platform: () => 'macos', readlink: async () => '1' }))).toBe(true)
  })
})
