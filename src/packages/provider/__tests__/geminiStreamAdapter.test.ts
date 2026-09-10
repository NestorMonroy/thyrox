/**
 * `gemini/streamAdapter.ts` — traduccion del stream de Gemini a los eventos de
 * Anthropic.
 *
 * PROCEDENCIA DEL CONTRATO, declarada: la fuente NO tiene suite para este
 * modulo. El contrato es la lectura del fuente.
 *
 * Lo que estos casos fijan y no es evidente: Gemini manda cada llamada a
 * funcion ENTERA en una parte —no en fragmentos— y su pensamiento es texto
 * marcado, no un campo aparte. Las dos cosas hacen que la forma de los eventos
 * que salen no se parezca a la del adaptador de OpenAI aunque el destino sea
 * el mismo.
 *
 * NOTA DE PROCESO: esta suite se escribio DESPUES del modulo. No hubo mitad
 * roja persistida. Los controles que si se hicieron son dos anulaciones, cada
 * una **1 de 27**: dejar de sumar los tokens de pensamiento a la salida, y
 * retirar la tercera rama de la firma —la que la emite sobre el bloque abierto
 * cuando la parte no es ni texto ni llamada.
 */
import { describe, expect, test } from 'bun:test'
import { adaptGeminiStreamToAnthropic } from '../src/gemini/streamAdapter.js'

async function* chunks(...items: unknown[]) {
  for (const item of items) yield item as never
}

async function recolectar(stream: AsyncIterable<unknown>, model = 'gemini-pro') {
  const eventos: Array<Record<string, unknown>> = []
  for await (const e of adaptGeminiStreamToAnthropic(stream as never, model)) {
    eventos.push(e as unknown as Record<string, unknown>)
  }
  return eventos
}

const tipos = (e: Array<Record<string, unknown>>) => e.map(x => x.type)

/** Un chunk con las partes dadas en su primer candidato. */
function conPartes(parts: unknown[], extra: Record<string, unknown> = {}) {
  return { candidates: [{ content: { parts }, ...extra }] }
}

describe('adaptGeminiStreamToAnthropic — message_start', () => {
  test('el primer chunk emite message_start con id, rol y modelo', async () => {
    const e = await recolectar(chunks(conPartes([])), 'gemini-2.0')
    expect(e[0]?.type).toBe('message_start')
    const msg = e[0]?.message as Record<string, unknown>
    expect(String(msg.id)).toMatch(/^msg_[0-9a-f]{24}$/)
    expect(msg.role).toBe('assistant')
    expect(msg.model).toBe('gemini-2.0')
  })

  test('promptTokenCount entra como input_tokens', async () => {
    const e = await recolectar(
      chunks({ ...conPartes([]), usageMetadata: { promptTokenCount: 11 } }),
    )
    const usage = (e[0]?.message as { usage: Record<string, number> }).usage
    expect(usage.input_tokens).toBe(11)
  })

  test('un stream SIN chunks no emite nada, ni siquiera el cierre', async () => {
    // Sin message_start no hay mensaje que cerrar.
    expect(await recolectar(chunks())).toEqual([])
  })
})

describe('adaptGeminiStreamToAnthropic — texto y pensamiento', () => {
  test('una parte de texto abre bloque text y emite text_delta', async () => {
    const e = await recolectar(chunks(conPartes([{ text: 'hola' }])))
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
    expect((e[1]?.content_block as { type: string }).type).toBe('text')
    expect(e[2]?.delta).toEqual({ type: 'text_delta', text: 'hola' })
  })

  test('una parte con thought abre bloque thinking', async () => {
    const e = await recolectar(chunks(conPartes([{ text: 'pienso', thought: true }])))
    expect((e[1]?.content_block as Record<string, unknown>)).toEqual({
      type: 'thinking',
      thinking: '',
      signature: '',
    })
    expect(e[2]?.delta).toEqual({ type: 'thinking_delta', thinking: 'pienso' })
  })

  test('dos textos seguidos comparten UN bloque', async () => {
    const e = await recolectar(chunks(conPartes([{ text: 'a' }, { text: 'b' }])))
    expect(tipos(e).filter(t => t === 'content_block_start')).toHaveLength(1)
    expect(tipos(e).filter(t => t === 'content_block_delta')).toHaveLength(2)
  })

  test('cambiar de pensamiento a texto CIERRA el bloque y abre otro', async () => {
    const e = await recolectar(
      chunks(conPartes([{ text: 'p', thought: true }, { text: 't' }])),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
    expect((e[4]?.content_block as { type: string }).type).toBe('text')
  })

  test('el bloque sobrevive entre chunks distintos', async () => {
    const e = await recolectar(
      chunks(conPartes([{ text: 'a' }]), conPartes([{ text: 'b' }])),
    )
    expect(tipos(e).filter(t => t === 'content_block_start')).toHaveLength(1)
  })

  test('una parte de texto VACIO abre el bloque pero no emite delta', async () => {
    // El tipo se decide por `typeof part.text === 'string'`, y el delta por la
    // veracidad del texto: son dos guards distintos.
    const e = await recolectar(chunks(conPartes([{ text: '' }])))
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
  })

  test('una parte sin texto de cadena no abre bloque', async () => {
    const e = await recolectar(chunks(conPartes([{ thought: true }])))
    expect(tipos(e)).toEqual(['message_start', 'message_delta', 'message_stop'])
  })
})

describe('adaptGeminiStreamToAnthropic — llamadas a funcion', () => {
  test('una llamada abre, rellena y CIERRA su bloque en la misma parte', async () => {
    // Gemini manda la llamada entera; no hay fragmentos que acumular.
    const e = await recolectar(
      chunks(conPartes([{ functionCall: { name: 'Bash', args: { c: 'ls' } } }])),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
    expect(e[1]?.content_block).toMatchObject({
      type: 'tool_use',
      name: 'Bash',
      input: {},
    })
    expect(e[2]?.delta).toEqual({
      type: 'input_json_delta',
      partial_json: '{"c":"ls"}',
    })
  })

  test('el id de la llamada se ACUNA: Gemini no da ninguno', async () => {
    const e = await recolectar(chunks(conPartes([{ functionCall: { name: 'X' } }])))
    expect((e[1]?.content_block as { id: string }).id).toMatch(/^toolu_[0-9a-f]{24}$/)
  })

  test('unos argumentos vacios NO emiten delta', async () => {
    const e = await recolectar(
      chunks(conPartes([{ functionCall: { name: 'X', args: {} } }])),
    )
    expect(tipos(e).filter(t => t === 'content_block_delta')).toHaveLength(0)
  })

  test('sin nombre, el nombre queda en cadena vacia', async () => {
    const e = await recolectar(chunks(conPartes([{ functionCall: {} }])))
    expect((e[1]?.content_block as { name: string }).name).toBe('')
  })

  test('una llamada CIERRA el bloque de texto abierto', async () => {
    const e = await recolectar(
      chunks(conPartes([{ text: 't' }, { functionCall: { name: 'X' } }])),
    )
    expect(tipos(e)).toEqual([
      'message_start',
      'content_block_start',
      'content_block_delta',
      'content_block_stop',
      'content_block_start',
      'content_block_stop',
      'message_delta',
      'message_stop',
    ])
  })
})

describe('adaptGeminiStreamToAnthropic — la firma de pensamiento', () => {
  test('sobre una parte de texto sale como signature_delta', async () => {
    const e = await recolectar(
      chunks(conPartes([{ text: 't', thoughtSignature: 'firma' }])),
    )
    expect(e[3]?.delta).toEqual({ type: 'signature_delta', signature: 'firma' })
  })

  test('sobre una llamada sale ANTES de sus argumentos', async () => {
    const e = await recolectar(
      chunks(
        conPartes([
          { functionCall: { name: 'X', args: { a: 1 } }, thoughtSignature: 'firma' },
        ]),
      ),
    )
    const deltas = e.filter(x => x.type === 'content_block_delta')
    expect((deltas[0]?.delta as { type: string }).type).toBe('signature_delta')
    expect((deltas[1]?.delta as { type: string }).type).toBe('input_json_delta')
  })

  test('sobre una parte que NO es texto ni llamada sale en el bloque abierto', async () => {
    // La tercera rama del bucle. Sin ella la firma se perderia.
    const e = await recolectar(
      chunks(conPartes([{ text: 't' }, { thoughtSignature: 'firma' }])),
    )
    const deltas = e.filter(x => x.type === 'content_block_delta')
    expect(deltas).toHaveLength(2)
    expect((deltas[1]?.delta as { signature: string }).signature).toBe('firma')
  })

  test('una firma suelta SIN bloque abierto no emite nada', async () => {
    const e = await recolectar(chunks(conPartes([{ thoughtSignature: 'firma' }])))
    expect(tipos(e)).toEqual(['message_start', 'message_delta', 'message_stop'])
  })
})

describe('adaptGeminiStreamToAnthropic — el cierre', () => {
  function conFin(reason: string, parts: unknown[] = []) {
    return conPartes(parts, { finishReason: reason })
  }

  const stopReason = (e: Array<Record<string, unknown>>) =>
    (e.find(x => x.type === 'message_delta')?.delta as { stop_reason: string }).stop_reason

  test('MAX_TOKENS da max_tokens', async () => {
    expect(stopReason(await recolectar(chunks(conFin('MAX_TOKENS'))))).toBe('max_tokens')
  })

  test('STOP sin herramientas da end_turn', async () => {
    expect(stopReason(await recolectar(chunks(conFin('STOP'))))).toBe('end_turn')
  })

  test('los motivos de bloqueo TAMBIEN dan end_turn', async () => {
    // Son ocho casos que caen a la misma rama, a proposito: SAFETY,
    // RECITATION, BLOCKLIST, PROHIBITED_CONTENT, SPII y los demas no tienen
    // stop_reason propio en Anthropic.
    for (const r of ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII']) {
      expect(stopReason(await recolectar(chunks(conFin(r))))).toBe('end_turn')
    }
  })

  test('con una llamada vista, el motivo pasa a tool_use', async () => {
    const e = await recolectar(chunks(conFin('STOP', [{ functionCall: { name: 'X' } }])))
    expect(stopReason(e)).toBe('tool_use')
  })

  test('MAX_TOKENS gana sobre la presencia de herramienta', async () => {
    const e = await recolectar(
      chunks(conFin('MAX_TOKENS', [{ functionCall: { name: 'X' } }])),
    )
    expect(stopReason(e)).toBe('max_tokens')
  })

  test('sin finishReason el cierre se emite igual', async () => {
    const e = await recolectar(chunks(conPartes([{ text: 't' }])))
    expect(stopReason(e)).toBe('end_turn')
  })

  test('la salida SUMA los tokens de pensamiento a los de respuesta', async () => {
    const e = await recolectar(
      chunks({
        ...conFin('STOP'),
        usageMetadata: { candidatesTokenCount: 10, thoughtsTokenCount: 3 },
      }),
    )
    expect(e.find(x => x.type === 'message_delta')?.usage).toEqual({ output_tokens: 13 })
  })

  test('el bloque abierto se cierra ANTES del message_delta', async () => {
    const e = await recolectar(chunks(conPartes([{ text: 't' }])))
    const posCierre = tipos(e).lastIndexOf('content_block_stop')
    const posDelta = tipos(e).indexOf('message_delta')
    expect(posCierre).toBeLessThan(posDelta)
  })
})
