/**
 * Sesión (T-003): identidad, dónde vive su transcript y cómo se reanuda.
 *
 * La ruta imita la del cliente —un directorio por proyecto, un JSONL por
 * sesión— para que la instrumentación existente encuentre nuestros
 * transcripts donde ya sabe mirar.
 */
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { readTranscript, Transcript } from './transcript.ts'
import type { LastTurn } from './session/reconcile.ts'
import { classifyLastTurn, filterUnresolvedToolUses, readTranscriptLines, resumableMessages, sessionEpoch } from './session/reconcile.ts'
import type { Message } from './types.ts'

export type Reconcile = {
  lastTurn: LastTurn
  epoch: number
  priorWorker: boolean
  /** Cuántos `tool_use` huérfanos se retiraron al sanear el historial. */
  rescuedToolUses: number
}

export type Session = {
  id: string
  transcriptPath: string
  transcript: Transcript
  previous: Message[]
  /** El veredicto de reconciliación, sólo presente al reanudar. */
  reconcile?: Reconcile
}

/** El nombre del proyecto a partir de su ruta, con el mismo criterio del cliente. */
export function projectSlug(cwd: string): string {
  return cwd.replace(/[/.]/g, '-')
}

export function openSession(opts: { cwd: string; transcriptDir: string; resume?: string }): Session {
  const id = opts.resume ?? randomUUID()
  const transcriptPath = join(opts.transcriptDir, `${id}.jsonl`)
  if (!opts.resume) {
    return { id, transcriptPath, transcript: new Transcript(transcriptPath, id), previous: [] }
  }
  // Al reanudar NO se relee el archivo en crudo: se reconcilia. `previous` sale
  // del pipeline del bloque 21 —frontera respetada, `tool_use` huérfanos
  // retirados— en vez del `readTranscript` lineal, que reintroducía el contexto
  // compactado y podía dejar un `tool_use` sin par que el API rechaza.
  const lines = readTranscriptLines(transcriptPath)
  const desdeFrontera = resumableMessages(lines)
  const previous = filterUnresolvedToolUses(desdeFrontera)
  const retirados = desdeFrontera.flatMap((m) => m.content).filter((b) => b.type === 'tool_use').length
    - previous.flatMap((m) => m.content).filter((b) => b.type === 'tool_use').length
  const ep = sessionEpoch()
  const reconcile: Reconcile = {
    lastTurn: classifyLastTurn(lines), epoch: ep.epoch, priorWorker: ep.priorWorkerProcess,
    rescuedToolUses: retirados,
  }
  return { id, transcriptPath, transcript: new Transcript(transcriptPath, id), previous, reconcile }
}
