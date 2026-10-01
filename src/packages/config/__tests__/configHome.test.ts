/**
 * La raíz de configuración del usuario es `.thyrox`: la variable propia y el
 * directorio propio mandan, y los nombres heredados del cliente sólo se leen
 * como respaldo mientras el usuario no haya migrado.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  CONFIG_DIR_ENV,
  CONFIG_DIR_NAME,
  LEGACY_CONFIG_DIR_ENV,
  LEGACY_CONFIG_DIR_NAME,
  getConfigHomeDir,
  resolveConfigHomeDir,
  resolveDataDir,
} from '../env/configHome.js'

const HOME = '/home/u'
const none = () => false
const only = (...dirs: string[]) => (p: string) => dirs.includes(p)

describe('resolveConfigHomeDir', () => {
  test('los nombres propios son los de thyrox', () => {
    expect(CONFIG_DIR_ENV).toBe('THYROX_CONFIG_DIR')
    expect(CONFIG_DIR_NAME).toBe('.thyrox')
    expect(LEGACY_CONFIG_DIR_ENV).toBe('CLAUDE_CONFIG_DIR') // thyrox-rename: keep — respaldo heredado de configHome
    expect(LEGACY_CONFIG_DIR_NAME).toBe('.claude')
  })

  test('la variable propia gana a todo', () => {
    const env = { THYROX_CONFIG_DIR: '/x', CLAUDE_CONFIG_DIR: '/y' } // thyrox-rename: keep — respaldo heredado de configHome
    expect(resolveConfigHomeDir({ env, home: HOME, exists: only(join(HOME, '.claude')) })).toBe('/x')
  })

  test('la variable heredada se lee como respaldo', () => {
    expect(resolveConfigHomeDir({ env: { CLAUDE_CONFIG_DIR: '/y' }, home: HOME, exists: none })).toBe('/y') // thyrox-rename: keep — respaldo heredado de configHome
  })

  test('sin variables ni directorios, el destino es ~/.thyrox', () => {
    expect(resolveConfigHomeDir({ env: {}, home: HOME, exists: none })).toBe(join(HOME, '.thyrox'))
  })

  test('un usuario sin migrar sigue leyendo ~/.claude', () => {
    expect(resolveConfigHomeDir({ env: {}, home: HOME, exists: only(join(HOME, '.claude')) }))
      .toBe(join(HOME, '.claude'))
  })

  test('con los dos directorios, ~/.thyrox gana', () => {
    const both = only(join(HOME, '.claude'), join(HOME, '.thyrox'))
    expect(resolveConfigHomeDir({ env: {}, home: HOME, exists: both })).toBe(join(HOME, '.thyrox'))
  })

  test('una variable vacía no cuenta como declarada', () => {
    expect(resolveConfigHomeDir({ env: { THYROX_CONFIG_DIR: '', CLAUDE_CONFIG_DIR: '/y' }, home: HOME, exists: none })) // thyrox-rename: keep — respaldo heredado de configHome
      .toBe('/y')
  })

  test('normaliza a NFC', () => {
    const nfd = '/café'
    expect(resolveConfigHomeDir({ env: { THYROX_CONFIG_DIR: nfd }, home: HOME, exists: none }))
      .toBe(nfd.normalize('NFC'))
  })
})

describe('getConfigHomeDir', () => {
  const saved = { t: process.env.THYROX_CONFIG_DIR, c: process.env.CLAUDE_CONFIG_DIR, h: process.env.HOME } // thyrox-rename: keep — respaldo heredado de configHome
  const restore = () => {
    for (const [k, v] of [['THYROX_CONFIG_DIR', saved.t], ['CLAUDE_CONFIG_DIR', saved.c], ['HOME', saved.h]] as const) { // thyrox-rename: keep — respaldo heredado de configHome
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }

  test('cambiar la variable propia recalcula sin limpiar nada', () => {
    try {
      process.env.THYROX_CONFIG_DIR = '/a'
      expect(getConfigHomeDir()).toBe('/a')
      process.env.THYROX_CONFIG_DIR = '/b'
      expect(getConfigHomeDir()).toBe('/b')
    } finally {
      restore()
    }
  })

  test('sin variables, resuelve contra el directorio del usuario y lo que existe en disco', () => {
    try {
      delete process.env.THYROX_CONFIG_DIR
      delete process.env.CLAUDE_CONFIG_DIR // thyrox-rename: keep — respaldo heredado de configHome
      expect(getConfigHomeDir()).toBe(resolveConfigHomeDir({ env: {}, home: homedir(), exists: existsSync }))
    } finally {
      restore()
    }
  })
})

describe('resolveDataDir', () => {
  const ENV_VAR = 'THYROX_TEST_DATA_DIR'
  const SUBDIR = 'test-subdir'

  test('la variable declarada gana, resuelta a ruta absoluta', () => {
    expect(resolveDataDir(ENV_VAR, SUBDIR, { [ENV_VAR]: 'rel/dir' })).toBe(resolve('rel/dir'))
  })

  test('una variable en blanco no cuenta como declarada', () => {
    expect(resolveDataDir(ENV_VAR, SUBDIR, { [ENV_VAR]: '   ', THYROX_CONFIG_DIR: '/cfg' })).toBe(join('/cfg', SUBDIR))
  })

  test('sin declaración, respalda en el hogar de configuración', () => {
    expect(resolveDataDir(ENV_VAR, SUBDIR, { THYROX_CONFIG_DIR: '/cfg' })).toBe(join('/cfg', SUBDIR))
  })

  test('respeta el `env` inyectado, no el global del proceso', () => {
    const saved = process.env.THYROX_CONFIG_DIR
    try {
      process.env.THYROX_CONFIG_DIR = '/global'
      expect(resolveDataDir(ENV_VAR, SUBDIR, { THYROX_CONFIG_DIR: '/inyectado' })).toBe(join('/inyectado', SUBDIR))
    } finally {
      if (saved === undefined) delete process.env.THYROX_CONFIG_DIR
      else process.env.THYROX_CONFIG_DIR = saved
    }
  })
})
