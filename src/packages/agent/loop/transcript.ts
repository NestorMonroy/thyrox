/**
 * Transcript JSONL append-only (T-002).
 *
 * El formato se copia a propósito del cliente: una línea por evento con
 * `type`, `timestamp`, `message` y —en los turnos del modelo— `usage` dentro
 * del mensaje. Es la condición para que la instrumentación que ya tenemos lea
 * nuestros transcripts sin tocar una línea.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ContentBlock, Message, Usage } from './types.ts'
import { USAGE_CERO } from './types.ts'

/**
 * Un adjunto: contexto que el cliente inyecta y que NO es un turno.
 *
 * `type` es una union en la referencia (`ccnmt: nullRenderingAttachments.ts`
 * nombra `hook_success`, `hook_additional_context`, `hook_cancelled`; su
 * `execAgentHook.ts:211` discrimina contra `structured_output`), asi que aqui
 * queda abierto: cerrar la union congelaria un universo que la propia fuente
 * no cierra.
 */
export type Attachment = { type: string; [otro: string]: unknown }

/**
 * Lo que una frontera de compactacion declara de si misma.
 *
 * **`preTokens` y `postTokens` son honestos los dos, y eso DIVERGE de la
 * referencia**: `ccnmt: snipCompactCore.ts:83` escribe `preTokens: tokensFreed`
 * — el campo lleva lo liberado, no el contexto previo — y no escribe
 * `postTokens`. Con esa forma el acumulado no se puede derivar, que es
 * justamente el invariante que el cliente si cumple (14 de 14 medidas: el
 * delta de `cumulativeDroppedTokens` es exactamente `preTokens - postTokens`).
 * Se conserva el nombre de la referencia y se corrige su contenido.
 */
export type CompactMetadata = {
  trigger: 'auto' | 'manual' | 'micro'
  preTokens: number
  postTokens: number
  /** Derivado: el acumulado previo mas `preTokens - postTokens`. Nunca crudo. */
  cumulativeDroppedTokens: number
  durationMs?: number
}

export type TranscriptLine = {
  /**
   * Los CINCO tipos de mensaje de la referencia
   * (`ccnmt: aggregates/stats.ts:971-977`), no tres. Lo que queda fuera
   * —`atis-latch`, `last-prompt`, `mode`, `queue-operation`— es registro
   * lateral del cliente y nunca fue contexto; ver `transcriptShape.ts`.
   */
  type: 'user' | 'assistant' | 'system' | 'attachment' | 'progress'
  timestamp: string
  sessionId: string
  message?: { id?: string; role?: string; model?: string; content: ContentBlock[]; usage?: Usage }
  subtype?: string
  content?: string
  attachment?: Attachment
  compactMetadata?: CompactMetadata
}

export class Transcript {
  readonly path: string
  readonly sessionId: string
  private acumulado = { ...USAGE_CERO }
  private turnos = 0
  /**
   * El acumulado de contexto descartado. `null` = aun no se ha resembrado del
   * archivo; se difiere para que abrir un transcript no cueste leerlo entero.
   */
  private caidaAcumulada: number | null = null

  constructor(path: string, sessionId: string) {
    this.path = path
    this.sessionId = sessionId
    mkdirSync(dirname(path), { recursive: true })
  }

  private write(line: TranscriptLine): void {
    appendFileSync(this.path, `${JSON.stringify(line)}\n`, 'utf8')
  }

  appendUser(content: string | ContentBlock[]): void {
    const bloques: ContentBlock[] = typeof content === 'string' ? [{ type: 'text', text: content }] : content
    this.write({ type: 'user', timestamp: new Date().toISOString(), sessionId: this.sessionId,
      message: { role: 'user', content: bloques } })
  }

  appendAssistant(message: { id: string; model: string; content: ContentBlock[] }, usage?: Usage): void {
    this.write({ type: 'assistant', timestamp: new Date().toISOString(), sessionId: this.sessionId,
      message: { ...message, role: 'assistant', ...(usage ? { usage } : {}) } })
    if (usage) {
      this.acumulado.input_tokens += usage.input_tokens
      this.acumulado.output_tokens += usage.output_tokens
      this.acumulado.cache_creation_input_tokens += usage.cache_creation_input_tokens
      this.acumulado.cache_read_input_tokens += usage.cache_read_input_tokens
      this.turnos += 1
    }
  }

  /** Un evento del harness que no es un mensaje (frontera, aviso, parada). */
  appendSystem(subtype: string, content: string): void {
    this.write({ type: 'system', timestamp: new Date().toISOString(), sessionId: this.sessionId, subtype, content })
  }

  /**
   * Un adjunto del cliente: salida de hook, contexto inyectado, resultado
   * estructurado. **Es un mensaje** —cuenta en `messages`, no en `sidecar`—
   * porque fue contexto que el modelo leyo.
   */
  appendAttachment(attachment: Attachment): void {
    this.write({ type: 'attachment', timestamp: new Date().toISOString(), sessionId: this.sessionId, attachment })
  }

  /** Progreso de un trabajo en curso (subagente, tarea larga). */
  appendProgress(content: string): void {
    this.write({ type: 'progress', timestamp: new Date().toISOString(), sessionId: this.sessionId, content })
  }

  /**
   * La frontera de una compactacion (T-083).
   *
   * Sin ella el transcript no distingue «no se compacto» de «se compacto y
   * nadie lo anoto»: `transcriptShape` publicaria 0 compactaciones y
   * `droppedTokens: null` sobre una sesion que si las tuvo — el sub-patron D
   * de `metrica-decide-la-conclusion.md` aplicado al propio registro.
   */
  appendCompactBoundary(m: { trigger: CompactMetadata['trigger']; preTokens: number; postTokens: number; durationMs?: number }): CompactMetadata {
    const caida = m.preTokens - m.postTokens
    const acumulado = this.seedCumulativeDropped() + caida
    this.caidaAcumulada = acumulado
    const compactMetadata: CompactMetadata = {
      trigger: m.trigger, preTokens: m.preTokens, postTokens: m.postTokens,
      cumulativeDroppedTokens: acumulado,
      ...(m.durationMs !== undefined ? { durationMs: m.durationMs } : {}),
    }
    this.write({
      type: 'system', timestamp: new Date().toISOString(), sessionId: this.sessionId,
      subtype: 'compact_boundary',
      content: `Context compacted: ${caida} tokens dropped (${m.trigger})`,
      compactMetadata,
    })
    return compactMetadata
  }

  /**
   * El acumulado con que arranca esta instancia: el de la ultima frontera que
   * ya este en el archivo.
   *
   * Al reanudar, empezar de cero haria que el delta entre dos fronteras
   * consecutivas dejara de ser `preTokens - postTokens` — el numero perderia
   * su referente, que es exactamente la razon por la que el acumulado no se
   * guarda en crudo sino que se deriva.
   */
  private seedCumulativeDropped(): number {
    if (this.caidaAcumulada !== null) return this.caidaAcumulada
    this.caidaAcumulada = 0
    if (!existsSync(this.path)) return 0
    for (const linea of readFileSync(this.path, 'utf8').split('\n')) {
      if (!linea.trim()) continue
      try {
        const d = JSON.parse(linea) as TranscriptLine
        const c = d.compactMetadata?.cumulativeDroppedTokens
        if (typeof c === 'number') this.caidaAcumulada = c
      } catch {
        continue
      }
    }
    return this.caidaAcumulada
  }

  totals(): { input: number; output: number; cacheCreation: number; cacheRead: number; turns: number } {
    return {
      input: this.acumulado.input_tokens,
      output: this.acumulado.output_tokens,
      cacheCreation: this.acumulado.cache_creation_input_tokens,
      cacheRead: this.acumulado.cache_read_input_tokens,
      turns: this.turnos,
    }
  }
}

/**
 * Los mensajes de un transcript, para reanudar. Una línea ilegible se salta:
 * el archivo es append-only y un escritor interrumpido puede dejar media
 * línea; tumbar la lectura entera por eso perdería la sesión.
 *
 * **`attachment` y `progress` NO vuelven como turnos por ESTA función**, y es
 * deliberado: `readTranscript` sirve a la copia de fork, al índice y a la
 * estimación de tokens, donde reproducir un adjunto no aplica. La **vía de
 * reanudación** es otra —`resumableMessages` de `session/reconcile.ts`— y ahí
 * **sí** se reproduce el contexto de hook de turnos pasados
 * (`hook_additional_context`, `hook_success`), mientras el andamiaje de sesión
 * lo re-renderiza la sesión nueva (`survivesResume`, #37 cerrada). Medido sobre
 * tres muestras: el contenido del adjunto **no** está duplicado en la línea
 * `user` adyacente, así que saltarlo en la vía de reanudación perdía contexto.
 */
export function readTranscript(path: string): Message[] {
  if (!existsSync(path)) return []
  const out: Message[] = []
  for (const linea of readFileSync(path, 'utf8').split('\n')) {
    if (!linea.trim()) continue
    let d: TranscriptLine
    try {
      d = JSON.parse(linea) as TranscriptLine
    } catch {
      continue
    }
    if ((d.type === 'user' || d.type === 'assistant') && d.message?.content) {
      out.push({ role: d.type, content: d.message.content })
    }
  }
  return out
}
