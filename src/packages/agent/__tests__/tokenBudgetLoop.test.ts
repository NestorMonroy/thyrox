/**
 * El presupuesto de continuación cableado al bucle que la CLI ejecuta.
 *
 * Fuente del requisito — `hbooks: book1/appendix-a-checklists.md §A.5`:
 *
 *   «After `max_output_tokens`, is continuation prioritized over recap?»
 *   «Do automated recoveries include counters, retry caps, and circuit
 *    breakers?»
 *
 * El mecanismo YA existe (`internal/tokenBudget.ts`, portado con su suite) y
 * `core/AgentLoop.ts:160-171` lo usa. `streamLoop` —el bucle de la CLI— no.
 * Censo de la divergencia entre los dos bucles (hecho antes de escribir esto):
 * de los 6 módulos que `core` importa y `streamLoop` no, CINCO son tipos de la
 * forma de ccnmt; el único mecanismo es éste.
 *
 * Qué compra: un modelo que para al 30 % de su presupuesto deja el trabajo a
 * medias, y el turno acaba. El `nudgeMessage` lo empuja a seguir con el texto
 * que el propio módulo fija — «Keep working — do not summarize» —, que es
 * literalmente la prioridad que A.5 pide.
 *
 * Y su freno es lo que lo hace seguro, no un añadido: `checkTokenBudget` para
 * al llegar al 90 % del presupuesto Y al detectar dos deltas cortos seguidos.
 * Es el «circuit breaker» de A.5, sin el cual empujar al modelo sería un bucle
 * que nunca termina — el otro modo de fallo que esa sección nombra: «A recovery
 * system that never stops can be as dangerous as a recovery system that never
 * starts.»
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { streamLoop } from '../loop/index.ts'
import { RecordedProvider } from '@thyrox/provider/recorded'
import type { AssistantTurn, HarnessEvent } from '../loop/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'budget-'))
/** Un turno cuyo consumo es el que el presupuesto mide. */
const turno = (texto: string, out: number): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn',
  content: [{ type: 'text', text: texto }],
  usage: { input_tokens: 10, output_tokens: out, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
})

async function correr(gen: AsyncGenerator<HarnessEvent, unknown>): Promise<HarnessEvent[]> {
  const out: HarnessEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

const base = (d: string) => ({ cwd: d, model: 'claude-opus-5', system: 's', transcriptDir: d, tools: [] })

describe('presupuesto de continuacion en streamLoop (A.5)', () => {
  test('1. SIN presupuesto la conducta no cambia: un end_turn termina', async () => {
    // Control de compatibilidad: el cableado es ADITIVO. Sin `tokenBudget`,
    // `checkTokenBudget` para siempre y el bucle hace lo de antes.
    const d = dir()
    const eventos = await correr(streamLoop({
      ...base(d), prompt: 'x',
      provider: new RecordedProvider([turno('listo', 5), turno('no deberia llegar', 5)]),
    }))
    const turnos = eventos.filter(e => e.type === 'turn_start')
    expect(turnos).toHaveLength(1)
  })

  test('2. CON presupuesto sin agotar, el bucle empuja a seguir en vez de terminar', async () => {
    const d = dir()
    const eventos = await correr(streamLoop({
      // `maxTurns: 2` acota el ejemplo: con un presupuesto de 10 000 y turnos
      // de 100, el empuje seguiria hasta el tope. Que haga falta la cota ES el
      // resultado — un presupuesto sin freno no termina, que es el modo de
      // fallo que §A.5 nombra junto al de no recuperar nunca.
      ...base(d), prompt: 'x', tokenBudget: 10_000, maxTurns: 2,
      provider: new RecordedProvider([turno('voy a medias', 100), turno('ahora si', 100)]),
    }))
    // Dos turnos: el segundo sólo ocurre si el presupuesto lo pidió.
    expect(eventos.filter(e => e.type === 'turn_start')).toHaveLength(2)
    const empuje = eventos.find(e => e.type === 'budget_continue') as { message?: string } | undefined
    expect(empuje).toBeDefined()
    expect(empuje!.message).toContain('do not summarize')
  })

  test('3. el freno existe: no empuja mas alla del tope de turnos', async () => {
    // El circuit breaker de A.5. Sin el, un presupuesto grande y un modelo
    // parco darian un bucle sin fin. `maxTurns` es la cota dura.
    const d = dir()
    const eventos = await correr(streamLoop({
      ...base(d), prompt: 'x', tokenBudget: 10_000_000, maxTurns: 3,
      provider: new RecordedProvider([turno('a', 1), turno('b', 1), turno('c', 1), turno('d', 1)]),
    }))
    expect(eventos.filter(e => e.type === 'turn_start')).toHaveLength(3)
  })

  test('4. el empuje llega al modelo como turno de usuario, no como aire', async () => {
    // Sin esto el nudge seria un evento decorativo: el modelo tiene que
    // LEERLO para que cambie algo.
    const d = dir()
    const vistos: string[] = []
    const provider = new RecordedProvider([turno('a', 100), turno('b', 100)])
    const original = provider.send.bind(provider)
    provider.send = async (req) => {
      const ultimo = req.messages[req.messages.length - 1]
      const bloques = Array.isArray(ultimo?.content) ? ultimo.content : []
      for (const b of bloques) if (b.type === 'text') vistos.push(b.text)
      return original(req)
    }
    await correr(streamLoop({ ...base(d), prompt: 'x', tokenBudget: 10_000, maxTurns: 2, provider }))
    expect(vistos.some(t => t.includes('do not summarize'))).toBe(true)
  })
})
