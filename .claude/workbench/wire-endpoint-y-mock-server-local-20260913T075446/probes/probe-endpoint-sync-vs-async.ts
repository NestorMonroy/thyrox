/**
 * Probe para T-10: reproduce el auto-interbloqueo de Bun.spawnSync contra un
 * servidor mock en el MISMO proceso, y confirma que Bun.spawn (asincrono) no
 * lo tiene. Se corre con --modo=sync o --modo=async.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startAnthropicMockServer } from '@thyrox/provider/anthropicMockServer'

const modo = process.argv.includes('--modo=sync') ? 'sync' : 'async'
console.error('modo=', modo)

const servidor = await startAnthropicMockServer({
  host: '127.0.0.1', port: 0,
  respond: () => ({ content: [{ type: 'text', text: 'hola desde el servidor local' }] }),
})
console.error('servidor arriba en', servidor.url)

const home = mkdtempSync(join(tmpdir(), 'con-endpoint-'))
mkdirSync(join(home, '.claude'), { recursive: true })
writeFileSync(join(home, '.claude', '.claude.json'), JSON.stringify({
  connections: [{
    id: 'con-local', name: 'con-local', protocol: 'anthropic', endpoint: servidor.url,
    auth: { type: 'api_key', key: 'sk-local-mock' }, enabled: true, models: [], createdAt: 1,
  }],
}))
const d = mkdtempSync(join(tmpdir(), 'bin-endpoint-'))
const env = { ...process.env, HOME: home }
delete env.ANTHROPIC_API_KEY
delete env.ANTHROPIC_BASE_URL
delete env.NODE_ENV

const args = ['bun', 'run', join(import.meta.dir, 'main.ts'), '--prompt', 'hola', '--provider', 'http',
  '--connection', 'con-local', '--cwd', d, '--transcript-dir', join(d, 'tr'), '--output-style', 'json']

if (modo === 'sync') {
  console.error('lanzando con Bun.spawnSync (bloquea el event loop del padre)...')
  const inicio = Date.now()
  const p = Bun.spawnSync(args, { env })
  console.error('duracion_ms=', Date.now() - inicio)
  console.error('exitCode=', p.exitCode)
  console.error('stdout=', p.stdout.toString())
  console.error('stderr=', p.stderr.toString())
} else {
  console.error('lanzando con Bun.spawn (asincrono, el event loop sigue libre)...')
  const inicio = Date.now()
  const p = Bun.spawn(args, { env, stdout: 'pipe', stderr: 'pipe' })
  const exitCode = await p.exited
  console.error('duracion_ms=', Date.now() - inicio)
  console.error('exitCode=', exitCode)
  console.error('stdout=', await new Response(p.stdout).text())
  console.error('stderr=', await new Response(p.stderr).text())
}
console.error('peticiones recibidas por el servidor:', servidor.requests.length)
await servidor.close()
