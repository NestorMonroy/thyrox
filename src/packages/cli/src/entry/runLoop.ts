/**
 * El modo bucle: el turno del agente, dibujado como flujo de eventos.
 *
 * Dibuja el **flujo** de `streamLoop`, no un resumen aparte: si un estado no
 * esta en el flujo, la interfaz no lo puede inventar, y si esta, lo ven por
 * igual esta CLI, el diario y cualquier otro consumidor.
 *
 * `--provider recorded` corre contra turnos grabados en un JSON: es la unica
 * via ejecutable en este contenedor, que no tiene credencial de modelo.
 * `--provider http` exige `ANTHROPIC_API_KEY` y falla diciendo por que si no
 * esta — nunca en silencio.
 *
 * Extraido de `bin/harness.ts` en #205. Es el UNICO modo que no vive en
 * `commands/`, y por una razon medida: los siete comandos son autocontenidos
 * —cada uno devuelve un codigo y sale— mientras este compone proveedor,
 * herramientas, hooks, permisos y transcript en un orden que importa. Es la
 * misma razon por la que la referencia no parte su `mode-dispatch.ts`
 * (ccnmt: packages/cli/src/entry/mode-dispatch.ts, cuyo docstring declara que
 * su orden de fases es load-bearing); aqui esa premisa se cumple solo para
 * este modo.
 */
import { readFileSync } from 'node:fs'
import { streamLoop } from '@thyrox/agent/loop'
import { AnthropicHttpProvider } from '@thyrox/provider/anthropicHttp'
import { RecordedProvider } from '@thyrox/provider/recorded'
import { CORE_TOOLS } from '@thyrox/tools/registry'
import { agentTool, type AgentDefinition } from '@thyrox/tools/agent'
import { skillTool } from '@thyrox/tools/skill'
import { taskTools } from '@thyrox/tools/tasks'
import { SkillRegistry } from '@thyrox/skills/registry'
import { registerBundledSkills } from '@thyrox/skills/bundled'
import { STORE_PATH } from '@thyrox/observability/store'
import type { AssistantTurn, Provider, Usage } from '@thyrox/agent/loop/types'
import { USAGE_CERO } from '@thyrox/agent/loop/types'
import { OUTPUT_STYLES, renderEvent, renderStatusLine, type OutputStyle } from '../render.ts'
import { settingsFor } from './settings.ts'
import { systemPromptFor } from './systemPrompt.ts'
import { flag, hasFlag } from './flags.ts'
import { resolveMaxTurnsFromEnv } from './maxTurnsEnv.ts'
import { openExistingConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { getConnection, getConnectionContextOptions, type ConnectionRecord } from '@thyrox/provider/connections'
import { adoptLoopSessionId, registerSessionAtLaunch, renameCurrentSession } from '@thyrox/app-host/runtime/sessionRegistryAtLaunch.js'
import { startMessagingInboxAtLaunch } from '@thyrox/app-host/runtime/messagingInboxAtLaunch.js'

/**
 * `connection` es la misma que `runLoop` resuelve para `compressToolResults`
 * (T-9), reusada aqui (T-10): antes esta funcion sólo miraba `--provider`, y
 * `connection.endpoint`/`connection.auth` quedaban sin leer -- el gap que el
 * banco `correr-connectionToolCompression-de-verdad-20260913T064445/README.md`
 * dejo nombrado. `AnthropicHttpProvider` ya aceptaba `opts.baseUrl`/`opts.apiKey`
 * (`anthropicHttp.ts:68,60`); lo que faltaba era pasarselos desde aqui.
 *
 * Sólo `auth.type === 'api_key'` alimenta `apiKey`. Sin conexión con llave, el
 * proveedor resuelve la credencial del entorno con la cadena portada de
 * 2.1.282 (`@thyrox/provider: credentials.ts` — ANTHROPIC_AUTH_TOKEN,
 * THYROX_CODE_OAUTH_TOKEN, su descriptor, ANTHROPIC_API_KEY y el transporte
 * ANTHROPIC_UNIX_SOCKET).
 */
function providerFor(argv: string[], connection: ConnectionRecord | undefined): Provider {
  const cual = flag(argv, 'provider') ?? 'recorded'
  if (cual === 'http') {
    const apiKey = connection?.auth.type === 'api_key' ? connection.auth.key : undefined
    // El proveedor resuelve su credencial al construirse: el store se abre sólo
    // para esa resolución, y sólo si existe.
    const opened = openExistingConnectionStore()
    try {
      return new AnthropicHttpProvider({ baseUrl: connection?.endpoint, apiKey, store: opened?.store })
    } finally {
      opened?.close()
    }
  }
  const ruta = flag(argv, 'grabacion')
  if (!ruta) throw new Error('--provider recorded exige --grabacion <ruta a JSON con los turnos>')
  return new RecordedProvider(JSON.parse(readFileSync(ruta, 'utf8')) as AssistantTurn[])
}

/**
 * Definiciones de subagente por `subagent_type`, desde `--agent-defs <json>`.
 * Sin el flag, `{}`: la herramienta `Agent` sólo ofrece `general-purpose` (el
 * comodín que `agentTool` mezcla siempre). Un archivo ilegible SÍ tumba el
 * arranque: se pidió explícitamente y correr con definiciones a medias sería
 * peor que decir por qué no se pudo.
 */
function agentDefsFor(argv: string[]): Record<string, AgentDefinition> {
  const ruta = flag(argv, 'agent-defs')
  if (!ruta) return {}
  return JSON.parse(readFileSync(ruta, 'utf8')) as Record<string, AgentDefinition>
}

/**
 * El registro de skills que respalda la herramienta `Skill`.
 *
 * Registra los cinco skills sólo-apoyo de `bundled.ts` — leídos de disco desde
 * `docsRoot()`. La lectura de disco va en un `try`: un clon sin el árbol `docs`
 * deja el registro vacío (la herramienta `Skill` responde con
 * «Registrados: (ninguno)»), no tumba el CLI. Mismo criterio que `--agent-defs`
 * ausente: la ausencia degrada, no rompe.
 */
function buildSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry()
  try {
    registerBundledSkills(registry)
  } catch {
    // sin el árbol docs no hay skills empaquetados; el registro queda vacío
  }
  return registry
}

function outputStyleOf(argv: string[]): OutputStyle {
  const v = flag(argv, 'output-style') ?? 'text'
  if (!(OUTPUT_STYLES as readonly string[]).includes(v)) {
    throw new Error(`--output-style desconocido: ${v}. Los válidos son: ${OUTPUT_STYLES.join(', ')}`)
  }
  return v as OutputStyle
}

async function* stdinLines(): AsyncGenerator<string> {
  let rest = ''
  const reader = Bun.stdin.stream().getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    rest += new TextDecoder().decode(value)
    let corte = rest.indexOf('\n')
    while (corte >= 0) {
      yield rest.slice(0, corte)
      rest = rest.slice(corte + 1)
      corte = rest.indexOf('\n')
    }
  }
  if (rest) yield rest
}

/**
 * Corre el modo bucle. `transcriptDir` llega resuelto desde el arranque: quien
 * lo resuelve es `runCli`, y hacerlo dos veces daria dos respuestas el dia que
 * la regla cambie.
 */
/**
 * Lo que el bucle necesita para correr, resuelto de `argv`: proveedor,
 * herramientas, hooks, permisos y transcript. Lo comparten el modo bucle y el
 * modo print (`print.ts`), que sólo difiere en cómo dibuja el resultado.
 *
 * `toolAllow` acota las herramientas por nombre (el `--tools` de `thyrox -p`);
 * `null` deja todas.
 */
/**
 * Tope de turnos del bucle: la bandera, luego THYROX_CODE_MAX_TURNS, y si no
 * hay ninguna, ninguno. Un ítem del pool lo acota su plazo, no un conteo.
 */
export function loopMaxTurns(argv: string[], env: Record<string, string | undefined> = process.env): number {
  const declared = flag(argv, 'max-turns')
  return resolveMaxTurnsFromEnv(declared === undefined ? undefined : Number(declared), env) ?? Infinity
}

export function loopSetup(argv: string[], cwd: string, transcriptDir: string,
                          toolAllow: readonly string[] | null = null) {
  const conf = settingsFor(argv, cwd)
  // `--connection <id>` es opcional: sin él, ningún ajuste por conexión
  // aplica y el comportamiento es idéntico al de antes de este cambio. Se
  // resuelve ANTES de `providerFor`, no despues (T-10): el endpoint/auth del
  // transporte http depende de ella.
  const connectionId = flag(argv, 'connection')
  const connection = connectionId ? getConnection(connectionId) : undefined
  const provider = providerFor(argv, connection)
  const connectionContext = connection ? getConnectionContextOptions(connection) : {}
  const modelo = flag(argv, 'model') ?? 'claude-opus-5'
  // La herramienta `Agent` se cablea AQUÍ, no en `CORE_TOOLS`: necesita datos de
  // ejecución (provider, transcriptDir, storePath) que el registro estático no
  // puede fijar, y su módulo importa `CORE_TOOLS` — meterla en el registro sería
  // un ciclo. El hijo hereda `CORE_TOOLS` (sin `Agent`), así que la profundidad
  // queda acotada por construcción, además del guard `maxDepth`.
  const storePath = flag(argv, 'store')
  // La herramienta `Skill` se cablea AQUÍ por la misma razón que `Agent`:
  // necesita el `SkillRegistry` en tiempo de ejecución, que `CORE_TOOLS` no
  // puede llevar sin cablearle un registry al núcleo (#49).
  // El subsistema de tareas se cablea AQUÍ en el run principal, no sólo en el
  // `import`: el tablero (`dbPath`) y su sesión (`sessionId`) los comparten las
  // herramientas y el gate del recordatorio, para que releer el store dé lo
  // que las herramientas escribieron (DEC-TASK-01).
  const taskStore = flag(argv, 'store') ?? STORE_PATH
  const taskSession = flag(argv, 'session') ?? flag(argv, 'resume') ?? 'harness'
  const allTools = [
    ...CORE_TOOLS,
    ...taskTools({ dbPath: taskStore, sessionId: taskSession }),
    agentTool({
      provider,
      transcriptDir,
      definitions: agentDefsFor(argv),
      defaultModel: modelo,
      hooks: conf.hooks,
      journalPath: flag(argv, 'journal'),
      storePath,
    }),
    skillTool(buildSkillRegistry()),
  ]
  const tools = toolAllow ? allTools.filter((t) => toolAllow.includes(t.name)) : allTools
  const shared = {
    provider,
    model: modelo,
    system: systemPromptFor(argv, cwd).text,
    tools,
    cwd,
    transcriptDir,
    maxTurns: loopMaxTurns(argv),
    hooks: conf.hooks,
    permissions: conf.permissions,
    journalPath: flag(argv, 'journal'),
    stream: hasFlag(argv, 'stream'),
    taskReminder: { dbPath: taskStore, sessionId: taskSession },
    // Opt-in real: `@thyrox/context-compression` no cambia el comportamiento
    // por defecto (ContextOptions.compressToolResults default false). Dos
    // formas de encenderlo, cualquiera basta -- la bandera explícita o que
    // la conexión activa (`--connection <id>`) lo lleve en su
    // `providerSpecificData` (ver `getConnectionContextOptions`,
    // `@thyrox/provider/connections`). Sin `--connection`, se comporta
    // exactamente como antes de este cambio.
    context: {
      compressToolResults:
        hasFlag(argv, 'compress-tool-results') ||
        connectionContext.compressToolResults === true,
    },
  }
  return { shared, modelo }
}

export async function runLoop(argv: string[], cwd: string, transcriptDir: string): Promise<number> {
  const chat = hasFlag(argv, 'chat')
  const prompt = flag(argv, 'prompt')
  const style = outputStyleOf(argv)
  const { shared, modelo } = loopSetup(argv, cwd, transcriptDir)
  // El buzon arranca ANTES del registro y del primer turno: su env
  // (THYROX_CODE_MESSAGING_SOCKET) tiene que estar exportado antes de que
  // cualquier hook SessionStart pueda hacer un snapshot de process.env.
  const stopMessaging = await startMessagingInboxAtLaunch(flag(argv, 'messaging-socket-path'))
  // Publica sessions/<pid>.json ANTES del primer turno: quien lista
  // sesiones ve ésta desde que arranca, no sólo tras la primera respuesta.
  await registerSessionAtLaunch(flag(argv, 'name') ?? process.env.THYROX_CODE_SESSION_NAME)

  try {
    /** Un turno completo: dibuja su flujo y devuelve su resultado. */
    const runTurn = async (texto: string, resume: string | undefined) => {
      const gen = streamLoop({ ...shared, prompt: texto, resume })
      /** Turnos cuyo texto ya salió por deltas: su `text` no se vuelve a imprimir. */
      const drawnByDelta = new Set<number>()
      let turn = 0
      let usage: Usage = { ...USAGE_CERO }
      let step = await gen.next()
      while (!step.done) {
        const e = step.value
        if (e.type === 'turn_start') turn = e.turn
        if (e.type === 'session_start') adoptLoopSessionId(e.sessionId, resume !== undefined)
        if (e.type === 'done') usage = e.result.usage
        // El `--json` final y el flujo `json` son cosas distintas: el primero
        // imprime el resultado, el segundo la conversación entera.
        if (!(hasFlag(argv, 'json') && style !== 'json')) {
          // El delta se escribe SIN salto de línea y marca el turno como ya
          // dibujado, para que su `text` no lo repita. Sin esa marca el usuario
          // leería la misma respuesta dos veces.
          if (e.type === 'text_delta' && style === 'text') {
            process.stdout.write(e.text)
            drawnByDelta.add(e.turn)
          } else if (e.type === 'text' && drawnByDelta.has(e.turn)) {
            process.stdout.write('\n')
          } else {
            const line = renderEvent(e, style)
            if (line !== null) process.stdout.write(`${line}\n`)
          }
        }
        step = await gen.next()
      }
      const r = step.value
      if (hasFlag(argv, 'json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`)
      if (hasFlag(argv, 'status-line')) {
        process.stdout.write(`${renderStatusLine({ model: modelo, turn, usage, usd: r.usd })}\n`)
      }
      return r
    }

    if (!chat) {
      const r = await runTurn(prompt as string, flag(argv, 'resume'))
      return r.stop === 'end_turn' ? 0 : 1
    }

    // Conversación: una línea de stdin por turno, reanudando SIEMPRE la misma
    // sesión. Reanudar es lo que hace que el segundo turno vea al primero; sin
    // eso serían N sesiones sueltas que comparten terminal y nada más.
    let sesion = flag(argv, 'resume')
    let ultimo = 0
    for await (const line of stdinLines()) {
      const texto = line.trim()
      if (!texto) continue
      if (texto === '/salir' || texto === '/exit') break
      if (texto === '/rename' || texto.startsWith('/rename ')) {
        const requestedName = texto === '/rename' ? undefined : texto.slice('/rename '.length).trim()
        process.stdout.write(`${await renameCurrentSession(requestedName)}\n`)
        continue
      }
      const r = await runTurn(texto, sesion)
      sesion = r.sessionId
      ultimo = r.stop === 'end_turn' ? 0 : 1
    }
    return ultimo
  } finally {
    await stopMessaging?.()
  }
}
