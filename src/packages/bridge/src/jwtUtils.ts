/**
 * Puerto fiel de `ccnmt: packages/bridge/src/jwtUtils.ts`.
 * `logEvent`/`logForDebugging`/`logForDiagnosticsNoPII`/`errorMessage`/
 * `jsonParse` son sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 */
import {
  errorMessage,
  jsonParse,
  logEvent,
  logForDebugging,
  logForDiagnosticsNoPII,
} from './internal/pendingCrossPackageDeps.js'

/** Formatea una duración en milisegundos como cadena legible (p. ej. "5m 30s"). */
function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

/**
 * Decodifica el segmento de payload de un JWT sin verificar la firma.
 * Retira el prefijo `sk-ant-si-` de session-ingress si está presente.
 * Devuelve el payload JSON parseado como `unknown`, o `null` si el
 * token está malformado o el payload no es JSON válido.
 */
export function decodeJwtPayload(token: string): unknown | null {
  const jwt = token.startsWith('sk-ant-si-')
    ? token.slice('sk-ant-si-'.length)
    : token
  const parts = jwt.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  try {
    return jsonParse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

/**
 * Decodifica el claim `exp` (expiración) de un JWT sin verificar la
 * firma.
 * @returns El valor `exp` en segundos Unix, o `null` si no se puede parsear
 */
export function decodeJwtExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token)
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'exp' in payload &&
    typeof payload.exp === 'number'
  ) {
    return payload.exp
  }
  return null
}

/** Buffer de refresh: solicita un token nuevo antes de expirar. */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

/** Intervalo de refresh de respaldo cuando la expiración del token nuevo se desconoce. */
const FALLBACK_REFRESH_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

/** Máx. de fallos consecutivos antes de rendirse con la cadena de refresh. */
const MAX_REFRESH_FAILURES = 3

/** Delay de reintento cuando getAccessToken devuelve undefined. */
const REFRESH_RETRY_DELAY_MS = 60_000

/**
 * Crea un scheduler de refresh de token que refresca proactivamente los
 * tokens de sesión antes de que expiren. Lo usan tanto el bridge
 * standalone como el bridge del REPL.
 *
 * Cuando un token está por expirar, el scheduler llama a `onRefresh` con
 * el ID de sesión y el access token OAuth del bridge. El llamador es
 * responsable de entregar el token al transporte apropiado (stdin del
 * proceso hijo para el bridge standalone, reconexión WebSocket para el
 * bridge del REPL).
 */
export function createTokenRefreshScheduler({
  getAccessToken,
  onRefresh,
  label,
  refreshBufferMs = TOKEN_REFRESH_BUFFER_MS,
}: {
  getAccessToken: () => string | undefined | Promise<string | undefined>
  onRefresh: (sessionId: string, oauthToken: string) => void
  label: string
  /** Cuánto antes de expirar disparar el refresh. Default 5 min. */
  refreshBufferMs?: number
}): {
  schedule: (sessionId: string, token: string) => void
  scheduleFromExpiresIn: (sessionId: string, expiresInSeconds: number) => void
  cancel: (sessionId: string) => void
  cancelAll: () => void
} {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const failureCounts = new Map<string, number>()
  // Contador de generación por sesión — incrementado por schedule() y
  // cancel() para que llamadas asíncronas en vuelo a doRefresh() puedan
  // detectar cuándo fueron superseídas y deban omitir fijar timers de
  // seguimiento.
  const generations = new Map<string, number>()

  function nextGeneration(sessionId: string): number {
    const gen = (generations.get(sessionId) ?? 0) + 1
    generations.set(sessionId, gen)
    return gen
  }

  function schedule(sessionId: string, token: string): void {
    const expiry = decodeJwtExpiry(token)
    if (!expiry) {
      // El token no es un JWT decodificable (p. ej. un token OAuth
      // pasado desde el handler de apertura del WebSocket del bridge
      // del REPL). Preserva cualquier timer existente (como el refresh
      // de seguimiento fijado por doRefresh) para que la cadena de
      // refresh no se rompa.
      logForDebugging(
        `[${label}:token] Could not decode JWT expiry for sessionId=${sessionId}, token prefix=${token.slice(0, 15)}…, keeping existing timer`,
      )
      return
    }

    // Limpia cualquier timer de refresh existente — tenemos una
    // expiración concreta para reemplazarlo.
    const existing = timers.get(sessionId)
    if (existing) {
      clearTimeout(existing)
    }

    // Adelanta la generación para invalidar cualquier doRefresh async en vuelo.
    const gen = nextGeneration(sessionId)

    const expiryDate = new Date(expiry * 1000).toISOString()
    const delayMs = expiry * 1000 - Date.now() - refreshBufferMs
    if (delayMs <= 0) {
      logForDebugging(
        `[${label}:token] Token for sessionId=${sessionId} expires=${expiryDate} (past or within buffer), refreshing immediately`,
      )
      void doRefresh(sessionId, gen)
      return
    }

    logForDebugging(
      `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDuration(delayMs)} (expires=${expiryDate}, buffer=${refreshBufferMs / 1000}s)`,
    )

    const timer = setTimeout(doRefresh, delayMs, sessionId, gen)
    timers.set(sessionId, timer)
  }

  /**
   * Programa el refresh usando un TTL explícito (segundos hasta
   * expirar) en vez de decodificar el claim exp de un JWT. Lo usan
   * llamadores cuyo JWT es opaco (p. ej. POST
   * /v1/code/sessions/{id}/bridge devuelve expires_in directamente).
   */
  function scheduleFromExpiresIn(
    sessionId: string,
    expiresInSeconds: number,
  ): void {
    const existing = timers.get(sessionId)
    if (existing) clearTimeout(existing)
    const gen = nextGeneration(sessionId)
    // Acotado a un piso de 30s — si refreshBufferMs excede el
    // expires_in del servidor (p. ej. un buffer muy grande para testear
    // refresh frecuente, o el servidor acorta expires_in
    // inesperadamente), un delayMs sin acotar ≤ 0 haría tight-loop.
    const delayMs = Math.max(expiresInSeconds * 1000 - refreshBufferMs, 30_000)
    logForDebugging(
      `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDuration(delayMs)} (expires_in=${expiresInSeconds}s, buffer=${refreshBufferMs / 1000}s)`,
    )
    const timer = setTimeout(doRefresh, delayMs, sessionId, gen)
    timers.set(sessionId, timer)
  }

  async function doRefresh(sessionId: string, gen: number): Promise<void> {
    let oauthToken: string | undefined
    try {
      oauthToken = await getAccessToken()
    } catch (err) {
      logForDebugging(
        `[${label}:token] getAccessToken threw for sessionId=${sessionId}: ${errorMessage(err)}`,
        { level: 'error' },
      )
    }

    // Si la sesión se canceló o reprogramó mientras estábamos
    // esperando, la generación habrá cambiado — abortar para evitar
    // timers huérfanos.
    if (generations.get(sessionId) !== gen) {
      logForDebugging(
        `[${label}:token] doRefresh for sessionId=${sessionId} stale (gen ${gen} vs ${generations.get(sessionId)}), skipping`,
      )
      return
    }

    if (!oauthToken) {
      const failures = (failureCounts.get(sessionId) ?? 0) + 1
      failureCounts.set(sessionId, failures)
      logForDebugging(
        `[${label}:token] No OAuth token available for refresh, sessionId=${sessionId} (failure ${failures}/${MAX_REFRESH_FAILURES})`,
        { level: 'error' },
      )
      logForDiagnosticsNoPII('error', 'bridge_token_refresh_no_oauth')
      // Programa un reintento para que la cadena de refresh pueda
      // recuperarse si el token vuelve a estar disponible (p. ej. una
      // limpieza transitoria de caché durante el refresh). Acotado
      // para no saturar ante fallos genuinos.
      if (failures < MAX_REFRESH_FAILURES) {
        const retryTimer = setTimeout(
          doRefresh,
          REFRESH_RETRY_DELAY_MS,
          sessionId,
          gen,
        )
        timers.set(sessionId, retryTimer)
      }
      return
    }

    // Resetea el contador de fallos ante una obtención exitosa del token
    failureCounts.delete(sessionId)

    logForDebugging(
      `[${label}:token] Refreshing token for sessionId=${sessionId}: new token prefix=${oauthToken.slice(0, 15)}…`,
    )
    logEvent('tengu_bridge_token_refreshed', {})
    onRefresh(sessionId, oauthToken)

    // Programa un refresh de seguimiento para que las sesiones de larga
    // duración se mantengan autenticadas. Sin esto, el timer inicial de
    // una sola vez deja la sesión vulnerable a la expiración del token
    // si corre más allá de la primera ventana de refresh.
    const timer = setTimeout(
      doRefresh,
      FALLBACK_REFRESH_INTERVAL_MS,
      sessionId,
      gen,
    )
    timers.set(sessionId, timer)
    logForDebugging(
      `[${label}:token] Scheduled follow-up refresh for sessionId=${sessionId} in ${formatDuration(FALLBACK_REFRESH_INTERVAL_MS)}`,
    )
  }

  function cancel(sessionId: string): void {
    // Adelanta la generación para invalidar cualquier doRefresh async en vuelo.
    nextGeneration(sessionId)
    const timer = timers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      timers.delete(sessionId)
    }
    failureCounts.delete(sessionId)
  }

  function cancelAll(): void {
    // Adelanta todas las generaciones para invalidar los doRefresh en vuelo.
    for (const sessionId of generations.keys()) {
      nextGeneration(sessionId)
    }
    for (const timer of timers.values()) {
      clearTimeout(timer)
    }
    timers.clear()
    failureCounts.clear()
  }

  return { schedule, scheduleFromExpiresIn, cancel, cancelAll }
}
