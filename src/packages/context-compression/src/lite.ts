/**
 * Compresion Lite -- limpieza sin cambio semantico, ~15% en el benchmark de
 * la fuente. Porte de OmniRoute `open-sse/services/compression/lite.ts`
 * (MIT), reescrito contra `ContentBlock`/`Message` de `@thyrox/agent` en vez
 * de su forma de chat OpenAI-normalizada (`role: 'tool'`, `content: string`).
 *
 * `dedupSystemPrompt` de la fuente NO se porta -- declarado, no omitido en
 * silencio: el API de Mensajes tiene UN `system: string` de nivel superior
 * (`ProviderRequest.system`), no una lista de mensajes `role: 'system'`
 * intercalable. No hay duplicado posible de la forma que esa funcion ataca.
 */
/**
 * Tipos LOCALES, estructuralmente compatibles con `ContentBlock`/`Message`
 * de `@thyrox/agent/loop/types` (no importados de alli): importar el tipo
 * real crearia una dependencia de paquete `context-compression -> agent`
 * que se volveria CIRCULAR en cuanto `agent` importe este paquete para
 * comprimir sus tool_result (ver el punto de wireado en `loop/index.ts`).
 * TypeScript compara por forma, asi que un `Message[]` real satisface esto
 * sin conversion.
 */
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'thinking'; thinking: string; signature?: string }
  | { type: 'redacted_thinking'; data: string }

type Message = { role: 'user' | 'assistant'; content: ContentBlock[] }

const MAX_TOOL_RESULT_LENGTH = 2000
const TRUNCATION_LOOKBACK = 80

/** Colapsa 3+ saltos de linea a 2 y quita espacios finales de linea. */
export function normalizeWhitespace(text: string): string {
  if (!text) return ''
  return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '')
}

function isPlainText(block: ContentBlock): block is Extract<ContentBlock, { type: 'text' }> {
  return block.type === 'text'
}

/** Normaliza el whitespace de cada bloque `text` de cada mensaje. */
export function collapseWhitespace(messages: Message[]): { messages: Message[]; applied: boolean } {
  let applied = false
  const out = messages.map((m) => ({
    ...m,
    content: m.content.map((b) => {
      if (!isPlainText(b)) return b
      const normalized = normalizeWhitespace(b.text)
      if (normalized !== b.text) applied = true
      return { ...b, text: normalized }
    }),
  }))
  return { messages: out, applied }
}

function isWordChar(c: string | undefined): boolean {
  return c !== undefined && /\S/.test(c)
}

/**
 * Retrocede el punto de corte al limite de palabra mas cercano, para no
 * partir una palabra a la mitad. Busca hacia atras primero (se queda en o
 * bajo el limite pedido); si no hay espacio en la ventana, busca hacia
 * adelante para completar la palabra actual.
 */
function backOffToWordBoundary(text: string, cutIndex: number): number {
  const alreadyAtBoundary = !isWordChar(text[cutIndex - 1]) || !isWordChar(text[cutIndex])
  if (alreadyAtBoundary) return cutIndex

  const windowStart = Math.max(0, cutIndex - TRUNCATION_LOOKBACK)
  for (let i = cutIndex; i > windowStart; i--) {
    if (!isWordChar(text[i - 1])) return i - 1
  }
  const windowEnd = Math.min(text.length, cutIndex + TRUNCATION_LOOKBACK)
  for (let i = cutIndex; i < windowEnd; i++) {
    if (!isWordChar(text[i])) return i
  }
  return cutIndex
}

/** Trunca el `content` de un `tool_result` mas largo que `maxLength`, sin partir palabras. */
export function compressToolResults(
  messages: Message[],
  maxLength = MAX_TOOL_RESULT_LENGTH,
): { messages: Message[]; applied: boolean } {
  let applied = false
  const out = messages.map((m) => ({
    ...m,
    content: m.content.map((b) => {
      if (b.type !== 'tool_result' || b.content.length <= maxLength) return b
      applied = true
      const cutIndex = backOffToWordBoundary(b.content, maxLength)
      return { ...b, content: b.content.slice(0, cutIndex) + '\n...[truncado]' }
    }),
  }))
  return { messages: out, applied }
}

function contentKey(m: Message): string {
  return JSON.stringify(m.content)
}

/** Quita un mensaje consecutivo con el MISMO rol y el MISMO contenido exacto que el anterior. */
export function removeRedundantContent(messages: Message[]): { messages: Message[]; applied: boolean } {
  let applied = false
  const out: Message[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const previous = i > 0 ? messages[i - 1] : undefined
    if (previous && previous.role === m.role && contentKey(previous) === contentKey(m)) {
      applied = true
      continue
    }
    out.push(m)
  }
  return { messages: out, applied }
}

export type LiteResult = { messages: Message[]; appliedTechniques: string[] }

/** Aplica las tres tecnicas Lite en orden y reporta cuales cambiaron algo. */
export function applyLiteCompression(messages: Message[], maxToolResultLength?: number): LiteResult {
  const appliedTechniques: string[] = []
  let current = messages

  const r1 = collapseWhitespace(current)
  current = r1.messages
  if (r1.applied) appliedTechniques.push('collapseWhitespace')

  const r2 = compressToolResults(current, maxToolResultLength)
  current = r2.messages
  if (r2.applied) appliedTechniques.push('compressToolResults')

  const r3 = removeRedundantContent(current)
  current = r3.messages
  if (r3.applied) appliedTechniques.push('removeRedundantContent')

  return { messages: current, appliedTechniques }
}

export type NamedSection = { name: string; text: string }
export type DedupSectionsResult<T extends NamedSection> = { sections: T[]; duplicates: T[] }

/**
 * Adaptacion nativa de `dedupSystemPrompt` (OmniRoute, `lite.ts`) -- la
 * fuente filtra mensajes duplicados con `role: 'system'` de un arreglo de
 * mensajes chat-normalizado. Aqui NO hay tal arreglo: la API de Mensajes
 * tiene un `system: string` unico (`ProviderRequest.system`), no una lista
 * intercalable de mensajes `role: 'system'`. El mismo PRINCIPIO -- descartar
 * contenido repetido antes de que entre al prompt -- se adapta a la forma
 * real que si tenemos: la lista de SECCIONES que `assembleSystemPrompt`
 * concatena (`CLAUDE.md`, cada `.claude/rules/*.md`...).
 *
 * Divergencia deliberada de la clave: la fuente compara
 * `content.trim().slice(0, 200)` -- un PREFIJO -- porque sus mensajes de
 * chat son cortos. Nuestras secciones son documentos largos que a menudo
 * COMPARTEN un preambulo (el patron "cheat-sheet (canonico en docs)" que
 * repiten varios repos consumidores), asi que un prefijo produciria falsos
 * positivos -- el sub-patron D de `metrica-decide-la-conclusion.md`: un
 * control que no discrimina "es el mismo documento" de "empieza igual".
 * Aqui la clave es el texto COMPLETO, recortado (`trim`).
 */
export function dedupSections<T extends NamedSection>(sections: T[]): DedupSectionsResult<T> {
  const seen = new Set<string>()
  const kept: T[] = []
  const duplicates: T[] = []
  for (const section of sections) {
    const key = section.text.trim()
    if (seen.has(key)) {
      duplicates.push(section)
      continue
    }
    seen.add(key)
    kept.push(section)
  }
  return { sections: kept, duplicates }
}
