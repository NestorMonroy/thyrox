/**
 * Las constantes del swarm de `chunk-q8a07cv0.js` (2.1.283): `uJ`, `sFt`,
 * `pJ`, `vFe`, `iFt`, `iLo` y `sLo`.
 */
import { describe, expect, test } from 'bun:test'

import {
  SWARM_PANE_PLACEHOLDER_COMMAND,
  SWARM_SESSION_NAME,
  SWARM_VIEW_WINDOW_NAME,
  TEAMMATE_COMMAND_ENV_VAR,
  TEAMMATE_NAME_PATTERN,
  TMUX_COMMAND,
  getSwarmSocketName,
} from '../src/core/constants.js'

describe('constantes de tmux del swarm', () => {
  test('sesión, ventana, ejecutable y orden de relleno del panel', () => {
    expect(SWARM_SESSION_NAME).toBe('claude-swarm')
    expect(SWARM_VIEW_WINDOW_NAME).toBe('swarm-view')
    expect(TMUX_COMMAND).toBe('tmux')
    expect(SWARM_PANE_PLACEHOLDER_COMMAND).toBe('cat')
  })
  test('el socket lleva el pid del proceso', () => {
    expect(getSwarmSocketName()).toBe(`claude-swarm-${process.pid}`)
  })
  test('la variable del comando del compañero lleva el prefijo propio', () => {
    expect(TEAMMATE_COMMAND_ENV_VAR).toBe('THYROX_CODE_TEAMMATE_COMMAND')
  })
})

describe('TEAMMATE_NAME_PATTERN (sLo)', () => {
  test('acepta letra o dígito inicial y hasta 64 caracteres', () => {
    expect(TEAMMATE_NAME_PATTERN.test('a')).toBe(true)
    expect(TEAMMATE_NAME_PATTERN.test('9worker_1-b')).toBe(true)
    expect(TEAMMATE_NAME_PATTERN.test('a'.repeat(64))).toBe(true)
  })
  test('rehúsa el inicio con guion o guion bajo, otros signos y más de 64', () => {
    expect(TEAMMATE_NAME_PATTERN.test('-a')).toBe(false)
    expect(TEAMMATE_NAME_PATTERN.test('_a')).toBe(false)
    expect(TEAMMATE_NAME_PATTERN.test('a.b')).toBe(false)
    expect(TEAMMATE_NAME_PATTERN.test('')).toBe(false)
    expect(TEAMMATE_NAME_PATTERN.test('a'.repeat(65))).toBe(false)
  })
})
