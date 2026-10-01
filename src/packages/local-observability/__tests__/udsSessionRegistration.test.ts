/**
 * El alta de la sesión en el registro: `nD`, `KNt`, `lD`, `ZM`, `QM`, `QKn`,
 * `opn` y `xy` (`chunk-t6pwageh.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { EntrypointHostState } from '@thyrox/config/entrypoint'

import { updatePidFile } from '../src/uds/pidFileRecord.ts'
import {
  PEER_PROTOCOL_VERSION,
  type RegistrationDeps,
  type RegistrationStorage,
  type SessionSwitchListener,
  adoptsConversation,
  hostSessionId,
  peerFeatures,
  processRegistrationDeps,
  registerSession,
  startSessionRegistration,
  supportsPeerPid,
  tmuxPaneTarget,
  validHostSessionId,
} from '../src/uds/sessionRegistration.ts'
import { SessionRegistryState } from '../src/uds/sessionRegistryState.ts'

let dir: string
let env: Record<string, string | undefined>
let state: SessionRegistryState
let sessionId: string
let cwd: string
let stable: boolean
let owned: boolean
let logs: string[]
let exitListeners: Array<() => void>
let cleanups: Array<() => Promise<void>>
let switchListeners: SessionSwitchListener[]
let cwdListeners: Array<(cwd: string) => void>
let polls: number

const sessionsDir = () => join(dir, 'sessions')
const pidFile = () => join(sessionsDir(), '4242.json')
const record = () => JSON.parse(readFileSync(pidFile(), 'utf8'))

function deps(overrides: Partial<RegistrationDeps> = {}): RegistrationDeps {
  return {
    sessionsDir,
    pid: 4242,
    now: () => 1000,
    log: message => void logs.push(message),
    ownsRegistryRecord: () => owned,
    state: () => state,
    kindHost: () => ({ env, configHome: () => dir, bgTakeover: () => null, replBridgeActive: () => false, teammateAgentId: () => undefined, attacherCaps: () => undefined }),
    storageBackendActive: () => false,
    scheduleEvery: () => {
      polls++
      return { handle: 0 as unknown as ReturnType<typeof setInterval>, unref: () => {} }
    },
    sessionId: () => sessionId,
    cwd: () => cwd,
    version: '9.9.9',
    tmuxPane: async () => undefined,
    processStartToken: async pid => `start-${pid}`,
    pidDomain: async () => 'linux:m:ns',
    peerFeatures: () => ['notify_idle', 'artifact_yield'],
    hostSessionId: () => undefined,
    derivedName: (folder, id) => `${folder.split('/').at(-1)}-${id}`,
    stableAddress: () => stable,
    onExit: listener => void exitListeners.push(listener),
    registerCleanup: cleanup => void cleanups.push(cleanup),
    onSessionSwitch: listener => void switchListeners.push(listener),
    onOriginalCwdChange: listener => void cwdListeners.push(listener),
    ...overrides,
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'registration-'))
  env = {}
  sessionId = 's1'
  cwd = '/work/app'
  stable = true
  owned = true
  logs = []
  exitListeners = []
  cleanups = []
  switchListeners = []
  cwdListeners = []
  polls = 0
  state = new SessionRegistryState({ now: () => 1000, sessionId: () => sessionId, stableAddress: () => stable })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('registerSession (nD)', () => {
  test('sin el registro de esta sesión no escribe nada', async () => {
    const before = state.pidFileWriteChain
    owned = false
    expect(await registerSession(undefined, deps())).toBe(false)
    expect(state.pidFileWriteChain).toBe(before)
    expect(existsSync(sessionsDir())).toBe(false)
  })

  test('una sesión interactiva se publica con nombre derivado y su directorio 0700', async () => {
    expect(await registerSession(undefined, deps())).toBe(true)
    expect(record()).toEqual({
      pid: 4242,
      sessionId: 's1',
      cwd: '/work/app',
      startedAt: 1000,
      procStart: 'start-4242',
      version: '9.9.9',
      peerProtocol: PEER_PROTOCOL_VERSION,
      peerFeatures: ['notify_idle', 'artifact_yield'],
      kind: 'interactive',
      pidDomain: 'linux:m:ns',
      name: 'app-s1',
      nameSource: 'derived',
      nameSince: 1000,
    })
    expect(statSync(sessionsDir()).mode & 0o777).toBe(0o700)
    expect(state.registered).toBe(true)
    expect(state.registeredName).toEqual({ name: 'app-s1', source: 'derived', since: 1000, sessionId: 's1' })
    expect(state.liveSessionId).toBe('s1')
  })

  test('THYROX_CODE_SESSION_NAME da el nombre de lanzamiento, saneado', async () => {
    env.THYROX_CODE_SESSION_NAME = '  Mi\u0007 sesión  '
    await registerSession(undefined, deps())
    expect(record().name).toBe('Mi  sesión')
    expect('nameSource' in record()).toBe(false)
    expect(state.registeredName).toMatchObject({ name: 'Mi  sesión', source: 'user', givenAtLaunch: true })
  })

  test('un directorio ya existente vuelve a 0700; una interactiva no es reserva ni publica trabajo', async () => {
    mkdirSync(sessionsDir(), { mode: 0o755 })
    env.THYROX_BG_SOURCE = 'spare'
    env.THYROX_JOB_DIR = join(dir, 'jobs', 'j9')
    await registerSession(undefined, deps())
    expect(statSync(sessionsDir()).mode & 0o777).toBe(0o700)
    expect(state.bornSpare).toBe(false)
    expect('jobId' in record()).toBe(false)
    expect(polls).toBe(0)
  })

  test('un nombre de lanzamiento que se sanea a vacío cae al derivado', async () => {
    env.THYROX_CODE_SESSION_NAME = '\u0007'
    await registerSession(undefined, deps())
    expect(record().name).toBe('app-s1')
  })

  test('no pisa un nombre ya registrado', async () => {
    state.setRegisteredName('previo', 'user')
    await registerSession(undefined, deps())
    expect(state.registeredName?.name).toBe('previo')
  })

  test('publica entrypoint, socket, log, agente y tmux; recorta y omite lo vacío', async () => {
    env.THYROX_CODE_ENTRYPOINT = ' cli '
    env.THYROX_CODE_MESSAGING_SOCKET = '/tmp/s.sock'
    env.THYROX_CODE_SESSION_LOG = '/tmp/log'
    env.THYROX_CODE_AGENT = '   '
    await registerSession(undefined, deps({ tmuxPane: async () => 'main:@1.%2', hostSessionId: () => 'local_0123abcd' }))
    expect(record()).toMatchObject({ entrypoint: 'cli', messagingSocketPath: '/tmp/s.sock', logPath: '/tmp/log', tmux: 'main:@1.%2', hostSessionId: 'local_0123abcd' })
    expect('agent' in record()).toBe(false)
  })

  test('una sesión de fondo no lleva nombre derivado y publica su trabajo', async () => {
    env.THYROX_CODE_SESSION_KIND = 'bg'
    env.THYROX_JOB_DIR = join(dir, 'jobs', 'j42')
    await registerSession(undefined, deps())
    expect(record()).toMatchObject({ kind: 'bg', jobId: 'j42' })
    expect('name' in record()).toBe(false)
    expect(state.registeredName).toBeUndefined()
    expect(state.bornSpare).toBe(false)
  })

  test('una reserva sin reclamar se anuncia y empieza a sondear; reclamada no', async () => {
    env.THYROX_CODE_SESSION_KIND = 'bg'
    env.THYROX_BG_SOURCE = 'spare'
    env.THYROX_JOB_DIR = join(dir, 'jobs', 'j1')
    mkdirSync(env.THYROX_JOB_DIR, { recursive: true })
    await registerSession(undefined, deps())
    expect(record().spare).toBe(true)
    expect(state.bornSpare).toBe(true)
    expect(polls).toBe(1)
    writeFileSync(join(env.THYROX_JOB_DIR, 'state.json'), '{}')
    state = new SessionRegistryState({ now: () => 1000, sessionId: () => sessionId, stableAddress: () => stable })
    await registerSession(undefined, deps())
    expect('spare' in record()).toBe(false)
    expect(state.bornSpare).toBe(true)
    expect(polls).toBe(1)
  })

  test('una escritura pedida durante el alta espera detrás de ella', async () => {
    const d = deps()
    const registration = registerSession(undefined, d)
    const update = updatePidFile({ extra: 1 }, undefined, d)
    expect(await registration).toBe(true)
    expect(await update).toBe(true)
    expect(record().extra).toBe(1)
  })

  test('al salir retira el archivo, y la limpieza lo borra', async () => {
    await registerSession(undefined, deps())
    exitListeners[0]!()
    expect(existsSync(pidFile())).toBe(false)
    exitListeners[0]!()
    writeFileSync(pidFile(), '{}')
    await cleanups[0]!()
    expect(existsSync(pidFile())).toBe(false)
    await cleanups[0]!()
  })

  test('un fallo al preparar el alta se registra y deja la cadena libre', async () => {
    writeFileSync(join(dir, 'sessions'), 'no es directorio')
    expect(await registerSession(undefined, deps())).toBe(false)
    expect(logs.at(-1)).toStartWith('[concurrentSessions] register failed: ')
    expect(state.registered).toBe(false)
    let settled = false
    await state.pidFileWriteChain.then(() => void (settled = true))
    expect(settled).toBe(true)
  })

  test('con storage escribe en su sitio, y su fallo cancela el alta', async () => {
    const writes: unknown[] = []
    const deletes: unknown[] = []
    const storage = (ok: boolean): RegistrationStorage => ({
      read: async () => ({ ok: false, error: { code: 'EIO' } }),
      write: async (key, text, options) => (writes.push([key, JSON.parse(text).pid, options]), ok ? { ok: true, value: undefined } : { ok: false, error: { code: 'EACCES' } }),
      statMeta: async () => ({ ok: false, error: { code: 'NotFound' } }),
      delete: async key => void deletes.push(key),
    })
    expect(await registerSession(storage(true), deps())).toBe(true)
    expect(writes).toEqual([[{ namespace: 'session', file: '4242.json' }, 4242, { publishDiscipline: 'inPlace' }]])
    expect(existsSync(pidFile())).toBe(false)
    await cleanups[0]!()
    expect(deletes).toEqual([{ namespace: 'session', file: '4242.json' }])
    state = new SessionRegistryState({ now: () => 1000, sessionId: () => sessionId, stableAddress: () => stable })
    expect(await registerSession(storage(false), deps())).toBe(false)
    expect(logs).toEqual(['[concurrentSessions] v5 pid-file write failed: EACCES', '[concurrentSessions] register failed: v5 pid-file write failed'])
    const failing: RegistrationStorage = { ...storage(true), delete: async () => Promise.reject(new Error('x')) }
    await registerSession(failing, deps())
    await cleanups.at(-1)!()
  })
})

describe('los cambios de sesión y de directorio', () => {
  const flush = () => new Promise(resolve => setTimeout(resolve, 5))

  test('un cambio que no adopta sólo publica la sesión nueva', async () => {
    await registerSession(undefined, deps())
    await updatePidFile({ parkedJobId: 'job' }, undefined, deps())
    switchListeners[0]!('s2', 'clear')
    await flush()
    expect(record()).toMatchObject({ sessionId: 's2', name: 'app-s1' })
    expect('parkedJobId' in record()).toBe(false)
    expect(state.liveSessionId).toBe('s2')
    expect(state.adoptions).toBe(0)
  })

  test('sin dirección estable un cambio que adopta tampoco renombra', async () => {
    stable = false
    await registerSession(undefined, deps())
    switchListeners[0]!('s2', 'resume')
    await flush()
    expect(state.adoptions).toBe(0)
    expect(record().name).toBe('app-s1')
  })

  test('un cambio que adopta renombra el nombre derivado con la sesión nueva', async () => {
    await registerSession(undefined, deps())
    switchListeners[0]!('s2', 'resume')
    await flush()
    expect(state.adoptions).toBe(1)
    expect(state.registeredName).toMatchObject({ name: 'app-s2', source: 'derived' })
    expect(record()).toMatchObject({ name: 'app-s2', sessionId: 's2' })
  })

  test('un nombre de usuario de otra conversación se aparta y vuelve el de la adoptada', async () => {
    await registerSession(undefined, deps())
    state.setRegisteredName('propio', 'user')
    state.conversationNames.set('s2', { name: 'guardado', source: 'user' })
    const restored: string[] = []
    state.restoreSetAsideName = (name, source) => void restored.push(`${name}/${source}`)
    switchListeners[0]!('s2', 'hydrate')
    await flush()
    expect(state.conversationNames.get('s1')).toEqual({ name: 'propio', source: 'user' })
    expect(restored).toEqual(['guardado/user'])
  })

  test('un nombre dado al lanzar, o de la misma sesión, sólo cambia de sesión', async () => {
    env.THYROX_CODE_SESSION_NAME = 'lanzado'
    await registerSession(undefined, deps())
    switchListeners[0]!('s2', 'spare_claim')
    await flush()
    expect(state.registeredName).toMatchObject({ name: 'lanzado', sessionId: 's2', givenAtLaunch: true })
    expect(state.conversationNames.size).toBe(0)
  })

  test('un cambio de directorio publica el nuevo y renombra el nombre derivado', async () => {
    await registerSession(undefined, deps())
    cwdListeners[0]!('/work/otro')
    await flush()
    expect(record()).toMatchObject({ cwd: '/work/otro', name: 'otro-s1' })
    state.setRegisteredName('propio', 'user')
    cwdListeners[0]!('/work/tercero')
    await flush()
    expect(record()).toMatchObject({ cwd: '/work/tercero', name: 'otro-s1' })
    stable = false
    state.setRegisteredName('d', 'derived')
    cwdListeners[0]!('/work/cuarto')
    await flush()
    expect(state.registeredName?.name).toBe('d')
  })
})

test('startSessionRegistration (KNt) guarda el alta en curso', async () => {
  const registration = startSessionRegistration(undefined, deps())
  expect(state.registration).toBe(registration)
  expect(await registration).toBe(true)
})

describe('ayudantes del alta', () => {
  test('tmuxPaneTarget (lD) sólo pregunta dentro de tmux y con panel', async () => {
    const calls: unknown[] = []
    const run = async (command: string, args: string[], options: { timeout: number }) => (calls.push([command, args, options.timeout]), { code: 0, stdout: 'main:@1.%2\n' })
    expect(await tmuxPaneTarget({ TMUX_PANE: '%2' }, run)).toBeUndefined()
    expect(await tmuxPaneTarget({ TMUX: '/tmp/t' }, run)).toBeUndefined()
    expect(await tmuxPaneTarget({ TMUX: '/tmp/t', TMUX_PANE: '%2' }, run)).toBe('main:@1.%2')
    expect(calls).toEqual([['tmux', ['display-message', '-p', '-t', '%2', '#{session_name}:#{window_id}.#{pane_id}'], 1000]])
    expect(await tmuxPaneTarget({ TMUX: '/tmp/t', TMUX_PANE: '%2' }, async () => ({ code: 1, stdout: 'x' }))).toBeUndefined()
  })

  test('supportsPeerPid (QM) y peerFeatures (ZM)', () => {
    expect(supportsPeerPid('linux', { ant: { getPeerPid: () => 1 } })).toBe(true)
    expect(supportsPeerPid('windows', { ant: { getPeerPid: () => 1 } })).toBe(false)
    expect(supportsPeerPid('linux', {})).toBe(false)
    expect(supportsPeerPid('linux', undefined)).toBe(false)
    expect(peerFeatures(true)).toEqual(['notify_idle', 'reply_across_default_dirs', 'artifact_yield'])
    expect(peerFeatures(false)).toEqual(['notify_idle', 'artifact_yield'])
  })

  test('hostSessionId (QKn) con THYROX_CODE_HOST_SESSION_ID, sólo en el escritorio de primer nivel', () => {
    expect(validHostSessionId('local_0123abcd')).toBe('local_0123abcd')
    expect(validHostSessionId('local_0123')).toBeUndefined()
    expect(validHostSessionId(7)).toBeUndefined()
    const state = new EntrypointHostState()
    state.setEntrypoint('claude-desktop')
    const ctx = { env: { THYROX_CODE_HOST_SESSION_ID: 'local_0123abcd' }, state, teammateAgentId: () => undefined, isNonInteractive: () => false, argv: () => [] }
    expect(hostSessionId(ctx)).toBe('local_0123abcd')
    state.setInsideAgentShell(true)
    expect(hostSessionId(ctx)).toBeUndefined()
    state.setInsideAgentShell(false)
    state.setChildSession(true)
    expect(hostSessionId(ctx)).toBeUndefined()
  })

  test('adoptsConversation (xy)', () => {
    for (const reason of ['resume', 'remote_attach', 'spare_claim', 'hydrate', 'startup_custom_id']) expect(adoptsConversation(reason)).toBe(true)
    for (const reason of ['clear', 'fork', 'cd', 'otro']) expect(adoptsConversation(reason)).toBe(false)
  })
})

test('processRegistrationDeps exige las cuatro partes del anfitrión y compone el resto', async () => {
  const parts = {
    derivedName: () => 'x',
    registerCleanup: () => {},
    onSessionSwitch: () => {},
    onOriginalCwdChange: () => {},
  }
  const process_ = processRegistrationDeps(parts)
  expect(process_.derivedName).toBe(parts.derivedName)
  expect(process_.onSessionSwitch).toBe(parts.onSessionSwitch)
  expect(process_.pid).toBe(process.pid)
  expect(process_.peerFeatures()).toEqual(['notify_idle', 'artifact_yield'])
  expect(typeof process_.version).toBe('string')
  expect(await process_.processStartToken(process.pid)).toBeString()
})
