/**
 * `startMessagingInboxAtLaunch` (TASK-THYROX-0450): sus dos guardas —
 * `feature('UDS_INBOX')` y `isBareMode()`— y su publicación en el pid file.
 *
 * AISLAMIENTO DE BANDERA (mismo idioma que
 * `permission/__tests__/permissionSetupAutoMode.test.ts`). Este archivo se
 * corre DOS veces: sin bandera (`bun test`), donde `feature('UDS_INBOX')`
 * es `false` y la única aserción posible es «nunca arranca»; y con ella
 * (`bun test --feature=UDS_INBOX`), donde se ejercitan la ruta explícita,
 * el respaldo por defecto, la guarda `--bare` y la publicación en
 * `sessions/<pid>.json`. `feature()` sólo se puede leer directo en un
 * `if`/ternario — no se puede activar a mitad de test — así que el propio
 * valor de `feature('UDS_INBOX')` decide qué rama de aserciones corre.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { feature } from 'bun:bundle'

import { startMessagingInboxAtLaunch, type MessagingInboxStop } from '../messagingInboxAtLaunch.ts'

const dirs: string[] = []
const stops: MessagingInboxStop[] = []
const originalArgv = [...process.argv]
const originalSimple = process.env.THYROX_CODE_SIMPLE
const originalConfigDir = process.env.THYROX_CONFIG_DIR

function tempSocketPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mial-'))
  dirs.push(dir)
  return join(dir, 's.sock')
}

afterEach(async () => {
  for (const stop of stops.splice(0)) await stop().catch(() => {})
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  process.argv = [...originalArgv]
  if (originalSimple === undefined) delete process.env.THYROX_CODE_SIMPLE
  else process.env.THYROX_CODE_SIMPLE = originalSimple
  if (originalConfigDir === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = originalConfigDir
})

if (!feature('UDS_INBOX')) {
  describe('startMessagingInboxAtLaunch — sin feature(UDS_INBOX)', () => {
    test('nunca arranca, con o sin ruta explícita', async () => {
      expect(await startMessagingInboxAtLaunch()).toBeUndefined()
      expect(await startMessagingInboxAtLaunch(tempSocketPath())).toBeUndefined()
    })
  })
} else {
  describe('startMessagingInboxAtLaunch — con feature(UDS_INBOX)', () => {
    test('sin ruta explícita, arranca con la ruta por defecto', async () => {
      const stop = await startMessagingInboxAtLaunch()
      expect(stop).toBeDefined()
      if (stop) stops.push(stop)
    })

    test('con ruta explícita, arranca bindeando exactamente esa ruta', async () => {
      const socketPath = tempSocketPath()
      const stop = await startMessagingInboxAtLaunch(socketPath)
      expect(stop).toBeDefined()
      if (stop) stops.push(stop)
      expect(existsSync(socketPath)).toBe(true)
    })

    test('--bare sin ruta explícita: no arranca (mismo gate que setup.ts)', async () => {
      process.argv = [...originalArgv, '--bare']
      expect(await startMessagingInboxAtLaunch()).toBeUndefined()
    })

    test('--bare CON ruta explícita: arranca de todos modos (vía de escape #23222)', async () => {
      process.argv = [...originalArgv, '--bare']
      const socketPath = tempSocketPath()
      const stop = await startMessagingInboxAtLaunch(socketPath)
      expect(stop).toBeDefined()
      if (stop) stops.push(stop)
    })

    test('un arranque exitoso publica messagingSocketPath en sessions/<pid>.json', async () => {
      const cfg = mkdtempSync(join(tmpdir(), 'thyrox-config-'))
      dirs.push(cfg)
      process.env.THYROX_CONFIG_DIR = cfg
      const { registerSessionAtLaunch } = await import('../sessionRegistryAtLaunch.ts')
      const socketPath = tempSocketPath()
      const stop = await startMessagingInboxAtLaunch(socketPath)
      if (stop) stops.push(stop)
      await registerSessionAtLaunch()
      const pidFile = join(cfg, 'sessions', `${process.pid}.json`)
      const record = JSON.parse(readFileSync(pidFile, 'utf8')) as Record<string, unknown>
      expect(record.messagingSocketPath).toBe(socketPath)
    })
  })
}
