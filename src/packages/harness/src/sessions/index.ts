/**
 * Sesiones: bifurcación, reanudación e índice (T-028, T-029, T-030).
 *
 * Las tres giran alrededor del mismo hecho medido: **la caché de prompt está
 * indexada por modelo** (:ref:`h-docs-1013`, matriz de 4×4 con 32 llamadas).
 * Bifurcar conserva el prefijo y por tanto la caché; reanudar con otro modelo
 * la pierde entera, y eso se puede cuantificar antes de pagarlo.
 */
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { estimateMessagesTokens } from '../context/autocompact.ts'
import { Transcript, readTranscript } from '../transcript.ts'
import type { Message, Usage } from '../types.ts'
import { USAGE_CERO } from '../types.ts'

export type ForkedSession = {
  id: string
  transcriptPath: string
  transcript: Transcript
  previous: Message[]
  forkedFrom: string
}

/**
 * Bifurca una sesión: la hija arranca con el historial del padre y un id propio.
 *
 * Se **copia** el archivo en vez de compartirlo: el padre tiene que poder
 * seguir escribiendo sin que la hija le meta líneas. La marca `fork` en la
 * primera línea de la hija es lo que hace reconstruible el árbol después.
 */
export function forkSession(opts: { cwd: string; transcriptDir: string; from: string }): ForkedSession {
  const origen = join(opts.transcriptDir, `${opts.from}.jsonl`)
  if (!existsSync(origen)) {
    throw new Error(`no se puede bifurcar: no existe el transcript de ${opts.from}`)
  }
  const id = randomUUID()
  const transcriptPath = join(opts.transcriptDir, `${id}.jsonl`)
  copyFileSync(origen, transcriptPath)
  const transcript = new Transcript(transcriptPath, id)
  transcript.appendSystem('fork', opts.from)
  return { id, transcriptPath, transcript, previous: readTranscript(transcriptPath), forkedFrom: opts.from }
}

export type ResumePlan = {
  fromModel: string | null
  toModel: string
  reusesCache: boolean
  /** Tokens del prefijo que hay que volver a escribir si la clave cambia. */
  rewriteTokens: number
  reason: string
}

/**
 * Qué cuesta reanudar esta sesión con este modelo.
 *
 * El modelo de origen sale del **transcript**, no de un alias: `sonnet` resuelve
 * a `claude-sonnet-4-5` o a `claude-sonnet-5` según el proveedor, así que
 * comparar alias contra alias no dice nada sobre la clave de caché.
 */
export function planResume(opts: { transcriptPath: string; toModel: string }): ResumePlan {
  const fromModel = lastModel(opts.transcriptPath)
  const mensajes = readTranscript(opts.transcriptPath)
  const prefijo = estimateMessagesTokens(mensajes)
  if (fromModel === null) {
    return {
      fromModel, toModel: opts.toModel, reusesCache: false, rewriteTokens: prefijo,
      reason: 'el transcript no declara ningun turno del modelo: no hay clave previa que reusar',
    }
  }
  if (fromModel === opts.toModel) {
    return { fromModel, toModel: opts.toModel, reusesCache: true, rewriteTokens: 0,
      reason: `mismo modelo (${fromModel}): la clave de cache no cambia` }
  }
  return {
    fromModel, toModel: opts.toModel, reusesCache: false, rewriteTokens: prefijo,
    reason: `la clave de cache lleva el modelo: pasar de ${fromModel} a ${opts.toModel} reescribe el prefijo entero`,
  }
}

export type SessionRow = {
  id: string
  path: string
  model: string | null
  turns: number
  usage: Usage
  firstAt: string
  lastAt: string
  forkedFrom: string | null
}

/** Una fila por transcript legible del directorio. Lo que no se puede leer, no cuenta. */
export function indexSessions(transcriptDir: string): SessionRow[] {
  if (!existsSync(transcriptDir)) return []
  const filas: SessionRow[] = []
  for (const archivo of readdirSync(transcriptDir).filter((f) => f.endsWith('.jsonl')).sort()) {
    const fila = leerFila(join(transcriptDir, archivo))
    if (fila) filas.push(fila)
  }
  return filas
}

/** La sesión con actividad más reciente, o `null` si el directorio está vacío. */
export function latestSession(transcriptDir: string): SessionRow | null {
  const filas = indexSessions(transcriptDir)
  if (filas.length === 0) return null
  return filas.reduce((a, b) => (b.lastAt > a.lastAt ? b : a))
}

type Linea = {
  type?: string
  subtype?: string
  content?: string
  sessionId?: string
  timestamp?: string
  message?: { model?: string; usage?: Usage }
}

/** Las líneas de un transcript, saltando las que no se puedan analizar. */
function lineas(path: string): Linea[] {
  const out: Linea[] = []
  for (const cruda of readFileSync(path, 'utf8').split('\n')) {
    if (!cruda.trim()) continue
    try {
      const l = JSON.parse(cruda) as Linea
      if (l && typeof l === 'object' && typeof l.type === 'string') out.push(l)
    } catch {
      // Línea a medias de un escritor interrumpido: se salta, igual que en
      // `readTranscript`. Tumbar el índice entero por una línea perdería
      // todas las demás sesiones del directorio.
    }
  }
  return out
}

/** El último modelo que el transcript declara — el que fijaría la clave al reanudar. */
function lastModel(path: string): string | null {
  if (!existsSync(path)) return null
  let modelo: string | null = null
  for (const l of lineas(path)) {
    if (l.type === 'assistant' && typeof l.message?.model === 'string') modelo = l.message.model
  }
  return modelo
}

function leerFila(path: string): SessionRow | null {
  const ls = lineas(path)
  if (ls.length === 0) return null
  const usage: Usage = { ...USAGE_CERO }
  let turns = 0
  let model: string | null = null
  let forkedFrom: string | null = null
  const sellos: string[] = []
  for (const l of ls) {
    if (typeof l.timestamp === 'string') sellos.push(l.timestamp)
    if (l.subtype === 'fork' && typeof l.content === 'string') forkedFrom = l.content
    if (l.type !== 'assistant') continue
    if (typeof l.message?.model === 'string') model = l.message.model
    const u = l.message?.usage
    if (!u) continue
    turns += 1
    usage.input_tokens += u.input_tokens
    usage.output_tokens += u.output_tokens
    usage.cache_creation_input_tokens += u.cache_creation_input_tokens
    usage.cache_read_input_tokens += u.cache_read_input_tokens
  }
  sellos.sort()
  // El id lo declara la propia línea; una sesión bifurcada hereda las líneas
  // del padre, así que se toma el de la ÚLTIMA — es la que la hija escribió.
  const id = [...ls].reverse().find((l) => typeof l.sessionId === 'string')?.sessionId
  if (!id) return null
  return { id, path, model, turns, usage, firstAt: sellos[0] ?? '', lastAt: sellos.at(-1) ?? '', forkedFrom }
}
