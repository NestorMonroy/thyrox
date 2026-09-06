#!/usr/bin/env bun
/**
 * El binario del harness (T-009, T-038, T-039, T-040, T-041, T-044).
 *
 * Dibuja el **flujo de eventos** de `streamLoop`, no un resumen aparte: si un
 * estado no está en el flujo, la interfaz no lo puede inventar, y si está, lo
 * ven por igual esta CLI, el diario y cualquier otro consumidor.
 *
 * `--provider recorded` corre contra turnos grabados en un JSON: es la única
 * vía ejecutable en este contenedor, que no tiene credencial de modelo.
 * `--provider http` exige `ANTHROPIC_API_KEY` y falla diciendo por qué si no
 * está — nunca en silencio.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { OUTPUT_STYLES, renderEvent, renderStatusLine, type OutputStyle } from '../src/cli/render.ts'
import { selectTests, type ImpactConfig } from '../src/testing/impact.ts'
import { changedPaths, fsIo } from '../src/testing/io.ts'
import { assessAll, type TaskPremise } from '../../../task/premises.ts'
import { fsPremiseIo, readPremises } from '../../../task/io.ts'
import { parseRstTasks } from '../../../task/rst.ts'
import { taskTools } from '../src/tools/tasks.ts'
import { STORE_PATH } from '../src/observability/store.ts'
import { resumeChoices } from '../src/cli/resume.ts'
import { checkWorkbench, scaffoldWorkbench } from '../src/workbench/manifest.ts'
import { streamLoop } from '../src/loop.ts'
import { AnthropicHttpProvider } from '../src/provider/anthropicHttp.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { projectSlug } from '../src/session.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import { agentTool, type AgentDefinition } from '../src/tools/agent.ts'
import { skillTool } from '../src/tools/skill.ts'
import { SkillRegistry } from '../src/skills/registry.ts'
import { registerBundledSkills } from '../src/skills/bundled.ts'
import {
  appendClaim, findOverlaps, ledgerPathFor, newClaimId, readLedger, whoHas,
  type ClaimRecord,
} from '../src/cowork/claims.ts'
import type { AssistantTurn, Provider, Usage } from '../src/types.ts'
import { USAGE_CERO } from '../src/types.ts'
import type { HookConfig } from '../src/hooks.ts'
import type { PermissionPolicy } from '../src/permission.ts'
import { loadSettings } from '@thyrox/config/load'

const AYUDA = `harness — el bucle de agente, nativo

  bun run bin/harness.ts --prompt "..." [opciones]

  --prompt <texto>        lo que se le pide al modelo (obligatorio, salvo --chat/--sessions)
  --chat                  conversación: una línea de stdin por turno, misma sesión
  --provider <n>          recorded (por defecto) | http
  --grabacion <ruta>      JSON con los turnos grabados (provider recorded)
  --model <id>            identificador completo, nunca alias
  --system <texto>        prompt de sistema
  --cwd <ruta>            directorio de trabajo de las herramientas
  --transcript-dir <ruta> dónde vive el JSONL (por defecto ~/.harness/<proyecto>)
  --store <ruta>          agent_store.sqlite3 donde el harness escribe la fila de
                          cada subagente (source=harness). Sin él, la herramienta
                          Agent sigue usable pero no registra nada
  --agent-defs <ruta>     JSON {tipo: {model, systemPrompt, tools, maxTurns}} con
                          las definiciones de subagente por subagent_type
  --resume <sesion>       reanuda una sesión por id
  --sessions              lista las sesiones reanudables y sale
  --max-turns <n>         corte del bucle (por defecto 20)
  --settings <ruta>       JSON con las claves "hooks" y "permissions"
  --settings-source <n>   project: lee <cwd>/.claude/settings.json (+ .local.json)
  --config-origin         imprime de qué fuente salió cada clave y sale
  --output-style <n>      text (por defecto) | json | quiet
  --stream                pide el turno como SSE y escribe el texto conforme llega
  --select-tests          imprime QUÉ pruebas correr para los cambios del árbol,
                          con su denominador y su ceguera — sin ejecutarlas
  --import-tasks          importa las casillas sin marcar de un --rst al tablero
  --check-premises        mide las premisas declaradas (--premises <json>) contra
                          el árbol; --strict sale 1 sólo ante overclaimed
  --workbench-new <slug>  andamia un banco de trabajo en .claude/eventos/ y
                          nombra lo que le falta para ser conforme
  --workbench-check <dir> mide un banco contra las cinco claves; con --strict
                          sale 1 si hay problemas
  --status-line           imprime la línea de estado al terminar
  --journal <ruta>        diario de eventos JSONL
  --json                  imprime el resultado final como JSON

  Claim ledger de coordinación (T-101) — texto JSONL versionado, no el store:
  --claim <ruta>          reserva una ruta; exige --owner y --branch. Rehúsa si
                          otro dueño ya la tiene, salvo --force
  --release <ruta>        libera una reserva; exige --owner
  --who-has <ruta>        imprime quién tiene reservas que solapan la ruta
  --overlap               imprime los solapes entre dueños distintos; sale 3 si hay
  --owner <n>             quién reserva            --branch <n>  su rama
  --task <n>              tarea que motiva          --ledger <ruta>  ledger explícito
  --force                 fuerza --claim sobre una reserva ajena
`

function arg(argv: string[], nombre: string): string | undefined {
  const i = argv.indexOf(`--${nombre}`)
  return i >= 0 ? argv[i + 1] : undefined
}

function providerFor(argv: string[]): Provider {
  const cual = arg(argv, 'provider') ?? 'recorded'
  if (cual === 'http') return new AnthropicHttpProvider()
  const ruta = arg(argv, 'grabacion')
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
  const ruta = arg(argv, 'agent-defs')
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

type Settings = { hooks?: HookConfig; permissions?: PermissionPolicy }

/**
 * La configuración, por `@thyrox/config` (T-044).
 *
 * No se parsea JSON a mano: la precedencia de las fuentes, la acumulación de
 * hooks y el origen por clave son del paquete, y duplicarlos aquí sería una
 * segunda implementación de las mismas reglas que nadie sincroniza.
 *
 * `--settings` explícito gana sobre el árbol, porque es una orden de esta
 * invocación y no una preferencia del proyecto.
 */
function loadFrom(argv: string[], cwd: string) {
  const explicito = arg(argv, 'settings')
  if (explicito) {
    return loadSettings([{ source: 'flagSettings', path: explicito }])
  }
  if (arg(argv, 'settings-source') !== 'project') {
    return { settings: {}, origin: {}, loaded: [], errors: [] }
  }
  return loadSettings([
    { source: 'projectSettings', path: join(cwd, '.claude', 'settings.json') },
    { source: 'localSettings', path: join(cwd, '.claude', 'settings.local.json') },
  ])
}

function settingsFor(argv: string[], cwd: string): Settings {
  const r = loadFrom(argv, cwd)
  for (const e of r.errors) {
    // Un archivo ilegible avisa y NO tumba el arranque: quedarse sin sesión
    // por una coma de más en un settings es peor que correr sin ese archivo.
    process.stderr.write(`aviso: ${e.path} — ${e.message}; se ignora\n`)
  }
  return {
    hooks: r.settings.hooks as Settings['hooks'],
    permissions: r.settings.permissions as Settings['permissions'],
  }
}

function outputStyleOf(argv: string[]): OutputStyle {
  const v = arg(argv, 'output-style') ?? 'text'
  if (!(OUTPUT_STYLES as readonly string[]).includes(v)) {
    throw new Error(`--output-style desconocido: ${v}. Los válidos son: ${OUTPUT_STYLES.join(', ')}`)
  }
  return v as OutputStyle
}

/**
 * `--select-tests` (T-050): el subconjunto derivado, impreso y NO ejecutado.
 *
 * Que sea un comando y no una biblioteca es lo que lo hace usable desde
 * cualquier repo, incluidos los cuatro que no son este paquete. Y que
 * imprima en vez de ejecutar es deliberado: quien decide correr es quien
 * lee la ceguera, no el selector.
 */
/**
 * `--check-premises` (T-056): mide las premisas declaradas contra el árbol.
 *
 * La descripción de una tarea es una hipótesis fechada. Este comando la
 * convierte en medición y publica su denominador — cuántas se pudieron medir
 * sobre cuántas se declararon. Una tarea sin premisas es `unmeasurable`, NO
 * `verified`: no medir no es haber verificado.
 *
 * `--strict` sale 1 sólo ante `overclaimed`, que es un defecto del árbol.
 * NO sale 1 ante `unmeasurable`: el silencio del instrumento no es un defecto
 * del código, y castigarlo empujaría a declarar premisas falsas por pasar. SÍ
 * ante `stale`, que dice que el enunciado describe un árbol que ya no existe:
 * despachar sobre esa premisa es el costo que el mecanismo entero evita.
 */
function checkPremisesCommand(argv: string[], cwd: string): number {
  const path = arg(argv, 'premises')
  if (!path) {
    // NO se adivina una ruta por convención: un archivo inventado que no está
    // daría un reporte vacío que se lee como «ninguna tarea tiene defectos».
    process.stderr.write(
      'Falta `--premises <archivo.json>`: las premisas se declaran, no se ' +
        'infieren del texto de la tarea. Inferirlas daría un veredicto que ' +
        'parece medido siendo adivinado.\n',
    )
    return 2
  }
  let declaradas: TaskPremise[]
  try {
    const crudo = readPremises(path)
    if (!Array.isArray(crudo)) throw new Error('se esperaba un arreglo de tareas')
    declaradas = crudo as TaskPremise[]
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    return 2
  }

  const reporte = assessAll(declaradas, fsPremiseIo(cwd))
  const ancho = Math.max(2, ...reporte.assessments.map((a) => a.id.length))
  for (const a of reporte.assessments) {
    process.stdout.write(`${a.id.padEnd(ancho)}  ${a.verdict.padEnd(12)}  ${a.reason}\n`)
  }
  // El denominador va SIEMPRE: un conteo sin universo no es un resultado.
  process.stdout.write(`· alcance: ${reporte.measured} de ${reporte.total} tareas medidas\n`)
  process.stdout.write(
    `· Métrica: predicados declarados por tarea, evaluados contra el árbol de ${cwd}.\n`,
  )
  process.stdout.write(
    '· Ciega a: toda premisa que la tarea no declaró — el mecanismo evalúa, no infiere; ' +
      'y a un predicado que se cumple por una razón distinta de la que la tarea supuso.\n',
  )
  // `stale` sale 1 con `--strict` por la misma razón que `overclaimed`: las dos
  // dicen que el enunciado no describe el árbol. `unmeasurable` NO — el
  // silencio del instrumento no es un defecto del código, y castigarlo
  // empujaría a declarar premisas falsas por pasar.
  if (argv.includes('--strict') && reporte.byVerdict.overclaimed + reporte.byVerdict.stale > 0) return 1
  return 0
}

/**
 * `--import-tasks` (T-062): las casillas de un `tareas-<slug>.rst` al tablero.
 *
 * Importa, NO sincroniza. El RST no tiene columna de asociación ni distingue
 * «en curso» de «pendiente», así que escribir de vuelta exigiría inventar lo
 * que el formato no guarda. Lo que el cuerpo nombra tras «depende de» entra
 * como `blocked_by`, y es una cota inferior declarada: sólo 14 entradas de los
 * 139 archivos del corpus declaran bloqueo en prosa.
 *
 * La reimportación deduplica por el **id del RST**, que va como prefijo del
 * asunto (`T-021 — …`). No por el asunto entero: la primera versión comparaba
 * la prosa y fallaba por un carácter, y no por el ordinal del tablero, que es
 * del proyecto mientras el del RST es de su iniciativa — dos numeraciones
 * distintas cuya confusión sobreescribiría filas ajenas.
 */
async function importTasksCommand(argv: string[], cwd: string): Promise<number> {
  const rst = arg(argv, 'rst')
  if (!rst) {
    process.stderr.write(
      'Falta `--rst <archivo.rst>`: el puente lee un `tareas-<slug>.rst` concreto. ' +
        'Adivinar la iniciativa por convención importaría el archivo equivocado en silencio.\n',
    )
    return 2
  }
  const db = arg(argv, 'db') ?? join(cwd, '.claude', 'agent-results', 'agent_store.sqlite3')
  let texto: string
  try {
    texto = readFileSync(rst, 'utf8')
  } catch {
    process.stderr.write(`No se pudo leer ${rst}\n`)
    return 2
  }

  const leidas = parseRstTasks(texto)
  const pendientes = leidas.filter((t) => !t.done)
  const seco = argv.includes('--dry-run')
  const herramientas = taskTools({ dbPath: db, sessionId: 'import' })
  const crear = herramientas.find((t) => t.name === 'TaskCreate')!
  const listar = herramientas.find((t) => t.name === 'TaskList')!
  // El importador de RST no corre en una sesión: no hay hilo, y las task
  // tools lo ignoran. `messages` va vacío por eso, no por omisión.
  const ctx = { cwd, sessionId: 'import', abort: new AbortController().signal, messages: [] }

  /** El id del RST tal como el asunto lo lleva de prefijo. */
  const idDelAsunto = (asunto: string) => asunto.split(' — ')[0]!.trim()

  const yaEstan = seco
    ? new Set<string>()
    : new Set(
        (JSON.parse((await listar.run({ limit: 10000 }, ctx)).content) as { subject: string }[]).map((t) =>
          idDelAsunto(t.subject),
        ),
      )

  let importadas = 0
  for (const tarea of pendientes) {
    const asunto = `${tarea.id} — ${tarea.subject}`
    if (yaEstan.has(tarea.id)) continue
    if (!seco) {
      await crear.run(
        {
          subject: asunto,
          description: `Importada de ${rst}:${tarea.line}. Su condición de cierre vive en el RST.`,
        },
        ctx,
      )
    }
    yaEstan.add(tarea.id)
    importadas++
  }

  process.stdout.write(`· importadas: ${importadas} de ${pendientes.length} pendientes (${leidas.length} casillas leídas)\n`)
  process.stdout.write(`· Métrica: casillas \`- [ ]\` de ${rst}, con su id y su asunto recompuesto.\n`)
  process.stdout.write(
    '· Ciega a: la asociación que el RST no declara — el formato no tiene columna de bloqueo, ' +
      'y sólo 14 entradas del corpus la nombran en prosa; y al estado `in_progress`, que la casilla no distingue.\n',
  )
  if (seco) process.stdout.write('· --dry-run: nada se escribió en el tablero.\n')
  return 0
}

function selectTestsCommand(argv: string[], cwd: string): number {
  // Lee el settings del PROYECTO sin exigir `--settings-source project`: ese
  // interruptor existe para que una sesión no herede configuración sin
  // pedirlo, y aquí la configuración del proyecto es la premisa del
  // subcomando — sin ella no hay nada que derivar.
  const explicitPath = arg(argv, 'settings')
  const r = explicitPath
    ? loadSettings([{ source: 'flagSettings', path: explicitPath }])
    : loadSettings([
        { source: 'projectSettings', path: join(cwd, '.claude', 'settings.json') },
        { source: 'localSettings', path: join(cwd, '.claude', 'settings.local.json') },
      ])
  for (const e of r.errors) process.stderr.write(`aviso: ${e.path} — ${e.message}\n`)
  const impactConfig = r.settings.testImpact as
    | (Omit<ImpactConfig, 'runner' | 'fullRunner'> & { testGlob: string; runner: string; fullRunner: string })
    | undefined
  if (!impactConfig) {
    // NO se adivina un default: una convención inventada produciría un
    // subconjunto que se lee como derivado siendo adivinado.
    process.stderr.write(
      'Falta `testImpact` en los settings del proyecto: sin él no hay estrategia, ' +
        'corredor ni disparadores transversales que declarar, y adivinarlos daría un ' +
        'subconjunto que parece derivado sin serlo.\n',
    )
    return 2
  }
  const selection = selectTests(changedPaths(cwd), {
    strategy: impactConfig.strategy,
    runner: (paths) => `${impactConfig.runner} ${paths.join(' ')}`,
    fullRunner: impactConfig.fullRunner,
    crossCutting: impactConfig.crossCutting,
    pathPattern: impactConfig.pathPattern,
  }, fsIo(cwd, impactConfig.testGlob))

  const { selected, total } = selection.denominator
  if (selection.crossCutting.triggered) {
    process.stdout.write(
      `· cambio transversal: ${selection.crossCutting.byPath} ` +
        `(regla ${selection.crossCutting.rule})\n`,
    )
  }
  process.stdout.write(selection.command === null
    ? '· sin cambios que impacten pruebas: nada que correr\n'
    : `${selection.command}\n`)
  // El denominador y la ceguera van SIEMPRE: un subconjunto sin ellos se lee
  // como cobertura completa.
  process.stdout.write(`· alcance: ${selected} de ${total} archivos de prueba\n`)
  process.stdout.write(`· Métrica: ${selection.metric}\n`)
  process.stdout.write(`· Ciega a: ${selection.blindTo}\n`)
  return 0
}

/**
 * `--claim` / `--release` / `--who-has` / `--overlap` (T-101): el claim ledger.
 *
 * Opera sobre un LEDGER DE TEXTO JSONL versionado, no sobre el store SQLite: la
 * reserva viaja por git y se puede apender con `echo >>` sin el harness
 * (:ref:`h-docs-1025`). Este comando es la vía del harness; la del humano es un
 * `echo` de la misma línea.
 */
function claimsCommand(argv: string[], cwd: string): number {
  const ledger = ledgerPathFor(cwd, arg(argv, 'ledger'))

  if (argv.includes('--overlap')) {
    const pairs = findOverlaps(readLedger(ledger))
    if (pairs.length === 0) {
      process.stdout.write('· sin solapes entre dueños distintos.\n')
      return 0
    }
    for (const [a, b] of pairs) {
      process.stdout.write(`SOLAPE  «${a.owner}» (${a.path}) ↔ «${b.owner}» (${b.path})\n`)
    }
    return 3
  }

  const whoPath = arg(argv, 'who-has')
  if (whoPath !== undefined) {
    const held = whoHas(readLedger(ledger), whoPath)
    if (held.length === 0) {
      process.stdout.write(`· nadie tiene reservas que solapen «${whoPath}».\n`)
      return 0
    }
    for (const c of held) {
      process.stdout.write(`${c.owner}\t${c.path}\t${c.branch}${c.task ? `\t${c.task}` : ''}\t${c.id}\n`)
    }
    return 0
  }

  const claimPath = arg(argv, 'claim')
  const releasePath = arg(argv, 'release')
  const target = claimPath ?? releasePath
  if (target === undefined) {
    process.stderr.write('Falta la ruta: --claim <ruta> | --release <ruta> | --who-has <ruta> | --overlap\n')
    return 2
  }
  const owner = arg(argv, 'owner')
  if (!owner) {
    process.stderr.write('Falta --owner <quién reserva>.\n')
    return 2
  }
  const branch = arg(argv, 'branch') ?? ''
  const op: ClaimRecord['op'] = claimPath !== undefined ? 'claim' : 'release'

  if (op === 'claim') {
    if (!branch) {
      process.stderr.write('Falta --branch <rama> para reservar.\n')
      return 2
    }
    // Surfacea el solape ANTES de escribir: rehúsa doblar la reserva de otro
    // dueño salvo --force. Es la mitad «que no se estén tocando los mismos
    // archivos» de la directiva.
    const ajenos = whoHas(readLedger(ledger), target).filter((c) => c.owner !== owner)
    if (ajenos.length > 0 && !argv.includes('--force')) {
      for (const c of ajenos) {
        process.stderr.write(`CONFLICTO  «${c.owner}» ya tiene «${c.path}» (rama ${c.branch}); usa --force para reservar igual.\n`)
      }
      return 3
    }
  }

  const rec: ClaimRecord = {
    id: newClaimId(),
    op,
    path: target,
    owner,
    branch,
    at: new Date().toISOString(),
  }
  const task = arg(argv, 'task')
  if (task) rec.task = task
  appendClaim(ledger, rec)
  process.stdout.write(`${op === 'claim' ? 'reservado' : 'liberado'}: ${JSON.stringify(rec)}\n`)
  return 0
}

/**
 * El banco de trabajo (#80). `--workbench-new` andamia; `--workbench-check`
 * mide. Por defecto **no bloquea**: medido al cablearlo, 0 de 140 bancos de
 * `.claude/eventos/` cumplen las cinco claves (95 sin `manifiesto.json`), así
 * que un `--strict` de día 1 marcaría rojo por deuda heredada — el mismo
 * defecto que `artefactos-minimos-iniciativa.md` documentó al graduar el suyo.
 * La regla es prospectiva: se paga al crear un banco nuevo.
 */
function workbenchCommand(argv: string[], cwd: string): number {
  const nuevo = arg(argv, 'workbench-new')
  if (nuevo !== undefined) {
    const dir = scaffoldWorkbench(arg(argv, 'eventos') ?? join(cwd, '.claude', 'eventos'), nuevo)
    process.stdout.write(`${dir}\n`)
    for (const p of checkWorkbench(dir)) {
      process.stderr.write(`  falta ${p.key ?? ''}: ${p.problem}\n`)
    }
    return 0
  }
  const objetivo = arg(argv, 'workbench-check')
  const problemas = checkWorkbench(objetivo!)
  for (const p of problemas) process.stdout.write(`  ${p.problem}\n`)
  process.stdout.write(`workbench-check: ${problemas.length} problema(s) en ${objetivo}\n`)
  return problemas.length > 0 && argv.includes('--strict') ? 1 : 0
}

export async function main(argv: string[]): Promise<number> {
  const cwd = arg(argv, 'cwd') ?? process.cwd()
  const transcriptDir = arg(argv, 'transcript-dir') ?? join(homedir(), '.harness', projectSlug(cwd))

  if (arg(argv, 'workbench-new') !== undefined || arg(argv, 'workbench-check') !== undefined) {
    return workbenchCommand(argv, cwd)
  }
  if (argv.includes('--select-tests')) return selectTestsCommand(argv, cwd)
  if (argv.includes('--check-premises')) return checkPremisesCommand(argv, cwd)
  if (argv.includes('--import-tasks')) return importTasksCommand(argv, cwd)
  if (
    argv.includes('--claim') || argv.includes('--release') ||
    argv.includes('--who-has') || argv.includes('--overlap')
  ) {
    return claimsCommand(argv, cwd)
  }

  if (argv.includes('--config-origin')) {
    const r = loadFrom(argv, cwd)
    for (const e of r.errors) process.stderr.write(`aviso: ${e.path} — ${e.message}\n`)
    for (const [clave, fuente] of Object.entries(r.origin)) {
      process.stdout.write(`${clave}\t${fuente}\n`)
    }
    return 0
  }

  if (argv.includes('--sessions')) {
    const opciones = resumeChoices(transcriptDir)
    if (opciones.length === 0) {
      process.stdout.write(`no hay sesiones en ${transcriptDir}\n`)
      return 0
    }
    for (const o of opciones) process.stdout.write(`${o.id}  ${o.label}\n`)
    return 0
  }

  const chat = argv.includes('--chat')
  const prompt = arg(argv, 'prompt')
  if ((!prompt && !chat) || argv.includes('--help')) {
    process.stdout.write(AYUDA)
    return prompt || chat ? 0 : 2
  }

  const style = outputStyleOf(argv)
  const conf = settingsFor(argv, cwd)
  const provider = providerFor(argv)
  const modelo = arg(argv, 'model') ?? 'claude-opus-5'
  // La herramienta `Agent` se cablea AQUÍ, no en `CORE_TOOLS`: necesita datos de
  // ejecución (provider, transcriptDir, storePath) que el registro estático no
  // puede fijar, y su módulo importa `CORE_TOOLS` — meterla en el registro sería
  // un ciclo. El hijo hereda `CORE_TOOLS` (sin `Agent`), así que la profundidad
  // queda acotada por construcción, además del guard `maxDepth`.
  const storePath = arg(argv, 'store')
  // La herramienta `Skill` se cablea AQUÍ por la misma razón que `Agent`:
  // necesita el `SkillRegistry` en tiempo de ejecución, que `CORE_TOOLS` no
  // puede llevar sin cablearle un registry al núcleo (#49).
  // El subsistema de tareas se cablea AQUÍ en el run principal, no sólo en el
  // `import`: el tablero (`dbPath`) y su sesión (`sessionId`) los comparten las
  // herramientas y el gate del recordatorio, para que releer el store dé lo
  // que las herramientas escribieron (DEC-TASK-01).
  const taskStore = arg(argv, 'store') ?? STORE_PATH
  const taskSession = arg(argv, 'session') ?? arg(argv, 'resume') ?? 'harness'
  const tools = [
    ...CORE_TOOLS,
    ...taskTools({ dbPath: taskStore, sessionId: taskSession }),
    agentTool({
      provider,
      transcriptDir,
      definitions: agentDefsFor(argv),
      defaultModel: modelo,
      hooks: conf.hooks,
      journalPath: arg(argv, 'journal'),
      storePath,
    }),
    skillTool(buildSkillRegistry()),
  ]
  const shared = {
    provider,
    model: modelo,
    system: arg(argv, 'system') ?? 'Eres un agente que trabaja con herramientas. Responde en español.',
    tools,
    cwd,
    transcriptDir,
    maxTurns: Number(arg(argv, 'max-turns') ?? 20),
    hooks: conf.hooks,
    permissions: conf.permissions,
    journalPath: arg(argv, 'journal'),
    stream: argv.includes('--stream'),
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
      if (!(argv.includes('--json') && style !== 'json')) {
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
    if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`)
    if (argv.includes('--status-line')) {
      process.stdout.write(`${renderStatusLine({ model: modelo, turn, usage, usd: r.usd })}\n`)
    }
    return r
  }

  if (!chat) {
    const r = await runTurn(prompt as string, arg(argv, 'resume'))
    return r.stop === 'end_turn' ? 0 : 1
  }

  // Conversación: una línea de stdin por turno, reanudando SIEMPRE la misma
  // sesión. Reanudar es lo que hace que el segundo turno vea al primero; sin
  // eso serían N sesiones sueltas que comparten terminal y nada más.
  let sesion = arg(argv, 'resume')
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

/** Las líneas de stdin, una a una. */
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

if (import.meta.main) {
  try {
    process.exit(await main(process.argv.slice(2)))
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(2)
  }
}
