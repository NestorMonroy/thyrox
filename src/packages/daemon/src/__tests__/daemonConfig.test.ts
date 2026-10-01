import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import {
  clearGrowthBookConfigOverrides,
  setGrowthBookConfigOverride,
} from '@thyrox/config/feature-flags'

import {
  DAEMON_CONFIG_MAX_BYTES,
  DAEMON_CONFIG_STOP_DRAIN_MS,
  DAEMON_CONFIG_WATCH_DEBOUNCE_MS,
  DAEMON_STATUS_WRITE_RETRY_MS,
  DAEMON_WORKER_KINDS,
  countConfiguredWorkers,
  daemonConfigReloadPlanIsEmpty,
  diffDaemonConfigForReload,
  emitDaemonConfigReloadEvent,
  emptyDaemonConfig,
  getDaemonConfigPath,
  isWorkerKindEnabled,
  loadDaemonConfig,
  parseDaemonConfig,
  watchDaemonConfigFile,
  workerKindNeedsOAuth,
  type DaemonJsonConfig,
} from '../daemonConfig.js'

// Porte de `Mr`/`Ct`/`Tt` y las constantes `Cr`/`Tr` — `chunk-92tvramn.js`,
// referencia 2.1.283, resueltos con `bin/binary symbol`.

const dirs: string[] = []

function tmpScope(): string {
  const dir = mkdtempSync(join(tmpdir(), 'daemon-config-test-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('DAEMON_WORKER_KINDS / workerKindNeedsOAuth', () => {
  test('los tres tipos de L7, en orden', () => {
    expect(DAEMON_WORKER_KINDS).toEqual(['heartbeat', 'scheduled', 'remoteControl'])
  })

  test('heartbeat no necesita OAuth; scheduled y remoteControl sí', () => {
    expect(workerKindNeedsOAuth('heartbeat')).toBe(false)
    expect(workerKindNeedsOAuth('scheduled')).toBe(true)
    expect(workerKindNeedsOAuth('remoteControl')).toBe(true)
  })
})

describe('isWorkerKindEnabled', () => {
  beforeEach(() => clearGrowthBookConfigOverrides())
  afterEach(() => clearGrowthBookConfigOverrides())

  test('heartbeat siempre habilitado', () => {
    expect(isWorkerKindEnabled('heartbeat')).toBe(true)
  })

  test('scheduled nunca habilitado (pV siempre falso en la referencia)', () => {
    expect(isWorkerKindEnabled('scheduled')).toBe(false)
  })

  test('remoteControl deshabilitado sin el gate tengu_radiant_heron', () => {
    expect(isWorkerKindEnabled('remoteControl')).toBe(false)
  })

  test('remoteControl habilitado cuando el gate está activo', () => {
    setGrowthBookConfigOverride('tengu_radiant_heron', true)
    expect(isWorkerKindEnabled('remoteControl')).toBe(true)
  })

  test('el gate de remoteControl no habilita scheduled', () => {
    setGrowthBookConfigOverride('tengu_radiant_heron', true)
    expect(isWorkerKindEnabled('scheduled')).toBe(false)
  })
})

describe('emptyDaemonConfig / countConfiguredWorkers', () => {
  test('config vacía cuenta cero', () => {
    expect(countConfiguredWorkers(emptyDaemonConfig())).toBe(0)
  })

  test('suma instancias por tipo', () => {
    const config: DaemonJsonConfig = {
      heartbeat: [{ intervalSeconds: 30 }],
      scheduled: [],
      remoteControl: [
        { dir: '/a', spawnMode: 'same-dir', capacity: 32, sandbox: false, createSessionOnStart: false },
        { dir: '/b', spawnMode: 'same-dir', capacity: 32, sandbox: false, createSessionOnStart: false },
      ],
    }
    expect(countConfiguredWorkers(config)).toBe(3)
  })
})

describe('parseDaemonConfig', () => {
  test('objeto vacío parsea a config vacía, sin claves desconocidas', () => {
    const result = parseDaemonConfig({})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config).toEqual(emptyDaemonConfig())
      expect(result.unknownKeys).toEqual([])
    }
  })

  test('$schema es una clave conocida (no cuenta como desconocida)', () => {
    const result = parseDaemonConfig({ $schema: 'x' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.unknownKeys).toEqual([])
  })

  test('una clave de nivel superior ajena se reporta en unknownKeys', () => {
    const result = parseDaemonConfig({ notAKind: [] })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.unknownKeys).toEqual(['notAKind'])
  })

  test('heartbeat aplica el default intervalSeconds=30', () => {
    const result = parseDaemonConfig({ heartbeat: [{}] })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.heartbeat).toEqual([{ intervalSeconds: 30 }])
  })

  test('heartbeat rechaza un intervalSeconds no positivo', () => {
    const result = parseDaemonConfig({ heartbeat: [{ intervalSeconds: 0 }] })
    expect(result.ok).toBe(false)
  })

  test('remoteControl exige dir', () => {
    const result = parseDaemonConfig({ remoteControl: [{}] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('dir')
  })

  test('remoteControl aplica los defaults de ae (spawnMode/capacity/sandbox/createSessionOnStart)', () => {
    const result = parseDaemonConfig({ remoteControl: [{ dir: '/work' }] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.remoteControl).toEqual([
        {
          dir: '/work',
          name: undefined,
          spawnMode: 'same-dir',
          capacity: 32,
          permissionMode: undefined,
          sandbox: false,
          sessionTimeoutMs: undefined,
          createSessionOnStart: false,
        },
      ])
    }
  })

  test('scheduled rechaza ids de tarea duplicados', () => {
    const result = parseDaemonConfig({
      scheduled: [{ tasks: [{ id: 'a' }, { id: 'a' }] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('unique')
  })

  test('scheduled aplica el default maxConcurrent=1', () => {
    const result = parseDaemonConfig({ scheduled: [{ tasks: [{ id: 'a' }] }] })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.scheduled[0]?.maxConcurrent).toBe(1)
  })

  test('un valor raíz que no es objeto falla', () => {
    expect(parseDaemonConfig([]).ok).toBe(false)
    expect(parseDaemonConfig('x').ok).toBe(false)
  })
})

describe('loadDaemonConfig', () => {
  test('archivo ausente (ENOENT) devuelve config vacía, sin error', async () => {
    const dir = tmpScope()
    const result = await loadDaemonConfig(join(dir, 'no-existe.json'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config).toEqual(emptyDaemonConfig())
  })

  test('archivo válido se lee y valida', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    writeFileSync(path, JSON.stringify({ heartbeat: [{ intervalSeconds: 15 }] }))
    const result = await loadDaemonConfig(path)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.heartbeat).toEqual([{ intervalSeconds: 15 }])
  })

  test('JSON malformado da error, sin lanzar', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    writeFileSync(path, '{not json')
    const result = await loadDaemonConfig(path)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('failed to parse')
  })

  test('un directorio en vez de un archivo da error de "not a regular file"', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    mkdirSync(path)
    const result = await loadDaemonConfig(path)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('not a regular file')
  })

  test('un archivo que excede DAEMON_CONFIG_MAX_BYTES da error', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    writeFileSync(path, JSON.stringify({ $schema: 'x'.repeat(DAEMON_CONFIG_MAX_BYTES) }))
    const result = await loadDaemonConfig(path)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('exceeds 1MiB')
  })
})

describe('diffDaemonConfigForReload', () => {
  const remoteControlEntry = (dir: string) => ({
    dir,
    spawnMode: 'same-dir' as const,
    capacity: 32,
    sandbox: false,
    createSessionOnStart: false,
  })

  test('config idéntica no produce cambios', () => {
    const config: DaemonJsonConfig = {
      heartbeat: [{ intervalSeconds: 30 }],
      scheduled: [],
      remoteControl: [],
    }
    const plan = diffDaemonConfigForReload(config, config)
    expect(daemonConfigReloadPlanIsEmpty(plan)).toBe(true)
  })

  test('una entrada nueva arranca', () => {
    const plan = diffDaemonConfigForReload(emptyDaemonConfig(), {
      ...emptyDaemonConfig(),
      remoteControl: [remoteControlEntry('/a')],
    })
    expect(plan.start).toEqual([{ id: 'remoteControl:0', kind: 'remoteControl', config: remoteControlEntry('/a') }])
    expect(plan.stop).toEqual([])
    expect(plan.restart).toEqual([])
  })

  test('una entrada retirada se para', () => {
    const plan = diffDaemonConfigForReload(
      { ...emptyDaemonConfig(), remoteControl: [remoteControlEntry('/a')] },
      emptyDaemonConfig(),
    )
    expect(plan.stop).toEqual([
      { id: 'remoteControl:0', kind: 'remoteControl', previousConfig: remoteControlEntry('/a') },
    ])
  })

  test('una entrada que cambia reinicia', () => {
    const plan = diffDaemonConfigForReload(
      { ...emptyDaemonConfig(), remoteControl: [remoteControlEntry('/a')] },
      { ...emptyDaemonConfig(), remoteControl: [remoteControlEntry('/b')] },
    )
    expect(plan.restart).toEqual([
      {
        id: 'remoteControl:0',
        kind: 'remoteControl',
        config: remoteControlEntry('/b'),
        previousConfig: remoteControlEntry('/a'),
      },
    ])
  })
})

describe('emitDaemonConfigReloadEvent', () => {
  test('no emite si el plan está vacío', () => {
    const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    emitDaemonConfigReloadEvent(
      { stop: [], start: [], restart: [] },
      { logEventFn: (name, metadata) => events.push({ name, metadata }) },
    )
    expect(events).toEqual([])
  })

  test('emite tengu_daemon_config_reload con los conteos cuando el plan cambia algo', () => {
    const events: Array<{ name: string; metadata?: Record<string, unknown> }> = []
    emitDaemonConfigReloadEvent(
      {
        stop: [],
        start: [{ id: 'heartbeat:0', kind: 'heartbeat', config: { intervalSeconds: 30 } }],
        restart: [],
      },
      { logEventFn: (name, metadata) => events.push({ name, metadata }) },
    )
    expect(events).toEqual([
      { name: 'tengu_daemon_config_reload', metadata: { stopped: 0, started: 1, restarted: 0 } },
    ])
  })
})

describe('watchDaemonConfigFile', () => {
  test('dispara onChange (debounced) cuando el archivo vigilado cambia', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    writeFileSync(path, '{}')
    let calls = 0
    const watcher = watchDaemonConfigFile(path, () => {
      calls++
    })
    try {
      writeFileSync(path, '{"heartbeat":[]}')
      await new Promise(resolve => setTimeout(resolve, DAEMON_CONFIG_WATCH_DEBOUNCE_MS + 300))
      expect(calls).toBeGreaterThan(0)
    } finally {
      watcher.close()
    }
  })

  test('ignora cambios de otros archivos del mismo directorio', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    const otherPath = join(dir, 'otro.json')
    writeFileSync(path, '{}')
    let calls = 0
    const watcher = watchDaemonConfigFile(path, () => {
      calls++
    })
    try {
      writeFileSync(otherPath, '{}')
      await new Promise(resolve => setTimeout(resolve, DAEMON_CONFIG_WATCH_DEBOUNCE_MS + 300))
      expect(calls).toBe(0)
    } finally {
      watcher.close()
    }
  })

  test('close() detiene la vigilancia — no dispara onChange tras cerrar', async () => {
    const dir = tmpScope()
    const path = join(dir, 'daemon.json')
    writeFileSync(path, '{}')
    let calls = 0
    const watcher = watchDaemonConfigFile(path, () => {
      calls++
    })
    watcher.close()
    writeFileSync(path, '{"heartbeat":[]}')
    await new Promise(resolve => setTimeout(resolve, DAEMON_CONFIG_WATCH_DEBOUNCE_MS + 300))
    expect(calls).toBe(0)
  })
})

describe('getDaemonConfigPath', () => {
  test('junta el config home dir con daemon.json', () => {
    expect(getDaemonConfigPath()).toBe(join(getConfigHomeDir(), 'daemon.json'))
  })
})

describe('umbrales de recarga de configuración (Cr/Tr)', () => {
  test('DAEMON_CONFIG_STOP_DRAIN_MS es Cr=1000', () => {
    expect(DAEMON_CONFIG_STOP_DRAIN_MS).toBe(1000)
  })

  test('DAEMON_STATUS_WRITE_RETRY_MS es Tr=5000', () => {
    expect(DAEMON_STATUS_WRITE_RETRY_MS).toBe(5000)
  })
})
