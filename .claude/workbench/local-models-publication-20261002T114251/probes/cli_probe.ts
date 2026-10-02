/**
 * Sonda de `thyrox -p` real contra Token Plan: un turno, prompt trivial, la misma
 * forma de petición que usa un trabajador (system prompt, herramientas, cabeceras).
 * La clave se lee con `envValue` y sólo viaja al entorno del hijo; se imprime el
 * código de salida y la cola de stderr.
 * Uso: bun cli_probe.ts <modelo> [herramientas]
 */
import { spawnSync } from 'node:child_process'
import { envValue } from '@thyrox/paths/reach.ts'

const key = envValue('THYROX_OPENAI_COMPAT_API_KEY')
if (!key) { console.log('key absent'); process.exit(2) }
const model = process.argv[2] ?? 'deepseek-v4.1-flash'
const tools = process.argv[3] ?? 'Read,Bash'
const started = Date.now()
const result = spawnSync('bash', ['bin/cli', '-p', '--model', model, '--setting-sources', 'project', '--tools', tools,
  '--allowedTools', tools, '--max-turns', '2', '--output-format', 'json', 'Reply with the single word OK.'], {
  env: { ...process.env, ANTHROPIC_BASE_URL: 'https://token-plan.maas.qwencloudapi.com/apps/anthropic', ANTHROPIC_API_KEY: key,
    THYROX_CODE_PROMPT_CACHE_TTL: '5m' },
  encoding: 'utf8', timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'],
})
console.log(`${model}\ttools=${tools}\texit=${result.status}\t${Date.now() - started}ms\t${(result.stderr ?? '').trim().slice(-200)}\t${(result.stdout ?? '').slice(0, 120).replace(/\s+/g, ' ')}`)
