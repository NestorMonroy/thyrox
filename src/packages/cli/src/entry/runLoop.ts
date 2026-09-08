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

function providerFor(argv: string[]): Provider {
  const cual = flag(argv, 'provider') ?? 'recorded'
  if (cual === 'http') return new AnthropicHttpProvider()
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
  for await (const chunk of Bun.stdin.stream()) {
    rest += new TextDecoder().decode(chunk)
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
export async function runLoop(argv: string[], cwd: string, transcriptDir: string): Promise<number> {
  const chat = hasFlag(argv, 'chat')
  const prompt = flag(argv, 'prompt')
  const style = outputStyleOf(argv)
  const conf = settingsFor(argv, cwd)
  const provider = providerFor(argv)
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
  const tools = [
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
  const shared = {
    provider,
    model: modelo,
    system: systemPromptFor(argv, cwd).text,
    tools,
    cwd,
    transcriptDir,
    maxTurns: Number(flag(argv, 'max-turns') ?? 20),
    hooks: conf.hooks,
    permissions: conf.permissions,
    journalPath: flag(argv, 'journal'),
    stream: hasFlag(argv, 'stream'),
    taskReminder: { dbPath: taskStore, sessionId: taskSession },
  }

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
    const r = await runTurn(texto, sesion)
    sesion = r.sessionId
    ultimo = r.stop === 'end_turn' ? 0 : 1
  }
  return ultimo
}
