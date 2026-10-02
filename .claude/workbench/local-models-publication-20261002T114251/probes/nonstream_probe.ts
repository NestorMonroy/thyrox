/**
 * Gemela sin streaming de `stream_probe.ts`: la misma petición de salida larga por
 * la ruta Anthropic de Token Plan, pero con `stream: false`, la forma en que
 * `thyrox -p` pide cada turno cuando no recibe `--stream` (delegate.sh no lo pasa).
 * Imprime el estado, la duración y los tokens de salida si la respuesta los trae.
 *
 * Métrica: estado HTTP y tiempo de pared de UNA petición, sin reintentos.
 * Ciega a: el límite exacto del gateway (sólo acota por encima o por debajo) y a la
 * variación entre ejecuciones; la clave se lee con `envValue` y nunca se escribe.
 */
import { envValue } from '@thyrox/paths/reach.ts'

const key = envValue('THYROX_OPENAI_COMPAT_API_KEY')
if (!key) { console.log('key absent'); process.exit(2) }
const model = process.argv[2] ?? 'deepseek-v4.1-flash'
const maxTokens = Number(process.argv[3] ?? '4000')
const started = Date.now()
const response = await fetch('https://token-plan.maas.qwencloudapi.com/apps/anthropic/v1/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: 'Write a 2500-word essay about compilers.' }] }),
})
const body = await response.text()
const outputTokens = /"output_tokens"\s*:\s*(\d+)/.exec(body)?.[1] ?? '-'
console.log(`${model}\tnon-stream max_tokens ${maxTokens}\tstatus ${response.status}\toutput_tokens ${outputTokens}\t${Date.now() - started}ms\t${response.status === 200 ? '' : body.slice(0, 120).replace(/\s+/g, ' ')}`)
