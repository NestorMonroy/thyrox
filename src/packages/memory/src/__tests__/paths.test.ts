/**
 * `getMemoryBaseDir` sin binding de host delega en el resolutor canónico de
 * `@thyrox/config` (`THYROX_CONFIG_DIR` → `CLAUDE_CONFIG_DIR` → `~/.thyrox`
 * o `~/.claude` según cuál exista), no en un cómputo manual de `~/.claude`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getConfigHomeDir } from '@thyrox/config/env/configHome.js'
import { installMemoryHostBindings } from '../host.ts'
import { getMemoryBaseDir } from '../paths.ts'

const KEYS = ['THYROX_CONFIG_DIR', 'CLAUDE_CONFIG_DIR', 'THYROX_CODE_REMOTE_MEMORY_DIR']
const saved: Record<string, string | undefined> = {}
let base: string

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  base = mkdtempSync(join(tmpdir(), 'thyrox-memory-paths-'))
  installMemoryHostBindings({})
})

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  rmSync(base, { recursive: true, force: true })
})

describe('getMemoryBaseDir', () => {
  test('THYROX_CONFIG_DIR fija la raíz de configuración', () => {
    const dir = join(base, 'config')
    process.env.THYROX_CONFIG_DIR = dir
    expect(getMemoryBaseDir()).toBe(dir)
  })

  test('sin THYROX_CONFIG_DIR, la variable heredada CLAUDE_CONFIG_DIR también resuelve', () => {
    const dir = join(base, 'legacy-config')
    process.env.CLAUDE_CONFIG_DIR = dir
    expect(getMemoryBaseDir()).toBe(dir)
  })

  test('sin ninguna variable, delega en el resolutor canónico de @thyrox/config', () => {
    expect(getMemoryBaseDir()).toBe(getConfigHomeDir())
  })
})
