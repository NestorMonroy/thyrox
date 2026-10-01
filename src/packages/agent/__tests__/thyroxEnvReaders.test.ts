/**
 * La conducta que gobierna cada variable THYROX_* de `@thyrox/agent`.
 * Cada caso contrasta la variable fijada con la ausente.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createBaseHookInput } from '../hooks.ts'
import { createChromeContext } from '../claudeInChrome/mcpServer.ts'
import { startupWedgeMs } from '../background/fleet/rvServer.ts'

const KEYS = ['THYROX_TRANSCRIPT_PATH', 'THYROX_CHROME_PERMISSION_MODE', 'THYROX_BG_STARTUP_WEDGE_MS']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('THYROX_TRANSCRIPT_PATH', () => {
  test('es el transcript_path de la entrada común de todo hook', () => {
    expect(createBaseHookInput(undefined, 's1').transcript_path).toBe('')
    process.env.THYROX_TRANSCRIPT_PATH = '/ruta/al/transcript.jsonl'
    expect(createBaseHookInput(undefined, 's1').transcript_path).toBe('/ruta/al/transcript.jsonl')
  })
})

describe('THYROX_CHROME_PERMISSION_MODE', () => {
  test('un modo válido fija el modo de permiso inicial de la extensión', () => {
    expect(createChromeContext().initialPermissionMode).toBeUndefined()
    process.env.THYROX_CHROME_PERMISSION_MODE = 'skip_all_permission_checks'
    expect(createChromeContext().initialPermissionMode).toBe('skip_all_permission_checks')
  })

  test('un modo inválido se descarta', () => {
    process.env.THYROX_CHROME_PERMISSION_MODE = 'no-es-un-modo'
    expect(createChromeContext().initialPermissionMode).toBeUndefined()
  })
})

describe('THYROX_BG_STARTUP_WEDGE_MS', () => {
  test('fija el plazo del vigilante de arranque; sin ella, 45 s', () => {
    expect(startupWedgeMs()).toBe(45_000)
    process.env.THYROX_BG_STARTUP_WEDGE_MS = '1200'
    expect(startupWedgeMs()).toBe(1200)
  })

  test('un valor no numérico cae al plazo por defecto', () => {
    process.env.THYROX_BG_STARTUP_WEDGE_MS = 'pronto'
    expect(startupWedgeMs()).toBe(45_000)
  })
})
