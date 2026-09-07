/**
 * Porte COMPLETO de
 * `ccnmt: packages/mcp-runtime/src/macOsKeychainHelpers.ts` — sus 6
 * exportaciones, ninguna omitida.
 *
 * `getClaudeConfigHomeDir` usa el sustituto local verbatim de
 * `./internal/pendingCrossPackageDeps.ts` — el mismo símbolo cuyo repunte
 * falso por `grep` (sin resolución real) se corrigió en H-DOCS-1160 dentro
 * de `client/authCache.ts` de este mismo puerto. `@thyrox/config/env/utils`
 * sólo trae `isEnvTruthy`/`readEnv`/`getAllEnv` (porte parcial
 * TASK-DOCS-0200); ésos son los 14 símbolos omitidos.
 *
 * `getOauthConfig` (`@claude-code-how-works/provider/oauthConstants`) NO
 * tiene sustituto local: no es una función pura y simple — construye
 * config real (URLs, `CLIENT_ID`) con ~140 líneas de lógica que
 * pertenecen al dominio de `@thyrox/provider`, no al de este paquete
 * (reimplementarla aquí sería scope creep sobre el porte de otro paquete).
 * Se envuelve con `require()` diferido — dentro de la función que la usa,
 * nunca en un `import` estático de nivel de módulo — para que ESTE
 * archivo siga siendo importable aunque esa función en concreto falle al
 * invocarse. Medido antes de la corrección: un `import` estático de
 * `@claude-code-how-works/provider/oauthConstants` hacía fallar la carga
 * del módulo ENTERO (`Cannot find module`, verificado con
 * `bun -e "import(...)"`), no sólo la función que la usa — el mismo
 * patrón que ya evita `appStateHooks.ts` de este puerto con su
 * `require('@claude-code-how-works/app-host/state/AppState.js')`
 * diferido.
 *
 * Helpers ligeros compartidos entre `keychainPrefetch.ts` y
 * `macOsKeychainStorage.ts` (ninguno de los dos portado aún — ver el
 * comentario de cabecera de la fuente sobre por qué este módulo no debe
 * importar `execa`/`execFileNoThrow`).
 */

import { createHash } from 'crypto'
import { userInfo } from 'os'
import { getClaudeConfigHomeDir } from './internal/pendingCrossPackageDeps.js'
import type { SecureStorageData } from './secureStorageTypes'

function getOauthConfig(): { OAUTH_FILE_SUFFIX: string } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@claude-code-how-works/provider/oauthConstants') as {
    getOauthConfig: () => { OAUTH_FILE_SUFFIX: string }
  }
  return mod.getOauthConfig()
}

// Sufijo que distingue la entrada de keychain de credenciales OAuth de la
// entrada legada de API key (que no usa sufijo). Ambas comparten el nombre
// base del servicio. NO cambiar este valor — es parte de la clave de
// búsqueda en el keychain y huerfanaría las credenciales ya almacenadas.
export const CREDENTIALS_SERVICE_SUFFIX = '-credentials'

export function getMacOsKeychainStorageServiceName(
  serviceSuffix: string = '',
): string {
  const configDir = getClaudeConfigHomeDir()
  const isDefaultDir = !process.env.CLAUDE_CONFIG_DIR

  // Usa un hash de la ruta del directorio de config para crear un sufijo
  // único pero estable. Sólo se añade sufijo para directorios no-default,
  // para mantener compatibilidad hacia atrás.
  const dirHash = isDefaultDir
    ? ''
    : `-${createHash('sha256').update(configDir).digest('hex').substring(0, 8)}`
  return `Claude Code${getOauthConfig().OAUTH_FILE_SUFFIX}${serviceSuffix}${dirHash}`
}

export function getUsername(): string {
  try {
    return process.env.USER || userInfo().username
  } catch {
    return 'claude-code-how-works-how-works-user'
  }
}

// --

// Caché de lecturas de keychain para evitar llamadas repetidas y costosas a
// la CLI de seguridad. El TTL acota la obsolescencia en escenarios
// cross-proceso (otra instancia de CC refrescando/invalidando tokens) sin
// forzar un spawnSync bloqueante en cada lectura. Las escrituras dentro del
// mismo proceso invalidan directamente vía clearKeychainCache().
//
// El camino de lectura síncrona toma ~500ms por cada spawn de `security`.
// Con 50+ conectores MCP de claude.ai autenticando al arranque, un TTL
// corto expira a mitad de la ráfaga y dispara lecturas síncronas repetidas
// — observado como un stall del event loop de 5.5s
// (go/ccshare/adamj-20260326-212235). 30s de obsolescencia cross-proceso es
// aceptable: los tokens OAuth expiran en horas, y el único escritor
// cross-proceso es otra instancia de CC en /login o refresh.
//
// Vive aquí (no en macOsKeychainStorage.ts) para que keychainPrefetch.ts
// pueda precargarla sin traer execa. Envuelto en un objeto porque los
// bindings `let` de ES modules no son escribibles entre límites de módulo
// — tanto este archivo como macOsKeychainStorage.ts necesitan mutar los
// tres campos.
export const KEYCHAIN_CACHE_TTL_MS = 30_000

export const keychainCacheState: {
  cache: { data: SecureStorageData | null; cachedAt: number } // cachedAt 0 = inválido
  // Se incrementa en cada invalidación de caché. readAsync() lo captura
  // antes de lanzar el spawn y se salta su escritura en caché si ya existe
  // una generación más nueva, evitando que un resultado obsoleto de
  // subproceso sobreescriba datos frescos escritos por update().
  generation: number
  // Deduplica llamadas concurrentes a readAsync() para que la expiración
  // del TTL bajo carga lance un solo subproceso, no N. Se limpia en la
  // invalidación para que las lecturas frescas no se unan a una promesa
  // en vuelo obsoleta.
  readInFlight: Promise<SecureStorageData | null> | null
} = {
  cache: { data: null, cachedAt: 0 },
  generation: 0,
  readInFlight: null,
}

export function clearKeychainCache(): void {
  keychainCacheState.cache = { data: null, cachedAt: 0 }
  keychainCacheState.generation++
  keychainCacheState.readInFlight = null
}

/**
 * Precarga la caché de keychain con un resultado de prefetch
 * (keychainPrefetch.ts). Sólo escribe si la caché aún no fue tocada — si
 * read() síncrono o update() ya corrieron, su resultado es autoritativo y
 * éste se descarta.
 */
export function primeKeychainCacheFromPrefetch(stdout: string | null): void {
  if (keychainCacheState.cache.cachedAt !== 0) return
  let data: SecureStorageData | null = null
  if (stdout) {
    try {
      // eslint-disable-next-line custom-rules/no-direct-json-operations -- jsonParse() trae slowOperations (lodash-es/cloneDeep) a la cadena de import de arranque temprano; ver la cabecera del archivo
      data = JSON.parse(stdout)
    } catch {
      // Resultado de prefetch malformado — deja que read() síncrono re-obtenga.
      return
    }
  }
  keychainCacheState.cache = { data, cachedAt: Date.now() }
}
