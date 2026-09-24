/**
 * Pruebas de `internalPaths.ts`: `yyt` y `hee` de 2.1.275
 * (`chunk-9apg35nm.js`) — qué rutas de la sesión se escriben o se leen sin
 * preguntar, y qué almacenes protegidos nunca se escriben.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getOriginalCwd,
  getPlanSlugCache,
  getSessionId,
  setCwdState,
  setOriginalCwd,
} from '@thyrox/app-host/bootstrap/state.js'
import {
  checkEditableInternalPath,
  checkReadableInternalPath,
  getProfileStoreDenyPaths,
  resetInternalPathCachesForTesting,
} from '../internalPaths.js'

let base: string
let home: string
let work: string
const saved: Record<string, string | undefined> = {}
const ENV = ['CLAUDE_CONFIG_DIR', 'CLAUDE_CODE_HOST_CREDS_FILE', 'ANTHROPIC_CONFIG_DIR', 'ANTHROPIC_PROFILE', 'CLAUDE_CODE_SESSION_KIND', 'CLAUDE_JOB_DIR']
let previousCwd: string

function touch(path: string): string {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, 'x')
  return path
}
const input = { file_path: 'x' }

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'internal-paths-')))
  home = join(base, 'config-home')
  work = join(base, 'work')
  mkdirSync(home, { recursive: true })
  mkdirSync(work, { recursive: true })
  for (const k of ENV) saved[k] = process.env[k]
  for (const k of ENV) delete process.env[k]
  process.env.CLAUDE_CONFIG_DIR = home
  previousCwd = getOriginalCwd()
  setOriginalCwd(work)
  setCwdState(work)
})
afterAll(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  setOriginalCwd(previousCwd)
  setCwdState(previousCwd)
  rmSync(base, { recursive: true, force: true })
})

describe('checkEditableInternalPath (yyt)', () => {
  test('un archivo común del trabajo pasa de largo', () => {
    expect(checkEditableInternalPath(touch(join(work, 'a.ts')), input)).toEqual({ behavior: 'passthrough', message: '' })
  })
  test('el archivo de credenciales del anfitrión nunca se escribe', () => {
    const creds = touch(join(base, 'creds.json'))
    process.env.CLAUDE_CODE_HOST_CREDS_FILE = creds
    try {
      const r = checkEditableInternalPath(creds, input)
      expect(r.behavior).toBe('deny')
      expect(r).toMatchObject({ decisionReason: { type: 'safetyCheck', classifierApprovable: false } })
    } finally {
      delete process.env.CLAUDE_CODE_HOST_CREDS_FILE
    }
  })
  test('seed-admin bajo el directorio de configuración nunca se escribe', () => {
    const r = checkEditableInternalPath(touch(join(home, 'seed-admin', 'repo', 'config')), input)
    expect(r.behavior).toBe('deny')
    expect((r as { message: string }).message).toContain('seed-admin')
  })
  test('adopt.json de un trabajo en segundo plano nunca se escribe', () => {
    const r = checkEditableInternalPath(touch(join(home, 'jobs', 'j1', 'adopt.json')), input)
    expect(r.behavior).toBe('deny')
    expect((r as { message: string }).message).toContain('adopt.json')
  })
  test('el almacén de perfiles de Anthropic nunca se escribe', () => {
    const store = join(base, 'anthropic')
    process.env.ANTHROPIC_CONFIG_DIR = store
    resetInternalPathCachesForTesting()
    try {
      const r = checkEditableInternalPath(touch(join(store, 'credentials', 'default.json')), input)
      expect(r.behavior).toBe('deny')
      expect((r as { message: string }).message).toContain('profile store')
      expect(checkEditableInternalPath(touch(join(base, 'other', 'default.json')), input).behavior).toBe('passthrough')
    } finally {
      delete process.env.ANTHROPIC_CONFIG_DIR
      resetInternalPathCachesForTesting()
    }
  })
  test('el plan de la sesión se escribe sólo si la sesión ya tiene plan', () => {
    const plansDir = join(home, 'plans')
    const plan = touch(join(plansDir, 'gentle-river.md'))
    expect(checkEditableInternalPath(plan, input).behavior).toBe('passthrough')
    getPlanSlugCache().set(getSessionId(), 'gentle-river')
    try {
      const r = checkEditableInternalPath(plan, input)
      expect(r).toEqual({ behavior: 'allow', updatedInput: input, decisionReason: { type: 'other', reason: 'Plan files for current session are allowed for writing' } })
    } finally {
      getPlanSlugCache().delete(getSessionId())
    }
  })
  test('varias rutas: una denegada deniega todo', () => {
    const creds = touch(join(base, 'creds2.json'))
    process.env.CLAUDE_CODE_HOST_CREDS_FILE = creds
    try {
      expect(checkEditableInternalPath(join(work, 'a.ts'), input, [join(work, 'a.ts'), creds]).behavior).toBe('deny')
    } finally {
      delete process.env.CLAUDE_CODE_HOST_CREDS_FILE
    }
  })
})

describe('checkReadableInternalPath (hee)', () => {
  test('un archivo común pasa de largo', () => {
    expect(checkReadableInternalPath(touch(join(base, 'other', 'b.txt')), input).behavior).toBe('passthrough')
  })
  test('las tareas del directorio de configuración se leen', () => {
    const r = checkReadableInternalPath(touch(join(home, 'tasks', 't1.json')), input)
    expect(r).toMatchObject({ behavior: 'allow', decisionReason: { reason: 'Task files are allowed for reading' } })
  })
  test('con lecturas fuera bloqueadas, las tareas ya no se abren', () => {
    const r = checkReadableInternalPath(touch(join(home, 'tasks', 't2.json')), input, undefined, { blockOutsideReads: true })
    expect(r.behavior).toBe('passthrough')
  })
  test('con la cerca de lectura, el CLAUDE.md del usuario se lee', () => {
    const md = touch(join(home, 'CLAUDE.md'))
    expect(checkReadableInternalPath(md, input).behavior).toBe('passthrough')
    expect(checkReadableInternalPath(md, input, undefined, { readBlockFence: true })).toMatchObject({ behavior: 'allow' })
  })
})

test('getProfileStoreDenyPaths: una raíz que contiene el cwd del proceso deja sólo configs, credentials y active_config', () => {
  const broad = join(process.cwd(), '..')
  process.env.ANTHROPIC_CONFIG_DIR = broad
  resetInternalPathCachesForTesting()
  try {
    const paths = getProfileStoreDenyPaths()
    expect(paths?.dirs).toEqual([join(broad, 'configs'), join(broad, 'credentials')])
    expect(paths?.files).toEqual([join(broad, 'active_config')])
  } finally {
    delete process.env.ANTHROPIC_CONFIG_DIR
    resetInternalPathCachesForTesting()
  }
})

test('getProfileStoreDenyPaths: una raíz acotada se deniega entera', () => {
  process.env.ANTHROPIC_CONFIG_DIR = join(base, 'anthropic-narrow')
  resetInternalPathCachesForTesting()
  try {
    expect(getProfileStoreDenyPaths()?.dirs).toEqual([join(base, 'anthropic-narrow')])
  } finally {
    delete process.env.ANTHROPIC_CONFIG_DIR
    resetInternalPathCachesForTesting()
  }
})
