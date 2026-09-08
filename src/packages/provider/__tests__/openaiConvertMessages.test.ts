/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/openaiConvertMessages.test.ts`
 * (21 casos en 4 describes): traduccion del mensaje Anthropic al mensaje de
 * ChatCompletion de OpenAI.
 *
 * La razon que la fuente escribe en su cabecera, y que este archivo conserva:
 * un ORDEN de mensajes equivocado rompe el contrato del API. El API de OpenAI
 * exige que el mensaje `tool` venga inmediatamente despues del mensaje de
 * asistente con `tool_calls`; un mensaje de usuario en medio hace que la
 * peticion se rechace con «insufficient tool messages following tool_calls».
 * El tercer describe de este archivo es lo que fija ese orden.
 *
 * La otra mitad del contrato —el ida y vuelta de los bloques de pensamiento
 * hacia `reasoning_content`— vive en `openaiConvertMessagesThinking.test.ts`,
 * porte de la segunda suite de la fuente.
 */
import { describe, expect, test } from 'bun:test'
import { anthropicMessagesToOpenAI } from '../src/openai/convertMessages.js'

function user(content: unknown) {
  return {
    type: 'user' as const,
    uuid: '00000000-0000-0000-0000-000000000001',
    message: { content },
  }
}

function assistant(content: unknown) {
  return {
    type: 'assistant' as const,
    uuid: '00000000-0000-0000-0000-000000000002',
    message: { content },
  }
}

describe('anthropicMessagesToOpenAI — el prompt de sistema', () => {
  test('el prompt de sistema se antepone como primer mensaje', () => {
    const result = anthropicMessagesToOpenAI(
      [user('hi') as never],
      ['You are a helpful assistant'] as never,
    )
    expect(result[0]?.role).toBe('system')
    expect(result[0]?.content).toBe('You are a helpful assistant')
  })

  test('un prompt de varios segmentos se une con doble salto de linea', () => {
    const result = anthropicMessagesToOpenAI(
      [user('hi') as never],
      ['Part 1', 'Part 2'] as never,
    )
    expect(result[0]?.content).toBe('Part 1\n\nPart 2')
  })

  test('un prompt vacio no antepone mensaje de sistema', () => {
    const result = anthropicMessagesToOpenAI([user('hi') as never], [] as never)
    expect(result[0]?.role).toBe('user')
  })

  test('los segmentos falsy del prompt se filtran', () => {
    const result = anthropicMessagesToOpenAI(
      [user('hi') as never],
      ['ok', '', 'also ok'] as never,
    )
    expect(result[0]?.content).toBe('ok\n\nalso ok')
  })
})

describe('anthropicMessagesToOpenAI — mensajes de usuario', () => {
  test('contenido de cadena plana', () => {
    const result = anthropicMessagesToOpenAI([user('hello') as never], [] as never)
    expect(result[0]).toEqual({ role: 'user', content: 'hello' })
  })

  test('contenido de arreglo: los bloques de texto se unen por salto de linea', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'text', text: 'line 1' },
          { type: 'text', text: 'line 2' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result[0]?.content).toBe('line 1\nline 2')
  })

  test('un bloque de imagen produce un arreglo de contenido multimodal', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'abc123' },
          },
        ]) as never,
      ],
      [] as never,
    )
    expect(Array.isArray(result[0]?.content)).toBe(true)
    const c = result[0]?.content as Array<{
      type: string
      image_url?: { url: string }
    }>
    expect(c[0]?.type).toBe('image_url')
    expect(c[0]?.image_url?.url).toBe('data:image/png;base64,abc123')
  })

  test('texto e imagen se combinan en un arreglo multimodal', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'text', text: 'caption' },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'x' },
          },
        ]) as never,
      ],
      [] as never,
    )
    const c = result[0]?.content as Array<{ type: string; text?: string }>
    expect(c).toHaveLength(2)
    expect(c[0]?.type).toBe('text')
    expect(c[0]?.text).toBe('caption')
    expect(c[1]?.type).toBe('image_url')
  })

  test('una imagen con fuente de URL pasa tal cual', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'image', source: { type: 'url', url: 'https://example.com/img.png' } },
        ]) as never,
      ],
      [] as never,
    )
    const c = result[0]?.content as Array<{ image_url?: { url: string } }>
    expect(c[0]?.image_url?.url).toBe('https://example.com/img.png')
  })

  test('una imagen sin fuente se descarta y no emite mensaje', () => {
    const result = anthropicMessagesToOpenAI(
      [user([{ type: 'image' }]) as never],
      [] as never,
    )
    expect(result).toEqual([])
  })
})

describe('anthropicMessagesToOpenAI — el orden del tool_result (CRITICO)', () => {
  test('un tool_result da un mensaje tool con su tool_call_id', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'tool_result', tool_use_id: 'call_abc', content: 'result text' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result[0]).toEqual({
      role: 'tool',
      tool_call_id: 'call_abc',
      content: 'result text',
    })
  })

  test('un tool_result con contenido de arreglo une sus bloques de texto', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          {
            type: 'tool_result',
            tool_use_id: 'call_x',
            content: [
              { type: 'text', text: 'part1' },
              { type: 'text', text: 'part2' },
            ],
          },
        ]) as never,
      ],
      [] as never,
    )
    expect(result[0]?.content).toBe('part1\npart2')
  })

  test('los mensajes tool salen ANTES del de usuario del mismo mensaje Anthropic', () => {
    // El caso que fija el orden: un mensaje Anthropic con tool_result y texto
    // tiene que producir [tool, user], nunca [user, tool]. Lo segundo dispara
    // «insufficient tool messages following tool_calls» en el API.
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'text', text: 'continuation prompt' },
          { type: 'tool_result', tool_use_id: 'call_x', content: 'tool output' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result[0]?.role).toBe('tool')
    expect(result[1]?.role).toBe('user')
  })

  test('varios tool_result salen todos antes de cualquier mensaje de usuario', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'tool_result', tool_use_id: 'call_a', content: 'a' },
          { type: 'tool_result', tool_use_id: 'call_b', content: 'b' },
          { type: 'text', text: 'after' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result.map(m => m.role)).toEqual(['tool', 'tool', 'user'])
  })

  test('solo tool_result y nada de texto: solo el mensaje tool, sin usuario vacio', () => {
    const result = anthropicMessagesToOpenAI(
      [
        user([
          { type: 'tool_result', tool_use_id: 'call_x', content: 'output' },
        ]) as never,
      ],
      [] as never,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.role).toBe('tool')
  })
})

describe('anthropicMessagesToOpenAI — mensajes de asistente', () => {
  test('contenido de cadena plana da un mensaje de asistente', () => {
    const result = anthropicMessagesToOpenAI(
      [assistant('reply') as never],
      [] as never,
    )
    expect(result[0]).toEqual({ role: 'assistant', content: 'reply' })
  })

  test('texto mas tool_use da el arreglo tool_calls en el asistente', () => {
    const result = anthropicMessagesToOpenAI(
      [
        assistant([
          { type: 'text', text: 'I will run a command' },
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'ls' } },
        ]) as never,
      ],
      [] as never,
    )
    const m = result[0] as {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
    expect(m.role).toBe('assistant')
    expect(m.content).toBe('I will run a command')
    expect(m.tool_calls).toHaveLength(1)
    expect(m.tool_calls?.[0]?.id).toBe('tu_1')
    expect(m.tool_calls?.[0]?.function.name).toBe('Bash')
    expect(JSON.parse(m.tool_calls![0]!.function.arguments)).toEqual({
      command: 'ls',
    })
  })

  test('solo tool_use y nada de texto da content null', () => {
    const result = anthropicMessagesToOpenAI(
      [
        assistant([
          { type: 'tool_use', id: 'tu_1', name: 'Bash', input: {} },
        ]) as never,
      ],
      [] as never,
    )
    const m = result[0] as { content: string | null }
    expect(m.content).toBeNull()
  })

  test('un bloque de pensamiento no entra en content', () => {
    // El nombre del caso en la fuente dice «SILENTLY DROPPED», y su asercion
    // solo mide `content`. El bloque NO se descarta del todo: viaja a
    // `reasoning_content`, y eso lo mide la suite hermana.
    const result = anthropicMessagesToOpenAI(
      [
        assistant([
          { type: 'thinking', thinking: 'inner monologue', signature: 'sig' },
          { type: 'text', text: 'visible' },
        ]) as never,
      ],
      [] as never,
    )
    expect((result[0] as { content: string }).content).toBe('visible')
  })

  test('un input que ya es cadena pasa tal cual, sin doble codificacion', () => {
    const result = anthropicMessagesToOpenAI(
      [
        assistant([
          { type: 'tool_use', id: 'tu_1', name: 'X', input: '{"already":"json"}' },
        ]) as never,
      ],
      [] as never,
    )
    const m = result[0] as {
      tool_calls?: Array<{ function: { arguments: string } }>
    }
    expect(m.tool_calls?.[0]?.function.arguments).toBe('{"already":"json"}')
  })

  test('un contenido que no es arreglo da contenido vacio', () => {
    const result = anthropicMessagesToOpenAI(
      [{ ...assistant({ unexpected: 'shape' }) } as never],
      [] as never,
    )
    expect((result[0] as { content: string }).content).toBe('')
  })
})
