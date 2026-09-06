/**
 * Adaptación de @claude-code-how-works/app-host: src/init.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * `init()` es la secuencia de arranque completa del host: configs,
 * variables de entorno seguras, cleanup en salida, OAuth, detección de
 * JetBrains/repo, settings remotos, migración de conexiones legacy,
 * mTLS/proxy, Sentry, preconexión a la API, shell de Windows, LSP,
 * swarm, scratchpad. Es la iniciativa más grande de este pase: 30
 * imports distintos de 15 paquetes/módulos hermanos.
 *
 * CINCO de esos imports son en realidad DEL PROPIO PAQUETE
 * `@thyrox/app-host` — la fuente los escribe con self-import
 * (`@claude-code-how-works/app-host/...`) porque su convención de
 * monorepo lo permite; aquí se TRADUCEN a ruta relativa, igual que
 * `activityManager.ts` ya hace para `./bootstrap/state.js`. Los cinco
 * SÍ existen hoy, portados por el otro agente de este mismo pase
 * (tramo A, familia `startup`):
 *
 *   - `./startup/startupProfiler.js` → `profileCheckpoint`
 *   - `./startup/apiPreconnect.js` → `preconnectAnthropicApi`
 *   - `./startup/caCertsConfig.js` → `applyExtraCACertsFromConfig`
 *   - `./bootstrap/gracefulShutdown.js` → `gracefulShutdownSync`,
 *     `setupGracefulShutdown`
 *   - `./bootstrap/cleanupRegistry.js` → `registerCleanup`
 *
 * `./bootstrap/state.js` (import de side-effect + `getIsNonInteractiveSession`
 * + el tipo `AttributedCounter` + `getSessionCounter`/`setMeter`) también
 * se tradujo a ruta relativa: es del propio paquete, aunque
 * `bootstrap/` es zona PROHIBIDA de este pase (la escribe el otro
 * agente) y ninguno de esos cuatro símbolos está hoy en su `state.ts`
 * — mismo criterio que `activityManager.ts` fija para
 * `getActiveTimeCounter`.
 *
 * El RESTO —24 imports— citan paquetes o subpaths genuinamente
 * ausentes en este árbol, y se conservan literales:
 *
 *   - Paquetes enteros ausentes: `ide`, `provider`, `local-observability`,
 *     `permission`, `shell`, `swarm`, `repl`, `server`.
 *   - Subpaths de `@thyrox/config` (SÍ existe) que no expone: `.` (para
 *     `enableConfigs`/`recordFirstStartTime`), `/remote`,
 *     `/feature-flags`, `/env/dynamic`, `/env/utils`, `/platform`,
 *     `/managedEnv.js`.
 *   - Subpaths de `@thyrox/storage` (SÍ existe) que no expone:
 *     `/detectRepository.js`, `/windowsPaths.js`.
 *   - `@opentelemetry/api` (sólo tipos: `Attributes`, `MetricOptions`)
 *     y `lodash-es` (`memoize`) — dependencias externas, ninguna
 *     instalada en `node_modules` de este árbol (`find . -maxdepth 5
 *     -iname lodash-es -o -iname @opentelemetry` → 0 resultados).
 *     Instalarlas es decisión del ejecutor, no de este pase.
 *
 * Ninguno de los 24 se stubea: se conservan literales, mismo criterio
 * que `providerHostSetup.ts`/`heapDumpService.ts` (hermanos de este
 * mismo pase) y `agent/internal/macroFallback.ts`.
 *
 * Toda la lógica de `init()`, `initializeTelemetryAfterTrust()`,
 * `doInitializeTelemetry()` y `setMeterState()` se porta verbatim: es
 * el contrato de arranque completo, y no hay forma de reducirlo sin
 * inventar un mecanismo que la fuente no tiene.
 *
 * Sin test: `memoize` de `lodash-es` (dependencia externa no instalada)
 * ya agota la resolución de módulos antes de que corra cualquier código
 * — y aunque se instalara, los 23 imports restantes de paquetes
 * ausentes lo bloquean igual. Mismo estado que
 * `heapDumpService.ts`/`providerHostSetup.ts` (hermanos de este mismo
 * pase).
 */
import { profileCheckpoint } from './startup/startupProfiler.js'
import './bootstrap/state.js'
import type { Attributes, MetricOptions } from '@opentelemetry/api'
import memoize from 'lodash-es/memoize.js'
import { getIsNonInteractiveSession } from './bootstrap/state.js'
import type { AttributedCounter } from './bootstrap/state.js'
import { getSessionCounter, setMeter } from './bootstrap/state.js'
import { shutdownLspServerManager } from '@claude-code-how-works/ide/lsp/manager.js'
import { populateOAuthAccountInfoIfNeeded } from '@claude-code-how-works/provider/oauth/client.js'
import {
  initializePolicyLimitsLoadingPromise,
  isPolicyLimitsEligible,
} from '@claude-code-how-works/provider/policyLimits/index.js'
import {
  initializeRemoteManagedSettingsLoadingPromise,
  isEligibleForRemoteManagedSettings,
  waitForRemoteManagedSettingsToLoad,
} from '@claude-code-how-works/config/remote'
import { preconnectAnthropicApi } from './startup/apiPreconnect.js'
import { applyExtraCACertsFromConfig } from './startup/caCertsConfig.js'
import { registerCleanup } from './bootstrap/cleanupRegistry.js'
import { enableConfigs, recordFirstStartTime } from '@claude-code-how-works/config'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import { detectCurrentRepository } from '@claude-code-how-works/storage/detectRepository.js'
import { logForDiagnosticsNoPII } from '@claude-code-how-works/local-observability/logging'
import { initJetBrainsDetection } from '@claude-code-how-works/config/env/dynamic'
import { isEnvTruthy } from '@claude-code-how-works/config/env/utils'
import { getPlatform } from '@claude-code-how-works/config/platform'
import { getCachedPowerShellPath, isPowerShellToolEnabled } from '@claude-code-how-works/shell'
import { ConfigParseError, errorMessage } from '@claude-code-how-works/local-observability/errorHelpers.js'
// showInvalidConfigDialog se importa dinámicamente en la ruta de error para no cargar React durante init
import {
  gracefulShutdownSync,
  setupGracefulShutdown,
} from './bootstrap/gracefulShutdown.js'
import {
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
} from '@claude-code-how-works/config/managedEnv.js'
import { configureGlobalMTLS } from '@claude-code-how-works/provider/mtls.js'
import {
  ensureScratchpadDir,
  isScratchpadEnabled,
} from '@claude-code-how-works/permission/filesystem'
// initializeTelemetry se carga perezosamente vía import() en setMeterState() para diferir
// ~400KB de módulos OpenTelemetry + protobuf hasta que la telemetría realmente se inicializa.
// Los exporters gRPC (~700KB vía @grpc/grpc-js) se cargan perezosamente aún más adentro, en instrumentation.ts.
import { configureGlobalAgents } from '@claude-code-how-works/provider/proxy.js'
import { isBetaTracingEnabled } from '@claude-code-how-works/local-observability/betaSessionTracing.js'
import { getTelemetryAttributes } from '@claude-code-how-works/local-observability/telemetry'
import { setShellIfWindows, findGitBashPath } from '@claude-code-how-works/storage/windowsPaths.js'
import { initSentry } from '@claude-code-how-works/local-observability/sentry.js'

// initialize1PEventLogging se importa dinámicamente para diferir sdk-logs/resources de OpenTelemetry

// Rastrea si la telemetría ya se inicializó, para evitar doble inicialización
let telemetryInitialized = false

export const init = memoize(async (): Promise<void> => {
  const initStartTime = Date.now()
  logForDiagnosticsNoPII('info', 'init_started')
  profileCheckpoint('init_function_start')

  // Valida que los configs sean válidos y habilita el sistema de configuración
  try {
    const configsStart = Date.now()
    enableConfigs()
    logForDiagnosticsNoPII('info', 'init_configs_enabled', {
      duration_ms: Date.now() - configsStart,
    })
    profileCheckpoint('init_configs_enabled')

    // Aplica sólo variables de entorno seguras antes del diálogo de confianza.
    // Las variables de entorno completas se aplican después de establecer la confianza.
    const envVarsStart = Date.now()
    applySafeConfigEnvironmentVariables()

    // Aplica NODE_EXTRA_CA_CERTS desde settings.json a process.env temprano,
    // antes de cualquier conexión TLS. Bun cachea el store de certs TLS al
    // arrancar vía BoringSSL, así que esto debe pasar antes del primer
    // handshake TLS.
    applyExtraCACertsFromConfig()

    logForDiagnosticsNoPII('info', 'init_safe_env_vars_applied', {
      duration_ms: Date.now() - envVarsStart,
    })
    profileCheckpoint('init_safe_env_vars_applied')

    // Asegura que todo se flushee al salir
    setupGracefulShutdown()
    profileCheckpoint('init_after_graceful_shutdown')

    void import('@claude-code-how-works/config/feature-flags')
    profileCheckpoint('init_after_1p_event_logging')

    // Puebla la info de cuenta OAuth si no está ya cacheada en config. Es
    // necesario porque la info de cuenta OAuth puede no estar poblada al
    // iniciar sesión vía la extensión de VSCode.
    void populateOAuthAccountInfoIfNeeded()
    profileCheckpoint('init_after_oauth_populate')

    // Inicializa la detección de IDE JetBrains de forma asíncrona (puebla el
    // caché para acceso síncrono posterior)
    void initJetBrainsDetection()
    profileCheckpoint('init_after_jetbrains_detection')

    // Detecta el repositorio de GitHub de forma asíncrona (puebla el caché
    // para el linking de PR de gitDiff)
    void detectCurrentRepository()

    // Inicializa la promesa de carga temprano para que otros sistemas (como
    // los hooks de plugin) puedan esperar la carga de settings remotos. La
    // promesa incluye un timeout para evitar deadlocks si
    // loadRemoteManagedSettings() nunca se llama (p. ej. tests del Agent SDK).
    if (isEligibleForRemoteManagedSettings()) {
      initializeRemoteManagedSettingsLoadingPromise()
    }
    if (isPolicyLimitsEligible()) {
      initializePolicyLimitsLoadingPromise()
    }
    profileCheckpoint('init_after_remote_settings_check')

    // Registra la hora del primer arranque
    recordFirstStartTime()

    // Migra cualquier config de provider legacy basada en env a registros de
    // conexión. Idempotente — no-op si ya existen conexiones para esos
    // valores. V7 §11.6 — el registro de conexiones es la nueva fuente de
    // verdad; env es sólo fallback.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { migrateLegacyEnvToConnections } = require(
        '@claude-code-how-works/provider/connections.js',
      ) as typeof import('@claude-code-how-works/provider/connections.js')
      // Lee de settings.env primero (persistente), cae a process.env.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSettings } = require(
        '@claude-code-how-works/config/settings',
      ) as typeof import('@claude-code-how-works/config/settings')
      const settings = getSettings() ?? {}
      const settingsEnv = (settings.env ?? {}) as Record<string, string>
      const merged: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([, v]): v is string => typeof v === 'string',
          ),
        ),
        ...settingsEnv,
      }
      const { migrated, clearedModelType } =
        migrateLegacyEnvToConnections(merged)
      if (migrated.length > 0) {
        logForDebugging(
          `[connections] migrated legacy env to connections: ${migrated.join(', ')}`,
        )
      }
      if (clearedModelType) {
        logForDebugging(
          '[connections] cleared legacy settings.modelType — routing is per-connection now',
        )
      }
    } catch (e) {
      // El fallo de la migración NO debe bloquear el arranque — los caminos
      // de fallback siguen funcionando.
      logForDebugging(
        `[connections] migration skipped: ${e instanceof Error ? e.message : String(e)}`,
      )
    }

    // Cura conexiones Codex con modelos obsoletos que sobreviven de builds
    // anteriores. El código pre-discovery escribía los slugs de tier
    // API-key (`gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`)
    // en el registro de conexión; el backend de cuenta ChatGPT los rechaza
    // con HTTP 400. Ajusta cualquier registro así de vuelta a la lista
    // codificada de tier correcto en `getDefaultModelsForProtocol('codex')`.
    // Los espejos estáticos existentes también necesitan la familia GPT-5.6
    // recién documentada. Preserva entradas desconocidas/personalizadas al
    // refrescar registros canónicos y su orden.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getConnections, saveConnection, refreshCodexModelCatalog } =
        require(
          '@claude-code-how-works/provider/connections.js',
        ) as typeof import('@claude-code-how-works/provider/connections.js')
      for (const c of getConnections()) {
        if (c.protocol !== 'codex') continue
        const refreshed = refreshCodexModelCatalog(c.models)
        if (!refreshed.changed) continue
        saveConnection({ ...c, models: refreshed.models })
        logForDebugging(
          `[connections] codex models healed: refreshed model catalog on connection ${c.id}`,
        )
      }
    } catch (e) {
      logForDebugging(
        `[connections] codex models heal failed: ${e instanceof Error ? e.message : String(e)}`,
      )
    }

    // Configura los settings globales de mTLS
    const mtlsStart = Date.now()
    logForDebugging('[init] configureGlobalMTLS starting')
    configureGlobalMTLS()
    logForDiagnosticsNoPII('info', 'init_mtls_configured', {
      duration_ms: Date.now() - mtlsStart,
    })
    logForDebugging('[init] configureGlobalMTLS complete')

    // Configura los agentes HTTP globales (proxy y/o mTLS)
    const proxyStart = Date.now()
    logForDebugging('[init] configureGlobalAgents starting')
    configureGlobalAgents()
    logForDiagnosticsNoPII('info', 'init_proxy_configured', {
      duration_ms: Date.now() - proxyStart,
    })
    logForDebugging('[init] configureGlobalAgents complete')
    profileCheckpoint('init_network_configured')

    // Inicializa Sentry para reporte de errores (no-op si SENTRY_DSN no está fijado)
    initSentry()

    // Preconecta a la API de Anthropic — solapa el handshake TCP+TLS
    // (~100-200ms) con los ~100ms de trabajo del action-handler previos al
    // request de la API. Corre después de configurar CA certs + agentes de
    // proxy, para que la conexión precalentada use el transporte correcto.
    // Fire-and-forget; se salta para proxy/mTLS/unix/cloud-provider donde el
    // dispatcher del SDK no reusaría el pool global.
    preconnectAnthropicApi()

    // CCR upstreamproxy: arranca el relay CONNECT local para que los
    // subprocesos de agente puedan alcanzar upstreams configurados por la
    // org con inyección de credenciales. Gateado en CLAUDE_CODE_REMOTE +
    // GrowthBook; fail-open ante cualquier error. Import perezoso para que
    // los arranques no-CCR no paguen la carga del módulo. La función
    // getUpstreamProxyEnv se registra con subprocessEnv.ts para que el spawn
    // de subprocesos pueda inyectar variables de proxy sin un import
    // estático del módulo upstreamproxy.
    if (isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
      try {
        const { initUpstreamProxy, getUpstreamProxyEnv } = await import(
          '@claude-code-how-works/server/upstreamproxy/upstreamproxy.js'
        )
        const { registerUpstreamProxyEnvFn } = await import(
          '@claude-code-how-works/shell/subprocessEnv.js'
        )
        registerUpstreamProxyEnvFn(getUpstreamProxyEnv)
        await initUpstreamProxy()
      } catch (err) {
        logForDebugging(
          `[init] upstreamproxy init failed: ${err instanceof Error ? err.message : String(err)}; continuing without proxy`,
          { level: 'warn' },
        )
      }
    }

    // Configura el shell en Windows. Cuando no se encuentra git-bash,
    // PowerShell es un fallback completamente soportado — todas las
    // herramientas no-bash (incluyendo PowerShellTool) siguen disponibles.
    // Sólo sale cuando NI bash NI PowerShell existen en el sistema.
    setShellIfWindows()
    if (getPlatform() === 'windows' && !findGitBashPath()) {
      if (!isPowerShellToolEnabled()) {
        process.stderr.write(
          'Claude Code on Windows requires a shell tool. Git Bash was not found and the PowerShell tool is disabled (CLAUDE_CODE_USE_POWERSHELL_TOOL=0).\n' +
            '  - Install Git for Windows: https://git-scm.com/downloads/win, or\n' +
            '  - Remove CLAUDE_CODE_USE_POWERSHELL_TOOL from your environment or settings.\n',
        )
        // eslint-disable-next-line custom-rules/no-process-exit
        process.exit(1)
      }
      if ((await getCachedPowerShellPath()) === null) {
        process.stderr.write(
          'Claude Code on Windows requires either Git for Windows (for bash) or PowerShell. Install one of:\n' +
            '  - Git for Windows: https://git-scm.com/downloads/win\n' +
            '  - PowerShell 7: https://aka.ms/powershell\n' +
            'Or set CLAUDE_CODE_GIT_BASH_PATH to your bash.exe location.\n',
        )
        // eslint-disable-next-line custom-rules/no-process-exit
        process.exit(1)
      }
    }

    // Registra el cleanup del gestor LSP (la inicialización ocurre en
    // main.tsx después de procesar --plugin-dir)
    registerCleanup(shutdownLspServerManager)

    // gh-32730: los teams creados por subagentes (o el agente principal sin
    // TeamDelete explícito) quedaban en disco para siempre. Registra el
    // cleanup para todos los teams creados en esta sesión. Import perezoso:
    // el código de swarm está detrás de un feature gate y la mayoría de
    // sesiones nunca crea teams.
    registerCleanup(async () => {
      const { cleanupSessionTeams } = await import(
        '@claude-code-how-works/swarm'
      )
      await cleanupSessionTeams()
    })

    // Inicializa el directorio de scratchpad si está habilitado
    if (isScratchpadEnabled()) {
      const scratchpadStart = Date.now()
      await ensureScratchpadDir()
      logForDiagnosticsNoPII('info', 'init_scratchpad_created', {
        duration_ms: Date.now() - scratchpadStart,
      })
    }

    logForDiagnosticsNoPII('info', 'init_completed', {
      duration_ms: Date.now() - initStartTime,
    })
    profileCheckpoint('init_function_end')
  } catch (error) {
    if (error instanceof ConfigParseError) {
      // Se salta el diálogo interactivo de Ink cuando no se puede renderizar
      // con seguridad. El diálogo rompe consumidores JSON (p. ej. el gestor
      // de marketplace del desktop corriendo
      // `plugin marketplace list --json` en un sandbox de VM).
      if (getIsNonInteractiveSession()) {
        process.stderr.write(
          `Configuration error in ${error.filePath}: ${error.message}\n`,
        )
        gracefulShutdownSync(1)
        return
      }

      // Muestra el diálogo de config inválida con el objeto de error y espera a que termine
      return import('@claude-code-how-works/repl/components/InvalidConfigDialog.js').then(m =>
        m.showInvalidConfigDialog({ error }),
      )
      // El diálogo mismo maneja process.exit, así que no hace falta cleanup adicional aquí
    } else {
      // Para errores que no son de config, se relanzan
      throw error
    }
  }
})

/**
 * Inicializa telemetría después de que se otorgó la confianza.
 * Para usuarios elegibles a settings remotos, espera a que carguen los
 * settings (sin bloquear), luego re-aplica las variables de entorno (para
 * incluir settings remotos) antes de inicializar telemetría.
 * Para usuarios no elegibles, inicializa telemetría de inmediato.
 * Sólo debe llamarse una vez, después de que se aceptó el diálogo de confianza.
 */
export function initializeTelemetryAfterTrust(): void {
  return
}

async function doInitializeTelemetry(): Promise<void> {
  if (telemetryInitialized) {
    // Ya inicializada, nada que hacer
    return
  }

  // Fija la bandera antes de inicializar, para evitar doble inicialización
  telemetryInitialized = true
  try {
    await setMeterState()
  } catch (error) {
    // Resetea la bandera ante un fallo, para que llamadas subsecuentes puedan reintentar
    telemetryInitialized = false
    throw error
  }
}

async function setMeterState(): Promise<void> {
  // Carga perezosa de instrumentation para diferir ~400KB de OpenTelemetry + protobuf
  const { initializeTelemetry } = await import(
    '@claude-code-how-works/local-observability/telemetry'
  )
  // Inicializa telemetría OTLP de cliente (métricas, logs, traces)
  const meter = await initializeTelemetry()
  if (meter) {
    // Crea función factory para contadores atribuidos
    const createAttributedCounter = (
      name: string,
      options: MetricOptions,
    ): AttributedCounter => {
      const counter = meter?.createCounter(name, options)

      return {
        add(value: number, additionalAttributes: Attributes = {}) {
          // Siempre trae atributos de telemetría frescos para asegurar que estén al día
          const currentAttributes = getTelemetryAttributes()
          const mergedAttributes = {
            ...currentAttributes,
            ...additionalAttributes,
          }
          counter?.add(value, mergedAttributes)
        },
      }
    }

    setMeter(meter, createAttributedCounter)

    // Incrementa el contador de sesión aquí porque el camino de telemetría de
    // arranque corre antes de que esta inicialización asíncrona termine, así
    // que el contador sería null ahí.
    getSessionCounter()?.add(1)
  }
}
