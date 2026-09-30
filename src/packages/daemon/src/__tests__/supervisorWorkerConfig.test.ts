import { describe, expect, test } from 'bun:test'

import { buildLegacyDaemonConfig, buildWorkerSpawnSettings } from '../main.js'

// Traducción entre `daemon.json` (`Tt`) y el entorno que `spawnWorker`
// entrega al worker (`workerRegistry.ts:runRemoteControlWorker`).

describe('buildLegacyDaemonConfig — flags de `daemon start` como respaldo', () => {
  test('sin flags: un remoteControl en dir con los defaults previos', () => {
    expect(buildLegacyDaemonConfig({}, '/work')).toEqual({
      heartbeat: [],
      scheduled: [],
      remoteControl: [
        {
          dir: '/work',
          name: undefined,
          spawnMode: 'same-dir',
          capacity: 4,
          permissionMode: undefined,
          sandbox: false,
          createSessionOnStart: true,
        },
      ],
    })
  })

  test('las flags se trasladan a la entrada', () => {
    const config = buildLegacyDaemonConfig(
      { spawnMode: 'worktree', capacity: '8', permissionMode: 'plan', sandbox: '1', name: 'n' },
      '/w',
    )
    expect(config.remoteControl[0]).toEqual({
      dir: '/w',
      name: 'n',
      spawnMode: 'worktree',
      capacity: 8,
      permissionMode: 'plan',
      sandbox: true,
      createSessionOnStart: true,
    })
  })

  test('una capacidad no numérica cae al default', () => {
    expect(buildLegacyDaemonConfig({ capacity: 'x' }, '/w').remoteControl[0]!.capacity).toBe(4)
  })
})

describe('buildWorkerSpawnSettings — entrada → entorno del worker', () => {
  test('remoteControl completo', () => {
    expect(
      buildWorkerSpawnSettings(
        {
          dir: '/a',
          name: 'n',
          spawnMode: 'worktree',
          capacity: 32,
          permissionMode: 'plan',
          sandbox: true,
          sessionTimeoutMs: 1000,
          createSessionOnStart: false,
        },
        '/fallback',
      ),
    ).toEqual({
      dir: '/a',
      settings: {
        name: 'n',
        spawnMode: 'worktree',
        capacity: '32',
        permissionMode: 'plan',
        sandbox: '1',
        timeoutMs: '1000',
        createSession: '0',
      },
    })
  })

  test('remoteControl mínimo omite lo no declarado', () => {
    expect(
      buildWorkerSpawnSettings(
        { dir: '/a', spawnMode: 'same-dir', capacity: 4, sandbox: false, createSessionOnStart: true },
        '/fallback',
      ),
    ).toEqual({
      dir: '/a',
      settings: { spawnMode: 'same-dir', capacity: '4', sandbox: '0', createSession: '1' },
    })
  })

  test('una entrada sin dir (heartbeat) corre en el dir del supervisor, sin ajustes', () => {
    expect(buildWorkerSpawnSettings({ intervalSeconds: 30 }, '/fallback')).toEqual({
      dir: '/fallback',
      settings: {},
    })
  })
})
