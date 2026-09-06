// save_result.mjs — el tercer escritor del registro de agentes.
//
// Porta `kaupamex-docs: .claude/hooks/save-agent-result.mjs` (134 lineas), el
// hook `SubagentStop` que lee el transcript de un subagente, extrae su ultimo
// mensaje de asistente y lo apenda —con su uso de tokens— a un log
// append-only.
//
// Que viaja y que no (DEC-04). Viaja el MECANISMO: leer el payload, elegir el
// transcript correcto, deduplicar el uso por `message.id`, ponderar el coste
// equivalente y componer la entrada. NO viaja el DESTINO del log: la fuente lo
// derivaba con `dirname(dirname(here))` —aritmetica de ruta que ancla al
// consumidor— y aqui es parametro. Sin destino, `main` rehusa: un default
// fabricado escribiria el registro de un repo en el de otro, y nadie lo
// notaria hasta necesitarlo.
//
// El fichero conserva la extension `.mjs` a proposito: el consumidor lo invoca
// con `node`, que es lo que el harness cablea en su `SubagentStop`. `bun` lo
// importa igual para la suite.
//
// NUNCA rompe el flujo: `main` traga todo error y el proceso sale 0.

import { readFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

/** El nombre del registro es del mecanismo; el directorio, del consumidor. */
export const LOG_BASENAME = 'registro-de-agentes.md'

/**
 * Resuelve el archivo de registro a partir de los argumentos y del entorno.
 * Devuelve `null` cuando ninguno declara destino — rehusar es la conducta.
 */
export function resolveLogFile(args = {}, env = {}) {
  const dir = args['--log-dir'] || env.AGENT_RESULTS_DIR
  return dir ? join(String(dir), LOG_BASENAME) : null
}

/** `--clave valor` -> objeto. Un flag sin valor no aporta destino. */
export function parseArgs(argv = []) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      out[argv[i]] = argv[i + 1]
      i += 1
    }
  }
  return out
}

/**
 * El transcript DEL SUBAGENTE llega en `agent_transcript_path`;
 * `transcript_path` es el de la SESION PRINCIPAL, que el harness mete en todo
 * payload. Leer solo el segundo no vacia el dato: lo llena con el uso de la
 * sesion entera — o falla si el payload no lo trae (H-DOCS-198: medido, el
 * disparo real del 2026-08-18 no apendo nada mientras `register_agent_session`,
 * que ya preferia `agent_transcript_path`, si capturo el uso del mismo evento).
 */
export function transcriptPath(payload = {}) {
  return payload.agent_transcript_path || payload.transcript_path || null
}

/**
 * Uso agregado de un transcript, deduplicado por `message.id`.
 *
 * H-DOCS-136: el uso se INDEXA por id, no se acumula. Un turno que llama a
 * varias herramientas emite un mensaje de asistente por bloque, todos con el
 * mismo id y el mismo uso — sumarlos cuenta ese turno N veces (medido: 3880
 * mensajes sobre 1983 ids unicos, ~2x de inflacion). La doc oficial prescribe
 * el arreglo (`ccdoc: cost-tracking.md`): *"deduplicate by ID to avoid
 * double-counting"*; en el id raro cuyas cifras difieren, *"the final message
 * in a group typically contains the accurate total"* — gana el ultimo.
 */
export function usageFromLines(lines = []) {
  const porId = new Map()
  for (const line of lines) {
    if (!line.trim()) continue
    let obj
    try { obj = JSON.parse(line) } catch { continue }
    const msg = obj.message
    if (obj.type !== 'assistant' || !msg || msg.role !== 'assistant') continue
    const u = msg.usage
    if (!u) continue
    porId.set(msg.id, {
      input: u.input_tokens || 0,
      cacheCreation: u.cache_creation_input_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      output: u.output_tokens || 0,
    })
  }
  const uso = { input: 0, cacheCreation: 0, cacheRead: 0, output: 0, turns: porId.size }
  for (const v of porId.values()) {
    uso.input += v.input
    uso.cacheCreation += v.cacheCreation
    uso.cacheRead += v.cacheRead
    uso.output += v.output
  }
  return uso
}

/** El ultimo bloque de texto de asistente no vacio — el reporte final. */
export function lastAssistantText(lines = []) {
  let ultimo = ''
  for (const line of lines) {
    if (!line.trim()) continue
    let obj
    try { obj = JSON.parse(line) } catch { continue }
    const msg = obj.message
    if (obj.type !== 'assistant' || !msg || msg.role !== 'assistant') continue
    const c = msg.content
    if (typeof c === 'string') {
      if (c.trim()) ultimo = c.trim()
    } else if (Array.isArray(c)) {
      const txt = c.filter((b) => b && b.type === 'text' && b.text)
                   .map((b) => b.text).join('\n').trim()
      if (txt) ultimo = txt
    }
  }
  return ultimo
}

/**
 * Coste ponderado en tokens equivalentes de entrada.
 *
 * H-DOCS-1008 (2026-09-02): estos pesos son las RAZONES DE UN SOLO TIER
 * (`tier_3_15`: 3 / 15 / 3.75 / 0.3) aplicadas a todo modelo. Se quedan porque
 * `equiv_cost` es una columna del store que se compara entre 800+ filas y
 * cambiar la formula romperia esa comparacion — pero NO son un precio. El USD
 * sale del catalogo vendorizado, por `src/agents/model_catalog.py`, donde
 * fable-5-1 lee cache a 0.025x de la entrada y no a 0.1x.
 */
/**
 * Los TRES tipos de costo de un subagente, y cuál calcula este módulo.
 *
 * Se declaran porque nombrarlos «el costo» a los tres es el sub-patrón A de
 * `metrica-decide-la-conclusion.md`: un rótulo único sobre métricas mezcladas,
 * que habilita comparaciones falsas. Los tres salen del MISMO uso y dan cifras
 * distintas.
 *
 * - `equiv_tokens` — el que este módulo calcula. Tokens equivalentes de
 *   entrada con los pesos de UN tier (`tier_3_15`: 1 / 1.25 / 0.1 / 5).
 *   Es columna del store y se compara entre filas; **no es un precio**.
 * - `usd` — el precio real, que depende del modelo y del TTL de caché.
 *   Vive en `src/agents/model_catalog.py` (`usage_cost_usd`), no aquí:
 *   `claude-fable-5-1` lee caché a 0.25 y `claude-opus-5` a 0.5, así que un
 *   mismo `equiv_tokens` cuesta distinto según quién lo gastó.
 * - `titular_harness` — lo que el harness reporta al terminar un subagente.
 *   **Excluye `cache_read` por completo**, que es el 98 % del consumo: medido
 *   4.24x de diferencia con el ponderado (H-DOCS-169/170).
 *   `calibration-verified-numbers.md` prohíbe citarlo como costo.
 *
 * El reparto de qué se cita en cada superficie es la tarea #118.
 */
export const COST_KINDS = Object.freeze({
  equiv_tokens: 'src/agents/save_result.mjs (aquí) — ponderado de un tier, comparable entre filas',
  usd: 'src/agents/model_catalog.py — precio real por modelo y TTL',
  titular_harness: 'lo que reporta el harness — excluye cache_read; NO se cita como costo',
})

/**
 * El titular del harness, reconstruido: la suma que **omite** `cache_read`.
 *
 * No se calcula para publicarlo —está prohibido citarlo— sino para que la
 * diferencia con `equivalentCost` sea medible en vez de recordada. Un módulo
 * que sólo expusiera una de las tres cifras deja que las otras dos se
 * confundan con ella.
 */
export function harnessHeadline(usage) {
  return usage.input + usage.cacheCreation + usage.output
}

export function equivalentCost(usage) {
  return Math.round(usage.input + 1.25 * usage.cacheCreation
                    + 0.1 * usage.cacheRead + 5 * usage.output)
}

/**
 * ¿Hay algo que registrar?
 *
 * Un agente cortado por `maxTurns` no deja mensaje final PERO si deja uso
 * (H-DOCS-106: 240 708 tokens, salida vacia). Registrar solo cuando hay texto
 * esconderia exactamente las ejecuciones que cuestan sin entregar.
 */
export function shouldRecord(text, usage) {
  return Boolean(text) || usage.turns > 0
}

const conMiles = (x) => x.toLocaleString('en-US')

/** La entrada markdown de un agente — el formato que el log ya tiene. */
export function entryFor({ ts, session, transcript, text, usage }) {
  const equiv = equivalentCost(usage)
  const gasto = usage.turns
    ? `- **gasto**: ${conMiles(equiv)} equiv-input · ${usage.turns} turnos · `
      + `${conMiles(Math.round(equiv / usage.turns))}/turno `
      + `(in ${conMiles(usage.input)} · cc ${conMiles(usage.cacheCreation)} · `
      + `cr ${conMiles(usage.cacheRead)} · out ${conMiles(usage.output)})\n`
    : ''
  const cuerpo = text || '_(sin mensaje final — el agente no llegó a cerrar)_'
  return `\n## ${ts}\n- **session**: ${session}\n`
    + `- **transcript**: ${basename(transcript)}\n${gasto}\n${cuerpo}\n\n---\n`
}

const CABECERA = '# Registro de agentes (auto)\n\n'
  + 'Reporte final de cada subagente, capturado por el hook SubagentStop. '
  + 'Append-only.\n\n---\n'

/** Apenda la entrada, creando el directorio y la cabecera si hacen falta. */
export function appendEntry(logFile, entry) {
  const dir = logFile.slice(0, logFile.lastIndexOf('/'))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(logFile)) appendFileSync(logFile, CABECERA)
  appendFileSync(logFile, entry)
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const logFile = resolveLogFile(parseArgs(argv), env)
  if (!logFile) {
    process.stderr.write(
      'save_result: falta el destino del registro. Declararlo con '
      + '--log-dir <ruta> o AGENT_RESULTS_DIR. NO se inventa un default: '
      + 'escribiria el registro de un repo en el de otro, en silencio.\n')
    return
  }

  let raw = ''
  try { raw = readFileSync(0, 'utf8') } catch { return }
  let payload = {}
  try { payload = JSON.parse(raw || '{}') } catch { return }

  const transcript = transcriptPath(payload)
  if (!transcript || !existsSync(transcript)) return

  let lines
  try { lines = readFileSync(transcript, 'utf8').split('\n') } catch { return }

  const usage = usageFromLines(lines)
  const text = lastAssistantText(lines)
  if (!shouldRecord(text, usage)) return

  const ts = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const entry = entryFor({ ts, session: payload.session_id || 'unknown',
                           transcript, text, usage })
  try { appendEntry(logFile, entry) } catch { return }
}

// Sólo como guion: la suite lo importa y no debe disparar el efecto.
if (import.meta.url === `file://${process.argv[1]}`) {
  try { main() } catch { /* nunca rompe el flujo */ }
  process.exit(0)
}
