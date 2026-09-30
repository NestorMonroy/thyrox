/**
 * El contexto del puente `runModeDispatch`, el `.action()` de commander.
 *
 * Ese camino ya tiene su implementación de directorio: `setup()` lo fija con
 * `setCwd` y se lee con `getCwd()` (`app-host/bootstrap/cwd.ts`), que además
 * respeta `runWithCwdOverride` para que agentes concurrentes vean cada uno el
 * suyo. `--cwd` es una bandera de `runCli`, no de commander. Las dos versiones
 * anteriores del puente se saltaban esa implementación: la del pool leía
 * `process.cwd()` y la de la primera revisión re-parseaba `--cwd`.
 */
import { describe, expect, test } from 'bun:test'
import { runWithCwdOverride } from '@thyrox/app-host/bootstrap/cwd.js'
import { modeDispatchContext } from '../src/entry/mode-dispatch.ts'

describe('modeDispatchContext', () => {
  test('el directorio sale de getCwd(), con su override por contexto async', () => {
    const ctx = runWithCwdOverride('/tmp/agente-a', () => modeDispatchContext(['sessions']))
    expect(ctx.cwd).toBe('/tmp/agente-a')
  })

  test('--cwd no es de este camino: no se re-parsea', () => {
    const ctx = runWithCwdOverride('/tmp/agente-a', () => modeDispatchContext(['--cwd', '/tmp/otro']))
    expect(ctx.cwd).toBe('/tmp/agente-a')
  })

  test('el transcript sale de ese directorio', () => {
    const a = runWithCwdOverride('/tmp/agente-a', () => modeDispatchContext([]))
    const b = runWithCwdOverride('/tmp/agente-b', () => modeDispatchContext([]))
    expect(a.transcriptDir).not.toBe(b.transcriptDir)
  })

  test('--transcript-dir manda sobre el derivado', () => {
    expect(modeDispatchContext(['--transcript-dir', '/t']).transcriptDir).toBe('/t')
  })
})
