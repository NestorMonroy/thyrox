import { describe, expect, test } from 'bun:test'
import {
  MAX_STREAMING_TEXT_CHARS,
  MAX_STREAMING_TOOL_USES,
  MAX_TOOL_USE_BLOCK_JSON_CHARS,
  handleMessageFromStream,
  isStreamItem,
  type ApiMetricsEvent,
  type StreamHandlerOptions,
  type StreamItem,
  type StreamingToolUse,
} from '../messages.js'

type Call = [name: string, payload: unknown]

/**
 * Graba cada callback del contrato en orden, y mantiene el estado que los
 * reductores (`onStreamingToolUses`, `onStreamingText`) devuelven.
 */
function recorder(initial: { toolUses?: StreamingToolUse[]; text?: string | null } = {}) {
  const calls: Call[] = []
  const state = { toolUses: initial.toolUses ?? [], text: initial.text ?? null }
  const options: StreamHandlerOptions = {
    onSetStreamMode: mode => calls.push(['mode', mode]),
    onApiMetrics: event => calls.push(['metrics', event]),
    onUpdateLength: length => calls.push(['length', length]),
    onStreamingToolUses: reduce => {
      state.toolUses = reduce(state.toolUses)
      calls.push(['toolUses', state.toolUses])
    },
    onStreamingText: reduce => {
      state.text = reduce(state.text)
      calls.push(['text', state.text])
    },
    onCompactEvent: event => calls.push(['compact', event]),
    onResponseLength: event => calls.push(['responseLength', event]),
    displayTransform: {
      begin: messageId => calls.push(['begin', messageId]),
      delta: text => calls.push(['delta', text]),
      finalize: () => calls.push(['finalize', null]),
      entryLanded: message => calls.push(['entryLanded', message]),
    },
    authoringProgressSurface: {
      onToolUseStart: (index, toolName) => calls.push(['toolUseStart', [index, toolName]]),
      onInputJsonDelta: (index, partialJson) => calls.push(['inputJsonDelta', [index, partialJson]]),
      onToolUseStop: index => calls.push(['toolUseStop', index]),
      resetAuthoringProgress: () => calls.push(['resetAuthoring', null]),
    },
  }
  const names = () => calls.map(([name]) => name)
  const metrics = () => calls.filter(([name]) => name === 'metrics').map(([, payload]) => payload as ApiMetricsEvent)
  return { options, calls, state, names, metrics }
}

function streamEvent(event: Record<string, unknown>, ttftMs?: number): StreamItem {
  return { type: 'stream_event', event: event as { type: string }, ...(ttftMs === undefined ? {} : { ttftMs }) }
}

function toolUseBlock(id: string, name: string | number = 'Bash') {
  return { type: 'tool_use', id, name, input: {} }
}

function toolUseStart(index: number, block: Record<string, unknown>): StreamItem {
  return streamEvent({ type: 'content_block_start', index, content_block: block })
}

describe('handleMessageFromStream — items que no son eventos del stream', () => {
  test('stream_request_start pone el spinner en requesting y nada mas', () => {
    const r = recorder()
    handleMessageFromStream({ type: 'stream_request_start' }, r.options)
    expect(r.calls).toEqual([['mode', 'requesting']])
  })

  test('response_length va integro a onResponseLength', () => {
    const r = recorder()
    const event = { type: 'response_length', op: 'add', delta: 12 } as const
    handleMessageFromStream(event, r.options)
    expect(r.calls).toEqual([['responseLength', event]])
  })

  test('un evento de compactacion va integro a onCompactEvent', () => {
    const r = recorder()
    const event = { type: 'stream_mode', mode: 'requesting' } as const
    handleMessageFromStream(event, r.options)
    expect(r.calls).toEqual([['compact', event]])
  })

  test('un ping no toca ningun callback', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'ping' }), r.options)
    expect(r.calls).toEqual([])
  })

  test('sin opciones declaradas no falla', () => {
    expect(() => handleMessageFromStream(streamEvent({ type: 'message_stop' }), {})).not.toThrow()
  })
})

describe('handleMessageFromStream — un mensaje completo no se entrega desde aqui', () => {
  test('isStreamItem separa los cuatro items del stream de los mensajes', () => {
    expect(isStreamItem({ type: 'stream_request_start' })).toBe(true)
    expect(isStreamItem(streamEvent({ type: 'ping' }))).toBe(true)
    expect(isStreamItem({ type: 'response_length', op: 'reset' })).toBe(true)
    expect(isStreamItem({ type: 'stream_mode', mode: 'thinking' })).toBe(true)
    expect(isStreamItem({ type: 'assistant' })).toBe(false)
    expect(isStreamItem({ type: 'tombstone' })).toBe(false)
    expect(isStreamItem({ type: 'tool_use_summary' })).toBe(false)
  })

  test('el contrato no tiene onMessage ni onTombstone', () => {
    const options: StreamHandlerOptions = {}
    expect('onMessage' in options).toBe(false)
    expect(Object.keys(recorder().options)).not.toContain('onMessage')
    expect(Object.keys(recorder().options)).not.toContain('onTombstone')
  })
})

describe('handleMessageFromStream — message_start', () => {
  test('con ttftMs emite la metrica start con el id del mensaje', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'message_start', message: { id: 'msg_1' } }, 250), r.options)
    expect(r.metrics()).toEqual([{ type: 'start', ttftMs: 250, messageId: 'msg_1' }])
  })

  test('sin ttftMs no emite la metrica start', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'message_start', message: { id: 'msg_1' } }), r.options)
    expect(r.metrics()).toEqual([])
  })

  test('abre el displayTransform, reinicia la superficie de autoria y pasa a responding', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'message_start', message: { id: 'msg_1' } }), r.options)
    expect(r.calls).toContainEqual(['begin', 'msg_1'])
    expect(r.calls).toContainEqual(['resetAuthoring', null])
    expect(r.calls.at(-1)).toEqual(['mode', 'responding'])
  })

  test('vacia los tool uses y el texto en curso conservando la identidad cuando ya estaban vacios', () => {
    const emptyToolUses: StreamingToolUse[] = []
    const r = recorder({ toolUses: emptyToolUses, text: null })
    handleMessageFromStream(streamEvent({ type: 'message_start', message: { id: 'msg_1' } }), r.options)
    expect(r.state.toolUses).toBe(emptyToolUses)
    expect(r.state.text).toBeNull()

    const full = recorder({ toolUses: [{ index: 0, contentBlock: toolUseBlock('t1') as never }], text: 'hola' })
    handleMessageFromStream(streamEvent({ type: 'message_start', message: { id: 'msg_1' } }), full.options)
    expect(full.state.toolUses).toEqual([])
    expect(full.state.text).toBeNull()
  })
})

describe('handleMessageFromStream — content_block_start', () => {
  test('emite la metrica content_block_start y retira el texto en curso', () => {
    const r = recorder({ text: 'parcial' })
    handleMessageFromStream(streamEvent({ type: 'content_block_start', index: 0, content_block: { type: 'text' } }), r.options)
    expect(r.metrics()).toEqual([{ type: 'content_block_start' }])
    expect(r.state.text).toBeNull()
    expect(r.calls.at(-1)).toEqual(['mode', 'responding'])
  })

  test('thinking y redacted_thinking ponen el spinner en thinking', () => {
    for (const type of ['thinking', 'redacted_thinking']) {
      const r = recorder()
      handleMessageFromStream(streamEvent({ type: 'content_block_start', index: 0, content_block: { type } }), r.options)
      expect(r.calls.at(-1)).toEqual(['mode', 'thinking'])
    }
  })

  test('un bloque de herramienta del servidor pasa a tool-input; fallback no mueve el spinner', () => {
    const server = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_start', index: 0, content_block: { type: 'web_search_tool_result' } }), server.options)
    expect(server.calls.at(-1)).toEqual(['mode', 'tool-input'])

    const fallback = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_start', index: 0, content_block: { type: 'fallback' } }), fallback.options)
    expect(fallback.names()).not.toContain('mode')
  })

  test('tool_use: tool-input, se anade {index, contentBlock} sin JSON parcial y arranca la autoria', () => {
    const r = recorder()
    const block = toolUseBlock('t1', 'Read')
    handleMessageFromStream(toolUseStart(2, block), r.options)
    expect(r.calls).toContainEqual(['mode', 'tool-input'])
    expect(r.state.toolUses).toEqual([{ index: 2, contentBlock: block }])
    expect(Object.keys(r.state.toolUses[0]!)).toEqual(['index', 'contentBlock'])
    expect(r.calls).toContainEqual(['toolUseStart', [2, 'Read']])
  })

  test('tool_use con el mismo indice sustituye en su posicion en vez de anadir', () => {
    const first = toolUseBlock('t1')
    const other = toolUseBlock('t2')
    const r = recorder({ toolUses: [{ index: 0, contentBlock: first as never }, { index: 1, contentBlock: other as never }] })
    const replacement = toolUseBlock('t1b')
    handleMessageFromStream(toolUseStart(0, replacement), r.options)
    expect(r.state.toolUses.map(toolUse => toolUse.contentBlock)).toEqual([replacement, other])
  })

  test('al tope de tool uses no se anade y la lista queda intacta', () => {
    const atCap: StreamingToolUse[] = Array.from({ length: MAX_STREAMING_TOOL_USES }, (_, index) => ({
      index,
      contentBlock: toolUseBlock(`t${index}`) as never,
    }))
    const r = recorder({ toolUses: atCap })
    handleMessageFromStream(toolUseStart(MAX_STREAMING_TOOL_USES, toolUseBlock('extra')), r.options)
    expect(r.state.toolUses).toBe(atCap)
    expect(r.state.toolUses).toHaveLength(MAX_STREAMING_TOOL_USES)
  })

  test('un bloque cuyo JSON supera el tope se descarta sin tocar la lista ni la autoria', () => {
    const r = recorder()
    const oversized = { ...toolUseBlock('t1'), input: { text: 'x'.repeat(MAX_TOOL_USE_BLOCK_JSON_CHARS) } }
    handleMessageFromStream(toolUseStart(0, oversized), r.options)
    expect(r.names()).not.toContain('toolUses')
    expect(r.names()).not.toContain('toolUseStart')
    expect(r.calls).toContainEqual(['mode', 'tool-input'])
  })

  test('un tool_use sin nombre de cadena se descarta', () => {
    const r = recorder()
    handleMessageFromStream(toolUseStart(0, toolUseBlock('t1', 7)), r.options)
    expect(r.names()).not.toContain('toolUses')
  })
})

describe('handleMessageFromStream — content_block_delta', () => {
  test('text_delta: longitud numerica, texto acumulado y displayTransform.delta', () => {
    const r = recorder({ text: 'ho' })
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'la' } }), r.options)
    expect(r.calls).toContainEqual(['length', 2])
    expect(r.state.text).toBe('hola')
    expect(r.calls).toContainEqual(['delta', 'la'])
  })

  test('text_delta recorta el delta al tope de texto y no crece mas alla', () => {
    const almostFull = 'a'.repeat(MAX_STREAMING_TEXT_CHARS - 3)
    const r = recorder({ text: almostFull })
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'bcdefg' } }), r.options)
    expect(r.state.text).toHaveLength(MAX_STREAMING_TEXT_CHARS)
    expect(r.state.text!.endsWith('bcd')).toBe(true)

    const full = recorder({ text: 'a'.repeat(MAX_STREAMING_TEXT_CHARS) })
    const before = full.state.text
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'zzz' } }), full.options)
    expect(full.state.text).toBe(before)
    expect(full.calls).toContainEqual(['length', 3])
  })

  test('input_json_delta: longitud numerica y JSON parcial a la autoria, no a los tool uses', () => {
    const r = recorder({ toolUses: [{ index: 1, contentBlock: toolUseBlock('t1') as never }] })
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"a"' } }), r.options)
    expect(r.calls).toEqual([['length', 4], ['inputJsonDelta', [1, '{"a"']]])
  })

  test('thinking_delta con estimated_tokens lo reporta tal cual', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', estimated_tokens: 9 } }), r.options)
    expect(r.calls).toEqual([['metrics', { type: 'thinking_progress', estimatedTokensDelta: 9 }]])
  })

  test('thinking_delta con texto estima ceil(chars/4) y no cuenta para la longitud', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'abcde' } }), r.options)
    expect(r.calls).toEqual([['metrics', { type: 'thinking_progress', estimatedTokensDelta: 2 }]])

    const empty = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: '' } }), empty.options)
    expect(empty.calls).toEqual([])
  })

  test('signature_delta reporta round(chars * 0.75) como thinking_signature', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'x'.repeat(10) } }), r.options)
    expect(r.calls).toEqual([['metrics', { type: 'thinking_signature', chars: 8 }]])
  })

  test('un delta desconocido no toca nada', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_delta', index: 0, delta: { type: 'citations_delta' } }), r.options)
    expect(r.calls).toEqual([])
  })
})

describe('handleMessageFromStream — cierre de bloque y de mensaje', () => {
  test('content_block_stop cierra el bloque en la autoria', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'content_block_stop', index: 3 }), r.options)
    expect(r.calls).toEqual([['toolUseStop', 3]])
  })

  test('message_delta con usage emite end con los tokens de salida; sin usage, solo responding', () => {
    const withUsage = recorder()
    handleMessageFromStream(streamEvent({ type: 'message_delta', usage: { output_tokens: 41 } }), withUsage.options)
    expect(withUsage.calls).toEqual([['mode', 'responding'], ['metrics', { type: 'end', outputTokens: 41 }]])

    const without = recorder()
    handleMessageFromStream(streamEvent({ type: 'message_delta' }), without.options, { isSubagent: true })
    expect(without.calls).toEqual([['mode', 'responding']])
  })

  test('message_stop finaliza el displayTransform, pasa a tool-use, vacia los tool uses y reinicia la autoria', () => {
    const r = recorder({ toolUses: [{ index: 0, contentBlock: toolUseBlock('t1') as never }] })
    handleMessageFromStream(streamEvent({ type: 'message_stop' }), r.options)
    expect(r.names()).toEqual(['finalize', 'mode', 'toolUses', 'resetAuthoring'])
    expect(r.calls[1]).toEqual(['mode', 'tool-use'])
    expect(r.state.toolUses).toEqual([])
  })

  test('un evento desconocido deja el spinner en responding', () => {
    const r = recorder()
    handleMessageFromStream(streamEvent({ type: 'something_new' }), r.options)
    expect(r.calls).toEqual([['mode', 'responding']])
  })
})
