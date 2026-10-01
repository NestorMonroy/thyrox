/**
 * Un doble de `claude -p` para las pruebas de `thyrox -p` por el proxy
 * local: habla el contrato que el upstream `claude-cli` compone —el mensaje
 * de usuario por stdin en `stream-json`, la salida en `stream-json`, las
 * tools como el servidor MCP puente de `--mcp-config`— y decide su guion por
 * el texto del mensaje. Es la forma del doble del proveedor
 * (`provider/src/proxy/__tests__/fakeCliUpstream.ts`) con un guion distinto:
 * `HERRAMIENTA` invoca `Bash` por el puente, para medir que la herramienta
 * la ejecuta el bucle de thyrox y no este proceso. Registra cada invocación
 * en `$FAKE_CLI_LOG/invocations.jsonl`.
 */
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

const BRIDGE_SERVER = 'thyrox_bridge'
const TOOL_SCENARIO = 'HERRAMIENTA'
const BRIDGE_COMMAND = 'printf hola-desde-el-bucle'

function optionValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function log(entry: Record<string, unknown>): void {
  const dir = process.env.FAKE_CLI_LOG
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

function finish(sessionId: string, text: string): void {
  assistant(sessionId, [{ type: 'text', text }], 'end_turn')
  emit({ type: 'result', subtype: 'success', is_error: false, result: text, session_id: sessionId, num_turns: 1 })
}

async function runToolScenario(sessionId: string, bridgeUrl: string): Promise<void> {
  await rpc(bridgeUrl, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fake', version: '0' } }, 1)
  await rpc(bridgeUrl, 'notifications/initialized', {})
  assistant(sessionId, [{ type: 'tool_use', id: 'toolu_fake_1', name: `mcp__${BRIDGE_SERVER}__Bash`, input: { command: BRIDGE_COMMAND } }], 'tool_use')
  const called = await rpc(bridgeUrl, 'tools/call', { name: 'Bash', arguments: { command: BRIDGE_COMMAND } }, 2) as { result?: { content: { text?: string }[] }; error?: unknown }
  if (!called.result) {
    process.stderr.write(`fake cli: tools/call falló: ${JSON.stringify(called.error)}\n`)
    process.exit(1)
  }
  const received = called.result.content.map(c => c.text ?? '').join('')
  emit({ type: 'user', session_id: sessionId, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fake_1', content: received }] } })
  finish(sessionId, `resultado: ${received}`)
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const stdin = await readStdin()
  const sessionId = optionValue(argv, '--session-id') ?? optionValue(argv, '--resume') ?? 'sin-sesion'
  log({ argv, stdin })
  emit({ type: 'system', subtype: 'init', session_id: sessionId, model: optionValue(argv, '--model') })
  const text = userText(stdin)
  const mcp = optionValue(argv, '--mcp-config')
  if (text.includes(TOOL_SCENARIO) && mcp) {
    const url = (JSON.parse(mcp) as { mcpServers: Record<string, { url: string }> }).mcpServers[BRIDGE_SERVER]!.url
    await runToolScenario(sessionId, url)
    return
  }
  finish(sessionId, `eco: ${text}`)
}

await main()
