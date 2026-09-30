/**
 * Sonda en vivo: el proxy local con un upstream `claude-cli` que lanza el
 * `claude` real del PATH. Una petición con una tool y un prompt que la pide;
 * después, el tool_result. Escribe las dos respuestas junto a este guion.
 */
import { writeFileSync } from 'node:fs'
import { startProxyServer } from '../../../../src/packages/provider/src/proxy/startServer.ts'
import { ALLOW_LOOPBACK_ENV } from '../../../../src/packages/provider/src/proxy/netGuards.ts'

const out = (name: string, data: unknown) => writeFileSync(new URL(name, import.meta.url), JSON.stringify(data, null, 2))
const proxy = startProxyServer({
  host: '127.0.0.1', port: 0, accessKeys: ['k'], selector: 'round-robin', version: '0.1.0',
  routing: { upstreams: [{ name: 'cli', provider: 'anthropic' }], models: [{ id: 'local', upstream_model: { cli: 'claude-sonnet-4-5' } }], auto_include_builtin_models: false },
  endpoints: {}, credentials: {}, env: { [ALLOW_LOOPBACK_ENV]: '1' },
  claudeCli: { upstreams: [{ name: 'cli', command: { executable: 'claude' }, turnTimeoutMs: 150_000 }] },
})
const send = (body: unknown) => fetch(`${proxy.url}/v1/messages`, { method: 'POST', headers: { 'x-api-key': 'k', 'content-type': 'application/json' }, body: JSON.stringify(body) })
const tool = { name: 'list_dir', description: 'Lista los archivos de un directorio', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }
const t0 = Date.now()
try {
  const first = await send({ model: 'local', max_tokens: 200, system: 'Responde en una línea.', tools: [tool], messages: [{ role: 'user', content: 'Usa la herramienta list_dir sobre "." y dime cuántos archivos hay.' }] })
  const firstBody = await first.json() as { content?: { type: string; id?: string; name?: string; input?: unknown; text?: string }[]; stop_reason?: string }
  out('first.json', { status: first.status, ms: Date.now() - t0, body: firstBody })
  const toolUse = firstBody.content?.find(b => b.type === 'tool_use')
  if (!toolUse) { console.log('sin tool_use'); process.exit(2) }
  const t1 = Date.now()
  const second = await send({ model: 'local', max_tokens: 200, system: 'Responde en una línea.', tools: [tool], messages: [
    { role: 'user', content: 'Usa la herramienta list_dir sobre "." y dime cuántos archivos hay.' },
    { role: 'assistant', content: firstBody.content },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: 'a.txt\nb.txt\nc.txt' }] },
  ] })
  out('second.json', { status: second.status, ms: Date.now() - t1, body: await second.json() })
  console.log('ok')
} finally {
  await proxy.stop()
}
