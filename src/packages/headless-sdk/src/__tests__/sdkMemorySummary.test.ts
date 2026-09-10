/**
 * Puerto de `ccnmt: packages/headless-sdk/src/__tests__/sdkMemorySummary.test.ts`
 * (verbatim en aserciones; el mecanismo de captura cambia porque el puerto
 * no usa `@claude-code-how-works/local-observability` sino el sustituto
 * local — ver `../internal/pendingCrossPackageDeps.ts`. La fuente hace
 * `mock.module('@thyrox/local-observability', ...)`; aquí
 * se inyecta directamente con `setLogEventFn`, que es el mismo patrón DI
 * que `setGetCwdFn` de `@thyrox/storage` — sin mockear un import de
 * paquete.
 *
 * Tests para `sdkMemorySummary.ts` — corrección del puerto contra ant
 * v2.1.136 2144.js: `Cc_`/`vP9`/`mH8`/`pG1`/`UG1`/`hP9`/`xH8`/`uH8`.
 *
 * Estrategia: inyectar un `logEvent` de prueba que capture los eventos
 * emitidos. Resetear los singletons a nivel de módulo con el helper de
 * sólo-test entre cada test, para que el estado de child/attribute no se
 * filtre entre casos.
 *
 * Los tests fijan:
 *   - candado de emisión única (`VP9`)
 *   - candado de programación única (`kP9`)
 *   - gate de SDK entrypoint — llamadores que no son SDK no ensucian el tracker
 *   - schema en bytes, no en MB
 *   - peak vía max(initial, now)
 *   - regla de emisión del campo constrained_memory_bytes
 *   - entries+bytes de los proveedores de atributos, en ambas formas
 *   - filtro de whitelist de child kind
 *   - vP9 marcar como muerto preserva la contribución de la entrada
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { setLogEventFn } from '../internal/pendingCrossPackageDeps.ts'

type EventPayload = Record<string, unknown>
const events: { name: string; payload: EventPayload }[] = []

setLogEventFn((name: string, payload?: EventPayload) => {
  events.push({ name, payload: payload ?? {} })
})

const mod = await import('../sdkMemorySummary.ts')

const ORIG_ENTRYPOINT = process.env.CLAUDE_CODE_ENTRYPOINT
const ORIG_SIMPLE = process.env.CLAUDE_CODE_SIMPLE

beforeEach(() => {
  events.length = 0
  mod._resetSdkMemorySummaryForTesting()
  process.env.CLAUDE_CODE_ENTRYPOINT = 'sdk-cli'
  delete process.env.CLAUDE_CODE_SIMPLE
})

afterEach(() => {
  if (ORIG_ENTRYPOINT === undefined)
    delete process.env.CLAUDE_CODE_ENTRYPOINT
  else process.env.CLAUDE_CODE_ENTRYPOINT = ORIG_ENTRYPOINT
  if (ORIG_SIMPLE === undefined) delete process.env.CLAUDE_CODE_SIMPLE
  else process.env.CLAUDE_CODE_SIMPLE = ORIG_SIMPLE
})

function captureEmit(): EventPayload | undefined {
  return events.find(e => e.name === 'tengu_sdk_memory_summary')?.payload
}

describe('scheduleSdkMemorySummary (ant hP9 + UG1)', () => {
  test('emits exactly one tengu_sdk_memory_summary at dispose', () => {
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    expect(captured).not.toBeNull()
    captured!()
    expect(events.filter(e => e.name === 'tengu_sdk_memory_summary')).toHaveLength(1)
  })

  test('emit-once latch — second dispose is no-op', () => {
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    captured!()
    expect(events).toHaveLength(1)
  })

  test('schedule-once latch — second schedule does not register again', () => {
    mod.recordRssSample()
    let registerCount = 0
    mod.scheduleSdkMemorySummary(() => {
      registerCount++
    })
    mod.scheduleSdkMemorySummary(() => {
      registerCount++
    })
    expect(registerCount).toBe(1)
  })
})

describe('payload shape (ant pG1)', () => {
  test('bytes-not-MB schema for all final/peak fields', () => {
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    // Ant: `final_rss_bytes`, `peak_rss_bytes`, etc. — sin sufijo `_mb`.
    expect(payload.final_rss_bytes).toBeGreaterThan(0)
    expect(payload.peak_rss_bytes).toBeGreaterThanOrEqual(
      payload.final_rss_bytes as number,
    )
    expect('final_rss_mb' in payload).toBe(false)
    expect('peak_rss_mb' in payload).toBe(false)
    expect('uptime_s' in payload).toBe(true)
  })

  test('peak_rss_bytes = max(initial, now)', () => {
    // Planta un snapshot inicial falso con un rss ENORME; verifica que el peak lo toma.
    mod.recordRssSample({
      rss: 999_999_999_999,
      heapUsed: 10,
      heapTotal: 10,
      external: 0,
      arrayBuffers: 0,
    })
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.peak_rss_bytes).toBe(999_999_999_999)
  })

  test('child_count is monotonic; per-kind aggregate respects whitelist', () => {
    mod.recordChildRssSample('bash_shell', 100)
    mod.recordChildRssSample('mcp_stdio', 200)
    mod.recordChildRssSample('unknown_kind', 300) // no está en la whitelist
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_count).toBe(3)
    expect(payload.child_rss_bytes_total).toBe(600) // 100 + 200 + 300
    expect(payload.child_bash_shell_rss_bytes).toBe(100)
    expect(payload.child_mcp_stdio_rss_bytes).toBe(200)
    // filtro de whitelist — un kind desconocido nunca obtiene columna dedicada
    expect('child_unknown_kind_rss_bytes' in payload).toBe(false)
  })

  test('attribute providers emit both entries and bytes when bytes set', () => {
    mod.registerMemoryAttribute('transcript', () => ({
      entries: 5,
      bytes: 4096,
    }))
    mod.registerMemoryAttribute('subagentTranscripts', () => ({
      entries: 2,
      // bytes omitido a propósito
    }))
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.attr_transcript_entries).toBe(5)
    expect(payload.attr_transcript_bytes).toBe(4096)
    expect(payload.attr_subagentTranscripts_entries).toBe(2)
    // No hay clave `_bytes` cuando el proveedor no la dio — fijar esto.
    expect('attr_subagentTranscripts_bytes' in payload).toBe(false)
  })

  test('attribute provider exception does not break emit', () => {
    mod.registerMemoryAttribute('crash', () => {
      throw new Error('boom')
    })
    mod.registerMemoryAttribute('ok', () => ({ entries: 1, bytes: 2 }))
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.attr_ok_entries).toBe(1)
    expect(payload.attr_ok_bytes).toBe(2)
    expect('attr_crash_entries' in payload).toBe(false)
  })
})

describe('registerMemoryAttribute / unregisterMemoryAttribute (ant xH8/uH8)', () => {
  test('unregister with identity match removes provider', () => {
    const fn = () => ({ entries: 1 })
    mod.registerMemoryAttribute('foo', fn)
    mod.unregisterMemoryAttribute('foo', fn)
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(disposer => {
      captured = disposer
    })
    captured!()
    const payload = captureEmit()!
    expect('attr_foo_entries' in payload).toBe(false)
  })

  test('unregister with stale identity does NOT remove the new provider', () => {
    // ant `uH8`: `if (Sc_.get(H) === _) delete`. Un unregister obsoleto tras
    // re-registrar debe ser un no-op.
    const fn1 = () => ({ entries: 1 })
    const fn2 = () => ({ entries: 999 })
    mod.registerMemoryAttribute('foo', fn1)
    mod.registerMemoryAttribute('foo', fn2) // reemplaza a fn1
    mod.unregisterMemoryAttribute('foo', fn1) // obsoleto → no-op
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(disposer => {
      captured = disposer
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.attr_foo_entries).toBe(999)
  })
})

describe('trackChildProcess / markChildProcessDead (ant Cc_/vP9)', () => {
  test('non-SDK entrypoint never registers a child', () => {
    process.env.CLAUDE_CODE_ENTRYPOINT = 'cli'
    mod.trackChildProcess('bash_shell', 1234)
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_count).toBe(0)
  })

  test('simple mode never registers a child', () => {
    process.env.CLAUDE_CODE_SIMPLE = '1'
    mod.trackChildProcess('bash_shell', 1234)
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_count).toBe(0)
  })

  test('non-finite or non-positive pid is rejected', () => {
    mod.trackChildProcess('bash_shell', NaN)
    mod.trackChildProcess('bash_shell', 0)
    mod.trackChildProcess('bash_shell', -1)
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_count).toBe(0)
  })

  test('re-tracking a still-alive pid is a no-op', () => {
    mod.trackChildProcess('bash_shell', 1234)
    mod.trackChildProcess('bash_shell', 1234)
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_count).toBe(1)
  })

  test('dead child still contributes to total + per-kind aggregate', () => {
    mod.recordChildRssSample('bash_shell', 500)
    // recordChildRssSample lo marca muerto de inmediato. El agregado debe
    // seguir incluyendo sus 500 bytes — ese fue el *peak* que alcanzó.
    mod.recordRssSample()
    let captured: (() => void) | null = null
    mod.scheduleSdkMemorySummary(fn => {
      captured = fn
    })
    captured!()
    const payload = captureEmit()!
    expect(payload.child_rss_bytes_total).toBe(500)
    expect(payload.child_bash_shell_rss_bytes).toBe(500)
  })
})
