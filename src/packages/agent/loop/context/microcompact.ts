/**
 * Microcompactación de resultados de herramienta (T-024).
 *
 * El contexto de un bucle largo lo domina lo que **relee**: medido sobre 313
 * agentes con telemetría, el `cache_read` es el 98.07 % del consumo. Y dentro
 * de lo releído, la masa está en resultados de herramienta que ya no informan
 * — el `cat` de un archivo que se editó tres turnos después.
 *
 * Esta pieza los vacía dejando el bloque en su sitio: **el `tool_result` no se
 * borra**. Borrarlo dejaría al `tool_use` correspondiente sin respuesta y el
 * API rechaza la petición entera. Se sustituye su contenido por un marcador, y
 * el modelo entiende que existió.
 *
 * La lista de compactables es cerrada a propósito: se limpia lo que se puede
 * volver a pedir. El reporte de un subagente no está en ella — pedirlo otra vez
 * cuesta lo que costó la primera.
 */
import type { ContentBlock, Message } from '../types.ts'
import { estimateTokens } from './systemPrompt.ts'

/** Lo que el marcador dice, verbatim: el modelo lo lee y sabe que hubo algo. */
export const CLEARED_MARKER = '[Old tool result content cleared]'

/**
 * `var Sdn=20000` del ejecutable 2.1.258 — el **piso** de la microcompactación.
 *
 * ```js
 * let {tokensSaved:d, candidates:p} = Hdn(e, r.keepRecent);
 * if (d < Sdn) return null;
 * ```
 *
 * Es la mitad que faltaba, y no es un detalle de eficiencia: microcompactar
 * **rompe la caché de prompt**, porque reescribe mensajes que ya estaban en
 * el prefijo cacheado. Con `cache_read` al 98 % del consumo, purgar para
 * liberar doscientos tokens cuesta releer el contexto entero a precio de
 * escritura — más caro que no haber purgado. El ejecutable no la ejecuta si
 * no libera al menos 20 000.
 *
 * Se puede bajar a 0 **declarándolo** (`minFreedTokens: 0`), que es distinto
 * de omitirlo: quien lo declara sabe lo que compra.
 */
export const MICROCOMPACT_MIN_FREED_TOKENS = 20_000

/**
 * Sólo se compacta lo reproducible. Son las seis del núcleo más las dos de red
 * (`WebFetch`/`WebSearch`, T-020): todas se pueden volver a invocar. Fuera
 * quedan `Agent` y las de tablero, cuyo resultado no se puede recuperar
 * repitiendo la llamada.
 */
export const COMPACTABLE_TOOLS: ReadonlySet<string> = new Set([
  'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch', 'Write',
])

export type MicrocompactOptions = {
  /** Cuántos resultados recientes se conservan intactos. */
  keepLast: number
  /** Sustituye la lista por defecto; útil para medir un subconjunto. */
  tools?: ReadonlySet<string>
  /**
   * Registra el contenido ANTES de vaciarlo y devuelve el marcador que lo
   * sustituye —con su procedencia—, o `null` si no se pudo registrar.
   *
   * Es `r.persist?.(x.content, x.tool_use_id)` del ejecutable, con **una
   * divergencia declarada**: allá el fallo cae al marcador pelado
   * (`F ?? iUe`) y limpia igual; aquí un `null` **impide la limpieza**. Vaciar
   * lo que no se pudo registrar es la pérdida silenciosa del nivel 4 de
   * `niveles-de-retencion.md`; conservarlo sólo cuesta contexto, y el turno
   * siguiente vuelve a evaluarlo.
   */
  persist?: (content: string, toolUseId: string) => string | null
}

export type MicrocompactResult = {
  messages: Message[]
  cleared: string[]
  freedTokens: number
  /** Candidatos que NO se limpiaron porque su registro falló. */
  unpersisted: string[]
}

/**
 * Los `tool_use_id` compactables de la conversación.
 *
 * **Sólo del lado asistente.** Un bloque con forma de `tool_use` dentro de un
 * mensaje de usuario no es una llamada del modelo: recogerlo produciría un id
 * que no existe como llamada, y el borrado apuntaría al vacío.
 */
export function collectCompactableToolIds(
  messages: Message[],
  tools: ReadonlySet<string> = COMPACTABLE_TOOLS,
): string[] {
  const ids: string[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    for (const b of m.content) {
      if (b.type === 'tool_use' && tools.has(b.name)) ids.push(b.id)
    }
  }
  return ids
}

export type MicrocompactProjection = { cleared: string[]; freedTokens: number }

/**
 * Qué liberaría la microcompactación, **sin** aplicarla.
 *
 * Es `Hdn(e, r.keepRecent)` del ejecutable, que devuelve `{tokensSaved,
 * candidates}` para que su llamador decida antes de tocar nada. Separarla es
 * lo que hace posible el piso: preguntar «¿cuánto libera?» no puede costar la
 * reescritura que se está evaluando.
 */
export function projectMicrocompact(
  messages: Message[], opts: MicrocompactOptions,
): MicrocompactProjection {
  const { aLimpiar, orden } = seleccionar(messages, opts)
  let freedTokens = 0
  const cleared: string[] = []
  for (const { id, tokens } of orden) {
    if (!aLimpiar.has(id)) continue
    cleared.push(id)
    freedTokens += tokens
  }
  return { cleared, freedTokens }
}

/**
 * Los resultados candidatos en orden de antigüedad y cuáles caen.
 *
 * El orden de aparición **es** el orden de antigüedad, así que los últimos
 * `keepLast` son los que se conservan. Un resultado ya vaciado no vuelve a
 * contar: su marcador no libera nada y sumarlo inflaría la proyección.
 */
function seleccionar(messages: Message[], opts: MicrocompactOptions): {
  aLimpiar: Set<string>
  orden: { id: string; tokens: number }[]
} {
  const compactables = new Set(collectCompactableToolIds(messages, opts.tools))
  const orden: { id: string; tokens: number }[] = []
  for (const m of messages) {
    for (const b of m.content) {
      // Por PREFIJO, no por igualdad: el marcador lleva la procedencia del
      // registro detrás (`… · Bash(git log) · sha256:… · N car`), así que
      // comparar con el literal lo daría por candidato y lo re-purgaría —
      // persistiendo el marcador en lugar del contenido que ya no está.
      if (b.type === 'tool_result' && compactables.has(b.tool_use_id)
          && !b.content.startsWith(CLEARED_MARKER)) {
        orden.push({ id: b.tool_use_id, tokens: estimateTokens(b.content) - estimateTokens(CLEARED_MARKER) })
      }
    }
  }
  const aLimpiar = new Set(orden.slice(0, Math.max(0, orden.length - opts.keepLast)).map((c) => c.id))
  return { aLimpiar, orden }
}

/** Vacía los resultados compactables salvo los `keepLast` últimos. No muta la entrada. */
export function microcompact(messages: Message[], opts: MicrocompactOptions): MicrocompactResult {
  const { aLimpiar } = seleccionar(messages, opts)

  const cleared: string[] = []
  const unpersisted: string[] = []
  let freedTokens = 0
  const salida: Message[] = messages.map((m) => ({
    role: m.role,
    content: m.content.map((b: ContentBlock): ContentBlock => {
      if (b.type !== 'tool_result' || !aLimpiar.has(b.tool_use_id)) return b
      // El registro va PRIMERO y decide: si no se pudo, el bloque se queda
      // como está. Sin `persist` declarado se limpia con el marcador pelado,
      // que es lo que hace el ejecutable cuando nadie le pasa persistidor.
      const marcador = opts.persist ? opts.persist(b.content, b.tool_use_id) : CLEARED_MARKER
      if (marcador === null) {
        unpersisted.push(b.tool_use_id)
        return b
      }
      cleared.push(b.tool_use_id)
      freedTokens += estimateTokens(b.content) - estimateTokens(marcador)
      return { ...b, content: marcador }
    }),
  }))

  return { messages: salida, cleared, freedTokens, unpersisted }
}
