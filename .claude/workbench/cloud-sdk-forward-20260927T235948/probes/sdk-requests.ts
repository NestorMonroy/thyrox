// Qué URL y qué autorización produce cada SDK de nube, con un fetch que intercepta.
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk'
import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk'
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk'

const seen: Record<string, unknown>[] = []
const capture = (label: string) => (async (input: string | URL | Request, init?: RequestInit) => {
  const headers = Object.fromEntries(new Headers(init?.headers).entries())
  seen.push({ label, url: String(input), authorization: headers.authorization?.replace(/Signature=\w+/, 'Signature=…'), apiKey: headers['api-key'] ?? headers['x-api-key'], body: JSON.parse(String(init?.body ?? '{}')) })
  return Response.json({ id: 'msg', type: 'message', role: 'assistant', model: 'm', content: [], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } })
}) as typeof fetch
const params = { model: 'claude-sonnet-5', max_tokens: 1, messages: [{ role: 'user' as const, content: 'hi' }] }
async function attempt(call: () => Promise<unknown>) {
  try { await call() } catch (error) { seen.push({ error: String(error).slice(0, 160) }) }
}

await attempt(() => new AnthropicBedrock({ awsRegion: 'us-east-1', awsAccessKey: 'AKIDEXAMPLE', awsSecretKey: 'secret', fetch: capture('bedrock-keys'), maxRetries: 0 }).messages.create(params))
await attempt(() => new AnthropicBedrock({ awsRegion: 'us-east-1', apiKey: 'bearer-token', fetch: capture('bedrock-bearer'), maxRetries: 0 } as never).messages.create(params))
// 0.26.4 no tiene `apiKey`: `skipAuth` salta SigV4 y la cabecera lleva el portador.
await attempt(() => new AnthropicBedrock({ awsRegion: 'us-east-1', skipAuth: true, defaultHeaders: { Authorization: 'Bearer bearer-token' }, fetch: capture('bedrock-bearer-skipauth'), maxRetries: 0 }).messages.create(params))
await attempt(() => new AnthropicVertex({ region: 'us-east5', projectId: 'proj', authClient: { projectId: 'proj', getRequestHeaders: async () => ({ Authorization: 'Bearer vtok' }) } as never, fetch: capture('vertex-token'), maxRetries: 0 }).messages.create(params))
await attempt(() => new AnthropicFoundry({ resource: 'res', apiKey: 'fkey', fetch: capture('foundry-key'), maxRetries: 0 }).messages.create(params))
await attempt(() => new AnthropicFoundry({ resource: 'res', azureADTokenProvider: async () => 'aad', fetch: capture('foundry-aad'), maxRetries: 0 }).messages.create(params))
for (const s of seen) console.log(JSON.stringify(s))
