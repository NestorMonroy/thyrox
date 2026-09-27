/**
 * `renameEnvPrefix`: la configuración de thyrox se lee como THYROX_CODE_*.
 *
 * Directiva del ejecutor 2026-09-27: thyrox es el único cliente. Las
 * CLAUDE_CODE_* son del cliente ajeno —el anfitrión de esta sesión pone
 * cincuenta para el suyo—, así que lo que thyrox lee o escribe como su
 * configuración pasa a THYROX_CODE_*. Los sitios que tratan a propósito el
 * entorno del cliente ajeno (retirar su credencial del entorno de un ítem)
 * conservan el nombre con la marca `thyrox-rename: keep`.
 *
 * El renombre tiene que ser idempotente: un renombre global aplicado dos
 * veces ya corrompió 115 archivos (H-THYROX-171).
 */
import { describe, expect, test } from 'bun:test'
import { FOREIGN_CONSTANTS, countRenames, renameEnvPrefix } from '../../src/verify/renameEnvPrefix.ts'

describe('renameEnvPrefix', () => {
  test('literal, shell y lista de nombres', () => {
    const src = [
      "if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) return 'bedrock'",
      'export CLAUDE_CODE_PROMPT_CACHE_TTL="$X"',
      "const NAMES = ['CLAUDE_CODE_A', 'CLAUDE_CODE_B_2']",
    ].join('\n')
    expect(renameEnvPrefix(src)).toBe([
      "if (isEnvTruthy(process.env.THYROX_CODE_USE_BEDROCK)) return 'bedrock'",
      'export THYROX_CODE_PROMPT_CACHE_TTL="$X"',
      "const NAMES = ['THYROX_CODE_A', 'THYROX_CODE_B_2']",
    ].join('\n'))
  })

  test('límite de palabra: no toca un nombre que sólo lo contiene', () => {
    expect(renameEnvPrefix('XCLAUDE_CODE_A MY_CLAUDE_CODE_B')).toBe('XCLAUDE_CODE_A MY_CLAUDE_CODE_B')
  })

  test('la marca keep en la misma línea conserva esa línea', () => {
    const src = 'unset CLAUDE_CODE_OAUTH_TOKEN  # thyrox-rename: keep — credencial del cliente ajeno'
    expect(renameEnvPrefix(src)).toBe(src)
  })

  test('la marca keep en la línea anterior conserva sólo la siguiente', () => {
    const src = [
      '# thyrox-rename: keep — el cliente ajeno la fija',
      'unset CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
      'export CLAUDE_CODE_X=1',
    ].join('\n')
    expect(renameEnvPrefix(src).split('\n')).toEqual([
      '# thyrox-rename: keep — el cliente ajeno la fija',
      'unset CLAUDE_CODE_OAUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
      'export THYROX_CODE_X=1',
    ])
  })

  test('idempotente', () => {
    const once = renameEnvPrefix('CLAUDE_CODE_A THYROX_CODE_B')
    expect(renameEnvPrefix(once)).toBe(once)
  })

  test('countRenames cuenta lo que cambiaría, sin las líneas marcadas', () => {
    const src = 'CLAUDE_CODE_A CLAUDE_CODE_B\nunset CLAUDE_CODE_C # thyrox-rename: keep'
    expect(countRenames(src)).toBe(2)
  })
})

/**
 * Una constante no es una variable de entorno. Las CLAUDE_CODE_* declaradas
 * con `const` nombran la identidad o el protocolo del cliente ajeno —la beta
 * `claude-code-20250219` que viaja en `anthropic-beta`, el esquema de sus
 * settings, su agente guía—, y el renombre no las toca. Es la misma frontera
 * que OmniRoute traza con CLAUDE_CODE_CLIENT_VERSION o
 * CLAUDE_CODE_SDK_PACKAGE_VERSION: modelan al cliente ajeno, no configuran el
 * propio.
 */
describe('renameEnvPrefix — constantes del cliente ajeno', () => {
  test('una constante declarada y su uso se conservan; la variable de al lado no', () => {
    const src = [
      "export const CLAUDE_CODE_20250219_BETA_HEADER = 'claude-code-20250219'",
      'if (process.env.CLAUDE_CODE_USE_BEDROCK) betas.push(CLAUDE_CODE_20250219_BETA_HEADER)',
    ].join('\n')
    expect(renameEnvPrefix(src).split('\n')).toEqual([
      "export const CLAUDE_CODE_20250219_BETA_HEADER = 'claude-code-20250219'",
      'if (process.env.THYROX_CODE_USE_BEDROCK) betas.push(CLAUDE_CODE_20250219_BETA_HEADER)',
    ])
    expect(countRenames(src)).toBe(1)
  })

  test('toda constante CLAUDE_CODE_* declarada en src/ está en FOREIGN_CONSTANTS', () => {
    const out = Bun.spawnSync(
      ['rg', '-o', '--no-filename', '-r', '$1', '^\\s*(?:export\\s+)?(?:const|let|var)\\s+(CLAUDE_CODE_[A-Z0-9_]+)', 'src'],
      { cwd: `${import.meta.dir}/../..` },
    )
    const declared = new Set(
      new TextDecoder().decode(out.stdout).split('\n').filter(Boolean),
    )
    expect(declared.size).toBeGreaterThan(0)
    expect([...declared].filter(n => !FOREIGN_CONSTANTS.has(n))).toEqual([])
  })
})
