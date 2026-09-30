/**
 * La conducta que gobiernan las variables THYROX_COWORK_MEMORY_* de
 * `@thyrox/memory`. La base de memoria se aísla en un directorio temporal
 * (`THYROX_CODE_REMOTE_MEMORY_DIR`) para no escribir en el árbol ni en el
 * hogar del usuario.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { loadAgentMemoryPrompt } from '../agentMemory.ts'
import { installMemoryHostBindings } from '../host.ts'
import { clearAutoMemPathCacheForTesting, getAutoMemPath, hasAutoMemPathOverride } from '../paths.ts'

const KEYS = [
  'THYROX_CODE_REMOTE_MEMORY_DIR',
  'THYROX_COWORK_MEMORY_PATH_OVERRIDE',
  'THYROX_COWORK_MEMORY_EXTRA_GUIDELINES',
]
const saved: Record<string, string | undefined> = {}
let base: string
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  base = mkdtempSync(join(tmpdir(), 'thyrox-memory-env-'))
  process.env.THYROX_CODE_REMOTE_MEMORY_DIR = base
  // Sólo la raíz del proyecto: el resto de los enlaces es opcional.
  installMemoryHostBindings({ getProjectRoot: () => base, getCwd: () => base })
  clearAutoMemPathCacheForTesting()
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  clearAutoMemPathCacheForTesting()
  rmSync(base, { recursive: true, force: true })
})

describe('THYROX_COWORK_MEMORY_PATH_OVERRIDE', () => {
  test('una ruta absoluta sustituye el directorio de memoria automática', () => {
    expect(hasAutoMemPathOverride()).toBe(false)
    const override = join(base, 'cowork')
    process.env.THYROX_COWORK_MEMORY_PATH_OVERRIDE = override
    expect(hasAutoMemPathOverride()).toBe(true)
    expect(getAutoMemPath()).toBe(override + sep)
  })

  test('una ruta relativa se rechaza y deja el directorio por defecto', () => {
    process.env.THYROX_COWORK_MEMORY_PATH_OVERRIDE = 'relativa/cowork'
    expect(hasAutoMemPathOverride()).toBe(false)
    expect(getAutoMemPath().startsWith(base)).toBe(true)
  })
})

describe('THYROX_COWORK_MEMORY_EXTRA_GUIDELINES', () => {
  test('el texto se añade a las pautas del prompt de memoria del agente', () => {
    const marker = 'pauta-extra-de-cowork'
    expect(loadAgentMemoryPrompt('probe', 'user')).not.toContain(marker)
    process.env.THYROX_COWORK_MEMORY_EXTRA_GUIDELINES = marker
    expect(loadAgentMemoryPrompt('probe', 'user')).toContain(marker)
  })

  test('un texto en blanco no añade nada', () => {
    const without = loadAgentMemoryPrompt('probe', 'user')
    process.env.THYROX_COWORK_MEMORY_EXTRA_GUIDELINES = '   '
    expect(loadAgentMemoryPrompt('probe', 'user')).toBe(without)
  })
})
