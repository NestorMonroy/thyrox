import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Pines a nivel de fuente para `internal/runtimeSignals.ts` — tres
 * delegados encadenados por optional-chaining a los bindings del host.
 * Porte de
 * `ccnmt: packages/agent/__tests__/internalRuntimeSignals.behavior.test.ts`.
 *
 * Invariantes:
 *  1. Los tres delegan vía `getAgentHostBindings().X?.(...)` — nunca lanzan
 *     si el host no instaló el binding.
 *  2. `notifyCommandLifecycle` acepta SÓLO 'started' | 'completed' (una
 *     unión que un refactor podría ensanchar — se fija aquí).
 *  3. `headlessProfilerCheckpoint` y `queryCheckpoint` reciben SÓLO el
 *     nombre (sin payload de metadata). El host decide qué hacer con él.
 */
describe('internal/runtimeSignals', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'runtimeSignals.ts'),
    'utf-8',
  )

  test('headlessProfilerCheckpoint delega vía optional chain (sin host = no-op)', () => {
    expect(source).toMatch(
      /headlessProfilerCheckpoint\(name: string\): void \{\s*\n?\s*getAgentHostBindings\(\)\.headlessProfilerCheckpoint\?\.\(name\)/,
    )
  })

  test('queryCheckpoint delega vía optional chain', () => {
    expect(source).toMatch(
      /queryCheckpoint\(name: string\): void \{\s*\n?\s*getAgentHostBindings\(\)\.queryCheckpoint\?\.\(name\)/,
    )
  })

  test('notifyCommandLifecycle delega con ambos argumentos', () => {
    expect(source).toMatch(
      /notifyCommandLifecycle\([\s\S]*?uuid: string,[\s\S]*?state: 'started' \| 'completed'/,
    )
    expect(source).toMatch(
      /getAgentHostBindings\(\)\.notifyCommandLifecycle\?\.\(uuid, state\)/,
    )
  })

  test('la unión de estado es EXACTAMENTE started|completed (ningún otro estado)', () => {
    // Pin: un refactor que agregue 'in_progress' cambiaría la UI aguas abajo.
    // Si hacen falta más estados, se agregan deliberadamente Y se actualiza
    // este test.
    expect(source).toMatch(/'started' \| 'completed'/)
    expect(source).not.toMatch(/'in_progress'/)
    expect(source).not.toMatch(/'cancelled'/)
  })

  test('importa getAgentHostBindings desde "../host.ts" (divergencia declarada: la fuente usa "../host.js", aquí el resto de "internal/" ya importa sus hermanos con extensión .ts)', () => {
    expect(source).toMatch(
      /import \{ getAgentHostBindings \} from '\.\.\/host\.ts'/,
    )
  })

  test('las tres se exportan (las consumen la query y el runtime de comandos)', () => {
    expect(source).toMatch(/^export function headlessProfilerCheckpoint/m)
    expect(source).toMatch(/^export function queryCheckpoint/m)
    expect(source).toMatch(/^export function notifyCommandLifecycle/m)
  })
})
