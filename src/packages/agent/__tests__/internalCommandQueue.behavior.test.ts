/**
 * Porte de
 * `ccnmt: packages/agent/__tests__/internalCommandQueue.behavior.test.ts`.
 *
 * `internal/commandQueue.ts` expone tres delegados finos sobre las
 * ataduras del host:
 *   1. getCommandsByMaxPriority — devuelve [] cuando el host no está.
 *   2. remove — no-op cuando el host no está.
 *   3. isSlashCommand — primero la atadura del host; SI NO, un fallback
 *      real con lógica propia.
 *
 * El fallback en isSlashCommand tiene lógica real:
 *   - command.value debe ser un STRING
 *   - el valor recortado empieza con '/'
 *   - la bandera skipSlashCommands suprime la detección (escape hatch)
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `AgentHostBindings`
 * de `../contracts.ts` (285 líneas, sin portar en este árbol — ver
 * `host.ts`). Aquí se importa desde `../host.ts`, que ya declara el tipo
 * localmente con la misma convención que el resto de `internal/`.
 *
 * Comportamiento probado directamente (invocable desde este proceso — sin
 * host instalado aquí, así que el test ejercita el camino de fallback).
 */
import { beforeAll, describe, expect, test } from 'bun:test'

import { isSlashCommand } from '../internal/commandQueue.js'
import { installAgentHostBindings } from '../host.ts'
import type { AgentHostBindings } from '../host.ts'
import { readFileSync } from 'fs'
import { resolve } from 'path'

beforeAll(() => {
  // Ataduras de host vacías — cada método es opcional, así que el
  // optional-chain cae al fallback en proceso. Esto ejercita el camino de
  // fallback, que es lo que queremos fijar.
  installAgentHostBindings({} as AgentHostBindings)
})

describe('internal/commandQueue fallback de isSlashCommand', () => {
  // Sin ataduras de host instaladas en este proceso de test → corre el
  // fallback.

  test('string que empieza con "/" → true', () => {
    expect(
      isSlashCommand({ mode: 'prompt', value: '/help' }),
    ).toBe(true)
  })

  test('string con espacio en blanco al inicio + "/" → true (recorta primero)', () => {
    expect(
      isSlashCommand({ mode: 'prompt', value: '  /clear' }),
    ).toBe(true)
  })

  test('string que empieza con "/" — skipSlashCommands suprime → false', () => {
    expect(
      isSlashCommand({
        mode: 'prompt',
        value: '/help',
        skipSlashCommands: true,
      }),
    ).toBe(false)
  })

  test('texto plano (sin slash inicial) → false', () => {
    expect(
      isSlashCommand({ mode: 'prompt', value: 'just text' }),
    ).toBe(false)
  })

  test('string vacío → false', () => {
    expect(isSlashCommand({ mode: 'prompt', value: '' })).toBe(false)
  })

  test('value objeto (no string) → false (guard typeof)', () => {
    expect(
      isSlashCommand({ mode: 'prompt', value: { not: 'string' } }),
    ).toBe(false)
  })

  test('value numérico → false', () => {
    expect(isSlashCommand({ mode: 'prompt', value: 42 })).toBe(false)
  })

  test('value null → false (sin crash)', () => {
    expect(isSlashCommand({ mode: 'prompt', value: null })).toBe(false)
  })

  test('"/" solo (nada más que el slash) → true (hace match con empieza-con-/)', () => {
    expect(isSlashCommand({ mode: 'prompt', value: '/' })).toBe(true)
  })

  test('"//" (doble slash) → true (sigue empezando con /)', () => {
    // Pin: el heurístico NO exige una palabra de comando después del
    // slash. El parser de ant maneja el caso vacío/doble-slash aguas
    // abajo.
    expect(isSlashCommand({ mode: 'prompt', value: '//comment' })).toBe(true)
  })

  test('"\\/help" (slash escapado) → false', () => {
    // Pin: la sintaxis de escape de ant. El primer carácter literal es
    // "\", no "/".
    expect(isSlashCommand({ mode: 'prompt', value: '\\/help' })).toBe(false)
  })
})

describe('internal/commandQueue — pines a nivel de código fuente', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'commandQueue.ts'),
    'utf-8',
  )

  test('getCommandsByMaxPriority devuelve [] cuando el host está ausente (NO undefined)', () => {
    // Pin: el llamador itera el resultado — undefined reventaría.
    expect(source).toMatch(
      /if \(!getCommands\) \{\s*\n?\s*return \[\]\s*\n?\s*\}/,
    )
  })

  test('remove usa optional-chain (no-op cuando el host está ausente)', () => {
    expect(source).toMatch(
      /removeCommandsFromQueue\?\.\(\s*\n?\s*commands\.map\(asQueuedCommandMessage\),/,
    )
  })

  test('isSlashCommand consulta la atadura del host PRIMERO', () => {
    // Pin: cuando el host está instalado (p. ej. con un parser de /cmd a
    // medida), se difiere a él. El fallback corre SÓLO cuando el host no
    // provee isSlashCommand.
    expect(source).toMatch(
      /const check = getAgentHostBindings\(\)\.isSlashCommand\s*\n?\s*if \(check\)/,
    )
  })

  test('enumeración del fallback de prioridad: now | next | later', () => {
    // Pin: la unión de prioridad — una regresión que agregue 'urgent'
    // tendría que ser intencional y actualizar a los consumidores.
    expect(source).toMatch(/'now' \| 'next' \| 'later'/)
  })
})
