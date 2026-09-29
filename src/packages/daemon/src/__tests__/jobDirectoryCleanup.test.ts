import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const ISOLATED_HOME = mkdtempSync(join(tmpdir(), 'ccb-jobdircleanup-test-'))
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

import {
  cleanupJobDirectory,
  cleanupPtyPidBreadcrumbs,
  ensureHostManagedDir,
  ensurePtyPidsDir,
  formatRetireMessage,
  getHostManagedDir,
  removeLegacyJobFile,
} from '../jobDirectoryCleanup.js'
import { getPtyPidsDir, getPtySocketPath } from '../socketPaths.js'

const JOBS_DIR = join(ISOLATED_HOME, 'jobs')

function clearAll(): void {
  rmSync(JOBS_DIR, { recursive: true, force: true })
  rmSync(join(ISOLATED_HOME, 'daemon'), { recursive: true, force: true })
  mkdirSync(JOBS_DIR, { recursive: true, mode: 0o700 })
}

beforeEach(clearAll)
afterEach(clearAll)

describe('ensurePtyPidsDir — ref wr (chunk-92tvramn.js)', () => {
  test('crea el directorio de breadcrumbs pty-pids', async () => {
    await ensurePtyPidsDir()
    expect(existsSync(getPtyPidsDir())).toBe(true)
  })

  test('un mkdir fallido se ignora en silencio (catch vacío)', async () => {
    // Deja un archivo regular en la ruta del directorio: mkdir({recursive:true})
    // falla porque el segmento final ya existe y no es un directorio.
    mkdirSync(join(getPtyPidsDir(), '..'), { recursive: true })
    writeFileSync(getPtyPidsDir(), 'no-es-un-directorio')
    await expect(ensurePtyPidsDir()).resolves.toBeUndefined()
    rmSync(getPtyPidsDir(), { force: true })
  })
})

describe('ensureHostManagedDir — ref mr (chunk-92tvramn.js)', () => {
  test('crea el directorio host-managed con modo 0700', async () => {
    await ensureHostManagedDir()
    expect(existsSync(getHostManagedDir())).toBe(true)
  })

  test('a diferencia de wr, un mkdir fallido SE PROPAGA (sin catch en la referencia)', async () => {
    mkdirSync(join(getHostManagedDir(), '..'), { recursive: true })
    writeFileSync(getHostManagedDir(), 'no-es-un-directorio')
    await expect(ensureHostManagedDir()).rejects.toBeDefined()
    rmSync(getHostManagedDir(), { force: true })
  })
})

describe('removeLegacyJobFile — ref _r (chunk-92tvramn.js)', () => {
  test('una ruta inexistente no es un residuo: devuelve false', async () => {
    expect(await removeLegacyJobFile(join(JOBS_DIR, 'no-existe'))).toBe(false)
  })

  test('un directorio no es un residuo: devuelve false y no lo toca', async () => {
    const dir = join(JOBS_DIR, 'abc11111')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), '{}')
    expect(await removeLegacyJobFile(dir)).toBe(false)
    expect(existsSync(join(dir, 'meta.json'))).toBe(true)
  })

  test('un archivo plano SÍ es un residuo: lo borra y devuelve true', async () => {
    const file = join(JOBS_DIR, 'legacy-job-file')
    writeFileSync(file, 'formato antiguo')
    expect(await removeLegacyJobFile(file)).toBe(true)
    expect(existsSync(file)).toBe(false)
  })
})

describe('cleanupJobDirectory — ref $t (chunk-92tvramn.js)', () => {
  test('borra el árbol jobs/<jobId> completo', async () => {
    const dir = join(JOBS_DIR, 'job11111')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), '{}')
    const errors: string[] = []
    await cleanupJobDirectory('job11111', (code) => errors.push(code))
    expect(existsSync(dir)).toBe(false)
    expect(errors).toEqual([])
  })

  test('si jobs/<jobId> es un residuo de formato antiguo (archivo plano), se borra y no se invoca onError', async () => {
    const path = join(JOBS_DIR, 'job22222')
    writeFileSync(path, 'formato antiguo')
    const errors: string[] = []
    await cleanupJobDirectory('job22222', (code) => errors.push(code))
    expect(existsSync(path)).toBe(false)
    expect(errors).toEqual([])
  })

  test('un fallo al borrar invoca onError con el código', async () => {
    // Un jobId con un byte nulo hace que `rm` rechace de forma síncrona
    // (ERR_INVALID_ARG_VALUE) antes de tocar el disco — dispara la rama de
    // error sin depender de permisos del sistema de archivos.
    const errors: string[] = []
    await cleanupJobDirectory('job\u000033333', (code) => errors.push(code))
    expect(errors.length).toBe(1)
  })
})

describe('cleanupPtyPidBreadcrumbs — ref tt (chunk-92tvramn.js)', () => {
  test('borra las cuatro variantes de breadcrumb de un job', async () => {
    mkdirSync(getPtyPidsDir(), { recursive: true })
    const short = 'pty11111'
    const pidFile = join(getPtyPidsDir(), `${short}.pid`)
    const socket = getPtySocketPath(short)
    mkdirSync(dirname(socket), { recursive: true })
    writeFileSync(pidFile, '123')
    writeFileSync(`${socket}.err`, 'e')
    writeFileSync(`${socket}.late`, 'l')
    writeFileSync(`${socket}.exec-exit`, '0')
    await cleanupPtyPidBreadcrumbs(short)
    expect(existsSync(pidFile)).toBe(false)
    expect(existsSync(`${socket}.err`)).toBe(false)
    expect(existsSync(`${socket}.late`)).toBe(false)
    expect(existsSync(`${socket}.exec-exit`)).toBe(false)
  })

  test('usa el ptySocket dado, no el derivado del short, cuando se pasa un override', async () => {
    mkdirSync(getPtyPidsDir(), { recursive: true })
    const short = 'pty22222'
    const override = join(getPtyPidsDir(), 'override.sock')
    writeFileSync(`${override}.exec-exit`, '0')
    await cleanupPtyPidBreadcrumbs(short, override)
    expect(existsSync(`${override}.exec-exit`)).toBe(false)
  })

  test('ninguno de los cuatro archivos existe: no lanza (catch silencioso por iteración)', async () => {
    await expect(cleanupPtyPidBreadcrumbs('pty-nada')).resolves.toBeUndefined()
  })
})

describe('formatRetireMessage — ref Ve (chunk-92tvramn.js)', () => {
  const worker = { short: 'abc12345', cliVersion: '2.1.283', isVersionStale: false }

  test('sin retiro, devuelve null (ref: `if(!o.retired)return!1`)', () => {
    const msg = formatRetireMessage(worker, { retired: false, idleMs: 999_999, cause: 'idle' })
    expect(msg).toBeNull()
  })

  test('idle en minutos por debajo de 120', () => {
    const msg = formatRetireMessage(worker, { retired: true, idleMs: 5 * 60_000, cause: 'idle' })
    expect(msg).toBe('bg retire abc12345: idle, idle 5m')
  })

  test('idle en horas a partir de 120 minutos', () => {
    const msg = formatRetireMessage(worker, { retired: true, idleMs: 130 * 60_000, cause: 'idle' })
    expect(msg).toBe('bg retire abc12345: idle, idle 2h')
  })

  test('CLI version desactualizada agrega la advertencia con ambas versiones', () => {
    const stale = { ...worker, isVersionStale: true }
    const msg = formatRetireMessage(stale, { retired: true, idleMs: 60_000, cause: 'idle' })
    expect(msg).toContain(', worker 2.1.283 (daemon ')
  })

  test('una cliVersion con formato inválido se reporta como "unrecognized"', () => {
    const stale = { short: 'abc12345', cliVersion: 'a b c', isVersionStale: true }
    const msg = formatRetireMessage(stale, { retired: true, idleMs: 60_000, cause: 'idle' })
    expect(msg).toContain(', worker unrecognized (daemon ')
  })

  test('una etiqueta extra se agrega entre corchetes al final', () => {
    const msg = formatRetireMessage(
      worker,
      { retired: true, idleMs: 60_000, cause: 'idle' },
      'low memory',
    )
    expect(msg).toBe('bg retire abc12345: idle, idle 1m [low memory]')
  })
})
