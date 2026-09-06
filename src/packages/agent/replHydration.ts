/**
 * Porte COMPLETO de `ccnmt: packages/agent/replHydration.ts` — hidratación
 * de REPL, del ant 4656.js `mJK` + 3845.js `k56`/`XI7`/`Px5`.
 *
 * Cuando un fork (o un agente resumido) arranca, el agente interno recibe
 * un objeto `replHydration` que deja que su REPL (sandbox
 * `vm.Script.runInContext`) vuelva a ejecutar cada bloque de código previo
 * con envoltorios de herramienta simulados que devuelven los resultados del
 * turno anterior, de forma que el estado del REPL termine coincidiendo con
 * lo que el usuario vio.
 *
 * Forma:
 *   { kind: 'fork',  log: ReplayEntry[] }   — fork nuevo, log = bloques REPL del padre
 *   { kind: 'resume', log: ReplayEntry[] }  — agente resumido, log reconstruido de los mensajes
 *   { kind: 'fresh' }                       — sin hidratación (default)
 *
 * `k56` (`reconstructLog` en este módulo) recorre el historial de mensajes
 * y agrupa los `tool_use:REPL` del asistente con sus salidas `tool_result`
 * en entradas `{ replId, code, calls: [{kind, toolName, result|error}], threw
 * }`. El `Px5` de ant 3845.js hace luego `vm.Script(code).runInContext` de
 * cada una, con `calls` dirigiendo los valores de retorno del envoltorio.
 *
 * Hoy el REPLTool de ccb es un stub de una línea (`isEnabled: () => false`),
 * así que el consumidor de la hidratación es un no-op. La extracción k56
 * sigue corriendo igual y produce `ReplayEntry[]` correcto, listo para
 * cuando el REPLTool de ccb tenga una implementación real. Éste es un
 * PORTE ESTRUCTURAL, no un mínimo-viable — el dato es correcto y completo;
 * solo el ejecutor `runInContext` está apagado por bandera.
 *
 * @dynamicRequire
 */

import type { Message, AssistantMessage, UserMessage } from './messageShapes.js'

/** ant 3845.js: constante con el nombre de la herramienta REPL. Se refleja como 'REPL'. */
export const REPL_TOOL_NAME = 'REPL'

/**
 * Una llamada a herramienta simulada dentro de un bloque REPL — lo que
 * devolvió el envoltorio. ant 3845.js: { kind: 'ok' | 'err', toolName, result?, error? }
 */
export type ReplayCall =
  | { kind: 'ok'; toolName: string; result: unknown }
  | { kind: 'err'; toolName: string; error: string }

/**
 * Un bloque REPL: el código original + la secuencia de llamadas a
 * herramientas internas que hizo (en orden) + si el original lanzó
 * excepción. ant 3845.js k56.
 */
export interface ReplayEntry {
  replId: string
  code: string
  calls: ReplayCall[]
  threw: boolean
}

/** Payload de hidratación como unión discriminada. Default 'fresh' = sin reproducción. */
export type ReplHydration =
  | { kind: 'fork'; log: ReplayEntry[] }
  | { kind: 'resume'; log: ReplayEntry[] }
  | { kind: 'fresh' }

/** ant 3845.js MI7 — lee de forma segura una propiedad string de un Record/objeto. */
function readStringProp(obj: unknown, key: string): string {
  if (obj === null || typeof obj !== 'object') return ''
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : ''
}

/** Convierte un bloque de content a un Record genérico para sondear campos sin tipar. */
function asRecord(block: unknown): Record<string, unknown> | null {
  if (typeof block !== 'object' || block === null) return null
  return block as unknown as Record<string, unknown>
}

/** ant 3845.js wx5 — extrae los bloques tool_use:REPL de un mensaje de asistente. */
function extractReplToolUses(m: AssistantMessage): Array<{ id: string; code: string }> {
  if (m.isVirtual) return []
  const content = m.message.content
  if (!Array.isArray(content)) return []
  const out: Array<{ id: string; code: string }> = []
  for (const block of content) {
    const b = asRecord(block)
    if (!b) continue
    if (b.type === 'tool_use' && b.name === REPL_TOOL_NAME) {
      out.push({
        id: typeof b.id === 'string' ? b.id : '',
        code: readStringProp(b.input, 'code'),
      })
    }
  }
  return out
}

/** ant 3845.js jx5 — extrae el nombre de herramienta interna pendiente de un mensaje de asistente virtual. */
function extractPendingName(m: AssistantMessage): string | undefined {
  if (!m.isVirtual) return undefined
  const content = m.message.content
  if (!Array.isArray(content)) return undefined
  const first = asRecord(content[0])
  if (first?.type === 'tool_use' && typeof first.name === 'string') return first.name
  return undefined
}

/** ant 3845.js Jx5 — extrae el resultado de la herramienta interna de un mensaje de usuario virtual. */
function extractInnerResult(m: UserMessage, toolName: string): ReplayCall | undefined {
  if (!m.isVirtual) return undefined
  const content = m.message.content
  if (!Array.isArray(content)) return undefined
  const first = asRecord(content[0])
  if (!first || first.type !== 'tool_result') return undefined
  const isError = first.is_error === true
  if (isError) {
    return {
      kind: 'err',
      toolName,
      error: typeof first.content === 'string' ? first.content : '',
    }
  }
  return {
    kind: 'ok',
    toolName,
    result: (m as { toolUseResult?: unknown }).toolUseResult,
  }
}

/** ant 3845.js Dx5 — detecta si un mensaje de usuario NO virtual reporta que el bloque REPL lanzó excepción. */
function detectReplThrew(m: UserMessage, replId: string): boolean | undefined {
  if (m.isVirtual) return undefined
  const content = m.message.content
  if (!Array.isArray(content)) return undefined
  const matched = content.some(block => {
    const b = asRecord(block)
    return b?.type === 'tool_result' && b?.tool_use_id === replId
  })
  if (!matched) return undefined
  return readStringProp((m as { toolUseResult?: unknown }).toolUseResult, 'error').length > 0
}

/**
 * Reconstruye el log de reproducción de REPL a partir de un arreglo de
 * mensajes — ant 3845.js k56 byte-idéntico.
 *
 * Recorre el flujo de mensajes, abre una nueva ReplayEntry en cada bloque
 * tool_use:REPL, acumula pares virtuales {pendingName,resultado} como
 * `calls`, y finaliza en el siguiente tool_use:REPL o al terminar el flujo.
 */
export function reconstructLog(messages: readonly Message[]): ReplayEntry[] {
  const out: ReplayEntry[] = []
  let cur:
    | {
        replId: string
        code: string
        calls: ReplayCall[]
        threw: boolean
        pendingName: string | undefined
      }
    | undefined
  const flush = (): void => {
    if (!cur) return
    out.push({ replId: cur.replId, code: cur.code, calls: cur.calls, threw: cur.threw })
    cur = undefined
  }
  for (const m of messages) {
    if (m.type !== 'assistant' && m.type !== 'user') continue
    if (m.isVirtual) {
      if (!cur) continue
      if (m.type === 'assistant') {
        const name = extractPendingName(m as AssistantMessage)
        if (name !== undefined) {
          cur.pendingName = name
          continue
        }
      } else {
        const pending = cur.pendingName
        if (pending === undefined) continue
        const call = extractInnerResult(m as UserMessage, pending)
        if (!call) continue
        cur.calls.push(call)
        cur.pendingName = undefined
      }
      continue
    }
    if (m.type === 'assistant') {
      const replUses = extractReplToolUses(m as AssistantMessage)
      if (replUses.length > 0) {
        for (const u of replUses) {
          flush()
          cur = { replId: u.id, code: u.code, calls: [], threw: false, pendingName: undefined }
        }
        continue
      }
    }
    if (cur && m.type === 'user') {
      const threw = detectReplThrew(m as UserMessage, cur.replId)
      if (threw !== undefined) cur.threw = threw
    }
  }
  flush()
  return out
}

/**
 * Consumidor de la hidratación — ant 3848.js flujo de arranque de
 * hidratación.
 *
 * Lo llama el arranque del agente interno (inicio de QueryEngine) con el
 * payload replHydration del padre + una referencia al REPLTool. Reproduce
 * cada ReplayEntry a través del vm.runInContext del REPL de forma que el
 * estado del REPL termine coincidiendo con lo que el usuario vio antes del
 * fork/resume.
 *
 * Devuelve un resumen de cuántas entradas se reprodujeron limpias vs. con
 * deriva (drift).
 *
 * Hoy REPLTool.isEnabled === false en ccb, así que este consumidor
 * devuelve { skipped: true } sin hacer nada. Cuando REPLTool tenga una
 * implementación real, el consumidor se activa automáticamente.
 */
export async function hydrateRepl(
  hydration: ReplHydration,
  options?: {
    /** Inyecta un REPLTool habilitado para testing — default es el stub de ccb. */
    isReplToolEnabled?: () => boolean
    /** Función de reproducción por entrada — abstraída para que los tests no necesiten vm. */
    replayEntry?: (entry: ReplayEntry) => Promise<{ kind: 'ok' | 'drift' | 'threw'; reason?: string }>
  },
): Promise<{
  skipped: boolean
  attempted: number
  ok: number
  drift: number
  threw: number
}> {
  const isEnabled = options?.isReplToolEnabled ?? (() => false)
  if (hydration.kind === 'fresh' || !isEnabled()) {
    return { skipped: true, attempted: 0, ok: 0, drift: 0, threw: 0 }
  }
  const log = hydration.log
  if (log.length === 0) {
    return { skipped: false, attempted: 0, ok: 0, drift: 0, threw: 0 }
  }
  const replayer =
    options?.replayEntry ??
    (async () => ({ kind: 'ok' as const })) // default no-op cuando falta implementación real de REPLTool
  let okCount = 0
  let driftCount = 0
  let threwCount = 0
  for (const entry of log) {
    const r = await replayer(entry)
    if (r.kind === 'ok') okCount++
    else if (r.kind === 'drift') driftCount++
    else threwCount++
  }
  return { skipped: false, attempted: log.length, ok: okCount, drift: driftCount, threw: threwCount }
}
