/**
 * Transcript JSONL append-only (T-002).
 *
 * Fuente del porte: el formato del cliente —una línea por evento con `type`,
 * `timestamp`, `message` y `usage` dentro del mensaje del modelo—, copiado para
 * que la instrumentación existente lea nuestros transcripts sin tocar una línea.
 * El test fija esa forma, no una propia.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Transcript, readTranscript } from '../src/transcript.ts'
import { transcriptShapeOf } from '../src/observability/transcriptShape.ts'

// El formato se copia A PROPOSITO del cliente: una linea JSON por evento con
// `type`, `timestamp`, `message` y `usage`. Asi `reconciliar_store.py` y
// `model_catalog.py sesion` leen nuestros transcripts sin cambios (T-002).
const dir = () => mkdtempSync(join(tmpdir(), 'harness-'))

describe('Transcript — JSONL append-only compatible con el cliente', () => {
  test('cada evento es una linea JSON con type y timestamp ISO', () => {
    const d = dir()
    const t = new Transcript(join(d, 's.jsonl'), 'sesion-1')
    t.appendUser('hola')
    t.appendAssistant({ id: 'msg_1', model: 'claude-opus-5', content: [{ type: 'text', text: 'ok' }] },
      { input_tokens: 3, output_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 })
    const lineas = readFileSync(join(d, 's.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(lineas).toHaveLength(2)
    expect(lineas[0].type).toBe('user')
    expect(lineas[1].type).toBe('assistant')
    expect(lineas[1].message.model).toBe('claude-opus-5')
    expect(lineas[1].message.usage.input_tokens).toBe(3)
    expect(lineas[1].sessionId).toBe('sesion-1')
    expect(new Date(lineas[1].timestamp).toISOString()).toBe(lineas[1].timestamp)
  })

  test('append-only: reabrir no trunca', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendUser('uno')
    new Transcript(ruta, 's').appendUser('dos')
    expect(readFileSync(ruta, 'utf8').trim().split('\n')).toHaveLength(2)
  })

  test('readTranscript devuelve los mensajes para reanudar, en orden', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendUser('uno')
    t.appendAssistant({ id: 'm', model: 'x', content: [{ type: 'text', text: 'dos' }] })
    t.appendUser('tres')
    const msgs = readTranscript(ruta)
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(msgs[1].content).toEqual([{ type: 'text', text: 'dos' }])
  })

  test('una linea corrupta no tumba la lectura: se salta y se cuenta', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendUser('uno')
    Bun.write(ruta, `${readFileSync(ruta, 'utf8')}{no es json\n`)
    expect(readTranscript(ruta)).toHaveLength(1)
  })

  test('el usage de cada turno se puede sumar sin releer el mensaje', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendAssistant({ id: 'a', model: 'm', content: [] }, { input_tokens: 1, output_tokens: 2, cache_creation_input_tokens: 3, cache_read_input_tokens: 4 })
    t.appendAssistant({ id: 'b', model: 'm', content: [] }, { input_tokens: 5, output_tokens: 6, cache_creation_input_tokens: 7, cache_read_input_tokens: 8 })
    expect(t.totals()).toEqual({ input: 6, output: 8, cacheCreation: 10, cacheRead: 12, turns: 2 })
  })
})

/**
 * T-082 (#33) — `attachment` y `progress` son tipos de LÍNEA, no de sidecar.
 *
 * La referencia parte el universo en cinco tipos de mensaje
 * (`ccnmt: aggregates/stats.ts:971`); el harness declaraba tres. `attachment`
 * es el mayor del corpus medido —2811 de 8847 líneas—, así que sin el tipo el
 * harness no puede producirlo ni contarlo, y todo instrumento que lo necesite
 * lo lee a mano.
 */
describe('Transcript — los cinco tipos de mensaje (T-082)', () => {
  test('appendAttachment escribe type=attachment con su payload tipado', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendAttachment({ type: 'hook_additional_context', content: 'del hook' })
    const l = JSON.parse(readFileSync(ruta, 'utf8').trim())
    expect(l.type).toBe('attachment')
    expect(l.attachment).toEqual({ type: 'hook_additional_context', content: 'del hook' })
    expect(l.sessionId).toBe('s')
    expect(new Date(l.timestamp).toISOString()).toBe(l.timestamp)
  })

  test('appendProgress escribe type=progress', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendProgress('subagente 2 de 5')
    const l = JSON.parse(readFileSync(ruta, 'utf8').trim())
    expect(l.type).toBe('progress')
    expect(l.content).toBe('subagente 2 de 5')
  })

  test('transcriptShape los cuenta como MENSAJES, no como sidecar', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendUser('uno')
    t.appendAttachment({ type: 'hook_success', content: 'ok' })
    t.appendProgress('a medias')
    const forma = transcriptShapeOf(ruta)!
    expect(forma.messages).toBe(3)
    expect(forma.sidecar).toBe(0)
    expect(forma.byType).toEqual({ user: 1, attachment: 1, progress: 1 })
  })

  test('readTranscript NO devuelve el attachment como mensaje del modelo', () => {
    // El attachment es un portador de contexto del cliente, no un turno: su
    // conversion a payload es OTRO subsistema (#36), no un salto silencioso.
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendUser('uno')
    t.appendAttachment({ type: 'hook_additional_context', content: 'no soy turno' })
    t.appendProgress('tampoco')
    expect(readTranscript(ruta).map((m) => m.role)).toEqual(['user'])
  })
})

/**
 * T-083 (#34) — la frontera de compactacion y su `compactMetadata`.
 *
 * El harness compactaba sin escribir marcador: `transcriptShape` contaba 0
 * compactaciones sobre un transcript que si las tuvo. El invariante medido
 * 14 de 14 en el corpus del cliente es que el delta de
 * `cumulativeDroppedTokens` entre dos fronteras es exactamente
 * `preTokens - postTokens` — el acumulado se DERIVA, no se guarda en crudo.
 */
describe('Transcript — la frontera compact_boundary (T-083)', () => {
  test('escribe subtype compact_boundary con su compactMetadata', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendCompactBoundary({
      trigger: 'auto', preTokens: 500_000, postTokens: 20_000, durationMs: 1234,
    })
    const l = JSON.parse(readFileSync(ruta, 'utf8').trim())
    expect(l.type).toBe('system')
    expect(l.subtype).toBe('compact_boundary')
    expect(l.compactMetadata.trigger).toBe('auto')
    expect(l.compactMetadata.preTokens).toBe(500_000)
    expect(l.compactMetadata.postTokens).toBe(20_000)
    expect(l.compactMetadata.durationMs).toBe(1234)
  })

  test('cumulativeDroppedTokens acumula con delta EXACTO pre - post', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendCompactBoundary({ trigger: 'auto', preTokens: 500_000, postTokens: 20_000 })
    t.appendCompactBoundary({ trigger: 'manual', preTokens: 300_000, postTokens: 30_000 })
    const cum = readFileSync(ruta, 'utf8').trim().split('\n')
      .map((l) => JSON.parse(l).compactMetadata.cumulativeDroppedTokens)
    expect(cum).toEqual([480_000, 480_000 + 270_000])
    expect(cum[1]! - cum[0]!).toBe(300_000 - 30_000)   // el invariante, verbatim
  })

  test('al reanudar RESIEMBRA el acumulado de la ultima frontera del archivo', () => {
    // Sin resiembra el acumulado arranca en 0 en cada reanudacion y el delta
    // deja de ser derivable: el numero perderia su referente.
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendCompactBoundary({ trigger: 'auto', preTokens: 100_000, postTokens: 10_000 })
    new Transcript(ruta, 's').appendCompactBoundary({ trigger: 'auto', preTokens: 50_000, postTokens: 5_000 })
    const cum = readFileSync(ruta, 'utf8').trim().split('\n')
      .map((l) => JSON.parse(l).compactMetadata.cumulativeDroppedTokens)
    expect(cum).toEqual([90_000, 135_000])
  })

  test('transcriptShape ya cuenta la compactacion y su caida derivada', () => {
    const d = dir()
    const ruta = join(d, 's.jsonl')
    const t = new Transcript(ruta, 's')
    t.appendUser('uno')
    t.appendCompactBoundary({ trigger: 'auto', preTokens: 500_000, postTokens: 20_000 })
    const forma = transcriptShapeOf(ruta)!
    expect(forma.compactions).toBe(1)
    expect(forma.droppedTokens).toBe(480_000)
  })

  test('CONTROL — sin frontera, droppedTokens es null y NO 0', () => {
    // El control que discrimina: un 0 no distingue «no cayo nada» de «nadie
    // midio». Si este caso diera 0, el de arriba no probaria nada.
    const d = dir()
    const ruta = join(d, 's.jsonl')
    new Transcript(ruta, 's').appendUser('uno')
    const forma = transcriptShapeOf(ruta)!
    expect(forma.compactions).toBe(0)
    expect(forma.droppedTokens).toBeNull()
  })
})
