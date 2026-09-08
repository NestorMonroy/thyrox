/**
 * A.4 del apéndice — gobierno de contexto: qué pasa cuando compactar FALLA, y
 * qué se restaura cuando compactar SALE BIEN.
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.4, dos de sus seis
 * predicados verbatim:
 *
 *   «After compact, are work semantics restored (plans, skills, key files,
 *    tool state)?»
 *   «Is there recovery strategy when compact itself fails?»
 *
 * MITAD ROJA. Las cinco aserciones se escriben ANTES de tocar el bucle y
 * fallan contra el árbol de hoy, por dos defectos medidos:
 *
 *  1. `comprimirAuto` llama a `opts.context.summarize` SIN try/catch
 *     (`loop/index.ts:654`). El resumen lo escribe un modelo, así que su
 *     fallo es el modo de fallo ESPERADO de la compactación automática, no
 *     una rareza — y hoy la excepción sube y mata el bucle. Peor: cuando eso
 *     ocurre el contexto ya está en `compact`, así que el turno siguiente
 *     habría dado `blocked` de todas formas. Un fallo con dos salidas malas
 *     y ninguna declarada.
 *  2. Tras una compactación automática el pasado se sustituye por el resumen
 *     y NADA se vuelve a poner: el tablero de tareas queda detrás de la
 *     frontera y su reinyección sigue esperando el gate de 10+10 turnos
 *     (`loop/index.ts:290-299`). El plan vuelve «al archivo» justo cuando
 *     acaba de salir «del plan».
 *
 * QUÉ SE IMPLEMENTA, y por qué esta forma y no otra. La recuperación NO
 * inventa un camino: degrada al mecanismo MENOS destructivo que ya existe.
 * Es la escalera que el propio apéndice pide en A.5.2 —«recovery paths
 * layered from low-destructiveness to high-destructiveness»— recorrida al
 * revés: si el camino que necesita un modelo falla, queda el mecánico.
 *
 *   summarize lanza
 *     → se dice, con la causa                      (`compaction_failed`)
 *     → se degrada a microcompactación             (sin modelo, en sitio)
 *     → si no libera nada, el bucle PARA declarando (`compaction_failed`)
 *
 * Descartadas dos alternativas, y por qué:
 *
 *   - **Compactar igual con un marcador en el hueco del resumen.** Tira
 *     historial de verdad para sustituirlo por una nota que dice que no hay
 *     nota. La microcompactación tira menos y dice lo mismo.
 *   - **No hacer nada y dejar que el turno siguiente dé `blocked`.** Es la
 *     conducta de hoy sin la excepción: preserva todo y no recupera nada.
 *     Un `blocked` es una parada correcta, no una recuperación.
 *
 * CONTROLES DE ANULACIÓN, medidos tras implementar:
 *
 * - Se retira el `try/catch` del resumen (`comprimirAuto`): caen **3 de 5**,
 *   los tres de A.4.6. Los casos 4 y 5 sobreviven y deben — no dependen de
 *   él: miden la restauración, que ocurre cuando compactar SALE BIEN.
 * - Se retira `restaurarTrasCompactar` del gate del recordatorio: cae **1 de
 *   5**, sólo el caso 4. El 5 sobrevive, y ésa es la conducta correcta: mide
 *   la AUSENCIA de inyección sin compactación, y quitar la restauración no
 *   la hace aparecer. Un caso que cayera ahí estaría midiendo el gate de
 *   10+10 en vez de la restauración.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoop, streamLoop } from '../loop/index.ts'
import { Transcript } from '../loop/transcript.ts'
import { TASK_REMINDER_TEXT } from '../loop/context/attachments.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import { CORE_TOOLS } from '@thyrox/tools/registry'
import { taskTools } from '@thyrox/tools/tasks'
import type { AssistantTurn, HarnessEvent, Message, ProviderRequest } from '../loop/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'gobierno-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn',
  content: [{ type: 'text', text: t }], usage: uso,
})
const pide = (i: number): AssistantTurn => ({
  id: `m${i}`, model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
  content: [{ type: 'tool_use', id: `tu${i}`, name: 'Bash', input: { command: 'echo sigue' } }],
})
const base = (d: string) => ({
  cwd: d, model: 'claude-opus-5', system: 'eres un harness', tools: CORE_TOOLS, transcriptDir: d,
})
const relleno = (tokens: number): Message => ({
  role: 'user', content: [{ type: 'text', text: 'x'.repeat(tokens * 4) }],
})
/** Un par tool_use/tool_result que la microcompactación SÍ puede purgar. */
const par = (id: string, tokens: number): Message[] => ([
  { role: 'assistant', content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: '/x' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'y'.repeat(tokens * 4) }] },
])

/** Siembra historial por el camino real: un transcript que se reanuda. */
function sembrar(d: string, mensajes: Message[]): string {
  const id = `s-${Math.random().toString(36).slice(2)}`
  const tr = new Transcript(join(d, `${id}.jsonl`), id)
  for (const m of mensajes) {
    if (m.role === 'user') tr.appendUser(m.content)
    else tr.appendAssistant({ id: `m-${id}`, model: 'claude-opus-5', content: m.content })
  }
  return id
}

const recoger = async (gen: AsyncGenerator<HarnessEvent>): Promise<HarnessEvent[]> => {
  const out: HarnessEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

/** ¿Trae esta petición el `<system-reminder>` del tablero? */
const traeTablero = (r: ProviderRequest): boolean =>
  r.messages.some((m) => (Array.isArray(m.content) ? m.content : []).some(
    (b) => (b as { type?: string; text?: string }).type === 'text'
      && ((b as { text?: string }).text ?? '').includes(TASK_REMINDER_TEXT)))

afterEach(() => {
  delete process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
})

describe('A.4.6 — hay recuperación cuando la compactación misma falla', () => {
  test('1. el resumen lanza y el bucle NO muere: lo dice con su causa', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    const p = new RecordedProvider([pide(1), texto('fin')])
    const eventos = await recoger(streamLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000), ...par('t1', 6_000)]),
      context: {
        summarize: async () => { throw new Error('el modelo del resumen no respondió') },
        keepMessages: 1, keepToolResults: 0, minFreedTokens: 0,
      },
      maxTurns: 4,
    }))
    const fallo = eventos.find((e) => e.type === 'compaction_failed')
    expect(fallo).toBeDefined()
    // La causa va verbatim: quien audita tiene que poder distinguir un modelo
    // caído de un resumen vacío sin volver a reproducirlo.
    expect(fallo!.type === 'compaction_failed' && fallo!.reason)
      .toContain('el modelo del resumen no respondió')
  })

  test('2. y degrada al mecanismo que NO necesita modelo, saltándose el piso', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    const p = new RecordedProvider([pide(1), texto('fin')])
    const eventos = await recoger(streamLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000), ...par('t1', 6_000)]),
      context: {
        summarize: async () => { throw new Error('caído') },
        keepMessages: 1, keepToolResults: 0, persistCleared: false,
        // Un piso inalcanzable: la microcompactación NORMAL de este turno
        // queda vetada por él. Así lo único que puede purgar es el rescate,
        // y el caso mide su conducta distintiva —ignorar el piso— en vez de
        // una purga que habría ocurrido igual.
        minFreedTokens: 1_000_000,
      },
      maxTurns: 4,
    }))
    const micro = eventos.filter((e) => e.type === 'compaction' && e.kind === 'micro')
    // Hay purga, y TODAS vienen del fallo. La segunda mitad es la que
    // discrimina: con el piso vetando la vía normal, una purga con trigger
    // `context_hint` significaría que el piso no se aplicó, y entonces el
    // caso no mediría el rescate sino una purga que habría ocurrido igual.
    //
    // El conteo es 2 y no 1 —medido, no previsto—: el turno 1 purga el par
    // sembrado y el turno 2 purga el resultado del Bash que el propio turno 1
    // produjo. Fijar el número congelaría un detalle del recorrido; lo que la
    // conducta afirma es el ORIGEN de cada purga, no cuántas hubo.
    expect(micro.length).toBeGreaterThanOrEqual(1)
    expect(micro.every((e) => e.type === 'compaction' && e.trigger === 'compact_failed')).toBe(true)
  })

  test('3. si no queda nada que liberar, PARA declarando — no lanza', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    const p = new RecordedProvider([pide(1), pide(2), texto('fin')])
    // Sin un solo par purgable: la escalera se queda sin peldaños.
    const r = await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      context: {
        summarize: async () => { throw new Error('caído') },
        keepMessages: 1,
      },
      maxTurns: 4,
    })
    expect(r.stop).toBe('compaction_failed')
  })
})

describe('A.4.5 — tras compactar, la semántica de trabajo vuelve a la vista', () => {
  test('4. el tablero se reinyecta en el turno siguiente, sin esperar 10+10', async () => {
    const d = dir()
    const db = join(d, 'tablero.sqlite3')
    const ctx = { cwd: d, sessionId: 'ses-1', abort: new AbortController().signal, messages: [] }
    const crear = taskTools(db).find((t) => t.name === 'TaskCreate')!
    await crear.run({ subject: 'la tarea que no se puede perder' }, ctx)

    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    const p = new RecordedProvider([pide(1), texto('fin')])
    await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      // Un resumen que SÍ reduce: se mide la restauración, no el guard.
      context: { summarize: async () => 'el resumen', keepMessages: 1 },
      taskReminder: { dbPath: db, sessionId: 'ses-1' },
      maxTurns: 4,
    })
    // La compactación cae en el turno 1; la petición del turno 2 tiene que
    // traer el tablero. Con el gate de 10+10 intacto, la primera ocasión
    // sería la petición 11 — que este recorrido nunca alcanza.
    expect(p.requests.length).toBeGreaterThanOrEqual(2)
    expect(traeTablero(p.requests[1])).toBe(true)
  })

  test('5. el control: sin compactación, el turno 2 NO lo trae', async () => {
    const d = dir()
    const db = join(d, 'tablero.sqlite3')
    const ctx = { cwd: d, sessionId: 'ses-2', abort: new AbortController().signal, messages: [] }
    const crear = taskTools(db).find((t) => t.name === 'TaskCreate')!
    await crear.run({ subject: 'la misma tarea, sin presión' }, ctx)

    // Sin override, el umbral queda en 967 000: no hay compactación que
    // restaurar. Si el caso 4 pasara también aquí, mediría la inyección
    // periódica y no la restauración.
    const p = new RecordedProvider([pide(1), texto('fin')])
    await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      context: { summarize: async () => 'el resumen', keepMessages: 1 },
      taskReminder: { dbPath: db, sessionId: 'ses-2' },
      maxTurns: 4,
    })
    expect(p.requests.length).toBeGreaterThanOrEqual(2)
    expect(traeTablero(p.requests[1])).toBe(false)
  })
})
