/**
 * El modelo del modo rápido, según 2.1.283 (`chunk-t6pwageh.js`): `Rte` es
 * siempre `'opus'` (con `[1m]` cuando aplica la fusión de contexto de 1M) y
 * `K$` lee su nombre visible del catálogo — ninguno de los dos conserva la
 * anulación a Opus 4.6 que 2.1.283 ya no trae.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { installConfigHostBindings } from '@thyrox/config/host'
import { InMemoryConfig } from '@thyrox/config/testing'
import { canonicalModelName, MODELS } from '@thyrox/agent/models'

import {
  FAST_MODE_MODEL_DISPLAY,
  getFastModeModel,
  getFastModeModelDisplay,
} from '../fastMode.js'
import { isOpus1mMergeEnabled, parseUserSpecifiedModel } from '../model.js'

const VARIABLES = [
  'THYROX_CODE_OPUS_4_6_FAST_MODE_OVERRIDE',
  'THYROX_CODE_ENABLE_OPUS_4_8_FAST_MODE',
  'ANTHROPIC_API_KEY',
]
const home = mkdtempSync(join(tmpdir(), 'fast-mode-model-'))
let saved: Record<string, string | undefined> = {}
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
  process.env.ANTHROPIC_API_KEY = 'marcador-local-de-prueba'
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
})

const catalogOpusDisplayName = () =>
  MODELS[canonicalModelName(parseUserSpecifiedModel('opus'))]?.display_name ?? 'Opus'

describe('getFastModeModel (Rte)', () => {
  test('es "opus", con [1m] sólo cuando la fusión de 1M aplica', () => {
    expect(getFastModeModel()).toBe('opus' + (isOpus1mMergeEnabled() ? '[1m]' : ''))
  })

  test('el override retirado ya no cambia el modelo a claude-opus-4-6', () => {
    process.env.THYROX_CODE_OPUS_4_6_FAST_MODE_OVERRIDE = '1'
    process.env.THYROX_CODE_ENABLE_OPUS_4_8_FAST_MODE = '0'
    expect(getFastModeModel()).not.toContain('claude-opus-4-6')
    expect(getFastModeModel().startsWith('opus')).toBe(true)
  })
})

describe('getFastModeModelDisplay (K$)', () => {
  test('lee el nombre visible del catálogo, no una cadena fija', () => {
    expect(getFastModeModelDisplay()).toBe(catalogOpusDisplayName())
  })

  test('el override retirado ya no cambia el nombre a "Opus 4.6"', () => {
    process.env.THYROX_CODE_OPUS_4_6_FAST_MODE_OVERRIDE = '1'
    process.env.THYROX_CODE_ENABLE_OPUS_4_8_FAST_MODE = '0'
    expect(getFastModeModelDisplay()).toBe(catalogOpusDisplayName())
    expect(getFastModeModelDisplay()).not.toBe('Opus 4.6')
  })
})

describe('FAST_MODE_MODEL_DISPLAY', () => {
  test('se resuelve a la carga del módulo con el mismo catálogo que getFastModeModelDisplay', () => {
    expect(FAST_MODE_MODEL_DISPLAY).toBe(getFastModeModelDisplay())
  })
})

describe('retiro de la anulación a Opus 4.6', () => {
  test('el guion fuente ya no declara shouldUseOpus46FastMode ni sus dos variables', () => {
    const source = readFileSync(fileURLToPath(new URL('../fastMode.ts', import.meta.url)), 'utf8')
    expect(source).not.toContain('shouldUseOpus46FastMode')
    expect(source).not.toContain('THYROX_CODE_OPUS_4_6_FAST_MODE_OVERRIDE')
    expect(source).not.toContain('THYROX_CODE_ENABLE_OPUS_4_8_FAST_MODE')
  })
})
