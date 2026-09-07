/**
 * Puerto de `ccnmt: packages/config/managedEnv.ts` (199 líneas fuente).
 * Aplica variables de entorno provenientes de settings a `process.env`, con
 * filtros de seguridad (túnel SSH, ruteo gestionado por el host, claves de
 * entorno de arranque de CCD) y la lista blanca de variables seguras
 * pre-confianza. Reimplementación fiel — misma lógica de filtrado, mismo
 * orden de aplicación por fuente.
 *
 * Repuntados vía `require()` diferido y ya EXISTENTES en su paquete
 * (`./internal/pendingCrossPackageDeps.ts` para los cross-package;
 * inline para los intra-`@thyrox/config` que sí existen):
 * - `clearMTLSCache` — `@thyrox/provider/mtls.js`, existe.
 *
 * BLOQUEADOS — el `require()` lanzará si se invoca, documentado en cada
 * envoltorio:
 * - `isSettingSourceEnabled` — CORREGIDO: esta línea decía "ya portado en
 *   este árbol" y era falso — medido con `bun -e "await import(...)"`
 *   (`SyntaxError: Export named 'isSettingSourceEnabled' not found`).
 *   `settings/constants.ts` de este árbol sólo porta
 *   `SETTING_SOURCES`/`EDITABLE_SOURCES`/`sourceDisplayName`/`precedence`/
 *   `parseSettingSourcesFlag` — no la función. Y en `ccnmt` la función real
 *   (`settings/constants.ts:175`) depende de `getEnabledSettingSources` →
 *   `getAllowedSettingSources` de `../internal/allowedSourcesState.js`,
 *   ninguno de los dos portado. Es DISTINTA de la función homónima que
 *   `plugin/_deps.ts` sí porta (slot DI con default `() => true`) —
 *   incluso en la fuente son dos funciones distintas en archivos distintos
 *   (`ccnmt: packages/config/settings/constants.ts:175` vs.
 *   `ccnmt: packages/config/plugin/_deps.ts:253`). El default de este
 *   envoltorio reusa el mismo `() => true` que `_deps.ts` ya declara para
 *   su homónima — no filtrar es la opción menos sorpresiva mientras la
 *   cadena real no esté portada.
 * - `isRemoteManagedSettingsEligible` — `./remote/syncCache.ts` no es uno
 *   de los 15 módulos del alcance (el único módulo de `remote/` portado es
 *   `remote/index.ts`) y no existe en este árbol.
 * - `getGlobalConfig` — `./global/config.ts` no existe en este árbol; nadie
 *   lo ha portado (ni está en los 15).
 * - `isProviderManagedEnvVar`, `SAFE_ENV_VARS` — SÍ portados: hoja sin
 *   dependencias propias, `./env/managed-constants.ts` (ver su propio
 *   docstring).
 * - `clearCACertsCache` — `@thyrox/provider/caCerts.ts` NO EXISTE (verificado
 *   con `ls`, no sólo con `Bun.resolveSync`).
 * - `clearProxyCache`/`configureGlobalAgents` — `@thyrox/provider/proxy.ts`
 *   NO EXISTE, mismo caso.
 * - `getSettings`/`getSettingsForSource` — `./settings/settings.ts` NO es
 *   uno de los 15 del alcance; es precisamente el caso a decidir del brief
 *   (`@thyrox/config/settings`): la fuente no tiene `settings/index.ts`, y
 *   el archivo real (`settings/settings.ts`, 35628 bytes) queda sin portar
 *   en este pase. Ver el reporte final para el veredicto medido completo.
 */

import {
  requireProviderCaCerts,
  requireProviderMtls,
  requireProviderProxy,
} from './internal/pendingCrossPackageDeps.js'
import { isEnvTruthy } from './env/utils.js'
import {
  isProviderManagedEnvVar,
  SAFE_ENV_VARS,
} from './env/managed-constants.js'

/**
 * `isSettingSourceEnabled` — `./settings/constants.ts` NO la porta (ver
 * docstring del módulo). Default `() => true`: no filtra ninguna fuente,
 * igual que el default del slot DI homónimo de `plugin/_deps.ts`.
 */
function requireSettingsConstants(): {
  isSettingSourceEnabled: (source: string) => boolean
} {
  const fallback = { isSettingSourceEnabled: () => true }
  try {
    // `require()` (a diferencia de un `import` estático) NO valida el
    // binding con nombre al resolver — el módulo carga igual y la
    // propiedad ausente da `undefined`. Por eso se comprueba el tipo
    // explícitamente en vez de confiar en que el `try` la habría atrapado.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: { isSettingSourceEnabled?: (source: string) => boolean } =
      require('./settings/constants.js')
    return typeof mod.isSettingSourceEnabled === 'function'
      ? { isSettingSourceEnabled: mod.isSettingSourceEnabled }
      : fallback
  } catch {
    return fallback
  }
}

/**
 * `isRemoteManagedSettingsEligible` — `./remote/syncCache.ts` no existe en
 * este árbol (fuera del alcance de los 15 módulos: sólo `remote/index.ts`
 * se porta en este pase).
 */
function requireRemoteSyncCache(): {
  isRemoteManagedSettingsEligible: () => boolean
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./remote/syncCache.js')
}

/**
 * `getGlobalConfig` — `./global/config.ts` no existe en este árbol (no está
 * entre los 15 módulos de este pase; nadie lo ha portado).
 */
function requireGlobalConfig(): {
  getGlobalConfig: () => { env?: Record<string, string> }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./global/config.js')
}

/**
 * `getSettings`/`getSettingsForSource` — `./settings/settings.ts` no existe
 * en este árbol. Es el caso `@thyrox/config/settings` del brief: la fuente
 * no declara `settings/index.ts`, así que no hay un módulo único que
 * portar; `settings/settings.ts` (35628 bytes) queda fuera del alcance de
 * los 15 y sin portar en este pase.
 */
function requireSettingsSettings(): {
  getSettings: () => { env?: Record<string, string>; outputStyle?: string } | null
  getSettingsForSource: (
    source: string,
  ) => { env?: Record<string, string> } | null
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./settings/settings.js')
}

/**
 * `claude ssh` remoto: `ANTHROPIC_UNIX_SOCKET` rutea la autenticación por un
 * socket reenviado con `-R` hacia un proxy local, y el lanzador setea un
 * puñado de variables de auth placeholder que el `settings.env` del remoto
 * NO DEBE machacar (ver `isAnthropicAuthEnabled`). Se descartan de cualquier
 * objeto de entorno proveniente de settings.
 */
function withoutSSHTunnelVars(
  env: Record<string, string> | undefined,
): Record<string, string> {
  if (!env || !process.env.ANTHROPIC_UNIX_SOCKET) return env || {}
  const {
    ANTHROPIC_UNIX_SOCKET: _1,
    ANTHROPIC_BASE_URL: _2,
    ANTHROPIC_API_KEY: _3,
    ANTHROPIC_AUTH_TOKEN: _4,
    CLAUDE_CODE_OAUTH_TOKEN: _5,
    ...rest
  } = env
  return rest
}

/**
 * Cuando el host es dueño del ruteo de inferencia (setea
 * `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` en el entorno de arranque), se
 * descartan del entorno proveniente de settings las variables de
 * selección de proveedor / modelo por defecto, para que un
 * `~/.claude/settings.json` de usuario no pueda redirigir requests fuera
 * del proveedor configurado por el host.
 */
function withoutHostManagedProviderVars(
  env: Record<string, string> | undefined,
): Record<string, string> {
  if (!env) return {}
  if (!isEnvTruthy(process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) {
    return env
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (!isProviderManagedEnvVar(key)) {
      out[key] = value
    }
  }
  return out
}

/**
 * Snapshot de las claves de entorno presentes antes de aplicar cualquier
 * `settings.env` — para CCD, son las claves que el host de escritorio
 * seteó para orquestar el subproceso. Settings no debe sobreescribirlas
 * (`OTEL_LOGS_EXPORTER=console` corrompería el transporte JSON-RPC de
 * stdio). Las claves añadidas DESPUÉS por settings de usuario/proyecto no
 * están en este conjunto, así que los cambios de `settings.json` a mitad
 * de sesión siguen aplicando. Se captura perezosamente en la primera
 * llamada a `applySafeConfigEnvironmentVariables()`.
 */
let ccdSpawnEnvKeys: Set<string> | null | undefined

function withoutCcdSpawnEnvKeys(
  env: Record<string, string> | undefined,
): Record<string, string> {
  if (!env || !ccdSpawnEnvKeys) return env || {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (!ccdSpawnEnvKeys.has(key)) out[key] = value
  }
  return out
}

/** Compone los filtros de descarte aplicados a todo objeto de entorno de settings. */
function filterSettingsEnv(
  env: Record<string, string> | undefined,
): Record<string, string> {
  return withoutCcdSpawnEnvKeys(
    withoutHostManagedProviderVars(withoutSSHTunnelVars(env)),
  )
}

/**
 * Fuentes de setting de confianza cuyas variables de entorno pueden
 * aplicarse antes del diálogo de confianza.
 *
 * - userSettings (`~/.claude/settings.json`): controlado por el usuario, no
 *   específico de proyecto.
 * - flagSettings (bandera `--settings` del CLI o settings inline del SDK):
 *   pasado explícitamente por el usuario.
 * - policySettings (settings gestionados de la API empresarial o
 *   `managed-settings.json` local): controlado por TI/admin (máxima
 *   prioridad, no se puede sobreescribir).
 *
 * Las fuentes con alcance de proyecto (`projectSettings`, `localSettings`)
 * se excluyen porque viven dentro del directorio del proyecto y podrían ser
 * commiteadas por un actor malicioso para redirigir tráfico (p. ej.
 * `ANTHROPIC_BASE_URL`) a un servidor controlado por el atacante.
 */
const TRUSTED_SETTING_SOURCES = [
  'userSettings',
  'flagSettings',
  'policySettings',
] as const

/**
 * Aplica variables de entorno de fuentes de confianza a `process.env`. Se
 * llama antes del diálogo de confianza para que variables de
 * usuario/empresa como `ANTHROPIC_BASE_URL` surtan efecto durante el
 * primer arranque/onboarding.
 *
 * Para fuentes de confianza (settings de usuario, gestionados, banderas de
 * CLI), se aplican TODAS las variables — incluidas las peligrosas como
 * `ANTHROPIC_BASE_URL`, que serían riesgosas desde settings con alcance de
 * proyecto.
 *
 * Para fuentes con alcance de proyecto (`projectSettings`, `localSettings`),
 * sólo se aplican las variables seguras de la lista blanca
 * `SAFE_ENV_VARS`. Éstas se aplican después de que la confianza está
 * plenamente establecida, vía `applyConfigEnvironmentVariables()`.
 */
export function applySafeConfigEnvironmentVariables(): void {
  // Captura las claves de entorno de arranque CCD antes de aplicar
  // cualquier settings.env (una sola vez).
  if (ccdSpawnEnvKeys === undefined) {
    ccdSpawnEnvKeys =
      process.env.CLAUDE_CODE_ENTRYPOINT === 'claude-desktop'
        ? new Set(Object.keys(process.env))
        : null
  }

  // El config global (~/.claude.json) es controlado por el usuario. En modo
  // CCD, filterSettingsEnv descarta las claves que estaban en el snapshot
  // del entorno de arranque, para que las variables operativas del host de
  // escritorio (OTEL, etc.) no queden sobreescritas.
  Object.assign(
    process.env,
    filterSettingsEnv(requireGlobalConfig().getGlobalConfig().env),
  )

  // Aplica TODAS las variables de las fuentes de setting de confianza,
  // policySettings al final. Se filtra por isSettingSourceEnabled para que
  // settingSources: [] del SDK (modo aislamiento) no quede machacado por el
  // env de ~/.claude/settings.json (gh#217). Las fuentes de policy/flag
  // siempre están habilitadas, así que esto sólo filtra userSettings.
  const { getSettingsForSource, getSettings } = requireSettingsSettings()
  const { isSettingSourceEnabled } = requireSettingsConstants()
  for (const source of TRUSTED_SETTING_SOURCES) {
    if (source === 'policySettings') continue
    if (!isSettingSourceEnabled(source)) continue
    Object.assign(
      process.env,
      filterSettingsEnv(getSettingsForSource(source)?.env),
    )
  }

  // Calcula la elegibilidad de settings gestionados remotos ahora, con
  // userSettings y flagSettings ya aplicados. La elegibilidad lee
  // CLAUDE_CODE_USE_BEDROCK, ANTHROPIC_BASE_URL — ambas seteables vía
  // settings.env. getSettingsForSource('policySettings') abajo consulta la
  // caché remota, que se guarda por esto. La estructura en dos fases hace
  // visible la dependencia de orden: env no-policy → elegibilidad → env de
  // policy.
  requireRemoteSyncCache().isRemoteManagedSettingsEligible()

  Object.assign(
    process.env,
    filterSettingsEnv(getSettingsForSource('policySettings')?.env),
  )

  // Aplica sólo las variables seguras de los settings completamente
  // fusionados (que incluyen fuentes con alcance de proyecto). Para
  // variables seguras que también existen en fuentes de confianza, el valor
  // fusionado (que puede venir de una fuente de proyecto de mayor
  // prioridad) sobreescribirá el valor de confianza — aceptable porque
  // están en la lista blanca segura. Sólo los valores de policySettings
  // están garantizados de sobrevivir sin cambio (tiene la mayor prioridad
  // de fusión en ambos loops) — excepto las variables de ruteo de
  // proveedor, que filterSettingsEnv descarta de toda fuente cuando
  // CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST está seteado.
  const settingsEnv = filterSettingsEnv(getSettings()?.env)
  for (const [key, value] of Object.entries(settingsEnv)) {
    if (SAFE_ENV_VARS.has(key.toUpperCase())) {
      process.env[key] = value
    }
  }
}

/**
 * Aplica variables de entorno de settings a `process.env`. Aplica TODAS las
 * variables (salvo las de ruteo de proveedor cuando
 * `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` está seteado — ver
 * `filterSettingsEnv`) y sólo debe llamarse tras establecer la confianza.
 * Aplica variables potencialmente peligrosas como `LD_PRELOAD`, `PATH`,
 * etc.
 */
export function applyConfigEnvironmentVariables(): void {
  Object.assign(
    process.env,
    filterSettingsEnv(requireGlobalConfig().getGlobalConfig().env),
  )

  const { getSettings } = requireSettingsSettings()
  Object.assign(process.env, filterSettingsEnv(getSettings()?.env))

  // Limpia las cachés para que los agentes se reconstruyan con las nuevas
  // variables de entorno.
  requireProviderCaCerts().clearCACertsCache()
  requireProviderMtls().clearMTLSCache()
  requireProviderProxy().clearProxyCache()

  // Reconfigura los agentes de proxy/mTLS para recoger cualquier variable
  // de proxy de settings.
  requireProviderProxy().configureGlobalAgents()
}
