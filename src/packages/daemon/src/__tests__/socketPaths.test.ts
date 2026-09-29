/**
 * `getDaemonHomeDir` sigue `getConfigHomeDir()` (DEC-04), no la variable
 * inventada `THYROX_CONFIG_HOME` ni un `homedir()/.claude` fijo.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { getDaemonHomeDir } from '../socketPaths.js'

const ORIGINAL_CONFIG_DIR = process.env.THYROX_CONFIG_DIR
const ORIGINAL_LEGACY_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
const ORIGINAL_CONFIG_HOME = process.env.THYROX_CONFIG_HOME

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = ORIGINAL_CONFIG_DIR
  if (ORIGINAL_LEGACY_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_LEGACY_CONFIG_DIR
  if (ORIGINAL_CONFIG_HOME === undefined) delete process.env.THYROX_CONFIG_HOME
  else process.env.THYROX_CONFIG_HOME = ORIGINAL_CONFIG_HOME
})

describe('getDaemonHomeDir', () => {
  test('queda debajo de THYROX_CONFIG_DIR', () => {
    const root = mkdtempSync(join(tmpdir(), 'ccb-daemon-home-'))
    try {
      process.env.THYROX_CONFIG_DIR = root
      expect(getDaemonHomeDir()).toBe(join(root, 'daemon'))
    } finally {
      delete process.env.THYROX_CONFIG_DIR
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('THYROX_CONFIG_HOME ya no se sigue', () => {
    const root = mkdtempSync(join(tmpdir(), 'ccb-daemon-home-legacy-'))
    try {
      delete process.env.THYROX_CONFIG_DIR
      delete process.env.CLAUDE_CONFIG_DIR
      process.env.THYROX_CONFIG_HOME = root
      expect(getDaemonHomeDir()).not.toBe(join(root, 'daemon'))
    } finally {
      delete process.env.THYROX_CONFIG_HOME
      rmSync(root, { recursive: true, force: true })
    }
  })
})
