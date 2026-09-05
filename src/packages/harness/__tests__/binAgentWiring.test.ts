/**
 * Cableado de la herramienta `Agent` en el binario (T-058, board #58).
 *
 * Fuente: diseño nativo. `agentTool` estaba construido y probado a nivel de
 * herramienta (``subagent.test.ts``) pero **sin cablear** en ``bin/harness.ts``
 * —el comentario de ``agent.ts`` lo decía: «el registro incluirá a `Agent` en
 * cuanto se cablee»—, así que una capacidad terminada no tenía forma de
 * invocarse desde la CLI. Este e2e ejercita el spawn ENTERO a través de
 * ``main()``: el modelo grabado usa la herramienta `Agent`, el hijo corre su
 * propio bucle, y —con ``--store``— el harness escribe su fila él mismo.
 *
 * El control que discrimina (sub-patrón D): la fila del store lleva
 * ``source='harness'`` y el ``subagent_type`` REAL. Si el cableado no pasara el
 * ``storePath``, la tabla quedaría vacía y el test caería; si `Agent` no se
 * cableara, el turno del hijo nunca se consumiría y el `RecordedProvider`
 * sobraría un turno.
 */

import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../bin/harness.ts'
import type { AssistantTurn } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'bin-agent-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }

function storeConAgentSessions(d: string): string {
  const ruta = join(d, 'store.sqlite3')
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

function filas(ruta: string): Record<string, unknown>[] {
  const db = new Database(ruta, { readonly: true })
  const r = db.query('select * from agent_sessions').all() as Record<string, unknown>[]
  db.close()
  return r
}

// Una grabación de TRES turnos, en el orden en que el RecordedProvider (índice
// plano y compartido por padre e hijo) los consume:
//   0 padre: usa la herramienta Agent
//   1 hijo:  su bucle propio → texto final
//   2 padre: recibe el tool_result del hijo → texto final
function grabacionSpawn(): AssistantTurn[] {
  return [
    {
      id: 'm-padre-1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
      content: [{
        type: 'tool_use', id: 'tu-1', name: 'Agent',
        input: { prompt: 'analiza el módulo X', subagent_type: 'general-purpose', description: 'analisis de X' },
      }],
    },
    {
      id: 'm-hijo-1', model: 'claude-sonnet-5', stop_reason: 'end_turn', usage: uso,
      content: [{ type: 'text', text: 'el hijo concluyó: X está bien' }],
    },
    {
      id: 'm-padre-2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
      content: [{ type: 'text', text: 'listo, integré lo del hijo' }],
    },
  ]
}

describe('cableado de Agent en bin/harness.ts (T-058)', () => {
  test('main() con --store: el modelo lanza Agent, el hijo corre y el harness escribe su fila', async () => {
    const d = dir()
    const store = storeConAgentSessions(d)
    const rec = join(d, 'grabacion.json')
    writeFileSync(rec, JSON.stringify(grabacionSpawn()))

    const code = await main([
      '--prompt', 'arranca',
      '--provider', 'recorded', '--grabacion', rec,
      '--transcript-dir', join(d, 'transcripts'),
      '--store', store,
      '--output-style', 'quiet',
    ])
    expect(code).toBe(0)

    const rs = filas(store)
    expect(rs.length).toBe(1)
    const f = rs[0]
    // El control: source=harness y el tipo real — no habría fila sin el cableado
    // del storePath, y el tipo saldría mal si el input del tool_use no llegara.
    expect(f.source).toBe('harness')
    expect(f.subagent_type).toBe('general-purpose')
    expect(f.status).toBe('completed')
    expect(f.description).toBe('analisis de X')
    expect(f.turns).toBe(1)
    expect(f.cache_read_tokens).toBe(100)
  })

  test('main() SIN --store: el spawn corre igual, pero no se registra fila', async () => {
    const d = dir()
    const store = storeConAgentSessions(d)   // existe, pero no se pasa
    const rec = join(d, 'grabacion.json')
    writeFileSync(rec, JSON.stringify(grabacionSpawn()))

    const code = await main([
      '--prompt', 'arranca',
      '--provider', 'recorded', '--grabacion', rec,
      '--transcript-dir', join(d, 'transcripts'),
      '--output-style', 'quiet',
    ])
    expect(code).toBe(0)
    expect(filas(store).length).toBe(0)   // sin --store, la tabla queda vacía
  })
})
