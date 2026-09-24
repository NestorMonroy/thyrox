/**
 * `T3r`/`Dm` de 2.1.275 (`chunk-xbd48fav.js`): la entrada de la herramienta,
 * recortada para el evento `tool_result`, sólo con OTEL_LOG_TOOL_DETAILS.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { extractToolInputForTelemetry } from '../eventMetadata.ts'

const saved = process.env.OTEL_LOG_TOOL_DETAILS
afterEach(() => {
  if (saved === undefined) delete process.env.OTEL_LOG_TOOL_DETAILS
  else process.env.OTEL_LOG_TOOL_DETAILS = saved
})

describe('extractToolInputForTelemetry', () => {
  test('sin la variable no se emite nada', () => {
    delete process.env.OTEL_LOG_TOOL_DETAILS
    expect(extractToolInputForTelemetry({ command: 'ls' })).toBeUndefined()
  })
  test('con la variable, JSON de la entrada', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    expect(extractToolInputForTelemetry({ command: 'ls', timeout: 5 })).toBe('{"command":"ls","timeout":5}')
  })
  test('cadenas de más de 512 se recortan a 128 con su longitud', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    const out = JSON.parse(extractToolInputForTelemetry({ c: 'x'.repeat(600) })!)
    expect(out.c).toBe(`${'x'.repeat(128)}…[600 chars]`)
  })
  test('las claves con guion bajo inicial no salen', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    expect(extractToolInputForTelemetry({ _secret: 1, a: 2 })).toBe('{"a":2}')
  })
  test('a profundidad 2 se corta con <nested>', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    expect(extractToolInputForTelemetry({ a: { b: { c: 1 } } })).toBe('{"a":{"b":"<nested>"}}')
  })
  test('más de 20 elementos se cuentan', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    const out = JSON.parse(extractToolInputForTelemetry({ l: Array.from({ length: 25 }, (_, i) => i) })!)
    expect(out.l).toHaveLength(21)
    expect(out.l[20]).toBe('…[25 items]')
  })
  test('el total se trunca a 4096', () => {
    process.env.OTEL_LOG_TOOL_DETAILS = '1'
    const input = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, 'y'.repeat(500)]))
    const out = extractToolInputForTelemetry(input)!
    expect(out).toHaveLength(4096 + '…[truncated]'.length)
    expect(out.endsWith('…[truncated]')).toBe(true)
  })
})
