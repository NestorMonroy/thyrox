/**
 * Sonda de streaming: una petición con `stream: true` y salida larga por la ruta
 * Anthropic de Token Plan, la forma que usa `thyrox -p`. Imprime el estado, los
 * eventos recibidos y si el stream terminó con `message_stop`.
 */
import { envValue } from '@thyrox/paths/reach.ts'

const key = envValue('THYROX_OPENAI_COMPAT_API_KEY')
if (!key) { console.log('key absent'); process.exit(2) }
const model = process.argv[2] ?? 'deepseek-v4.1-flash'
const words = Number(process.argv[3] ?? '0')
const filler = Array.from({ length: words }, (_, index) => `w${index}`).join(' ')
const started = Date.now()
const response = await fetch('https://token-plan.maas.qwencloudapi.com/apps/anthropic/v1/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({ model, max_tokens: 4000, stream: true, messages: [{ role: 'user', content: `${filler}\n\nWrite a 2500-word essay about compilers.` }] }),
})
let events = 0
let stopped = false
const decoder = new TextDecoder()
for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
  const text = decoder.decode(chunk)
  events += (text.match(/^event:/gm) ?? []).length
  if (text.includes('message_stop')) stopped = true
}
console.log(`${model}\tstatus ${response.status}\tevents ${events}\tstop ${stopped}\t${Date.now() - started}ms`)
