import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { userConfigDir } from '../settings.ts'

const ORIGINAL_ENV = { ...process.env }
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'thyrox-settings-bin-'))
})

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true })
  process.env = { ...ORIGINAL_ENV }
})

describe('userConfigDir', () => {
  test('con THYROX_CONFIG_DIR declarada, usa ESE directorio', () => {
    process.env.THYROX_CONFIG_DIR = scratch
    delete process.env.CLAUDE_CONFIG_DIR
    expect(userConfigDir()).toBe(scratch)
  })

  test('sin la variable, cae en ~/.thyrox cuando ya existe', () => {
    delete process.env.THYROX_CONFIG_DIR
    delete process.env.CLAUDE_CONFIG_DIR
    mkdirSync(join(scratch, '.thyrox'))
    expect(userConfigDir({ home: scratch, exists: existsSync })).toBe(join(scratch, '.thyrox'))
  })

  test('sin la variable y sin ningún directorio previo, resuelve a ~/.thyrox (destino de instalación nueva)', () => {
    delete process.env.THYROX_CONFIG_DIR
    delete process.env.CLAUDE_CONFIG_DIR
    expect(userConfigDir({ home: scratch, exists: existsSync })).toBe(join(scratch, '.thyrox'))
  })

  test('respaldo heredado: sólo ~/.claude existe, se usa ese', () => {
    delete process.env.THYROX_CONFIG_DIR
    delete process.env.CLAUDE_CONFIG_DIR
    mkdirSync(join(scratch, '.claude'))
    expect(userConfigDir({ home: scratch, exists: existsSync })).toBe(join(scratch, '.claude'))
  })

  test('la variable declarada gana incluso con ~/.claude presente', () => {
    process.env.THYROX_CONFIG_DIR = scratch
    mkdirSync(join(scratch, '.claude'))
    expect(userConfigDir({ home: scratch, exists: existsSync })).toBe(scratch)
  })
})
