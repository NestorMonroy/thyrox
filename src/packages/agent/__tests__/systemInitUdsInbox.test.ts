/**
 * TASK-THYROX-0450 — el ramal `feature('UDS_INBOX')` de
 * `messages/systemInit.ts:88-93` resuelve su función real en vez de morir
 * con `TypeError: … is not a function`. Antes de completar
 * `udsMessaging.ts`, `getUdsMessagingSocketPath` no existía en ese módulo
 * (sólo `getDefaultUdsSocketPath` y `startUdsMessaging`) — este archivo se
 * queda en rojo si ese hueco vuelve.
 *
 * `buildSystemInitMessage` en sí exige los bindings de host de
 * `@thyrox/config` instalados (fuera de alcance de esta prueba: es un
 * bootstrap de proceso completo, no de este módulo); lo que se mide aquí es
 * el límite real — el `require()` exacto que ese archivo ejecuta, desde el
 * contexto de paquete de `@thyrox/agent` (su propio `package.json` declara
 * `@thyrox/local-observability` como dependencia) — y, en la misma prueba,
 * que el texto fuente sigue pidiendo esa función por nombre (mismo patrón
 * de control estático que `internalHeadlessRuntime.behavior.test.ts` ya usa
 * para esta función).
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('systemInit.ts — el ramal UDS_INBOX resuelve getUdsMessagingSocketPath', () => {
  test('require(@thyrox/local-observability/uds/udsMessaging.js).getUdsMessagingSocketPath existe y es invocable', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@thyrox/local-observability/uds/udsMessaging.js') as {
      getUdsMessagingSocketPath?: () => string | undefined
    }
    expect(typeof m.getUdsMessagingSocketPath).toBe('function')
    expect(() => m.getUdsMessagingSocketPath?.()).not.toThrow()
  })

  test('el código fuente sigue pidiendo getUdsMessagingSocketPath (no otro nombre)', () => {
    const source = readFileSync(join(import.meta.dir, '..', 'messages', 'systemInit.ts'), 'utf8')
    expect(source).toContain("require('@thyrox/local-observability/uds/udsMessaging.js').getUdsMessagingSocketPath()")
  })
})
