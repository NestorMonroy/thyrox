/**
 * El mensaje `extra_usage_disabled` recibe sus dos piezas de créditos de uso
 * (`_6e` y `hy() && Ex() ? Run()`) calculadas sobre el contexto de sesión que
 * arman `Te`, `yu` y `Jx` de `@thyrox/config/entrypoint`.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installConfigHostBindings } from '@thyrox/config/host'
import { InMemoryConfig } from '@thyrox/config/testing'
import { isInsideAgentShell, isTopLevelDesktopSession, processEntrypointContext } from '@thyrox/config/entrypoint'

const realCredits = await import('../extraUsageCredits.js')
const seen: unknown[] = []
mock.module('../extraUsageCredits.js', () => ({
  ...realCredits,
  usageCreditsLink: (context: unknown) => {
    seen.push(context)
    return '/usage-credits'
  },
  usageCreditsInstruction: (context: unknown) => {
    seen.push(context)
    return 'turn on usage credits'
  },
}))

const { processFastModeAvailabilityContext } = await import('../fastMode.js')
const { extraUsageDisabledMessage } = await import('../fastModeAvailability.js')

const saved = process.env.ANTHROPIC_API_KEY
const home = mkdtempSync(join(tmpdir(), 'fast-mode-credits-'))
beforeEach(() => {
  seen.length = 0
  process.env.ANTHROPIC_API_KEY = 'marcador-local-de-prueba'
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
})
afterEach(() => {
  if (saved === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = saved
})

describe('créditos de uso en el contexto de disponibilidad', () => {
  test('el enlace y la instrucción llegan al contexto', () => {
    const context = processFastModeAvailabilityContext()
    expect(context.usageCreditsLink).toBe('/usage-credits')
    expect(context.usageCreditsInstruction).toBe('turn on usage credits')
    expect(extraUsageDisabledMessage(context)).toBe('Fast mode requires usage credits · /usage-credits to turn them on')
  })

  test('se calculan sobre Te, yu y Jx del proceso', () => {
    processFastModeAvailabilityContext()
    const expected = {
      isNonInteractiveHost: processEntrypointContext.isNonInteractive(),
      isOwnSessionWithoutChild: isTopLevelDesktopSession(),
      isHostSession: isInsideAgentShell(),
    }
    expect(seen).toEqual([expected, expected])
  })
})
