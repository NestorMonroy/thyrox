/**
 * Superficie publica del primer lote de fachadas `TS2305` verificado con una
 * sola pasada de `tsc` (`src/verify/batch_verification.py`).
 *
 * Cada proveedor del lote tiene TODOS sus simbolos faltantes implementados
 * dentro de su mismo paquete; el defecto era el barrel, no el codigo. Se
 * prueba el import publico, que es lo que el consumidor usa.
 */
import { describe, expect, test } from 'bun:test'
import * as capture from '@thyrox/output/capture'
import * as permission from '@thyrox/permission'
import * as claudeAiLimits from '@thyrox/provider/claudeAiLimits.js'
import * as shell from '@thyrox/shell'

const EXPECTED: Array<[string, Record<string, unknown>, string[]]> = [
  ['@thyrox/output/capture', capture, ['ansiToPng', 'renameRecordingForSession']],
  ['@thyrox/permission', permission, [
    'getAutoModeUnavailableNotification', 'getAutoModeUnavailableReason',
    'isAutoModeGateEnabled', 'isBypassPermissionsModeDisabled', 'transitionPermissionMode',
  ]],
  ['@thyrox/provider/claudeAiLimits.js', claudeAiLimits, ['getRateLimitWarning', 'getUsingOverageText']],
  ['@thyrox/shell', shell, ['getCachedPowerShellPath']],
]

describe('primer lote de fachadas TS2305', () => {
  for (const [specifier, mod, symbols] of EXPECTED) {
    for (const symbol of symbols) {
      test(`${specifier} publica ${symbol}`, () => {
        expect(typeof mod[symbol]).toBe('function')
      })
    }
  }
})
