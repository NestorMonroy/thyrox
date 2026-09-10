/**
 * La cadena causal del transcript: ningún `tool_use` sin su `tool_result`.
 *
 * Fuente del requisito — `hbooks: book1/appendix-a-checklists.md`, que lo pide
 * en DOS predicados y en el esqueleto del bucle:
 *
 *   §A.1 «Can interrupted tool calls be closed with synthetic results to keep
 *         execution ledger complete?»
 *   §A.3 «Can execution preserve causal chain and avoid dangling `tool_use`
 *         blocks?»
 *   §A.10.1 `if interrupted: drain_tools_with_synthetic_results(state); break`
 *
 * Por qué importa y no es formalismo: el transcript es lo que se relee al
 * reanudar, y la API rechaza un mensaje de assistant cuyos `tool_use` no
 * tengan su `tool_result` correspondiente. Una interrupción a media tanda deja
 * la sesión IRRECUPERABLE, no sólo incompleta.
 *
 * Estado medido antes de escribir esto: el mecanismo YA existe
 * (`internal/abort.ts: createSyntheticToolResults`, portado con su suite) y
 * `core/AgentLoop.ts:211-213` lo usa. Lo que NO lo usa es `streamLoop`
 * —`loop/index.ts`—, que es el bucle que la CLI ejecuta: mira
 * `signal.aborted` ANTES de la tanda (`:231`, `:325`) y no dentro del `for`
 * que ejecuta las herramientas. Es capacidad muerta en el camino vivo, el
 * defecto que `flow-selection-agile.md` describe.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { streamLoop } from '../loop/index.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import type { AssistantTurn, ContentBlock, HarnessEvent, Tool } from '../loop/types.ts'

const uso = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const dir = () => mkdtempSync(join(tmpdir(), 'cadena-'))

/** Un turno que pide DOS herramientas: la interrupción cae entre ellas. */
const dosLlamadas = (): AssistantTurn => ({
  id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
  content: [
    { type: 'tool_use', id: 'tu1', name: 'Primera', input: {} },
    { type: 'tool_use', id: 'tu2', name: 'Segunda', input: {} },
  ],
})
const cierre = (): AssistantTurn => ({
  id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
  content: [{ type: 'text', text: 'listo' }],
})

/** Lee el transcript y devuelve los ids de `tool_use` y de `tool_result`. */
function ledger(transcriptPath: string): { usos: string[]; resultados: string[] } {
  const usos: string[] = []
  const resultados: string[] = []
  for (const linea of readFileSync(transcriptPath, 'utf8').split('\n')) {
    if (!linea.trim()) continue
    const l = JSON.parse(linea) as { type?: string; message?: { content?: ContentBlock[] } }
    for (const b of l.message?.content ?? []) {
      if (b.type === 'tool_use') usos.push(b.id)
      if (b.type === 'tool_result') resultados.push(b.tool_use_id)
    }
  }
  return { usos, resultados }
}

/** Una herramienta que corre y, opcionalmente, aborta al terminar. */
function herramienta(name: string, alCorrer?: () => void): Tool {
  return {
    name, description: name, permission: 'read',
    inputSchema: { type: 'object', properties: {} },
    async run() { alCorrer?.(); return { content: `${name} ok`, isError: false } },
  } as unknown as Tool
}

async function correr(gen: AsyncGenerator<HarnessEvent, unknown>): Promise<HarnessEvent[]> {
  const out: HarnessEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

describe('cadena causal — ningun tool_use queda sin su tool_result', () => {
  test('1. CONTROL POSITIVO: sin interrupcion, cada uso tiene su resultado REAL', async () => {
    // Este caso es el que discrimina. Sin el, una implementacion que cerrara
    // TODA llamada con un resultado sintetico pasaria los otros dos.
    const d = dir()
    const eventos = await correr(streamLoop({
      cwd: d, model: 'claude-opus-5', system: 's', transcriptDir: d, prompt: 'x',
      tools: [herramienta('Primera'), herramienta('Segunda')],
      provider: new RecordedProvider([dosLlamadas(), cierre()]),
    }))
    const inicio = eventos.find(e => e.type === 'session_start') as { transcriptPath?: string } | undefined
    const tp = inicio?.transcriptPath ?? join(d, 'x')
    const { usos, resultados } = ledger(tp)
    expect(usos.sort()).toEqual(['tu1', 'tu2'])
    expect(resultados.sort()).toEqual(['tu1', 'tu2'])
    // Y son resultados REALES, no de relleno.
    expect(readFileSync(tp, 'utf8')).toContain('Primera ok')
    expect(readFileSync(tp, 'utf8')).toContain('Segunda ok')
  })

  test('2. abortado a media tanda: la segunda NO corre y aun asi cierra', async () => {
    const control = new AbortController()
    const d = dir()
    let corrioSegunda = false
    const eventos = await correr(streamLoop({
      cwd: d, model: 'claude-opus-5', system: 's', transcriptDir: d, prompt: 'x',
      signal: control.signal,
      tools: [
        herramienta('Primera', () => control.abort()),
        herramienta('Segunda', () => { corrioSegunda = true }),
      ],
      provider: new RecordedProvider([dosLlamadas(), cierre()]),
    }))
    // La interrupcion tiene que ATENDERSE: seguir la tanda es ignorarla.
    expect(corrioSegunda).toBe(false)
    const inicio = eventos.find(e => e.type === 'session_start') as { transcriptPath?: string } | undefined
    const { usos, resultados } = ledger(inicio?.transcriptPath ?? join(d, 'x'))
    // Y la cadena tiene que quedar cerrada igual: los DOS usos, los DOS
    // resultados. El de la segunda es sintetico, pero existe.
    expect(usos.sort()).toEqual(['tu1', 'tu2'])
    expect(resultados.sort()).toEqual(['tu1', 'tu2'])
  })

  test('3. el resultado sintetico se marca como error y dice por que', async () => {
    const control = new AbortController()
    const d = dir()
    const eventos = await correr(streamLoop({
      cwd: d, model: 'claude-opus-5', system: 's', transcriptDir: d, prompt: 'x',
      signal: control.signal,
      tools: [herramienta('Primera', () => control.abort()), herramienta('Segunda')],
      provider: new RecordedProvider([dosLlamadas(), cierre()]),
    }))
    const inicio = eventos.find(e => e.type === 'session_start') as { transcriptPath?: string } | undefined
    const crudo = readFileSync(inicio?.transcriptPath ?? join(d, 'x'), 'utf8')
    // Un relleno silencioso mentiria: el modelo leeria «la herramienta corrio»
    // donde no corrio. `is_error` y la razon son lo que lo impide.
    expect(crudo).toContain('interrupted')
    expect(crudo).toContain('"is_error":true')
  })
})
