/**
 * El bucle pide cada turno con el TTL que DECIDE `resolveRequestCacheTtl`.
 *
 * MITAD ROJA, medida antes del cambio: el bucle escribía `opts.cacheTtl ??
 * '1h'` en tres sitios (la petición, el costo del turno y el cambio de
 * modelo), así que la política de TTL —el hueco entre turnos y el origen de
 * la petición— no llegaba a ninguna petición real.
 *
 * CONTROL DE ANULACIÓN: devolver el literal `'1h'` hace caer los casos 2 y 3,
 * y deja en pie el 1 (el default de `sdk` coincide con el literal).
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop } from '../loop/index.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import type { AssistantTurn } from '../loop/types.ts'

const texto = (t: string): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-sonnet-5', stop_reason: 'end_turn',
  content: [{ type: 'text', text: t }],
  usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 },
})

async function ttlOf(extra: Record<string, unknown>): Promise<unknown> {
  const d = mkdtempSync(join(tmpdir(), 'loop-ttl-'))
  const provider = new RecordedProvider([texto('listo')])
  await runLoop({ cwd: d, model: 'claude-sonnet-5', system: 's', tools: [], transcriptDir: d, prompt: 'hola', provider, ...extra })
  return provider.requests[0]!.cacheTtl
}

describe('runLoop — el TTL de caché de cada petición', () => {
  test('1. sin nada declarado, el origen por defecto (sdk) pide 1h', async () => {
    expect(await ttlOf({})).toBe('1h')
  })

  test('2. un hueco corto entre turnos pide 5m', async () => {
    expect(await ttlOf({ expectedGapMinutes: 2 })).toBe('5m')
  })

  test('3. un subagente pide 5m por su origen', async () => {
    expect(await ttlOf({ requestSource: 'agent:custom' })).toBe('5m')
  })

  test('4. el TTL declarado gana', async () => {
    expect(await ttlOf({ cacheTtl: '5m', requestSource: 'sdk' })).toBe('5m')
  })
})
