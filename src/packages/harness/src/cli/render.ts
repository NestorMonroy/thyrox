/**
 * La CLI, escrita sobre el flujo de eventos (T-038, T-040).
 *
 * El bucle emite eventos y la interfaz los dibuja. No hay una segunda lógica
 * que decida qué mostrar: si un estado no está en el flujo, la interfaz no lo
 * puede inventar — y si está, cualquier consumidor (esta CLI, el diario, un
 * panel) ve lo mismo. Esa es la razón de que `streamLoop` sea el primario y
 * `runLoop` su envoltura.
 *
 * Tres estilos, y ninguno es «bonito por defecto»: `text` para leer, `json`
 * para tubería, `quiet` para cuando lo único que importa es la respuesta.
 */
import type { HarnessEvent, Usage } from '../types.ts'

export const OUTPUT_STYLES = ['text', 'json', 'quiet'] as const
export type OutputStyle = (typeof OUTPUT_STYLES)[number]

/** El argumento que identifica una llamada, con el mismo criterio que la puerta de permisos. */
function argumento(input: Record<string, unknown>): string {
  for (const clave of ['command', 'file_path', 'path', 'pattern', 'url', 'prompt']) {
    const v = input[clave]
    if (typeof v === 'string') return v.length > 120 ? `${v.slice(0, 120)}…` : v
  }
  return ''
}

/** Una línea para el evento, o `null` cuando el estilo decide callarlo. */
export function renderEvent(e: HarnessEvent, style: OutputStyle): string | null {
  if (style === 'json') return JSON.stringify(e)
  const silencioso = style === 'quiet'
  switch (e.type) {
    case 'session_start':
      return silencioso ? null : `· sesión ${e.sessionId}`
    case 'turn_start':
      return silencioso ? null : `· turno ${e.turn}`
    case 'thinking_delta':
      // El razonamiento no es la respuesta: se acumula en el turno y viaja de
      // vuelta al servicio verbatim, pero no se imprime como si fuera lo dicho.
      return null
    case 'text_delta':
      // No produce línea: el `text` del turno completo llega después con el
      // mismo contenido, y emitir los dos lo mostraría duplicado. El
      // incremental en terminal lo escribe el binario sin salto de línea —
      // eso es escritura parcial, no una línea, y este renderizador devuelve
      // líneas.
      return null
    case 'text':
      return e.text
    case 'tool_start':
      return silencioso ? null : `→ ${e.tool}(${argumento(e.input)})`
    case 'tool_end': {
      if (silencioso) return null
      const cabeza = e.output.split('\n')[0] ?? ''
      const recorte = cabeza.length > 120 ? `${cabeza.slice(0, 120)}…` : cabeza
      return e.isError ? `✗ ${e.tool} error: ${recorte}` : `← ${e.tool}: ${recorte}`
    }
    case 'context_level': {
      // El nivel `ok` no se dice: sería una línea por turno para informar de
      // que no pasa nada, y una línea que siempre sale se aprende a ignorar.
      // `blocked` se dice INCLUSO en `quiet` porque es el motivo por el que el
      // bucle va a parar sin haber llamado al modelo; callarlo dejaría al
      // usuario con una parada sin causa visible.
      if (e.level === 'ok') return null
      if (silencioso && e.level !== 'blocked') return null
      const margen = e.pctLeft === null ? 'sin ventana en el catálogo' : `${e.pctLeft} % libre`
      return `· contexto ${e.level}: ${e.tokens.toLocaleString('en-US')} tok · ${margen}`
    }
    case 'cleared_unpersisted':
      // Se dice SIEMPRE, incluso en `quiet`: no es ruido de progreso, es un
      // fallo de registro que hay que analizar. Callarlo deja el contexto
      // creciendo sin que nadie sepa por que no baja.
      return `⚠ sin registrar ${e.toolUseId}: ${e.reason}${e.detail ? ` — ${e.detail}` : ''} · no se limpio`
    case 'compaction':
      // Se dice siempre, incluso en `quiet`: compactar borra detalle que el
      // modelo tenía. Callarlo dejaría al usuario explicándose solo por qué el
      // agente «olvidó» algo que sí le había dicho.
      return `· compactación ${e.kind}: ${e.cleared} limpiados, ${e.freedTokens} tokens liberados`
    case 'done':
      return silencioso ? null : `· fin (${e.result.stop}) · ${e.result.turns} turnos`
  }
  return null
}

export type StatusLine = { model: string; turn: number; usage: Usage; usd: number | null }

/** La línea de estado: modelo, turno, lo releído y lo que va costando. */
export function renderStatusLine(s: StatusLine): string {
  const leidos = s.usage.cache_read_input_tokens.toLocaleString('en-US')
  // Un coste desconocido NO se imprime como 0.00: un modelo fuera del catálogo
  // no es gratis, es incalculable, y las dos cosas se leen muy distinto.
  const coste = s.usd === null ? 'sin precio en el catálogo' : `$${s.usd.toFixed(4)}`
  return `${s.model} · turno ${s.turn} · ${leidos} tok releídos · ${coste}`
}
