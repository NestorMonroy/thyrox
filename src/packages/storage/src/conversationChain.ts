/**
 * Módulo hoja: reconstrucción pura de la cadena de conversación. Extraído en
 * la fuente de `sessionStorage.ts` (#132 en ccnmt). Sin I/O — dado un mapa en
 * memoria de mensajes, produce el transcript linearizado.
 *
 * `buildConversationChain` camina `parentUuid` hacia atrás desde una hoja;
 * `recoverOrphanedParallelToolResults` es un post-pase que reinserta
 * hermanos assistant + tool_results que el camino de padre único descartó.
 * (El streaming emite un AssistantMessage por cada `content_block_stop`, así
 * que N `tool_use` en paralelo → N mensajes con `uuid` distinto pero el
 * mismo `message.id`. Cada `tool_result` apunta con su `parentUuid` a su
 * propio assistant de un solo bloque — la topología es un DAG, el camino es
 * lista enlazada.)
 *
 * `checkResumeConsistency` emite un evento de telemetría comparando el
 * `messageCount` grabado en el checkpoint `turn_duration` contra la
 * longitud de la cadena reconstruida — monitoreo de deriva
 * escritura→lectura en el resume.
 *
 * Adaptación fiel de ccnmt `packages/storage/src/conversationChain.ts`
 * (180 líneas) — porte completo de sus dos símbolos exportados y su helper
 * interno.
 *
 * Porte parcial declarado — sustitutos locales, no cross-import de
 * `@thyrox/*` (DEC-04, ver `internal/pendingCrossPackageDeps.ts` de este
 * mismo paquete para el precedente):
 *
 * - `logEvent`/`logError` — en la fuente vienen de
 *   `@claude-code-how-works/local-observability(/logging)`, un paquete que
 *   no existe aquí. Se sustituyen por no-ops locales: ningún test de este
 *   porte observa su payload, sólo que no revienten el camino feliz.
 * - `TranscriptMessage`/`Message` — en la fuente vienen de
 *   `@claude-code-how-works/agent/logsTypes.js` y `.../messageShapes`,
 *   ninguno exportado desde `@thyrox/agent` todavía. Se declara aquí el
 *   subconjunto de campos que este módulo lee: `type`, `uuid`, `parentUuid`,
 *   `timestamp`, `message.{id,content}` para `TranscriptMessage`, y
 *   `type`/`subtype`/`messageCount` para el mensaje `system` que
 *   `checkResumeConsistency` inspecciona.
 */
import type { UUID } from 'crypto'

/** No-op local — ver docstring del módulo. */
function logEvent(_name: string, _payload: Record<string, unknown>): void {}

/** No-op local — ver docstring del módulo. */
function logError(_error: Error): void {}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id?: string
  content?: unknown
}

type MessageContent = string | unknown[]

export interface TranscriptMessage {
  type: 'user' | 'assistant' | 'attachment' | 'system' | string
  uuid: UUID
  parentUuid?: UUID
  timestamp: string
  message: {
    id?: string
    content?: MessageContent
  }
  subtype?: string
  messageCount?: number
}

function isToolResultUserMessage(m: TranscriptMessage): boolean {
  return (
    m.type === 'user' &&
    !!m.parentUuid &&
    Array.isArray(m.message.content) &&
    (m.message.content as ToolResultBlock[]).some(
      b => b.type === 'tool_result',
    )
  )
}

export function buildConversationChain(
  messages: Map<UUID, TranscriptMessage>,
  leafMessage: TranscriptMessage,
): TranscriptMessage[] {
  const transcript: TranscriptMessage[] = []
  const seen = new Set<UUID>()
  let currentMsg: TranscriptMessage | undefined = leafMessage
  while (currentMsg) {
    if (seen.has(currentMsg.uuid)) {
      logError(
        new Error(
          `Cycle detected in parentUuid chain at message ${currentMsg.uuid}. Returning partial transcript.`,
        ),
      )
      logEvent('tengu_chain_parent_cycle', {})
      break
    }
    seen.add(currentMsg.uuid)
    transcript.push(currentMsg)
    currentMsg = currentMsg.parentUuid
      ? messages.get(currentMsg.parentUuid)
      : undefined
  }
  transcript.reverse()
  return recoverOrphanedParallelToolResults(messages, transcript, seen)
}

/**
 * Post-pase de `buildConversationChain`: recupera bloques assistant hermanos
 * y tool_results que el camino de padre único dejó huérfanos.
 *
 * Dos formas de pérdida observadas en producción (ambas corregidas aquí):
 *   1. Hermano assistant huérfano: el camino sigue prev→asstA→TR_A→next,
 *      descarta asstB (mismo message.id, encadenado tras asstA) y TR_B.
 *   2. Bifurcación de progreso (legado, pre-#23537): cada assistant
 *      tool_use tenía un hijo `progress` (continuaba la cadena de
 *      escritura) Y un hijo tool_result. El camino seguía el progreso;
 *      los tool_results se descartaban.
 */
function recoverOrphanedParallelToolResults(
  messages: Map<UUID, TranscriptMessage>,
  chain: TranscriptMessage[],
  seen: Set<UUID>,
): TranscriptMessage[] {
  type ChainAssistant = TranscriptMessage & { type: 'assistant' }
  const chainAssistants = chain.filter(
    (m): m is ChainAssistant => m.type === 'assistant',
  )
  if (chainAssistants.length === 0) return chain

  // Ancla = último miembro en-cadena de cada grupo de hermanos. chainAssistants
  // ya está en orden de cadena, así que las iteraciones posteriores
  // sobreescriben → gana el último.
  const anchorByMsgId = new Map<string, ChainAssistant>()
  for (const a of chainAssistants) {
    if (a.message.id) anchorByMsgId.set(a.message.id, a)
  }

  // Precómputo O(n): grupos de hermanos e índice de tool_results. Los
  // tool_results se indexan por parentUuid.
  const siblingsByMsgId = new Map<string, TranscriptMessage[]>()
  const toolResultsByAsst = new Map<UUID, TranscriptMessage[]>()
  for (const m of messages.values()) {
    if (m.type === 'assistant' && m.message.id) {
      const group = siblingsByMsgId.get(m.message.id)
      if (group) group.push(m)
      else siblingsByMsgId.set(m.message.id, [m])
    } else if (isToolResultUserMessage(m)) {
      const group = toolResultsByAsst.get(m.parentUuid!)
      if (group) group.push(m)
      else toolResultsByAsst.set(m.parentUuid!, [m])
    }
  }

  // Para cada grupo de message.id que toca la cadena: recolecta hermanos
  // fuera-de-cadena, luego tool_results fuera-de-cadena de TODOS los
  // miembros. Inserta justo después del último miembro en-cadena para que
  // el grupo quede contiguo.
  const processedGroups = new Set<string>()
  const inserts = new Map<UUID, TranscriptMessage[]>()
  let recoveredCount = 0
  for (const asst of chainAssistants) {
    const msgId = asst.message.id
    if (!msgId || processedGroups.has(msgId)) continue
    processedGroups.add(msgId)

    const group = siblingsByMsgId.get(msgId) ?? [asst]
    const orphanedSiblings = group.filter(s => !seen.has(s.uuid))
    const orphanedTRs: TranscriptMessage[] = []
    for (const member of group) {
      const trs = toolResultsByAsst.get(member.uuid)
      if (!trs) continue
      for (const tr of trs) {
        if (!seen.has(tr.uuid)) orphanedTRs.push(tr)
      }
    }
    if (orphanedSiblings.length === 0 && orphanedTRs.length === 0) continue

    // El orden por timestamp preserva el orden de bloque de contenido /
    // finalización; el sort estable preserva el orden de escritura JSONL en
    // empates.
    orphanedSiblings.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    orphanedTRs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    const anchor = anchorByMsgId.get(msgId)!
    const recovered = [...orphanedSiblings, ...orphanedTRs]
    for (const r of recovered) seen.add(r.uuid)
    recoveredCount += recovered.length
    inserts.set(anchor.uuid, recovered)
  }

  if (recoveredCount === 0) return chain
  logEvent('tengu_chain_parallel_tr_recovered', {
    recovered_count: recoveredCount,
  })

  const result: TranscriptMessage[] = []
  for (const m of chain) {
    result.push(m)
    const toInsert = inserts.get(m.uuid)
    if (toInsert) result.push(...toInsert)
  }
  return result
}

/** El subconjunto de `Message` que `checkResumeConsistency` inspecciona. */
export interface ResumeConsistencyMessage {
  type: string
  subtype?: string
  messageCount?: number
}

/**
 * Localiza el checkpoint `turn_duration` más reciente en la cadena
 * reconstruida y compara su `messageCount` grabado contra la posición de la
 * cadena en ese punto. Emite `tengu_resume_consistency_delta` para
 * monitoreo de deriva escritura→lectura en el resume.
 *
 * delta > 0: el resume cargó MÁS mensajes que en sesión
 * delta < 0: el resume cargó MENOS (truncamiento de cadena)
 * delta = 0: round-trip consistente
 */
export function checkResumeConsistency(
  chain: ResumeConsistencyMessage[],
): void {
  for (let i = chain.length - 1; i >= 0; i--) {
    const m = chain[i]!
    if (m.type !== 'system' || m.subtype !== 'turn_duration') continue
    const expected = m.messageCount
    if (expected === undefined) return
    // `i` es el índice 0-based del checkpoint en la cadena reconstruida. El
    // checkpoint se anexó DESPUÉS de messageCount mensajes, así que su
    // propia posición debería ser messageCount (i.e., i === expected).
    const actual = i
    logEvent('tengu_resume_consistency_delta', {
      expected,
      actual,
      delta: actual - expected,
      chain_length: chain.length,
      checkpoint_age_entries: chain.length - 1 - i,
    })
    return
  }
}
