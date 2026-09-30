import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DAEMON_WORKER_START_STAGGER_MS,
  emptyDaemonConfig,
  startDaemonWorkerSet,
  type DaemonJsonConfig,
  type DaemonWorkerEntryConfig,
  type DaemonWorkerKind,
  type DaemonWorkerSetOptions,
} from '../daemonConfig.js'

// Porte de `Tt` (`chunk-92tvramn.js`, referencia 2.1.283): arranque del
// conjunto de workers de `daemon.json`, feature gate por tipo (`Ct`),
// recarga en caliente y refresco de flags.

const dirs: string[] = []

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function writeConfig(config: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'daemon-worker-set-'))
  dirs.push(dir)
  const path = join(dir, 'daemon.json')
  writeFileSync(path, typeof config === 'string' ? config : JSON.stringify(config))
  return path
}

function remoteControl(dir: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { dir, ...extra }
}

interface Launch {
  id: string
  kind: DaemonWorkerKind
  entry: DaemonWorkerEntryConfig
  delayMs: number
}

interface Harness {
  launches: Launch[]
  stops: Array<{ id: string; cause: string | undefined }>
  lines: string[]
  events: Array<{ name: string; metadata?: Record<string, unknown> }>
  errors: unknown[]
  busy: Set<string>
  enabled: Set<DaemonWorkerKind>
  triggerFileChange: () => void
  triggerFlagsRefresh: () => void
  watcherClosed: () => boolean
  options: (configPath: string, extra?: Partial<DaemonWorkerSetOptions>) => DaemonWorkerSetOptions
}

function makeHarness(): Harness {
  const launches: Launch[] = []
  const stops: Array<{ id: string; cause: string | undefined }> = []
  const lines: string[] = []
  const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
  const errors: unknown[] = []
  const busy = new Set<string>()
  const enabled = new Set<DaemonWorkerKind>(['heartbeat', 'remoteControl'])
  let onFileChange: () => void = () => {}
  let onFlags: () => void = () => {}
  let closed = false
  return {
    launches,
    stops,
    lines,
    events,
    errors,
    busy,
    enabled,
    triggerFileChange: () => onFileChange(),
    triggerFlagsRefresh: () => onFlags(),
    watcherClosed: () => closed,
    options: (configPath, extra = {}) => ({
      configPath,
      launchWorker: (id, kind, entry, delayMs) => {
        launches.push({ id, kind, entry, delayMs })
        return {
          kind,
          isBusy: () => busy.has(id),
          stop: async cause => {
            stops.push({ id, cause })
          },
        }
      },
      log: line => lines.push(line),
      isKindEnabled: kind => enabled.has(kind),
      watch: (_path, onChange) => {
        onFileChange = onChange
        return { close: () => (closed = true) }
      },
      onFlagsRefreshed: listener => {
        onFlags = listener
        return () => (onFlags = () => {})
      },
      logEventFn: (name, metadata) => events.push({ name, metadata }),
      logErrorFn: error => errors.push(error),
      ...extra,
    }),
  }
}

describe('startDaemonWorkerSet — arranque (ce de Tt)', () => {
  test('lanza una instancia por entrada, con id kind:index y escalonado He', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}], remoteControl: [remoteControl('/a'), remoteControl('/b')] })
    const set = await startDaemonWorkerSet(h.options(path))
    expect(h.launches.map(l => [l.id, l.delayMs])).toEqual([
      ['heartbeat:0', 0],
      ['remoteControl:0', DAEMON_WORKER_START_STAGGER_MS],
      ['remoteControl:1', 2 * DAEMON_WORKER_START_STAGGER_MS],
    ])
    expect(h.lines).toEqual(['spawned heartbeat:0', 'spawned remoteControl:0', 'spawned remoteControl:1'])
    expect(set.workerCount()).toBe(3)
    await set.stop()
  })

  test('el escalonado es He=2000 ms', () => {
    expect(DAEMON_WORKER_START_STAGGER_MS).toBe(2000)
  })

  test('un tipo sin gate no arranca y se avisa una sola vez', async () => {
    const h = makeHarness()
    h.enabled.delete('remoteControl')
    const path = writeConfig({ remoteControl: [remoteControl('/a'), remoteControl('/b')] })
    const set = await startDaemonWorkerSet(h.options(path))
    expect(h.launches).toEqual([])
    expect(h.lines).toEqual(["not starting 2 remoteControl worker(s): not available for this account"])
    h.triggerFlagsRefresh()
    await set.drainReloads()
    expect(h.lines.length).toBe(1)
    await set.stop()
  })

  test('workerCount cuenta lo configurado aunque el gate esté cerrado (Mr)', async () => {
    const h = makeHarness()
    h.enabled.delete('remoteControl')
    const path = writeConfig({ remoteControl: [remoteControl('/a')] })
    const set = await startDaemonWorkerSet(h.options(path))
    expect(set.workerCount()).toBe(1)
    await set.stop()
  })

  test('refrescar flags arranca lo que el gate acaba de abrir, sin duplicar', async () => {
    const h = makeHarness()
    h.enabled.delete('remoteControl')
    const path = writeConfig({ heartbeat: [{}], remoteControl: [remoteControl('/a')] })
    const set = await startDaemonWorkerSet(h.options(path))
    expect(h.launches.map(l => l.id)).toEqual(['heartbeat:0'])
    h.enabled.add('remoteControl')
    h.triggerFlagsRefresh()
    await set.drainReloads()
    expect(h.launches.map(l => l.id)).toEqual(['heartbeat:0', 'remoteControl:0'])
    await set.stop()
  })

  test('config inválida: idle, sin workers, con la línea de la referencia', async () => {
    const h = makeHarness()
    const path = writeConfig('{not json')
    const set = await startDaemonWorkerSet(h.options(path, { fallbackConfig: legacyConfig() }))
    expect(h.launches).toEqual([])
    expect(h.lines[0]).toStartWith('config load failed: failed to parse ')
    expect(h.lines[0]).toEndWith(' — idling')
    await set.stop()
  })

  test('claves desconocidas se avisan por nombre', async () => {
    const h = makeHarness()
    const path = writeConfig({ bogus: 1 })
    const set = await startDaemonWorkerSet(h.options(path))
    expect(h.lines).toEqual(["unknown config key 'bogus' — upgrade claude?"])
    await set.stop()
  })
})

function legacyConfig(): DaemonJsonConfig {
  return {
    ...emptyDaemonConfig(),
    remoteControl: [
      { dir: '/legacy', spawnMode: 'same-dir', capacity: 4, sandbox: false, createSessionOnStart: true },
    ],
  }
}

describe('startDaemonWorkerSet — configuración de respaldo (flags de `daemon start`)', () => {
  test('sin entradas en daemon.json se usa la configuración de respaldo', async () => {
    const h = makeHarness()
    const path = join(mkdtempSync(join(tmpdir(), 'daemon-worker-set-')), 'daemon.json')
    dirs.push(join(path, '..'))
    const set = await startDaemonWorkerSet(h.options(path, { fallbackConfig: legacyConfig() }))
    expect(h.launches.map(l => [l.id, (l.entry as { dir: string }).dir])).toEqual([['remoteControl:0', '/legacy']])
    await set.stop()
  })

  test('con entradas en daemon.json el respaldo se ignora', async () => {
    const h = makeHarness()
    const path = writeConfig({ remoteControl: [remoteControl('/file')] })
    const set = await startDaemonWorkerSet(h.options(path, { fallbackConfig: legacyConfig() }))
    expect(h.launches.map(l => (l.entry as { dir: string }).dir)).toEqual(['/file'])
    await set.stop()
  })
})

describe('startDaemonWorkerSet — recarga en caliente (ne de Tt)', () => {
  test('para, reinicia y arranca según el diff, y emite el evento', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}, {}], remoteControl: [remoteControl('/a')] })
    const set = await startDaemonWorkerSet(h.options(path))
    h.lines.length = 0
    writeFileSync(
      path,
      JSON.stringify({ heartbeat: [{ intervalSeconds: 5 }], remoteControl: [remoteControl('/a'), remoteControl('/b')] }),
    )
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.stops).toEqual([
      { id: 'heartbeat:1', cause: undefined },
      { id: 'heartbeat:0', cause: 'reload' },
    ])
    expect(h.launches.slice(3).map(l => [l.id, l.delayMs])).toEqual([
      ['heartbeat:0', 0],
      ['remoteControl:1', 0],
    ])
    expect(h.lines).toEqual([
      'stopped heartbeat:1',
      'restarted heartbeat:0',
      'spawned remoteControl:1',
      'reload: stopped=1 started=1 restarted=1',
    ])
    expect(h.events).toEqual([
      { name: 'tengu_daemon_config_reload', metadata: { stopped: 1, started: 1, restarted: 1 } },
    ])
    expect(set.workerCount()).toBe(3)
    await set.stop()
  })

  test('remoteControl quitado cuyo dir sigue servido se para con causa reload', async () => {
    const h = makeHarness()
    const path = writeConfig({ remoteControl: [remoteControl('/a'), remoteControl('/b')] })
    const set = await startDaemonWorkerSet(h.options(path))
    writeFileSync(path, JSON.stringify({ remoteControl: [remoteControl('/b')] }))
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.stops).toEqual([
      { id: 'remoteControl:1', cause: 'reload' },
      { id: 'remoteControl:0', cause: undefined },
    ])
    await set.stop()
  })

  test('remoteControl reiniciado con un dir que ya no se sirve se para sin causa', async () => {
    const h = makeHarness()
    const path = writeConfig({ remoteControl: [remoteControl('/a')] })
    const set = await startDaemonWorkerSet(h.options(path))
    writeFileSync(path, JSON.stringify({ remoteControl: [remoteControl('/z')] }))
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.stops).toEqual([{ id: 'remoteControl:0', cause: undefined }])
    await set.stop()
  })

  test('una entrada nueva de un tipo sin gate no arranca', async () => {
    const h = makeHarness()
    h.enabled.delete('remoteControl')
    const path = writeConfig({})
    const set = await startDaemonWorkerSet(h.options(path))
    writeFileSync(path, JSON.stringify({ remoteControl: [remoteControl('/a')] }))
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.launches).toEqual([])
    expect(h.lines).toEqual(['reload: stopped=0 started=1 restarted=0'])
    await set.stop()
  })

  test('recarga fallida conserva la última config buena', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}] })
    const set = await startDaemonWorkerSet(h.options(path))
    writeFileSync(path, '{broken')
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.lines[1]).toEndWith(' — keeping last-good config')
    expect(h.stops).toEqual([])
    expect(set.workerCount()).toBe(1)
    await set.stop()
  })

  test('un plan vacío no emite evento', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}] })
    const set = await startDaemonWorkerSet(h.options(path))
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.events).toEqual([])
    await set.stop()
  })

  test('un fallo dentro de la recarga va a logError y no rompe la cola', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}] })
    const failure = new Error('stop failed')
    const set = await startDaemonWorkerSet(
      h.options(path, {
        launchWorker: (_id, kind) => ({ kind, isBusy: () => false, stop: () => Promise.reject(failure) }),
      }),
    )
    writeFileSync(path, JSON.stringify({}))
    h.triggerFileChange()
    await set.drainReloads()
    expect(h.errors).toEqual([failure])
    h.triggerFlagsRefresh()
    await set.drainReloads()
    expect(h.errors.length).toBe(1)
  })
})

describe('startDaemonWorkerSet — superficie de Tt', () => {
  test('un refresco de flags encolado antes de disposeWatcher no lanza nada (guarda ie)', async () => {
    const h = makeHarness()
    h.enabled.delete('remoteControl')
    const path = writeConfig({ remoteControl: [remoteControl('/a')] })
    const set = await startDaemonWorkerSet(h.options(path))
    h.enabled.add('remoteControl')
    h.triggerFlagsRefresh()
    set.disposeWatcher()
    await set.drainReloads()
    expect(h.launches).toEqual([])
    await set.stop()
  })

  test('busyWorkerCount cuenta los handles ocupados', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}, {}] })
    const set = await startDaemonWorkerSet(h.options(path))
    h.busy.add('heartbeat:1')
    expect(set.busyWorkerCount()).toBe(1)
    await set.stop()
  })

  test('hasOAuthConsumer sólo con un tipo que necesita OAuth vivo', async () => {
    const h = makeHarness()
    const heartbeatOnly = await startDaemonWorkerSet(h.options(writeConfig({ heartbeat: [{}] })))
    expect(heartbeatOnly.hasOAuthConsumer()).toBe(false)
    await heartbeatOnly.stop()
    const withRemote = await startDaemonWorkerSet(h.options(writeConfig({ remoteControl: [remoteControl('/a')] })))
    expect(withRemote.hasOAuthConsumer()).toBe(true)
    await withRemote.stop()
  })

  test('stop cierra el watcher, desuscribe flags y para cada worker con la causa', async () => {
    const h = makeHarness()
    const path = writeConfig({ heartbeat: [{}] })
    const set = await startDaemonWorkerSet(h.options(path))
    await set.stop('shutdown')
    expect(h.watcherClosed()).toBe(true)
    expect(h.stops).toEqual([{ id: 'heartbeat:0', cause: 'shutdown' }])
    h.triggerFlagsRefresh()
    await set.drainReloads()
    expect(h.launches.length).toBe(1)
  })
})
