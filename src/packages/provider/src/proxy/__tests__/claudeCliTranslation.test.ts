/**
 * La traducción entre una petición `/v1/messages` y la línea de comando,
 * la entrada y la salida de `claude -p` (`../claudeCli/requestTranslation.ts`,
 * `../claudeCli/streamJson.ts`, `../claudeCli/responseTranslation.ts`).
 */
import { describe, expect, test } from 'bun:test'
import {
  BRIDGE_SERVER_NAME,
  bridgeToolDefinitions,
  bridgeToolName,
  claudeArgv,
  clientToolName,
  conversationPrefixKey,
  foldedUserInput,
  systemPromptOf,
  toolResultIdsOf,
  userInputLine,
} from '../claudeCli/requestTranslation.ts'
import { parseStreamJsonLine } from '../claudeCli/streamJson.ts'
import { messageSseEvents } from '../claudeCli/responseTranslation.ts'

describe('nombres de tool a través del puente', () => {
  test('el nombre del cliente se expone como mcp__<puente>__<tool> y vuelve sin prefijo', () => {
    expect(bridgeToolName('ls')).toBe(`mcp__${BRIDGE_SERVER_NAME}__ls`)
    expect(clientToolName(`mcp__${BRIDGE_SERVER_NAME}__ls`)).toBe('ls')
  })
  test('un nombre que no es del puente no se traduce', () => {
    expect(clientToolName('Bash')).toBeUndefined()
    expect(clientToolName('mcp__otro__ls')).toBeUndefined()
  })
  test('las definiciones MCP llevan el nombre del cliente y su input_schema como inputSchema', () => {
    const defined = bridgeToolDefinitions([{ name: 'ls', description: 'lista', input_schema: { type: 'object', properties: {} } }])
    expect(defined).toEqual([{ name: 'ls', description: 'lista', inputSchema: { type: 'object', properties: {} } }])
  })
})

describe('el prompt de sistema', () => {
  test('una cadena pasa tal cual; una lista de bloques de texto se une; sin sistema, nada', () => {
    expect(systemPromptOf('eres breve')).toBe('eres breve')
    expect(systemPromptOf([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('a\n\nb')
    expect(systemPromptOf(undefined)).toBeUndefined()
  })
})

describe('la entrada por stdin', () => {
  test('el último mensaje de usuario va como línea stream-json con su contenido en bloques', () => {
    const line = userInputLine({ role: 'user', content: 'hola' })
    expect(JSON.parse(line)).toEqual({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hola' }] } })
    const blocks = [{ type: 'text', text: 'mira' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA==' } }]
    expect(JSON.parse(userInputLine({ role: 'user', content: blocks })).message.content).toEqual(blocks)
  })
  test('una conversación nueva con historia pliega los turnos previos en un bloque de texto delante del último', () => {
    const messages = [
      { role: 'user', content: 'uno' },
      { role: 'assistant', content: [{ type: 'text', text: 'dos' }] },
      { role: 'user', content: 'tres' },
    ]
    const content = foldedUserInput(messages)
    expect(content).toHaveLength(2)
    expect(content[0]).toEqual({ type: 'text', text: '[user]\nuno\n\n[assistant]\ndos' })
    expect(content[1]).toEqual({ type: 'text', text: 'tres' })
    expect(foldedUserInput([{ role: 'user', content: 'solo' }])).toEqual([{ type: 'text', text: 'solo' }])
  })
})

describe('la clave de prefijo de una conversación', () => {
  test('la misma historia da la misma clave, con contenido en cadena o en bloques', () => {
    const asString = [{ role: 'user', content: 'hola' }]
    const asBlocks = [{ role: 'user', content: [{ type: 'text', text: 'hola' }] }]
    expect(conversationPrefixKey(asString)).toBe(conversationPrefixKey(asBlocks))
  })
  test('una historia distinta da otra clave, y los campos ajenos a la conversación no la cambian', () => {
    const base = [{ role: 'user', content: 'hola' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'ls', input: { p: 1 } }] }]
    const decorated = [{ role: 'user', content: 'hola' }, { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'ls', input: { p: 1 }, cache_control: { type: 'ephemeral' } }] }]
    expect(conversationPrefixKey(base)).toBe(conversationPrefixKey(decorated))
    expect(conversationPrefixKey(base)).not.toBe(conversationPrefixKey([{ role: 'user', content: 'adiós' }]))
  })
})

describe('los tool_result del último mensaje', () => {
  test('devuelve los tool_use_id de un mensaje de usuario con tool_result, y nada para texto', () => {
    const message = { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a' }, { type: 'tool_result', tool_use_id: 'b', content: 'x' }] }
    expect(toolResultIdsOf(message)).toEqual(['a', 'b'])
    expect(toolResultIdsOf({ role: 'user', content: 'hola' })).toEqual([])
  })
})

describe('la línea de comando de claude -p', () => {
  const base = { model: 'claude-real', bridgeUrl: 'http://127.0.0.1:1/claude-cli/bridge/tok' }
  test('una conversación nueva sin tools: -p, sesión propia, stream-json en las dos direcciones, sin tools nativas, sin MCP y sin --bare', () => {
    const argv = claudeArgv({ ...base, session: { kind: 'new', sessionId: 'uuid-1' }, toolNames: [] })
    expect(argv.slice(0, 2)).toEqual(['-p', '--verbose'])
    expect(argv).not.toContain('--bare')
    expect(argv.join(' ')).toContain('--session-id uuid-1')
    expect(argv.join(' ')).toContain('--output-format stream-json')
    expect(argv.join(' ')).toContain('--input-format stream-json')
    expect(argv.join(' ')).toContain('--model claude-real')
    expect(argv.join(' ')).toContain('--tools ')
    expect(argv[argv.indexOf('--tools') + 1]).toBe('')
    expect(argv).not.toContain('--mcp-config')
    expect(argv).not.toContain('--allowedTools')
    expect(argv).not.toContain('--system-prompt')
  })
  test('con tools: el puente como MCP http en --mcp-config, estricto, y cada tool permitida por su nombre MCP', () => {
    const argv = claudeArgv({ ...base, session: { kind: 'new', sessionId: 'uuid-1' }, toolNames: ['ls', 'cat'], systemPrompt: 'eres breve' })
    const mcp = JSON.parse(argv[argv.indexOf('--mcp-config') + 1] as string)
    expect(mcp).toEqual({ mcpServers: { [BRIDGE_SERVER_NAME]: { type: 'http', url: base.bridgeUrl } } })
    expect(argv).toContain('--strict-mcp-config')
    const allowed = argv.slice(argv.indexOf('--allowedTools') + 1, argv.indexOf('--allowedTools') + 3)
    expect(allowed).toEqual([`mcp__${BRIDGE_SERVER_NAME}__ls`, `mcp__${BRIDGE_SERVER_NAME}__cat`])
    expect(argv[argv.indexOf('--system-prompt') + 1]).toBe('eres breve')
  })
  test('una conversación conocida se reanuda con --resume y no lleva --session-id', () => {
    const argv = claudeArgv({ ...base, session: { kind: 'resume', sessionId: 'uuid-1' }, toolNames: [] })
    expect(argv.join(' ')).toContain('--resume uuid-1')
    expect(argv).not.toContain('--session-id')
  })
})

describe('el parseo de la salida stream-json', () => {
  test('una línea con type es un evento; una en blanco, nada; una rota, malformada', () => {
    expect(parseStreamJsonLine('{"type":"result","subtype":"success","is_error":false}')).toEqual({
      kind: 'event', event: { type: 'result', subtype: 'success', is_error: false },
    })
    expect(parseStreamJsonLine('   ')).toEqual({ kind: 'blank' })
    expect(parseStreamJsonLine('{no')).toEqual({ kind: 'malformed', line: '{no' })
    expect(parseStreamJsonLine('{"sin":"tipo"}')).toEqual({ kind: 'malformed', line: '{"sin":"tipo"}' })
  })
})

describe('el SSE sintetizado de un mensaje completo', () => {
  test('lleva message_start, un bloque por contenido, message_delta con stop_reason y message_stop', () => {
    const message = {
      id: 'msg_1', type: 'message', role: 'assistant', model: 'm', stop_reason: 'tool_use', stop_sequence: null,
      content: [{ type: 'text', text: 'hola' }, { type: 'tool_use', id: 't1', name: 'ls', input: { p: 1 } }],
      usage: { input_tokens: 3, output_tokens: 5 },
    }
    const events = messageSseEvents(message)
    expect(events.map(e => e.type)).toEqual([
      'message_start', 'content_block_start', 'content_block_delta', 'content_block_stop',
      'content_block_start', 'content_block_delta', 'content_block_stop', 'message_delta', 'message_stop',
    ])
    expect(events[0]).toEqual({ type: 'message_start', message: { ...message, content: [], stop_reason: null, usage: { input_tokens: 3, output_tokens: 0 } } })
    expect(events[2]).toEqual({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hola' } })
    expect(events[4]).toEqual({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 't1', name: 'ls', input: {} } })
    expect(events[5]).toEqual({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"p":1}' } })
    expect(events[7]).toEqual({ type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 5 } })
  })
})
