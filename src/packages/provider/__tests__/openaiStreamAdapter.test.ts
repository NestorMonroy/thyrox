/**
 * `openai/streamAdapter.ts` — traduccion del stream de OpenAI a los eventos
 * de stream de Anthropic.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo (medido: cero hits de «streamAdapter» en sus dos directorios de
 * test). El contrato de estos casos es el MAPEO que la fuente documenta en su
 * cabecera, caso por caso, mas la lectura del cuerpo. Es un contrato mas debil
 * que una suite portada y se dice para que nadie lo lea como si viniera de la
 * referencia.
 */
import { describe, expect, test } from 'bun:test'
import { adaptOpenAIStreamToAnthropic } from '../src/openai/streamAdapter.js'

/** Convierte una lista de chunks en el iterable asincrono que el adaptador espera. */
async function* chunks(...items: unknown[]) {
  for (const item of items) yield item as never
}

async function recolectar(stream: AsyncIterable<unknown>, model = 'm') {
  const eventos: Array<Record<string, unknown>> = []
  for await (const e of adaptOpenAIStreamToAnthropic(stream as never, model)) {
    eventos.push(e as unknown as Record<string, unknown>)
  }
  return eventos
}

const tipos = (eventos: Array<Record<string, unknown>>) => eventos.map(e => e.type)

describe('adaptOpenAIStreamToAnthropic — message_start', () => {
  test('el primer chunk emite message_start con id, rol y modelo', async () => {
    const e = await recolectar(chunks({ choices: [{ delta: {} }] }), 'gpt-4o')
    expect(e[0]?.type).toBe('message_start')
    const msg = e[0]?.message as Record<string, unknown>
    expect(String(msg.id)).toMatch(/^msg_[0-9a-f]{24}$/)
    expect(msg.role).toBe('assistant')
    expect(msg.model).toBe('gpt-4o')
    expect(msg.content).toEqual([])
    expect(msg.stop_reason).toBeNull()
  })

  test('solo se emite UN message_start aunque lleguen varios chunks', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {} }] }, { choices: [{ delta: {} }] }),
    )
    expect(tipos(e).filter(t => t === 'message_start')).toHaveLength(1)
  })

  test('prompt_tokens del primer chunk entra como input_tokens', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {} }], usage: { prompt_tokens: 42 } }),
    )
    const usage = (e[0]?.message as { usage: Record<string, number> }).usage
    expect(usage.input_tokens).toBe(42)
  })

  test('prompt_tokens_details.cached_tokens entra como cache_read_input_tokens', async () => {
    const e = await recolectar(
      chunks({
        choices: [{ delta: {} }],
        usage: { prompt_tokens: 10, prompt_tokens_details: { cached_tokens: 7 } },
      }),
    )
    const usage = (e[0]?.message as { usage: Record<string, number> }).usage
    expect(usage.cache_read_input_tokens).toBe(7)
    expect(usage.cache_creation_input_tokens).toBe(0)
  })
})

describe('adaptOpenAIStreamToAnthropic — bloque de texto', () => {
  test('delta.content abre el bloque de texto y emite text_delta', async () => {
    const e = await recolectar(chunks({ choices: [{ delta: { content: 'hola' } }] }))
    // El cierre final lo pone la red de seguridad: este stream acaba sin
    // finish_reason, asi que el bloque abierto se cierra al agotarse.
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
    ])
    expect((e[1]?.content_block as { type: string }).type).toBe('text')
    expect(e[2]?.delta).toEqual({ type: 'text_delta', text: 'hola' })
  })

  test('varios deltas de texto abren el bloque UNA sola vez', async () => {
    const e = await recolectar(
      chunks(
        { choices: [{ delta: { content: 'a' } }] },
        { choices: [{ delta: { content: 'b' } }] },
      ),
    )
    expect(tipos(e).filter(t => t === 'content_block_start')).toHaveLength(1)
    expect(tipos(e).filter(t => t === 'content_block_delta')).toHaveLength(2)
  })

  test('un content de cadena vacia no abre bloque', async () => {
    const e = await recolectar(chunks({ choices: [{ delta: { content: '' } }] }))
    expect(tipos(e)).toEqual(['message_start'])
  })
})

describe('adaptOpenAIStreamToAnthropic — bloque de pensamiento', () => {
  test('reasoning_content abre un bloque thinking y emite thinking_delta', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: { reasoning_content: 'pienso' } }] }),
    )
    expect((e[1]?.content_block as Record<string, unknown>)).toEqual({
      type: 'thinking',
      thinking: '',
      signature: '',
    })
    expect(e[2]?.delta).toEqual({ type: 'thinking_delta', thinking: 'pienso' })
  })

  test('un reasoning_content vacio no abre bloque', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: { reasoning_content: '' } }] }),
    )
    expect(tipos(e)).toEqual(['message_start'])
  })

  test('el texto CIERRA el bloque de pensamiento antes de abrir el suyo', async () => {
    const e = await recolectar(
      chunks(
        { choices: [{ delta: { reasoning_content: 'p' } }] },
        { choices: [{ delta: { content: 't' } }] },
      ),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
    ])
    expect((e[4]?.content_block as { type: string }).type).toBe('text')
  })
})

describe('adaptOpenAIStreamToAnthropic — llamadas a herramienta', () => {
  test('tool_calls abre un bloque tool_use con su id y su nombre', async () => {
    const e = await recolectar(
      chunks({
        choices: [
          { delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'Bash' } }] } },
        ],
      }),
    )
    expect(e[1]?.content_block).toEqual({
      type: 'tool_use',
      id: 'call_1',
      name: 'Bash',
      input: {},
    })
  })

  test('sin id, se genera uno con prefijo toolu_', async () => {
    const e = await recolectar(
      chunks({
        choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'X' } }] } }],
      }),
    )
    const bloque = e[1]?.content_block as { id: string }
    expect(bloque.id).toMatch(/^toolu_[0-9a-f]{24}$/)
  })

  test('los fragmentos de argumento salen como input_json_delta', async () => {
    const e = await recolectar(
      chunks(
        { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c', function: { name: 'X', arguments: '{"a' } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '":1}' } }] } }] },
      ),
    )
    const deltas = e.filter(x => x.type === 'content_block_delta')
    expect(deltas.map(d => (d.delta as { partial_json: string }).partial_json)).toEqual([
      '{"a',
      '":1}',
    ])
  })

  test('una herramienta CIERRA el bloque de texto abierto antes de abrir el suyo', async () => {
    const e = await recolectar(
      chunks(
        { choices: [{ delta: { content: 't' } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c', function: { name: 'X' } }] } }] },
      ),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_stop',
    ])
  })
})

describe('adaptOpenAIStreamToAnthropic — el cierre', () => {
  test('finish_reason stop da end_turn, message_delta y message_stop', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
    )
    expect(tipos(e)).toEqual(['message_start', 'message_delta', 'message_stop'])
    expect(e[1]?.delta).toEqual({ stop_reason: 'end_turn', stop_sequence: null })
  })

  test('finish_reason length da max_tokens', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {}, finish_reason: 'length' }] }),
    )
    expect((e[1]?.delta as { stop_reason: string }).stop_reason).toBe('max_tokens')
  })

  test('finish_reason content_filter da end_turn', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {}, finish_reason: 'content_filter' }] }),
    )
    expect((e[1]?.delta as { stop_reason: string }).stop_reason).toBe('end_turn')
  })

  test('un finish_reason desconocido cae a end_turn', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: {}, finish_reason: 'algo_raro' }] }),
    )
    expect((e[1]?.delta as { stop_reason: string }).stop_reason).toBe('end_turn')
  })

  test('con herramientas, un finish_reason stop se FUERZA a tool_use', async () => {
    // El backend a veces devuelve «stop» aunque haya tool_calls. Si el
    // stop_reason no dijera tool_use, el bucle no ejecutaria las herramientas.
    const e = await recolectar(
      chunks({
        choices: [
          {
            delta: { tool_calls: [{ index: 0, id: 'c', function: { name: 'X' } }] },
            finish_reason: 'stop',
          },
        ],
      }),
    )
    const delta = e.find(x => x.type === 'message_delta')
    expect((delta?.delta as { stop_reason: string }).stop_reason).toBe('tool_use')
  })

  test('el cierre cierra el bloque de texto que siguiera abierto', async () => {
    const e = await recolectar(
      chunks({ choices: [{ delta: { content: 't' }, finish_reason: 'stop' }] }),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
  })

  test('completion_tokens sale como output_tokens en el message_delta', async () => {
    const e = await recolectar(
      chunks({
        choices: [{ delta: {}, finish_reason: 'stop' }],
        usage: { completion_tokens: 13 },
      }),
    )
    expect(e[1]?.usage).toEqual({ output_tokens: 13 })
  })

  test('un stream que acaba SIN finish_reason cierra los bloques abiertos', async () => {
    // La red de seguridad: sin ella el consumidor recibe un bloque que nunca
    // cierra.
    const e = await recolectar(chunks({ choices: [{ delta: { content: 't' } }] }))
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
    ])
  })
})
