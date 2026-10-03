/**
 * EXPERIMENTAL — medición exploratoria: no es autoridad ni evidencia de aceptación.
 * Cruza cada clave de Qwen Cloud con el endpoint OpenAI del otro plan, para
 * separar «clave inválida» de «clave de otro plan». Sólo publica el estado HTTP.
 */
const PAIRS: readonly [string, string][] = [
  ['QWENCLOUD_APK_TP', 'https://maas.qwencloudapi.com/compatible-mode/v1/chat/completions'],
  ['QWENCLOUD_APK_PAYG', 'https://token-plan.maas.qwencloudapi.com/compatible-mode/v1/chat/completions'],
  ['QWENCLOUD_APK_TP', 'https://token-plan.maas.qwencloudapi.com/compatible-mode/v1/models'],
  ['QWENCLOUD_APK_PAYG', 'https://maas.qwencloudapi.com/compatible-mode/v1/models'],
]
for (const [keyName, url] of PAIRS) {
  const key = process.env[keyName] ?? ''
  const isList = url.endsWith('/models')
  const response = await fetch(url, {
    method: isList ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    ...(isList ? {} : { body: JSON.stringify({ model: 'qwen3.8-flash', max_tokens: 16, messages: [{ role: 'user', content: 'Reply with OK.' }] }) }),
  })
  const code = (((await response.json().catch(() => ({}))) as { error?: { code?: string }, code?: string }).error?.code) ?? ''
  console.log(`${keyName}\t${url}\t${response.status}\t${code}`)
}
