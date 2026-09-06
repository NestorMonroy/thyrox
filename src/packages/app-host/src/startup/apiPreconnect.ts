// Adaptación de @claude-code-how-works/app-host: src/startup/apiPreconnect.ts.
// Capa 1 (con cita al `fetch` nativo — no es paquete hermano).
//
// Divergencias declaradas:
//
// 1. `isEnvTruthy`/`readEnv` se reimplementan localmente en vez de citar
//    `@claude-code-how-works/config/env/utils` — ese paquete no existe en
//    este árbol. Verbatim de
//    `ccnmt: packages/config/env/utils.ts:43-48,198-200`.
// 2. `getOauthConfig().BASE_API_URL` (de
//    `@claude-code-how-works/provider/oauthConstants`, ausente aquí) se
//    simplifica a la constante de producción
//    `https://api.anthropic.com` (`ccnmt: packages/provider/src/oauthConstants.ts:88`).
//    Se omite la rama `USER_TYPE === 'ant'` que la fuente usa para apuntar
//    a un OAuth de staging/local interno de Anthropic — irrelevante fuera
//    de ese entorno, y `ANTHROPIC_BASE_URL` (revisado primero, igual que
//    la fuente) sigue siendo la vía de override real.
// 3. `resetPreconnectStateForTests` es nuevo: no existe en la fuente. El
//    flag `fired` es un singleton de proceso — sin un reset, ningún test
//    posterior al primero puede ejercitar la función. Mismo patrón que
//    `resetHostBindingsForTests` en `../host.ts`.

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com'

function readEnv(name: string): string | undefined {
  return process.env[name]
}

function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

let fired = false

/**
 * Precalienta la conexión a la API de Anthropic para solapar el handshake
 * TCP+TLS (~100-200ms) con el resto del arranque, en vez de pagarlo dentro
 * de la primera llamada real. El pool de keep-alive de `fetch` es global,
 * así que la petición real reutiliza la conexión precalentada.
 */
export function preconnectAnthropicApi(): void {
  if (fired) return
  fired = true

  // Se omite si usa un proveedor cloud — endpoint y auth distintos.
  if (
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_BEDROCK')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_VERTEX')) ||
    isEnvTruthy(readEnv('CLAUDE_CODE_USE_FOUNDRY'))
  ) {
    return
  }
  // Se omite si hay proxy/mTLS/unix socket — el dispatcher a medida del
  // SDK no reutilizaría este pool.
  if (
    readEnv('HTTPS_PROXY') ||
    readEnv('https_proxy') ||
    readEnv('HTTP_PROXY') ||
    readEnv('http_proxy') ||
    readEnv('ANTHROPIC_UNIX_SOCKET') ||
    readEnv('CLAUDE_CODE_CLIENT_CERT') ||
    readEnv('CLAUDE_CODE_CLIENT_KEY')
  ) {
    return
  }

  // Usa la URL base configurada (staging, local, o gateway propio).
  const baseUrl = readEnv('ANTHROPIC_BASE_URL') || DEFAULT_ANTHROPIC_BASE_URL

  // Fire and forget. HEAD implica sin cuerpo de respuesta — la conexión
  // queda elegible para el pool de keep-alive apenas llegan las cabeceras.
  // Timeout de 10s para que una red lenta no cuelgue el proceso.
  void fetch(baseUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {})
}

/** Reinicia el singleton de proceso — sólo para tests. */
export function resetPreconnectStateForTests(): void {
  fired = false
}
