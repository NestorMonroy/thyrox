/**
 * El tope de peticiones que un 429 declara en prosa — porte de OmniRoute
 * (`open-sse/services/rateLimitManager/requestCap.ts`, a58000c7, MIT).
 *
 * Algunos proveedores no dan cabeceras: escriben el techo en el mensaje
 * («Maximum 5 requests within 1 minutes»). Nada más aprende ese número, así
 * que el limitador seguiría chocando con él. Esto lo convierte en
 * `{ requests, windowMs }`, y `requestCapSettings` en un ritmo que queda por
 * debajo.
 */

const UNIT_MS: Record<string, number> = {
  second: 1_000,
  sec: 1_000,
  minute: 60_000,
  min: 60_000,
  hour: 3_600_000,
  hr: 3_600_000,
}

// Una palabra de techo tiene que ir poco antes de la cifra, y sin un verbo de
// uso entre medias: «you made 120 requests in 1 minute» o «current usage: 4
// rpm» dicen cuánto se usó, no cuánto se permite.
const CAP_WORD_PREFIX = String.raw`\b(?:max(?:imum)?|limit(?:ed)?|allowed|up to|at most|exceed(?:ed|s)?|quota|rate)\b(?![^.\n]{0,40}\b(?:made|sent|used)\b)[^.\n]{0,40}?`
// «Maximum 5 requests within 1 minutes», «60 requests per minute», «10 requests per 2 minutes».
const REQUESTS_PER_WINDOW = new RegExp(
  CAP_WORD_PREFIX + String.raw`(\d{1,7})\s+requests?\s+(?:within|per|in|every)\s+(?:(\d{1,5})\s*)?(second|sec|minute|min|hour|hr)s?\b`,
  'i',
)
// «Rate limit: 20 RPM».
const REQUESTS_PER_MINUTE = new RegExp(CAP_WORD_PREFIX + String.raw`(\d{1,7})\s*rpm\b`, 'i')

const MAX_TEXT_LENGTH = 4_000
const MAX_WINDOW_MS = 24 * 3_600_000

export interface RequestCap {
  requests: number
  windowMs: number
}

function bodyText(body: unknown): string {
  if (typeof body === 'string') return body
  if (body === null || body === undefined) return ''
  try {
    return JSON.stringify(body)
  } catch {
    return ''
  }
}

/** El tope que el cuerpo de un 429 declara, o `null` si no declara ninguno usable. */
export function parseRequestCapFromBody(body: unknown): RequestCap | null {
  const text = bodyText(body).slice(0, MAX_TEXT_LENGTH)
  if (!text) return null

  let cap: RequestCap
  const perWindow = REQUESTS_PER_WINDOW.exec(text)
  if (perWindow) {
    const count = perWindow[2] ? Number.parseInt(perWindow[2], 10) : 1
    cap = { requests: Number.parseInt(perWindow[1]!, 10), windowMs: count * UNIT_MS[perWindow[3]!.toLowerCase()]! }
  } else {
    const rpm = REQUESTS_PER_MINUTE.exec(text)
    if (!rpm) return null
    cap = { requests: Number.parseInt(rpm[1]!, 10), windowMs: UNIT_MS.minute! }
  }
  return isValidRequestCap(cap) ? cap : null
}

/** Un tope es usable si es un número entero de peticiones en una ventana de 1 s a 24 h. */
export function isValidRequestCap(cap: RequestCap): boolean {
  return (
    Number.isInteger(cap.requests)
    && cap.requests >= 1
    && Number.isFinite(cap.windowMs)
    && cap.windowMs >= 1_000
    && cap.windowMs <= MAX_WINDOW_MS
  )
}

export interface RequestCapSettings {
  minTime: number
  reservoirRefreshAmount: number
  reservoirRefreshInterval: number
}

/** El ritmo que queda bajo el tope: un cupo de `requests` que se repone cada `windowMs`, repartido por `minTime`. */
export function requestCapSettings(cap: RequestCap): RequestCapSettings {
  return {
    minTime: Math.floor(cap.windowMs / cap.requests),
    reservoirRefreshAmount: cap.requests,
    reservoirRefreshInterval: cap.windowMs,
  }
}
