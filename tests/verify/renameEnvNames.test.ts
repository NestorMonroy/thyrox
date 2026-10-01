/**
 * `renameEnvNames`: renombra una LISTA EXPLÍCITA de nombres de entorno
 * CLAUDE_<X> a THYROX_<X>.
 *
 * El prefijo CLAUDE_ a secas no se puede renombrar entero: también nombra
 * constantes de TypeScript que no son variables de entorno
 * (CLAUDE_OPUS_4_7_CONFIG, CLAUDE_AI_AUTHORIZE_URL). La lista la da el gate
 * (`checkEnvPrefix`), que sólo cuenta lecturas de entorno; este guion
 * renombra esos nombres y ningún otro.
 */
import { describe, expect, test } from 'bun:test'
import { renameEnvNames } from '../../src/verify/renameEnvNames.ts'

const names = new Set(['CLAUDE_CONFIG_DIR', 'CLAUDE_JOB_DIR'])

describe('renameEnvNames', () => {
  test('renombra los nombres de la lista y deja las constantes que comparten el prefijo', () => {
    const src = [
      "const dir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')",
      "const jobDir = readEnv('CLAUDE_JOB_DIR')",
      'export const CLAUDE_OPUS_4_7_CONFIG = { id: 1 }',
    ].join('\n')
    expect(renameEnvNames(src, names).split('\n')).toEqual([
      "const dir = process.env.THYROX_CONFIG_DIR ?? join(homedir(), '.claude')",
      "const jobDir = readEnv('THYROX_JOB_DIR')",
      'export const CLAUDE_OPUS_4_7_CONFIG = { id: 1 }',
    ])
  })

  test('palabra completa: un nombre que sólo contiene uno de la lista no cambia', () => {
    expect(renameEnvNames('CLAUDE_CONFIG_DIRS X_CLAUDE_JOB_DIR', names)).toBe('CLAUDE_CONFIG_DIRS X_CLAUDE_JOB_DIR')
  })

  test('respeta la marca keep, con el mismo alcance que renameEnvPrefix', () => {
    const src = [
      'unset CLAUDE_CONFIG_DIR # thyrox-rename: keep — el del anfitrión',
      'export CLAUDE_JOB_DIR=x',
    ].join('\n')
    expect(renameEnvNames(src, names).split('\n')).toEqual([
      'unset CLAUDE_CONFIG_DIR # thyrox-rename: keep — el del anfitrión',
      'export THYROX_JOB_DIR=x',
    ])
  })

  test('rehúsa un nombre que no es CLAUDE_<X>', () => {
    expect(() => renameEnvNames('x', new Set(['HOME']))).toThrow('HOME')
  })

  test('idempotente', () => {
    const once = renameEnvNames('CLAUDE_CONFIG_DIR', names)
    expect(renameEnvNames(once, names)).toBe(once)
  })
})
