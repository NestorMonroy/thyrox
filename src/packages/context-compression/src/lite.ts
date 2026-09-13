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
export function normalizeWhitespace(texto: string): string {
  if (!texto) return ''
  return texto.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '')
}

function esTextoPlano(bloque: ContentBlock): bloque is Extract<ContentBlock, { type: 'text' }> {
  return bloque.type === 'text'
}

/** Normaliza el whitespace de cada bloque `text` de cada mensaje. */
export function collapseWhitespace(mensajes: Message[]): { mensajes: Message[]; aplicado: boolean } {
  let aplicado = false
  const out = mensajes.map((m) => ({
    ...m,
    content: m.content.map((b) => {
      if (!esTextoPlano(b)) return b
      const normalizado = normalizeWhitespace(b.text)
      if (normalizado !== b.text) aplicado = true
      return { ...b, text: normalizado }
    }),
  }))
  return { mensajes: out, aplicado }
}

function esPalabra(c: string | undefined): boolean {
  return c !== undefined && /\S/.test(c)
}

/**
 * Retrocede el punto de corte al limite de palabra mas cercano, para no
 * partir una palabra a la mitad. Busca hacia atras primero (se queda en o
 * bajo el limite pedido); si no hay espacio en la ventana, busca hacia
 * adelante para completar la palabra actual.
 */
function retrocederALimiteDePalabra(texto: string, corte: number): number {
  const yaEnLimite = !esPalabra(texto[corte - 1]) || !esPalabra(texto[corte])
  if (yaEnLimite) return corte

  const inicioVentana = Math.max(0, corte - TRUNCATION_LOOKBACK)
  for (let i = corte; i > inicioVentana; i--) {
    if (!esPalabra(texto[i - 1])) return i - 1
  }
  const finVentana = Math.min(texto.length, corte + TRUNCATION_LOOKBACK)
  for (let i = corte; i < finVentana; i++) {
    if (!esPalabra(texto[i])) return i
  }
  return corte
}

/** Trunca el `content` de un `tool_result` mas largo que `maxLength`, sin partir palabras. */
export function compressToolResults(
  mensajes: Message[],
  maxLength = MAX_TOOL_RESULT_LENGTH,
): { mensajes: Message[]; aplicado: boolean } {
  let aplicado = false
  const out = mensajes.map((m) => ({
    ...m,
    content: m.content.map((b) => {
      if (b.type !== 'tool_result' || b.content.length <= maxLength) return b
      aplicado = true
      const corte = retrocederALimiteDePalabra(b.content, maxLength)
      return { ...b, content: b.content.slice(0, corte) + '\n...[truncado]' }
    }),
  }))
  return { mensajes: out, aplicado }
}

function claveDeContenido(m: Message): string {
  return JSON.stringify(m.content)
}

/** Quita un mensaje consecutivo con el MISMO rol y el MISMO contenido exacto que el anterior. */
export function removeRedundantContent(mensajes: Message[]): { mensajes: Message[]; aplicado: boolean } {
  let aplicado = false
  const out: Message[] = []
  for (let i = 0; i < mensajes.length; i++) {
    const m = mensajes[i]
    const anterior = i > 0 ? mensajes[i - 1] : undefined
    if (anterior && anterior.role === m.role && claveDeContenido(anterior) === claveDeContenido(m)) {
      aplicado = true
      continue
    }
    out.push(m)
  }
  return { mensajes: out, aplicado }
}

export type LiteResult = { mensajes: Message[]; tecnicasAplicadas: string[] }

/** Aplica las tres tecnicas Lite en orden y reporta cuales cambiaron algo. */
export function applyLiteCompression(mensajes: Message[], maxToolResultLength?: number): LiteResult {
  const tecnicasAplicadas: string[] = []
  let actual = mensajes

  const r1 = collapseWhitespace(actual)
  actual = r1.mensajes
  if (r1.aplicado) tecnicasAplicadas.push('collapseWhitespace')

  const r2 = compressToolResults(actual, maxToolResultLength)
  actual = r2.mensajes
  if (r2.aplicado) tecnicasAplicadas.push('compressToolResults')

  const r3 = removeRedundantContent(actual)
  actual = r3.mensajes
  if (r3.aplicado) tecnicasAplicadas.push('removeRedundantContent')

  return { mensajes: actual, tecnicasAplicadas }
}
