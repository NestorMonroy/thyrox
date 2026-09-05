/**
 * La forma de un transcript, y su registro en el store.
 *
 * Análisis que la origina: `analisis-forma-del-transcript-y-su-registro.rst`.
 * Los valores de los casos salen del corpus medido —el JSONL de esta sesión—
 * o de la referencia (`ccnmt: packages/local-observability/src/aggregates/`),
 * no de imaginar formas.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TRANSCRIPT_MESSAGE_TYPES, transcriptShape, transcriptShapeOf,
} from '../src/observability/transcriptShape.ts'
import { recordHarnessSession } from '../src/observability/store.ts'
import { USAGE_CERO } from '../src/types.ts'

const temporales: string[] = []
afterEach(() => { for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true }) })

function storeVacio(): string {
  const dir = mkdtempSync(join(tmpdir(), 'forma-'))
  temporales.push(dir)
  const ruta = join(dir, 'store.sqlite3')
  const db = new Database(ruta)
  db.run(`CREATE TABLE agent_sessions (
    agent_id TEXT PRIMARY KEY, subagent_type TEXT NOT NULL, session_id TEXT NOT NULL,
    status TEXT NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    model TEXT, description TEXT, turns INTEGER, input_tokens INTEGER,
    cache_creation_tokens INTEGER, cache_read_tokens INTEGER, output_tokens INTEGER,
    equiv_cost INTEGER, retention_level INTEGER, usage_source TEXT, source TEXT,
    metadata_json TEXT, compactions INTEGER, dropped_tokens INTEGER)`)
  db.close()
  return ruta
}

describe('la partición: mensaje de transcript contra registro lateral', () => {
  test('los cinco tipos de mensaje son los que la referencia enumera', () => {
    // `const TRANSCRIPT_MESSAGE_TYPES = new Set(['user','assistant',
    //  'attachment','system','progress'])` — `aggregates/stats.ts:971-977`.
    expect([...TRANSCRIPT_MESSAGE_TYPES].sort())
      .toEqual(['assistant', 'attachment', 'progress', 'system', 'user'])
  })

  test('los dos conteos van SEPARADOS — juntarlos infla el total', () => {
    // Medido en el corpus: 7279 mensajes y 1568 laterales sobre 8847 líneas.
    // Publicar 8847 «mensajes» sería un 21 % de inflación (sub-patrón A).
    const f = transcriptShape([
      { type: 'user' }, { type: 'assistant' }, { type: 'attachment' },
      { type: 'mode' }, { type: 'atis-latch' },
    ] as never)
    expect(f.messages).toBe(3)
    expect(f.sidecar).toBe(2)
    expect(f.total).toBe(5)
  })

  test('el histograma conserva TODOS los tipos, medidos o no', () => {
    // El conjunto no está cerrado: si el instrumento sólo contara los cinco
    // conocidos, un tipo nuevo desaparecería sin que nadie lo notara — el
    // silencio del instrumento leído como ausencia del fenómeno.
    const f = transcriptShape([{ type: 'user' }, { type: 'tipo-que-no-existia' }] as never)
    expect(f.byType['tipo-que-no-existia']).toBe(1)
    expect(f.sidecar).toBe(1)
  })
})

describe('compactMetadata — la telemetría de las fronteras', () => {
  const frontera = (pre: number, post: number, cum: number, ms: number) => ({
    type: 'system', subtype: 'compact_boundary',
    compactMetadata: {
      trigger: 'auto', preTokens: pre, postTokens: post,
      cumulativeDroppedTokens: cum, durationMs: ms,
    },
  })

  test('cuenta las fronteras y suma la caída de contexto', () => {
    // Valores del corpus: dos fronteras consecutivas reales.
    const f = transcriptShape([
      frontera(777_395, 15_804, 357_982_102, 323_286),
      frontera(785_313, 15_395, 358_752_020, 124_834),
    ] as never)
    expect(f.compactions).toBe(2)
    expect(f.droppedTokens).toBe(761_591 + 769_918)
  })

  test('la caída se DERIVA de pre−post, no se lee del acumulado', () => {
    // Invariante medido 14 de 14 en el corpus: el delta de
    // `cumulativeDroppedTokens` es exactamente `preTokens - postTokens`.
    // Guardar el acumulado en crudo sería guardar un número sin referente:
    // arranca en 357 982 102, muy por encima de lo que la sesión gastó.
    const f = transcriptShape([frontera(787_053, 16_743, 361_060_794, 183_159)] as never)
    expect(f.droppedTokens).toBe(770_310)
    expect(f.droppedTokens).toBeLessThan(361_060_794)
  })

  test('una frontera sin metadata cuenta como frontera y NO como caída', () => {
    // Contarla como 0 tokens caídos mezclaría «no cayó nada» con «no se midió».
    const f = transcriptShape([{ type: 'system', subtype: 'compact_boundary' }] as never)
    expect(f.compactions).toBe(1)
    expect(f.droppedTokens).toBeNull()
  })

  test('sin ninguna frontera, la caída es null y no cero', () => {
    const f = transcriptShape([{ type: 'user' }] as never)
    expect(f.compactions).toBe(0)
    expect(f.droppedTokens).toBeNull()
  })
})

describe('el registro en el store', () => {
  const base = {
    sessionId: 's1', model: 'claude-opus-5', turns: 3,
    usage: { ...USAGE_CERO }, status: 'completed' as const,
    startedAt: '2026-09-02T19:00:00.000Z',
  }

  test('la forma viaja en `metadata_json`, no en columnas por tipo', () => {
    // El conjunto de tipos no está cerrado: una columna por tipo congelaría
    // un universo que la propia medición declara abierto.
    const ruta = storeVacio()
    recordHarnessSession(ruta, {
      ...base,
      shape: transcriptShape([{ type: 'user' }, { type: 'attachment' }, { type: 'mode' }] as never),
    })
    const db = new Database(ruta)
    const fila = db.query('select metadata_json, compactions, dropped_tokens from agent_sessions').get() as
      { metadata_json: string; compactions: number | null; dropped_tokens: number | null }
    db.close()
    const m = JSON.parse(fila.metadata_json)
    expect(m.transcriptShape.byType.attachment).toBe(1)
    expect(m.transcriptShape.messages).toBe(2)
    expect(m.transcriptShape.sidecar).toBe(1)
  })

  test('las dos columnas ya declaradas se pueblan — están y estaban vacías', () => {
    // `compactions` y `dropped_tokens` existen en el esquema y en el corpus
    // sólo 3 de 842 filas las tienen. Esta es la vía por la que se llenan.
    const ruta = storeVacio()
    recordHarnessSession(ruta, {
      ...base,
      shape: transcriptShape([
        { type: 'system', subtype: 'compact_boundary',
          compactMetadata: { preTokens: 800_000, postTokens: 20_000 } },
      ] as never),
    })
    const db = new Database(ruta)
    const fila = db.query('select compactions, dropped_tokens from agent_sessions').get() as
      { compactions: number; dropped_tokens: number }
    db.close()
    expect(fila.compactions).toBe(1)
    expect(fila.dropped_tokens).toBe(780_000)
  })

  test('sin forma, metadata lleva el pid pero las columnas de token quedan NULL', () => {
    // CONTROL: `NULL` significa «nadie midió», y es distinto de 0. Escribir 0
    // repartiría el gasto entre filas que no aportaron dato — el defecto que
    // `calibration-verified-numbers.md` registra para los agregados del store.
    const ruta = storeVacio()
    recordHarnessSession(ruta, base)
    const db = new Database(ruta)
    const fila = db.query('select metadata_json, compactions, dropped_tokens from agent_sessions').get() as
      { metadata_json: string | null; compactions: number | null; dropped_tokens: number | null }
    db.close()
    // `metadata_json` ya NO es NULL: desde T-094 toda fila lleva el `pid` del
    // proceso dueño, que es lo que `reconcileStaleRunningRows` lee. Lo que SÍ
    // queda ausente sin forma es `transcriptShape`, y las dos columnas.
    const m = JSON.parse(fila.metadata_json!)
    expect(typeof m.pid).toBe('number')
    expect(m.transcriptShape).toBeUndefined()
    expect(fila.compactions).toBeNull()
    expect(fila.dropped_tokens).toBeNull()
  })

  test('reescribir la misma sesión ACTUALIZA la forma, no duplica la fila', () => {
    const ruta = storeVacio()
    recordHarnessSession(ruta, { ...base, status: 'running' })
    recordHarnessSession(ruta, {
      ...base, shape: transcriptShape([{ type: 'user' }, { type: 'user' }] as never),
    })
    const db = new Database(ruta)
    const n = db.query('select count(*) as n from agent_sessions').get() as { n: number }
    const fila = db.query('select metadata_json from agent_sessions').get() as { metadata_json: string }
    db.close()
    expect(n.n).toBe(1)
    expect(JSON.parse(fila.metadata_json).transcriptShape.byType.user).toBe(2)
  })

  test('la forma se consulta con `json_extract`, que es lo que la hace útil', () => {
    // Sin esto, `metadata_json` sería un blob que nadie puede agregar y la
    // decisión de no crear columnas no se sostendría.
    const ruta = storeVacio()
    recordHarnessSession(ruta, {
      ...base, shape: transcriptShape([{ type: 'attachment' }, { type: 'attachment' }] as never),
    })
    const db = new Database(ruta)
    const r = db.query(
      "select json_extract(metadata_json,'$.transcriptShape.byType.attachment') as n from agent_sessions",
    ).get() as { n: number }
    db.close()
    expect(r.n).toBe(2)
  })
})

describe('leer la forma de un JSONL en disco', () => {
  test('un archivo ausente da null, no una forma vacía', () => {
    // Una forma con todo en cero afirmaría que el transcript existe y no tiene
    // nada; `null` dice que no se pudo medir. Son cosas distintas.
    expect(transcriptShapeOf(join(tmpdir(), 'no-existe-jamas.jsonl'))).toBeNull()
  })

  test('la última línea a medio escribir se CUENTA, no se salta', () => {
    // Un archivo vivo la tiene siempre. Saltarla en silencio haría que el
    // total no cuadre con `wc -l` y nadie sabría por qué.
    const dir = mkdtempSync(join(tmpdir(), 'jsonl-')); temporales.push(dir)
    const ruta = join(dir, 't.jsonl')
    writeFileSync(ruta, '{"type":"user"}\n{"type":"assist')
    const f = transcriptShapeOf(ruta)!
    expect(f.total).toBe(2)
    expect(f.byType['no-parseable']).toBe(1)
  })
})
