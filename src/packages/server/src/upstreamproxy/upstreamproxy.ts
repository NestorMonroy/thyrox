/**
 * Puerto de `ccnmt: packages/server/src/upstreamproxy/upstreamproxy.ts`.
 *
 * upstreamproxy de CCR — cableado del lado contenedor.
 *
 * Cuando corre dentro de un contenedor de sesión CCR con upstreamproxy
 * configurado, este módulo:
 *   1. Lee el token de sesión de /run/ccr/session_token
 *   2. Fija prctl(PR_SET_DUMPABLE, 0) para bloquear el ptrace de mismo UID sobre el heap
 *   3. Descarga el cert CA de upstreamproxy y lo concatena con el bundle
 *      del sistema para que curl/gh/python confíen en el proxy MITM
 *   4. Arranca un relay local CONNECT→WebSocket (ver relay.ts)
 *   5. Borra el archivo de token (el token queda sólo en el heap; el
 *      archivo desaparece antes de que el bucle del agente pueda verlo,
 *      pero sólo después de confirmar que el relay está arriba, para que
 *      un reinicio del supervisor pueda reintentar)
 *   6. Expone las variables de entorno HTTPS_PROXY / SSL_CERT_FILE para
 *      todos los subprocesos del agente
 *
 * Cada paso falla en modo abierto: cualquier error loguea un warning y
 * desactiva el proxy. Un setup de proxy roto nunca debe romper una sesión
 * que de otro modo funcionaría.
 *
 * Doc de diseño: api-go/ccr/docs/plans/CCR_AUTH_DESIGN.md § "Week-1 pilot scope".
 *
 * `registerCleanup`/`logForDebugging`/`isEnvTruthy`/`isENOENT` — ver
 * `../internal/pendingCrossPackageDeps.js`.
 *
 * `require('bun:ffi')` se conserva EXACTAMENTE como la fuente: es un
 * módulo built-in de Bun (siempre resuelve bajo este runtime), guardado
 * tras `typeof Bun === 'undefined'` — no es un rodeo mío por Rule 3, es
 * la propia detección condicional de la fuente.
 */
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import {
  requireAppHostCleanupRegistry,
  requireConfigEnvUtils,
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
} from '../internal/pendingCrossPackageDeps.js'
import { startUpstreamProxyRelay } from './relay.js'

export const SESSION_TOKEN_PATH = '/run/ccr/session_token'
const SYSTEM_CA_BUNDLE = '/etc/ssl/certs/ca-certificates.crt'

// Hosts que el proxy NO debe interceptar. Cubre loopback, RFC1918, el
// rango de IMDS, y los registros de paquetes + GitHub a los que los
// contenedores CCR ya llegan directo. Refleja
// airlock/scripts/sandbox-shell-ccr.sh.
const NO_PROXY_LIST = [
  'localhost',
  '127.0.0.1',
  '::1',
  '169.254.0.0/16',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  // API de Anthropic: ninguna ruta upstream la va a matchear nunca, y el
  // MITM rompe runtimes que no son Bun (httpx/certifi de Python no
  // confía en la CA forjada). Tres formas porque el parseo de NO_PROXY
  // difiere entre runtimes:
  //   *.anthropic.com  — Bun, curl, Go (match de glob)
  //   .anthropic.com   — urllib/httpx de Python (match de sufijo, quita el punto inicial)
  //   anthropic.com    — fallback del dominio apex
  'anthropic.com',
  '.anthropic.com',
  '*.anthropic.com',
  'github.com',
  'api.github.com',
  '*.github.com',
  '*.githubusercontent.com',
  'registry.npmjs.org',
  'pypi.org',
  'files.pythonhosted.org',
  'index.crates.io',
  'proxy.golang.org',
].join(',')

type UpstreamProxyState = {
  enabled: boolean
  port?: number
  caBundlePath?: string
}

let state: UpstreamProxyState = { enabled: false }

/**
 * Inicializa upstreamproxy. Se llama una vez desde init.ts. Seguro de
 * llamar cuando la feature está apagada o el archivo de token está
 * ausente — devuelve {enabled: false}.
 *
 * Las rutas sobreescribibles son para tests; producción usa los defaults.
 */
export async function initUpstreamProxy(opts?: {
  tokenPath?: string
  systemCaPath?: string
  caBundlePath?: string
  ccrBaseUrl?: string
}): Promise<UpstreamProxyState> {
  const { isEnvTruthy } = requireConfigEnvUtils()
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { registerCleanup } = requireAppHostCleanupRegistry()

  if (!isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
    return state
  }
  // CCR evalúa ccr_upstream_proxy_enabled del lado servidor (donde
  // GrowthBook está caliente) e inyecta esta variable de entorno vía
  // StartupContext.EnvironmentVariables. Cada sesión CCR es un
  // contenedor fresco sin caché de GB, así que un check de GB del lado
  // cliente aquí siempre devolvía el default (false).
  if (!isEnvTruthy(process.env.CCR_UPSTREAM_PROXY_ENABLED)) {
    return state
  }

  const sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID
  if (!sessionId) {
    logForDebugging(
      '[upstreamproxy] CLAUDE_CODE_REMOTE_SESSION_ID unset; proxy disabled',
      { level: 'warn' },
    )
    return state
  }

  const tokenPath = opts?.tokenPath ?? SESSION_TOKEN_PATH
  const token = await readToken(tokenPath)
  if (!token) {
    logForDebugging('[upstreamproxy] no session token file; proxy disabled')
    return state
  }

  setNonDumpable()

  // CCR inyecta ANTHROPIC_BASE_URL vía StartupContext (sessionExecutor.ts
  // / sessionHandler.ts). getOauthConfig() está mal aquí: depende de
  // USER_TYPE + USE_{LOCAL,STAGING}_OAUTH, ninguna de las cuales fija el
  // contenedor, así que siempre devolvía la URL de prod y la descarga de
  // CA daba 404.
  const baseUrl =
    opts?.ccrBaseUrl ??
    process.env.ANTHROPIC_BASE_URL ??
    'https://api.anthropic.com'
  const caBundlePath =
    opts?.caBundlePath ?? join(homedir(), '.ccr', 'ca-bundle.crt')

  const caOk = await downloadCaBundle(
    baseUrl,
    opts?.systemCaPath ?? SYSTEM_CA_BUNDLE,
    caBundlePath,
  )
  if (!caOk) return state

  try {
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/v1/code/upstreamproxy/ws'
    const relay = await startUpstreamProxyRelay({ wsUrl, sessionId, token })
    registerCleanup(async () => relay.stop())
    state = { enabled: true, port: relay.port, caBundlePath }
    logForDebugging(`[upstreamproxy] enabled on 127.0.0.1:${relay.port}`)
    // Sólo borra el archivo tras confirmar que el listener está arriba:
    // si la descarga de CA o el listen() fallan, un reinicio del
    // supervisor puede reintentar con el token todavía en disco.
    await unlink(tokenPath).catch(() => {
      logForDebugging('[upstreamproxy] token file unlink failed', {
        level: 'warn',
      })
    })
  } catch (err) {
    logForDebugging(
      `[upstreamproxy] relay start failed: ${err instanceof Error ? err.message : String(err)}; proxy disabled`,
      { level: 'warn' },
    )
  }

  return state
}

/**
 * Variables de entorno para mezclar en cada subproceso del agente. Vacío
 * cuando el proxy está desactivado. Se llama desde subprocessEnv() para
 * que Bash/MCP/LSP/hooks hereden todos la misma receta.
 */
export function getUpstreamProxyEnv(): Record<string, string> {
  if (!state.enabled || !state.port || !state.caBundlePath) {
    // Los subprocesos hijos de CLI no pueden reinicializar el relay (el
    // archivo de token lo borró el padre), pero el relay del padre sigue
    // corriendo y es alcanzable en 127.0.0.1:<port>. Si heredamos las
    // variables de proxy del padre (HTTPS_PROXY + SSL_CERT_FILE ambas
    // fijadas), se pasan también para que nuestros subprocesos enruten
    // por el relay del padre.
    if (process.env.HTTPS_PROXY && process.env.SSL_CERT_FILE) {
      const inherited: Record<string, string> = {}
      for (const key of [
        'HTTPS_PROXY',
        'https_proxy',
        'NO_PROXY',
        'no_proxy',
        'SSL_CERT_FILE',
        'NODE_EXTRA_CA_CERTS',
        'REQUESTS_CA_BUNDLE',
        'CURL_CA_BUNDLE',
      ]) {
        if (process.env[key]) inherited[key] = process.env[key]
      }
      return inherited
    }
    return {}
  }
  const proxyUrl = `http://127.0.0.1:${state.port}`
  // Sólo HTTPS: el relay maneja CONNECT y nada más. El HTTP plano no
  // tiene credenciales que inyectar, así que enrutarlo por el relay sólo
  // rompería la petición con un 405.
  return {
    HTTPS_PROXY: proxyUrl,
    https_proxy: proxyUrl,
    NO_PROXY: NO_PROXY_LIST,
    no_proxy: NO_PROXY_LIST,
    SSL_CERT_FILE: state.caBundlePath,
    NODE_EXTRA_CA_CERTS: state.caBundlePath,
    REQUESTS_CA_BUNDLE: state.caBundlePath,
    CURL_CA_BUNDLE: state.caBundlePath,
  }
}

/** Sólo para tests: resetea el estado del módulo entre casos de test. */
export function resetUpstreamProxyForTests(): void {
  state = { enabled: false }
}

async function readToken(path: string): Promise<string | null> {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { isENOENT } = requireLocalObservabilityErrorHelpers()
  try {
    const raw = await readFile(path, 'utf8')
    return raw.trim() || null
  } catch (err) {
    if (isENOENT(err)) return null
    logForDebugging(
      `[upstreamproxy] token read failed: ${err instanceof Error ? err.message : String(err)}`,
      { level: 'warn' },
    )
    return null
  }
}

/**
 * prctl(PR_SET_DUMPABLE, 0) vía FFI a libc. Bloquea el ptrace de mismo
 * UID sobre este proceso, así un `gdb -p $PPID` inyectado por prompt no
 * puede rascar el token del heap. Sólo Linux; no-op en silencio en el resto.
 */
function setNonDumpable(): void {
  if (process.platform !== 'linux' || typeof Bun === 'undefined') return
  const { logForDebugging } = requireLocalObservabilityDebug()
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffi = require('bun:ffi') as typeof import('bun:ffi')
    const lib = ffi.dlopen('libc.so.6', {
      prctl: {
        args: ['int', 'u64', 'u64', 'u64', 'u64'],
        returns: 'int',
      },
    } as const)
    const PR_SET_DUMPABLE = 4
    const rc = lib.symbols.prctl(PR_SET_DUMPABLE, 0n, 0n, 0n, 0n)
    if (rc !== 0) {
      logForDebugging(
        '[upstreamproxy] prctl(PR_SET_DUMPABLE,0) returned nonzero',
        {
          level: 'warn',
        },
      )
    }
  } catch (err) {
    logForDebugging(
      `[upstreamproxy] prctl unavailable: ${err instanceof Error ? err.message : String(err)}`,
      { level: 'warn' },
    )
  }
}

async function downloadCaBundle(
  baseUrl: string,
  systemCaPath: string,
  outPath: string,
): Promise<boolean> {
  const { logForDebugging } = requireLocalObservabilityDebug()
  try {
    const resp = await fetch(`${baseUrl}/v1/code/upstreamproxy/ca-cert`, {
      // Bun no tiene timeout de fetch por defecto — un endpoint colgado
      // bloquearía el arranque del CLI para siempre. 5s es generoso para un PEM chico.
      signal: AbortSignal.timeout(5000),
    })
    if (!resp.ok) {
      logForDebugging(
        `[upstreamproxy] ca-cert fetch ${resp.status}; proxy disabled`,
        { level: 'warn' },
      )
      return false
    }
    const ccrCa = await resp.text()
    const systemCa = await readFile(systemCaPath, 'utf8').catch(() => '')
    await mkdir(join(outPath, '..'), { recursive: true })
    await writeFile(outPath, systemCa + '\n' + ccrCa, 'utf8')
    return true
  } catch (err) {
    logForDebugging(
      `[upstreamproxy] ca-cert download failed: ${err instanceof Error ? err.message : String(err)}; proxy disabled`,
      { level: 'warn' },
    )
    return false
  }
}
