/**
 * Corrida REAL, no simulada: guarda una conexion de verdad (archivo en
 * disco, via @thyrox/config, no NODE_ENV=test) con providerSpecificData
 * .compressToolResults, la relee con getConnection/getConnectionContextOptions
 * (el mismo camino que runLoop.ts usa con --connection), y corre el bucle
 * real contra un tool_use de Bash que EJECUTA git status de verdad en este
 * repo -- no un fixture de texto. Compara la salida con y sin la conexion.
 */
import { installConfigHostBindings } from '@thyrox/config/host.js'
import { enableConfigs } from '@thyrox/config'
import { runLoop } from '@thyrox/agent/loop'
import { RecordedProvider } from '@thyrox/provider/recorded'
import { CORE_TOOLS } from '@thyrox/tools/registry'
import { saveConnection, getConnection, getConnectionContextOptions } from '@thyrox/provider/connections'
import type { AssistantTurn } from '@thyrox/agent/loop/types'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const usage = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const assistantText = (t: string): AssistantTurn =>
  ({ id: 'm2', model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage })

function turns(): AssistantTurn[] {
  return [
    {
      id: 'm1', model: 'claude-opus-5', stop_reason: 'tool_use', usage,
      // git status de VERDAD, sobre el repo real -- no un heredoc de texto fijo.
      content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'git status' } }],
    },
    assistantText('listo'),
  ]
}

async function runWithConnection(connectionId: string | undefined) {
  const d = mkdtempSync(join(tmpdir(), 'live-compress-'))
  const connection = connectionId ? getConnection(connectionId) : undefined
  const connectionContext = connection ? getConnectionContextOptions(connection) : {}
  console.log(
    `[conexion=${connectionId ?? '(ninguna)'}] providerSpecificData=` +
      JSON.stringify(connection?.providerSpecificData) +
      ` -> getConnectionContextOptions=` + JSON.stringify(connectionContext),
  )
  const p = new RecordedProvider(turns())
  await runLoop({
    provider: p, model: 'claude-opus-5', system: 's', prompt: 'corre git status',
    tools: CORE_TOOLS, cwd: '/home/user/thyrox', transcriptDir: d,
    context: { compressToolResults: connectionContext.compressToolResults === true },
  })
  const result = p.requests[1].messages.flatMap((m) => m.content)
    .find((b: { type: string }) => b.type === 'tool_result') as { content: string }
  console.log(`  longitud del tool_result real: ${result.content.length} caracteres`)
  console.log(`  primeras 200 chars: ${JSON.stringify(result.content.slice(0, 200))}`)
  return result.content
}

async function main() {
  // Precondicion real, medida al intentar correr esto por primera vez:
  // @thyrox/config exige host bindings instalados antes de leer o
  // escribir config -- si no, getGlobalConfig/saveGlobalConfig LANZAN
  // ConfigHostBindingsError. `{}` basta: cada binding individual que
  // falte cae a node:fs real (ver _fs() en global/config.ts) y
  // getConfigHomeDir cae a HOME-derivado -- que es exactamente lo que
  // este probe necesita, apuntado a un HOME de scratch.
  installConfigHostBindings({})
  enableConfigs()

  // 1. Conexion de verdad, en disco de verdad (HOME esta redirigido por el
  //    caller a un directorio de scratch -- no toca el config real).
  saveConnection({
    id: 'demo-compress',
    name: 'Demo compresion',
    protocol: 'anthropic',
    endpoint: 'https://api.anthropic.com',
    auth: { type: 'api_key', key: 'sk-demo' },
    enabled: true,
    models: [],
    createdAt: Date.now(),
    providerSpecificData: { compressToolResults: true },
  })
  saveConnection({
    id: 'demo-sin-compresion',
    name: 'Demo sin compresion',
    protocol: 'anthropic',
    endpoint: 'https://api.anthropic.com',
    auth: { type: 'api_key', key: 'sk-demo' },
    enabled: true,
    models: [],
    createdAt: Date.now(),
    // sin providerSpecificData -- el default.
  })

  console.log('=== SIN --connection (comportamiento identico al de antes de este cambio) ===')
  const sinConexion = await runWithConnection(undefined)

  console.log('\n=== --connection demo-sin-compresion (persistida, sin el flag) ===')
  const conexionApagada = await runWithConnection('demo-sin-compresion')

  console.log('\n=== --connection demo-compress (persistida, con compressToolResults: true) ===')
  const conexionEncendida = await runWithConnection('demo-compress')

  console.log('\n=== veredicto ===')
  console.log('sin conexion === conexion apagada:', sinConexion === conexionApagada)
  console.log('conexion encendida es mas corta:', conexionEncendida.length < sinConexion.length)
  console.log('conexion encendida conserva la linea real:', conexionEncendida.includes('branch'))
}

main()
