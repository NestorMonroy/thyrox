/**
 * EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
 * no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
 *
 * Una petición mínima por endpoint de Qwen Cloud (Token Plan y Pay-As-You-Go,
 * por OpenAI y por Anthropic) y por modelo. Adaptada de
 * `local-models-publication-20261002T114251/probes/route_probe.ts`. Cada clave se
 * lee con `envValue` dentro de este proceso y nunca se escribe; la salida lleva
 * sólo estado HTTP, latencia, usage y el inicio del error.
 */
import { envValue } from '@thyrox/paths/reach.ts'

type Plan = { readonly name: string; readonly base: string; readonly keyName: string }

const PLANS: readonly Plan[] = [
  { name: 'token-plan', base: 'https://token-plan.maas.qwencloudapi.com', keyName: 'THYROX_OPENAI_COMPAT_API_KEY' },
  { name: 'payg', base: 'https://maas.qwencloudapi.com', keyName: 'THYROX_OPENAI_COMPAT_PAYG_API_KEY' },
]
const MODELS = (process.env.PROBE_MODELS ?? 'qwen3.8-flash').split(',')
const ERROR_PREVIEW = 120

async function probe(label: string, url: string, headers: Record<string, string>, body: unknown,
  usageOf: (json: Record<string, unknown>) => string): Promise<void> {
  const started = Date.now()
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    const text = await response.text()
    let detail = text.slice(0, ERROR_PREVIEW).replace(/\s+/g, ' ')
    if (response.ok) {
      try { detail = usageOf(JSON.parse(text) as Record<string, unknown>) } catch { /* el cuerpo no es JSON: se publica su inicio */ }
    }
    console.log(`${label}\t${response.status}\t${Date.now() - started}ms\t${detail}`)
  } catch (error) {
    console.log(`${label}\terror\t${Date.now() - started}ms\t${(error as Error).message.slice(0, ERROR_PREVIEW)}`)
  }
}

for (const plan of PLANS) {
  const key = envValue(plan.keyName)
  if (!key) { console.log(`${plan.name}\tsin-clave\t-\t${plan.keyName} ausente`); continue }
  for (const model of MODELS) {
    const prompt = { model, max_tokens: 16, messages: [{ role: 'user', content: 'Reply with OK.' }] }
    await probe(`${plan.name}\tanthropic\t${model}`, `${plan.base}/apps/anthropic/v1/messages`,
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, prompt,
      json => `usage=${JSON.stringify(json.usage ?? null)}`)
    await probe(`${plan.name}\topenai\t${model}`, `${plan.base}/compatible-mode/v1/chat/completions`,
      { authorization: `Bearer ${key}` }, prompt,
      json => `usage=${JSON.stringify(json.usage ?? null)}`)
  }
}
