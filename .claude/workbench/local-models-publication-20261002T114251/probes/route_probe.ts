/**
 * Sonda mínima de las dos rutas de Token Plan: una petición de pocos tokens por
 * ruta y modelo. Imprime sólo el estado HTTP y la duración; la clave se lee con
 * `envValue` dentro de este proceso y nunca se escribe.
 */
import { envValue } from '@thyrox/paths/reach.ts'

const key = envValue('THYROX_OPENAI_COMPAT_API_KEY')
if (!key) { console.log('key absent'); process.exit(2) }
const base = 'https://token-plan.maas.qwencloudapi.com'
const models = ['deepseek-v4.1-flash', 'qwen3.8-flash']

async function probe(label: string, url: string, headers: Record<string, string>, body: unknown): Promise<void> {
  const started = Date.now()
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    console.log(`${label}\t${response.status}\t${Date.now() - started}ms`)
  } catch (error) {
    console.log(`${label}\terror ${(error as Error).message.slice(0, 80)}\t${Date.now() - started}ms`)
  }
}

const size = Number(process.env.PROBE_PROMPT_WORDS ?? '0')
// Un prompt de N palabras distintas, para medir la ruta con el tamaño en que fallaron los trabajadores.
const filler = size > 0 ? Array.from({ length: size }, (_, index) => `w${index}`).join(' ') + '\n\n' : ''
for (const model of models) {
  await probe(`anthropic ${model}`, `${base}/apps/anthropic/v1/messages`, { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 8, messages: [{ role: 'user', content: filler + 'Reply with OK.' }] })
  await probe(`openai ${model}`, `${base}/compatible-mode/v1/chat/completions`, { authorization: `Bearer ${key}` },
    { model, max_tokens: 8, messages: [{ role: 'user', content: filler + 'Reply with OK.' }] })
}
