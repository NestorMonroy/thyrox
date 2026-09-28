/**
 * El tipo de sesión según el entorno y el anfitrión: `oJ`, `vt`, `fm`, `Ip`,
 * `tc`, `tz`, `jte`, `NNr` y `qKn` (`chunk-t6pwageh.js`) de 2.1.283.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import {
  type SessionKindHost,
  configureSessionKindHost,
  currentJobDir,
  hasBackgroundJob,
  isBackgroundSession,
  isDetachedBackgroundSession,
  isRemoteDrivenSession,
  jobStorageKey,
  jobsRootDir,
  processSessionKindHost,
  sessionKind,
  usesDaemonBackend,
} from '../src/uds/sessionKind.ts'

function host(overrides: Partial<SessionKindHost> = {}): SessionKindHost {
  return {
    env: {},
    configHome: () => '/cfg',
    bgTakeover: () => null,
    replBridgeActive: () => false,
    teammateAgentId: () => undefined,
    attacherCaps: () => undefined,
    ...overrides,
  }
}

describe('sessionKind (oJ) y los predicados por tipo', () => {
  test('THYROX_CODE_SESSION_KIND sólo cuenta con bg, daemon o daemon-worker', () => {
    expect(sessionKind(host({ env: { THYROX_CODE_SESSION_KIND: 'bg' } }))).toBe('bg')
    expect(sessionKind(host({ env: { THYROX_CODE_SESSION_KIND: 'daemon' } }))).toBe('daemon')
    expect(sessionKind(host({ env: { THYROX_CODE_SESSION_KIND: 'daemon-worker' } }))).toBe('daemon-worker')
    expect(sessionKind(host({ env: { THYROX_CODE_SESSION_KIND: 'interactive' } }))).toBeUndefined()
    expect(sessionKind(host())).toBeUndefined()
  })

  test('isBackgroundSession (vt) e isDetachedBackgroundSession (Ip)', () => {
    const bg = { env: { THYROX_CODE_SESSION_KIND: 'bg' } }
    expect(isBackgroundSession(host(bg))).toBe(true)
    expect(isBackgroundSession(host({ env: { THYROX_CODE_SESSION_KIND: 'daemon' } }))).toBe(false)
    expect(isDetachedBackgroundSession(host(bg))).toBe(true)
    expect(isDetachedBackgroundSession(host({ ...bg, attacherCaps: () => ({ tty: true }) }))).toBe(false)
    expect(isDetachedBackgroundSession(host())).toBe(false)
  })

  test('isRemoteDrivenSession (fm): puente del REPL, sesión de fondo o teammate', () => {
    expect(isRemoteDrivenSession(host())).toBe(false)
    expect(isRemoteDrivenSession(host({ replBridgeActive: () => true }))).toBe(true)
    expect(isRemoteDrivenSession(host({ env: { THYROX_CODE_SESSION_KIND: 'bg' } }))).toBe(true)
    expect(isRemoteDrivenSession(host({ teammateAgentId: () => 'a1' }))).toBe(true)
    expect(isRemoteDrivenSession(host({ teammateAgentId: () => '' }))).toBe(true)
  })

  test('hasBackgroundJob (tc): sesión de fondo, o una toma de control de un trabajo', () => {
    expect(hasBackgroundJob(host())).toBe(false)
    expect(hasBackgroundJob(host({ bgTakeover: () => ({ jobDir: '/j' }) }))).toBe(true)
    expect(hasBackgroundJob(host({ bgTakeover: () => ({}) }))).toBe(true)
    expect(hasBackgroundJob(host({ env: { THYROX_CODE_SESSION_KIND: 'bg' } }))).toBe(true)
  })

  test('currentJobDir (tz): el de la toma de control, y si no THYROX_JOB_DIR', () => {
    expect(currentJobDir(host({ env: { THYROX_JOB_DIR: '/env' } }))).toBe('/env')
    expect(currentJobDir(host({ env: { THYROX_JOB_DIR: '/env' }, bgTakeover: () => ({ jobDir: '/take' }) }))).toBe('/take')
    expect(currentJobDir(host({ env: { THYROX_JOB_DIR: '/env' }, bgTakeover: () => ({}) }))).toBe('/env')
    expect(currentJobDir(host())).toBeUndefined()
  })

  test('usesDaemonBackend (jte): THYROX_BG_BACKEND igual a daemon', () => {
    expect(usesDaemonBackend(host({ env: { THYROX_BG_BACKEND: 'daemon' } }))).toBe(true)
    expect(usesDaemonBackend(host({ env: { THYROX_BG_BACKEND: 'detached' } }))).toBe(false)
    expect(usesDaemonBackend(host())).toBe(false)
  })
})

describe('trabajos en el storage', () => {
  test('jobsRootDir (NNr) es <config>/jobs', () => {
    expect(jobsRootDir(host())).toBe(join('/cfg', 'jobs'))
  })

  test('jobStorageKey (qKn): sólo un trabajo directamente bajo la raíz de trabajos', () => {
    expect(jobStorageKey('/cfg/jobs/abc', ['state.json'], host())).toEqual({ namespace: 'job', jobId: 'abc', relPath: ['state.json'] })
    expect(jobStorageKey('/cfg/jobs/abc/', ['state.json'], host())).toBeUndefined()
    expect(jobStorageKey('/otro/jobs/abc', ['state.json'], host())).toBeUndefined()
    expect(jobStorageKey('/cfg/jobs/a/b', ['state.json'], host())).toBeUndefined()
    expect(jobStorageKey('/cfg/jobs/..', ['state.json'], host())).toBeUndefined()
    expect(jobStorageKey('/cfg/jobs/.0123456789abcdef.aside', ['state.json'], host())).toBeUndefined()
  })
})

describe('el anfitrión del proceso', () => {
  afterEach(() => configureSessionKindHost({ bgTakeover: () => null, replBridgeActive: () => false, teammateAgentId: () => undefined, attacherCaps: () => undefined }))

  test('lee process.env y deja configurar lo que vive en otros paquetes', () => {
    const saved = process.env.THYROX_CODE_SESSION_KIND
    process.env.THYROX_CODE_SESSION_KIND = 'bg'
    try {
      expect(sessionKind()).toBe('bg')
    } finally {
      if (saved === undefined) delete process.env.THYROX_CODE_SESSION_KIND
      else process.env.THYROX_CODE_SESSION_KIND = saved
    }
    expect(processSessionKindHost.bgTakeover()).toBeNull()
    configureSessionKindHost({ bgTakeover: () => ({ jobDir: '/tomado' }) })
    expect(currentJobDir()).toBe('/tomado')
    expect(processSessionKindHost.configHome()).toBeString()
  })
})
