/**
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeStatusUtil.ts`.
 * `getClaudeAiBaseUrl`/`getRemoteSessionUrl`/`stringWidth`/
 * `formatDuration`/`truncateToWidth`/`getGraphemeSegmenter` son
 * sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 */
import {
  formatDuration,
  getClaudeAiBaseUrl,
  getGraphemeSegmenter,
  stringWidth,
  truncateToWidth,
} from './internal/pendingCrossPackageDeps.js'
import { getRemoteSessionUrl } from './internal/getRemoteSessionUrl.js'

/** Estados de la máquina de estados de status del bridge. */
export type StatusState =
  | 'idle'
  | 'attached'
  | 'titled'
  | 'reconnecting'
  | 'failed'

/** Cuánto se queda visible una línea de actividad de herramienta tras el último tool_start (ms). */
export const TOOL_DISPLAY_EXPIRY_MS = 30_000

/** Intervalo del tick de la animación shimmer (ms). */
export const SHIMMER_INTERVAL_MS = 150

export function timestamp(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export { formatDuration, truncateToWidth as truncatePrompt }

/** Abrevia un resumen de actividad de herramienta para el display de trail. */
export function abbreviateActivity(summary: string): string {
  return truncateToWidth(summary, 30)
}

/** Construye la URL de conexión mostrada cuando el bridge está ocioso. */
export function buildBridgeConnectUrl(
  environmentId: string,
  ingressUrl?: string,
): string {
  const baseUrl = getClaudeAiBaseUrl(undefined, ingressUrl)
  return `${baseUrl}/code?bridge=${environmentId}`
}

/**
 * Construye la URL de sesión mostrada cuando una sesión está adjunta.
 * Delega en getRemoteSessionUrl para la traducción de prefijo cse_→session_,
 * y luego apenda la query ?bridge={environmentId} específica de v1.
 */
export function buildBridgeSessionUrl(
  sessionId: string,
  environmentId: string,
  ingressUrl?: string,
): string {
  return `${getRemoteSessionUrl(sessionId, ingressUrl)}?bridge=${environmentId}`
}

/** Calcula el índice de brillo para una animación shimmer de barrido inverso. */
export function computeGlimmerIndex(
  tick: number,
  messageWidth: number,
): number {
  const cycleLength = messageWidth + 20
  return messageWidth + 10 - (tick % cycleLength)
}

/**
 * Divide el texto en tres segmentos por posición de columna visual para
 * el render del shimmer.
 *
 * Usa segmentación por grafema y `stringWidth` para que la división sea
 * correcta con caracteres multi-byte, emoji y glifos CJK.
 *
 * Devuelve las cadenas `{ before, shimmer, after }`. Ambos renderers
 * (chalk en bridgeUI.ts y React/Ink en bridge.tsx) aplican su propio
 * coloreado a estos segmentos.
 */
export function computeShimmerSegments(
  text: string,
  glimmerIndex: number,
): { before: string; shimmer: string; after: string } {
  const messageWidth = stringWidth(text)
  const shimmerStart = glimmerIndex - 1
  const shimmerEnd = glimmerIndex + 1

  // Cuando el shimmer está fuera de pantalla, devuelve todo el texto como "before"
  if (shimmerStart >= messageWidth || shimmerEnd < 0) {
    return { before: text, shimmer: '', after: '' }
  }

  // Divide en a lo sumo 3 segmentos por posición de columna visual
  const clampedStart = Math.max(0, shimmerStart)
  let colPos = 0
  let before = ''
  let shimmer = ''
  let after = ''
  for (const { segment } of getGraphemeSegmenter().segment(text)) {
    const segWidth = stringWidth(segment)
    if (colPos + segWidth <= clampedStart) {
      before += segment
    } else if (colPos > shimmerEnd) {
      after += segment
    } else {
      shimmer += segment
    }
    colPos += segWidth
  }

  return { before, shimmer, after }
}

/** Etiqueta y color de status del bridge, computados. */
export type BridgeStatusInfo = {
  label:
    | 'Remote Control failed'
    | 'Remote Control reconnecting'
    | 'Remote Control active'
    | 'Remote Control connecting…'
  color: 'error' | 'warning' | 'success'
}

/** Deriva una etiqueta y color de status del estado de conexión del bridge. */
export function getBridgeStatus({
  error,
  connected,
  sessionActive,
  reconnecting,
}: {
  error: string | undefined
  connected: boolean
  sessionActive: boolean
  reconnecting: boolean
}): BridgeStatusInfo {
  if (error) return { label: 'Remote Control failed', color: 'error' }
  if (reconnecting)
    return { label: 'Remote Control reconnecting', color: 'warning' }
  if (sessionActive || connected)
    return { label: 'Remote Control active', color: 'success' }
  return { label: 'Remote Control connecting…', color: 'warning' }
}

/** Texto del footer mostrado cuando el bridge está ocioso (estado Ready). */
export function buildIdleFooterText(url: string): string {
  return `Code everywhere with the Claude app or ${url}`
}

/** Texto del footer mostrado cuando una sesión está activa (estado Connected). */
export function buildActiveFooterText(url: string): string {
  return `Continue coding in the Claude app or ${url}`
}

/** Texto del footer mostrado cuando el bridge falló. */
export const FAILED_FOOTER_TEXT = 'Something went wrong, please try again'

/**
 * Envuelve texto en un hyperlink de terminal OSC 8. Ancho visual cero
 * para propósitos de layout. strip-ansi (usado por stringWidth) elimina
 * correctamente estas secuencias, así que countVisualLines en
 * bridgeUI.ts se mantiene exacto.
 */
export function wrapWithOsc8Link(text: string, url: string): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`
}
