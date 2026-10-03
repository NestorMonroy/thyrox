/**
 * `thyrox -p` / `--print`: el modo no interactivo sobre el bucle nativo.
 *
 * Es el único ejecutor de `headless-pool`: hablar con Anthropic u otro
 * proveedor es trabajo de thyrox (traductores y selección de credenciales),
 * no de un segundo cliente. Su línea de comando y sus formas de salida son
 * un porte del modo `--print` del ejecutable 2.1.282. Traduce las banderas que el
 * pool usa y rehúsa las demás nombrándolas: aceptar en silencio una bandera
 * que no se cumple es peor que no aceptarla.
 *
 * Sin credencial propia no delega en `claude -p`: entra al túnel del proxy
 * local con el upstream `claude-cli` (`./printDelegation.ts`), y el bucle
 * sigue siendo el propio, herramientas incluidas.
 *
 * Las formas de salida salen del binario 2.1.282 (extractos en
 * `.claude/workbench/print-mode-20260926T225709/`):
 * - `system/init` del constructor de `chunk-q6234ftd.js` (cwd, session_id,
 *   tools, model, …);
 * - `result` de `S5` (`chunk-tsex6vh0.js`): `{...common, ...variant,
 *   type:"result", duration_ms, uuid}`, con `subtype` `success`,
 *   `error_max_turns` o `error_during_execution`.
 *
 * Divergencia declarada: el `stream-json` se escribe al TERMINAR, derivado
 * del transcript, no en vivo. El bucle no emite hoy el uso por petición como
 * evento, y el transcript sí lo guarda por línea `assistant`; el pool lee el
 * archivo cuando el ítem termina, así que para él la diferencia no existe.
 */
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { streamLoop } from '@thyrox/agent/loop'
import type { LoopResult } from '@thyrox/agent/loop/types'
import { loopSetup } from './runLoop.ts'
import { resolveMaxTurnsFromEnv } from './maxTurnsEnv.ts'
import { openExistingConnectionStore, type OpenedConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { credentialEnvironmentFor, decidePrintRoute, servedByLine, type CredentialEnvironment, type SpawnLocalProxy } from './printDelegation.ts'
import { adoptLoopSessionId, registerSessionAtLaunch } from '@thyrox/app-host/runtime/sessionRegistryAtLaunch.js'
import { startMessagingInboxAtLaunch, type MessagingInboxStop } from '@thyrox/app-host/runtime/messagingInboxAtLaunch.js'

/** Lo que `runPrint` lee del proceso; las pruebas lo sustituyen. */
export type PrintDeps = {
  env?: Record<string, string | undefined>
  readFd?: (fd: number) => string
  /** El store de conexiones, si existe; la decisión de ruta lo consulta. */
  openStore?: () => OpenedConnectionStore | undefined
  /** Cómo se lanza el proxy local cuando hace falta; las pruebas lo sustituyen. */
  spawnLocalProxy?: SpawnLocalProxy
  /** Cuánto se espera el anuncio del socket del proxy local. */
  announceTimeoutMs?: number
}

export type OutputFormat = 'text' | 'json' | 'stream-json'
const OUTPUT_FORMATS: readonly OutputFormat[] = ['text', 'json', 'stream-json']

export type PrintArgs = {
  prompt: string
  model: string
  maxTurns: number | undefined
  /** Las herramientas permitidas; `null` = todas. */
  tools: string[] | null
  persist: boolean
  outputFormat: OutputFormat
  /** El `argv` que entiende `loopSetup`. */
  loopArgv: string[]
  /** `--messaging-socket-path`, si llegó — la vía de escape también bajo `--bare`. */
  messagingSocketPath: string | undefined
}

/** Banderas con valor que se traducen o se pasan al bucle tal cual. */
const WITH_VALUE = new Set(['--model', '--max-turns', '--setting-sources', '--tools', '--allowedTools',
  '--allowed-tools', '--output-format', '--provider', '--grabacion', '--system', '--connection', '--store',
  '--messaging-socket-path', '--system-budget-tokens'])
/** Banderas sin valor que se aceptan. `--verbose` no cambia nada aquí. */
const FLAGS = new Set(['-p', '--print', '--no-session-persistence', '--verbose'])

function toolList(v: string): string[] {
  return v.split(/[\s,]+/).filter(Boolean)
}

/**
 * Traduce la línea de comando de `thyrox -p`. `stdin` es el texto leído de la
 * entrada estándar, o `null` si no hubo; el prompt posicional gana.
 */
export function parsePrintArgs(argv: string[], stdin: string | null, env: Record<string, string | undefined> = process.env): PrintArgs {
  const values = new Map<string, string>()
  const positional: string[] = []
  let persist = true
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string
    const [name, inline] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined]
    if (FLAGS.has(name)) {
      if (name === '--no-session-persistence') persist = false
      continue
    }
    if (WITH_VALUE.has(name)) {
      const v = inline ?? argv[i + 1]
      if (v === undefined) throw new Error(`thyrox -p: ${name} pide un valor`)
      if (inline === undefined) i += 1
      values.set(name === '--allowed-tools' ? '--allowedTools' : name, v)
      continue
    }
    if (a.startsWith('-')) {
      throw new Error(`thyrox -p: la bandera ${a} no se admite. Se admiten: ${[...FLAGS, ...WITH_VALUE].join(', ')}`)
    }
    positional.push(a)
  }
  const prompt = positional.length ? positional.join(' ') : stdin
  if (!prompt || !prompt.trim()) throw new Error('thyrox -p: falta el prompt (posicional o por stdin)')
  const outputFormat = (values.get('--output-format') ?? 'text') as OutputFormat
  if (!OUTPUT_FORMATS.includes(outputFormat)) {
    throw new Error(`thyrox -p: --output-format desconocido: ${outputFormat}. Los válidos: ${OUTPUT_FORMATS.join(', ')}`)
  }
  const declared = [values.get('--tools'), values.get('--allowedTools')].filter((v): v is string => v !== undefined)
  const tools = declared.length
    ? declared.map(toolList).reduce((acc, list) => acc.filter((t) => list.includes(t)))
    : null
  const model = values.get('--model') ?? 'claude-opus-5'
  const declaredTurns = values.get('--max-turns')
  const explicitTurns = declaredTurns === undefined ? undefined : Number(declaredTurns)
  if (explicitTurns !== undefined && (!Number.isInteger(explicitTurns) || explicitTurns < 1)) {
    throw new Error(`thyrox -p: --max-turns pide un entero ≥ 1`)
  }
  // Sin bandera ni variable no hay tope: el ítem lo acota su plazo, no un conteo.
  const maxTurns = resolveMaxTurnsFromEnv(explicitTurns, env)
  const loopArgv = ['--prompt', prompt, '--model', model,
    ...(maxTurns === undefined ? [] : ['--max-turns', String(maxTurns)]),
    '--provider', values.get('--provider') ?? 'http']
  // `claude` lee una lista (`user,project,local`); thyrox distingue «sólo el
  // proyecto» de lo demás, que es lo que el pool pide.
  const sources = values.get('--setting-sources')
  if (sources !== undefined && toolList(sources).join(',') === 'project') loopArgv.push('--settings-source', 'project')
  // `--system-budget-tokens` acota el prompt de sistema (`systemPrompt.ts`): un
  // modelo local en CPU paga cada token del piso en prefill (A6 r8).
  for (const passthrough of ['--grabacion', '--system', '--connection', '--store', '--system-budget-tokens']) {
    const v = values.get(passthrough)
    if (v !== undefined) loopArgv.push(passthrough, v)
  }
  return { prompt, model, maxTurns, tools, persist, outputFormat, loopArgv, messagingSocketPath: values.get('--messaging-socket-path') }
}

/**
 * ¿Hay que leer stdin? Sólo si no hay prompt posicional. Leerlo siempre
 * colgaría a quien lanza `thyrox -p <prompt>` con un stdin que no se cierra
 * (el socket de una herramienta, H-THYROX-103 en su forma de `rg`).
 */
export function needsStdin(argv: string[]): boolean {
  try {
    parsePrintArgs(argv, null)
    return false
  } catch (e) {
    return /falta el prompt/.test((e as Error).message)
  }
}

type TranscriptEntry = { type: string; message?: Record<string, unknown> }

function subtypeOf(stop: LoopResult['stop']): 'success' | 'error_max_turns' | 'error_during_execution' {
  if (stop === 'end_turn') return 'success'
  if (stop === 'max_turns') return 'error_max_turns'
  return 'error_during_execution'
}

/** Las líneas de `--output-format stream-json`, con las formas del binario. */
export function streamJsonLines(o: {
  transcript: TranscriptEntry[]
  result: LoopResult
  model: string
  tools: string[]
  cwd: string
  startedAt: number
  now: number
}): Record<string, unknown>[] {
  const sessionId = o.result.sessionId
  const init = { type: 'system', subtype: 'init', cwd: o.cwd, session_id: sessionId, tools: o.tools,
    mcp_servers: [], model: o.model, permissionMode: 'default', uuid: randomUUID() }
  const assistants = o.transcript
    .filter((e) => e.type === 'assistant' && e.message)
    .map((e) => ({ type: 'assistant', message: e.message, parent_tool_use_id: null, session_id: sessionId, uuid: randomUUID() }))
  const subtype = subtypeOf(o.result.stop)
  const result = {
    is_error: subtype !== 'success',
    duration_api_ms: 0,
    num_turns: o.result.turns,
    stop_reason: o.result.stop,
    session_id: sessionId,
    total_cost_usd: o.result.usd,
    usage: o.result.usage,
    permission_denials: [],
    subtype,
    ...(subtype === 'success' ? { result: o.result.lastText } : { errors: [o.result.stop] }),
    type: 'result',
    duration_ms: Math.max(0, Math.round(o.now - o.startedAt)),
    uuid: randomUUID(),
  }
  return [init, ...assistants, result]
}

function readTranscript(path: string): TranscriptEntry[] {
  try {
    return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as TranscriptEntry)
  } catch {
    return []
  }
}

/**
 * Corre el modo print. `stdin` es el texto de la entrada estándar (lo lee
 * quien despacha); `transcriptDir` se sustituye por uno temporal que se
 * borra al terminar cuando se pide `--no-session-persistence`.
 */
export async function runPrint(argv: string[], cwd: string, transcriptDir: string, stdin: string | null,
  deps: PrintDeps = {}): Promise<number> {
  let args: PrintArgs
  try {
    args = parsePrintArgs(argv, stdin)
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    return 2
  }
  // La línea se valida con el contrato de thyrox antes de buscar credencial:
  // lo que thyrox -p rehúsa no levanta ningún proxy.
  const env = deps.env ?? process.env
  const opened = (deps.openStore ?? (() => openExistingConnectionStore({ env })))()
  const route = decidePrintRoute(argv, env, deps.readFd, opened?.store)
  opened?.close()
  process.stderr.write(`${servedByLine(route, args.model)}\n`)
  let credential: CredentialEnvironment
  try {
    credential = await credentialEnvironmentFor(route, {
      env, cwd, models: [args.model], spawn: deps.spawnLocalProxy, announceTimeoutMs: deps.announceTimeoutMs,
    })
  } catch (e) {
    // Nunca se cae a `claude -p` directo: sin proxy, la causa y exit 2.
    process.stderr.write(`thyrox -p: sin credencial propia y sin proxy local: ${(e as Error).message}\n`)
    return 2
  }
  const dir = args.persist ? transcriptDir : mkdtempSync(join(tmpdir(), 'thyrox-print-'))
  const startedAt = performance.now()
  let stopMessaging: MessagingInboxStop | undefined
  try {
    // El buzón arranca ANTES del registro y del turno, igual que el modo
    // bucle: su env tiene que estar exportado antes de cualquier hook
    // SessionStart.
    stopMessaging = await startMessagingInboxAtLaunch(args.messagingSocketPath)
    // Publica sessions/<pid>.json ANTES del turno, igual que el modo bucle.
    await registerSessionAtLaunch(process.env.THYROX_CODE_SESSION_NAME)
    const { shared } = loopSetup(args.loopArgv, cwd, dir, { toolAllow: args.tools, env: credential.env })
    const gen = streamLoop({ ...shared, prompt: args.prompt })
    let step = await gen.next()
    while (!step.done) {
      if (step.value.type === 'session_start') adoptLoopSessionId(step.value.sessionId, false)
      step = await gen.next()
    }
    const result = step.value
    if (args.outputFormat === 'text') {
      process.stdout.write(`${result.lastText}\n`)
    } else {
      const lines = streamJsonLines({ transcript: readTranscript(result.transcriptPath), result, model: args.model,
        tools: shared.tools.map((t) => t.name), cwd, startedAt, now: performance.now() })
      if (args.outputFormat === 'json') process.stdout.write(`${JSON.stringify(lines.at(-1))}\n`)
      else for (const line of lines) process.stdout.write(`${JSON.stringify(line)}\n`)
    }
    return result.stop === 'end_turn' ? 0 : 1
  } catch (e) {
    process.stderr.write(`thyrox -p: ${(e as Error).message}\n`)
    return 1
  } finally {
    if (!args.persist) rmSync(dir, { recursive: true, force: true })
    await stopMessaging?.()
    await credential.close()
  }
}
