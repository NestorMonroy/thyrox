/**
 * `executePostCompactHooks` (`ccnmt: packages/agent/hooks.ts:4435`) y la
 * constante `COMPACT_MAX_OUTPUT_TOKENS` (`ccnmt: packages/agent/context.ts:13`),
 * las dos dependencias de `compaction/compact.ts` que faltaban en
 * `hooks.ts` y `context.ts`.
 *
 * Los hooks son comandos `bash` reales, como en `hooksEngine.test.ts`: lo
 * que se mide es que el resultado de cada comando llegue al mensaje que el
 * usuario ve, con la misma forma que PostCompact publica en la fuente.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { executePostCompactHooks } from '../hooks.ts'
import { COMPACT_MAX_OUTPUT_TOKENS } from '../context.ts'
import { resetHooksConfigSnapshot, setHooksConfigSnapshot } from '../hooksConfigSnapshot.ts'

const cmd = (command: string) => ({ type: 'command', command })

beforeEach(() => resetHooksConfigSnapshot())
afterEach(() => resetHooksConfigSnapshot())

describe('COMPACT_MAX_OUTPUT_TOKENS', () => {
  test('es el tope de salida de la fuente: 20 000', () => {
    expect(COMPACT_MAX_OUTPUT_TOKENS).toBe(20_000)
  })
})

describe('executePostCompactHooks', () => {
  test('sin hooks configurados devuelve un objeto vacío', async () => {
    const r = await executePostCompactHooks(
      { trigger: 'manual', compactSummary: 'resumen' },
      new AbortController().signal,
    )
    expect(r).toEqual({})
  })

  test('la salida de un hook exitoso viaja al mensaje del usuario, con su comando', async () => {
    setHooksConfigSnapshot({ PostCompact: [{ hooks: [cmd("printf 'anotado'")] }] })
    const r = await executePostCompactHooks(
      { trigger: 'auto', compactSummary: 'resumen' },
      new AbortController().signal,
    )
    expect(r.userDisplayMessage).toBe("PostCompact [printf 'anotado'] completed successfully: anotado")
  })

  test('un hook que falla se reporta como fallo, sin ocultar su salida', async () => {
    setHooksConfigSnapshot({ PostCompact: [{ hooks: [cmd("printf 'roto' >&2; exit 1")] }] })
    const r = await executePostCompactHooks(
      { trigger: 'manual', compactSummary: 'resumen' },
      new AbortController().signal,
    )
    expect(r.userDisplayMessage).toContain('PostCompact [')
    expect(r.userDisplayMessage).toContain('failed')
    expect(r.userDisplayMessage).toContain('roto')
  })

  test('el matcher filtra por disparador: un hook de `auto` no corre en `manual`', async () => {
    setHooksConfigSnapshot({ PostCompact: [{ matcher: 'auto', hooks: [cmd("printf 'solo auto'")] }] })
    const manual = await executePostCompactHooks(
      { trigger: 'manual', compactSummary: 'x' },
      new AbortController().signal,
    )
    expect(manual).toEqual({})
    const auto = await executePostCompactHooks(
      { trigger: 'auto', compactSummary: 'x' },
      new AbortController().signal,
    )
    expect(auto.userDisplayMessage).toContain('solo auto')
  })

  test('el hook recibe el resumen en `compact_summary` por stdin', async () => {
    setHooksConfigSnapshot({
      PostCompact: [
        {
          hooks: [
            cmd(
              "python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[\"hook_event_name\"], d[\"trigger\"], d[\"compact_summary\"])'",
            ),
          ],
        },
      ],
    })
    const r = await executePostCompactHooks(
      { trigger: 'auto', compactSummary: 'lo resumido' },
      new AbortController().signal,
    )
    expect(r.userDisplayMessage).toContain('PostCompact auto lo resumido')
  })
})
