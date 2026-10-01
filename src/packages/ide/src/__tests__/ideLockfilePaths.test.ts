/**
 * Dónde se buscan los lockfiles del IDE. Las extensiones de editor escriben
 * en `~/.claude/ide`; el ejecutable 2.1.283 (`rWn`) lo añade a la lista
 * cuando la raíz de configuración se declaró por variable. En thyrox la raíz
 * puede ser `~/.thyrox` sin declarar nada, así que la condición es la raíz
 * resuelta: siempre que no sea `~/.claude`, `~/.claude/ide` se busca también.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getIdeLockfilesPaths } from '../ide.js'

const saved = process.env.THYROX_CONFIG_DIR
afterEach(() => {
  if (saved === undefined) delete process.env.THYROX_CONFIG_DIR
  else process.env.THYROX_CONFIG_DIR = saved
})

describe('getIdeLockfilesPaths', () => {
  test('con otra raíz, también busca en ~/.claude/ide', async () => {
    process.env.THYROX_CONFIG_DIR = '/raiz-declarada'
    expect(await getIdeLockfilesPaths()).toEqual(['/raiz-declarada/ide', join(homedir(), '.claude', 'ide')])
  })

  test('con la raíz en ~/.claude, no la repite', async () => {
    process.env.THYROX_CONFIG_DIR = join(homedir(), '.claude')
    expect(await getIdeLockfilesPaths()).toEqual([join(homedir(), '.claude', 'ide')])
  })
})
