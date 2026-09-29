/**
 * TASK-THYROX-0450 — el ramal `feature('UDS_INBOX')` de
 * `headless/sdk/session/run-streaming.ts:2064-2072` resuelve su función
 * real (`setOnEnqueue`) en vez de morir con `TypeError: … is not a
 * function`. Antes de completar `udsMessaging.ts`, ese nombre no existía
 * en el módulo — este archivo se queda en rojo si el hueco vuelve.
 *
 * `run-streaming.ts` exporta el arranque completo del bucle SDK, que exige
 * un `Query`/proveedor real en marcha (fuera de alcance de esta prueba: es
 * un bootstrap de sesión entero, no de este módulo). Lo que se mide aquí es
 * el límite real: el `require()` exacto que ese archivo ejecuta, desde el
 * contexto de paquete de `@thyrox/cli` (su propio `package.json` declara
 * `@thyrox/local-observability` como dependencia), invocado con la misma
 * forma (`setOnEnqueue(() => …)`, sin `InboxState`) que el archivo usa — y,
 * en la misma prueba, que el texto fuente sigue pidiendo esa función por
 * nombre.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('run-streaming.ts — el ramal UDS_INBOX resuelve setOnEnqueue', () => {
  test('require(@thyrox/local-observability/uds/udsMessaging.js).setOnEnqueue existe y acepta un callback sin InboxState', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setOnEnqueue } = require('@thyrox/local-observability/uds/udsMessaging.js') as {
      setOnEnqueue?: (handler: (() => void) | undefined) => void
    }
    expect(typeof setOnEnqueue).toBe('function')
    expect(() => setOnEnqueue?.(() => {})).not.toThrow()
    setOnEnqueue?.(undefined)
  })

  test('el código fuente sigue pidiendo setOnEnqueue (no otro nombre)', () => {
    const source = readFileSync(
      join(import.meta.dir, '..', 'src', 'headless', 'sdk', 'session', 'run-streaming.ts'), 'utf8')
    expect(source).toContain("const { setOnEnqueue } = require('@thyrox/local-observability/uds/udsMessaging.js')")
  })
})
