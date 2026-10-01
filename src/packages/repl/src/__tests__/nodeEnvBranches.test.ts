/**
 * TASK-THYROX-0324 (parte A): el ejecutable 2.1.283 se compila con
 * NODE_ENV="production" y ninguna de sus funciones equivalentes ramifica por
 * ese valor. Estas pruebas fijan que la conducta de producción no depende de
 * NODE_ENV: el valor de la variable no cambia la decisión.
 */
import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getCurrentInstallationType } from '../doctorDiagnostic.js'
import { isDevMode } from '../diagnostics/desktopDeepLink.js'
import { shouldNotify } from '../hooks/useNotifyAfterTimeout.js'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const IDLE_THRESHOLD_MS = 6000

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  setSystemTime()
})

describe('isDevMode', () => {
  test('NODE_ENV=development no activa el modo dev', () => {
    process.env.NODE_ENV = 'development'
    expect(isDevMode()).toBe(false)
  })
})

describe('getCurrentInstallationType', () => {
  test('NODE_ENV=development no produce el tipo development', async () => {
    process.env.NODE_ENV = 'development'
    expect(await getCurrentInstallationType()).not.toBe('development')
  })
})

describe('shouldNotify', () => {
  test('NODE_ENV=test no suprime la notificación tras inactividad', () => {
    process.env.NODE_ENV = 'test'
    setSystemTime(new Date(Date.now() + 10 * IDLE_THRESHOLD_MS))
    expect(shouldNotify(IDLE_THRESHOLD_MS)).toBe(true)
  })
})

describe('código de producción sin ramas por NODE_ENV', () => {
  const PRODUCTION_FILES = [
    'components/AutoUpdater.tsx',
    'components/NativeAutoUpdater.tsx',
    'components/PackageManagerAutoUpdater.tsx',
    'diagnostics/desktopDeepLink.ts',
    'doctorDiagnostic.ts',
    'hooks/useNotifyAfterTimeout.ts',
    'hooks/useTypeahead.tsx',
    'interactiveHelpers/interactiveHelpers.tsx',
  ]

  for (const file of PRODUCTION_FILES) {
    test(`${file} no lee NODE_ENV`, () => {
      const source = readFileSync(join(import.meta.dir, '..', file), 'utf8')
      expect(source).not.toContain('NODE_ENV')
    })
  }
})
