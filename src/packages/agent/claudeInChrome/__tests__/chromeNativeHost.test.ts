/**
 * El log de depuración del host nativo de Chrome vive bajo el hogar de
 * configuración compartido (`getConfigHomeDir()`), no bajo un `~/.claude`
 * calculado a mano: una instalación nueva usa `~/.thyrox`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getConfigHomeDir } from '@thyrox/config/env/utils'
import { resolveChromeNativeHostLogFile } from '../chromeNativeHost.js'

const SAVED_THYROX_CONFIG_DIR = process.env.THYROX_CONFIG_DIR
const SAVED_CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
const tempDirs: string[] = []

afterEach(async () => {
  if (SAVED_THYROX_CONFIG_DIR === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = SAVED_THYROX_CONFIG_DIR
  if (SAVED_CLAUDE_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = SAVED_CLAUDE_CONFIG_DIR
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('resolveChromeNativeHostLogFile', () => {
  test('fuera de USER_TYPE=ant, el log queda deshabilitado', () => {
    expect(resolveChromeNativeHostLogFile({ USER_TYPE: 'external' })).toBeUndefined()
    expect(resolveChromeNativeHostLogFile({})).toBeUndefined()
  })

  test('con THYROX_CONFIG_DIR apuntando a un mkdtemp, usa ese directorio', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'thyrox-chrome-native-host-'))
    tempDirs.push(dir)
    process.env.THYROX_CONFIG_DIR = dir
    delete process.env.CLAUDE_CONFIG_DIR
    expect(resolveChromeNativeHostLogFile({ USER_TYPE: 'ant' })).toBe(
      join(dir, 'debug', 'chrome-native-host.txt'),
    )
  })

  test('sin variable declarada, delega en el hogar de configuración compartido', () => {
    delete process.env.THYROX_CONFIG_DIR
    delete process.env.CLAUDE_CONFIG_DIR
    expect(resolveChromeNativeHostLogFile({ USER_TYPE: 'ant' })).toBe(
      join(getConfigHomeDir(), 'debug', 'chrome-native-host.txt'),
    )
  })
})
