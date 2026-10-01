/**
 * Un doble de `claude -p` para las pruebas del upstream `claude-cli`: habla
 * el contrato que el upstream compone —`--input-format stream-json` por
 * stdin, `--output-format stream-json` por stdout, el puente MCP de
 * `--mcp-config`— y decide su guion por el texto del mensaje de usuario.
 * Registra cada invocación en `$FAKE_CLAUDE_LOG/invocations.jsonl`.
 *
 * Guiones: `FALLA` sale con 1 sin `result`; `TOOL` llama a la tool `ls` del
 * puente y responde con lo que el puente le devolvió; cualquier otro texto
 * se devuelve como eco, con `reanudado:` si la línea llevaba `--resume`.
 */
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

type Invocation = { argv: string[]; stdin: string; inheritedBaseUrl: boolean }

function optionValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function log(entry: Record<string, unknown>): void {
  const dir = process.env.FAKE_CLAUDE_LOG
  if (dir) appendFileSync(join(dir, 'invocations.jsonl'), `${JSON.stringify(entry)}\n`)
}

function emit(event: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(event)}\n`)
}

async function readStdin(): Promise<string> {
  const chunks: string[] = []
  const decoder = new TextDecoder()
  for await (const chunk of Bun.stdin.stream()) chunks.push(decoder.decode(chunk as Uint8Array, { stream: true }))
  return chunks.join('')
}

function userText(stdin: string): string {
  const line = stdin.split('\n').find(l => l.trim() !== '')
  if (!line) return ''
  const message = JSON.parse(line) as { message: { content: { type: string; text?: string }[] } }
  return message.message.content.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
}

async function rpc(url: string, method: string, params: unknown, id?: number): Promise<unknown> {
  const body = id === undefined ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id, method, params }
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (response.status === 202) return undefined
  return response.json()
}

function assistant(sessionId: string, content: unknown[], stopReason: string): void {
  emit({
    type: 'assistant', session_id: sessionId, parent_tool_use_id: null,
    message: { id: 'msg_fake', type: 'message', role: 'assistant', model: 'real-model', content, stop_reason: stopReason, usage: { input_tokens: 11, output_tokens: 7 } },
  })
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const stdin = await readStdin()
  const sessionId = optionValue(argv, '--session-id') ?? optionValue(argv, '--resume') ?? 'sin-sesion'
  const invocation: Invocation = { argv, stdin, inheritedBaseUrl: process.env.ANTHROPIC_BASE_URL !== undefined }
  log({ phase: 'start', pid: process.pid, ...invocation })
  emit({ type: 'system', subtype: 'init', session_id: sessionId, model: optionValue(argv, '--model') })
  const text = userText(stdin)
  if (text.includes('FALLA')) {
    process.stderr.write('fake claude: falla simulada\n')
    process.exit(1)
  }
  const mcp = optionValue(argv, '--mcp-config')
  if (text.includes('TOOL') && mcp) {
    const url = (JSON.parse(mcp) as { mcpServers: Record<string, { url: string }> }).mcpServers.thyrox_bridge!.url
    await rpc(url, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fake', version: '0' } }, 1)
    await rpc(url, 'notifications/initialized', {})
    const listed = await rpc(url, 'tools/list', {}, 2) as { result: { tools: { name: string }[] } }
    log({ phase: 'tools_listed', names: listed.result.tools.map(t => t.name) })
    assistant(sessionId, [{ type: 'text', text: 'voy a listar' }, { type: 'tool_use', id: 'toolu_fake_1', name: 'mcp__thyrox_bridge__ls', input: { path: '.' } }], 'tool_use')
    const called = await rpc(url, 'tools/call', { name: 'ls', arguments: { path: '.' } }, 3) as { result?: { content: { text?: string }[]; isError: boolean }; error?: unknown }
    log({ phase: 'tool_result_received', result: called.result, error: called.error })
    if (!called.result) {
      process.stderr.write(`fake claude: tools/call falló: ${JSON.stringify(called.error)}\n`)
      process.exit(1)
    }
    const received = called.result.content.map(c => c.text ?? '').join('')
    emit({ type: 'user', session_id: sessionId, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fake_1', content: received }] } })
    assistant(sessionId, [{ type: 'text', text: `resultado: ${received}` }], 'end_turn')
    emit({ type: 'result', subtype: 'success', is_error: false, result: `resultado: ${received}`, session_id: sessionId, num_turns: 2 })
    return
  }
  const reply = `${argv.includes('--resume') ? 'reanudado' : 'eco'}: ${text}`
  assistant(sessionId, [{ type: 'text', text: reply }], 'end_turn')
  emit({ type: 'result', subtype: 'success', is_error: false, result: reply, session_id: sessionId, num_turns: 1 })
}

await main()
