/**
 * Puerto de `ccnmt: packages/ide/src/lsp/manager.ts`. `isBareMode` viene de
 * `@claude-code-how-works/config/env/utils.js` — no está en `@thyrox/config`
 * todavía; sustituto en `../internal/pendingCrossPackageDeps.js`.
 */
import {
  isBareMode,
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
} from '../internal/pendingCrossPackageDeps.js'
import {
  createLSPServerManager,
  type LSPServerManager,
} from './LSPServerManager.js'
import { registerLSPNotificationHandlers } from './passiveFeedback.js'

/**
 * Estado de inicialización del manager de servidores LSP.
 */
type InitializationState = 'not-started' | 'pending' | 'success' | 'failed'

/**
 * Instancia singleton global del manager de servidores LSP. Se inicializa
 * durante el arranque de Claude Code.
 */
let lspManagerInstance: LSPServerManager | undefined

/**
 * Estado de inicialización actual.
 */
let initializationState: InitializationState = 'not-started'

/**
 * Error del último intento de inicialización, si lo hubo.
 */
let initializationError: Error | undefined

/**
 * Contador de generación, para evitar que promesas de inicialización
 * obsoletas actualicen el estado.
 */
let initializationGeneration = 0

/**
 * Promesa que se resuelve cuando la inicialización termina (éxito o fallo).
 */
let initializationPromise: Promise<void> | undefined

/**
 * Reset síncrono, sólo para tests. shutdownLspServerManager() es async y
 * desmonta conexiones reales; esto sólo limpia el estado del singleton a
 * nivel de módulo, para que reinitializeLspServerManager() salga temprano
 * en 'not-started' en tests posteriores del mismo shard.
 */
export function _resetLspManagerForTesting(): void {
  initializationState = 'not-started'
  initializationError = undefined
  initializationPromise = undefined
  initializationGeneration++
}

/**
 * Obtiene la instancia singleton del manager de servidores LSP. Devuelve
 * `undefined` si aún no se inicializó, la inicialización falló, o sigue
 * pendiente.
 *
 * Quien llama debe comprobar `undefined` y manejarlo con gracia, ya que la
 * inicialización ocurre de forma asíncrona durante el arranque de Claude
 * Code. Usar getInitializationStatus() para distinguir entre los estados
 * pendiente, fallido y no-iniciado.
 */
export function getLspServerManager(): LSPServerManager | undefined {
  // No se devuelve una instancia rota si la inicialización falló.
  if (initializationState === 'failed') {
    return undefined
  }
  return lspManagerInstance
}

/**
 * Obtiene el estado actual de inicialización del manager de servidores LSP.
 *
 * @returns Objeto de estado con el estado actual y el error (si falló).
 */
export function getInitializationStatus():
  | { status: 'not-started' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'failed'; error: Error } {
  if (initializationState === 'failed') {
    return {
      status: 'failed',
      error: initializationError || new Error('Initialization failed'),
    }
  }
  if (initializationState === 'not-started') {
    return { status: 'not-started' }
  }
  if (initializationState === 'pending') {
    return { status: 'pending' }
  }
  return { status: 'success' }
}

/**
 * Comprueba si al menos un language server está conectado y saludable.
 * Respalda LSPTool.isEnabled().
 */
export function isLspConnected(): boolean {
  if (initializationState === 'failed') return false
  const manager = getLspServerManager()
  if (!manager) return false
  const servers = manager.getAllServers()
  if (servers.size === 0) return false
  for (const server of servers.values()) {
    if (server.state !== 'error') return true
  }
  return false
}

/**
 * Espera a que termine la inicialización del manager de servidores LSP.
 *
 * Devuelve inmediatamente si la inicialización ya terminó (éxito o fallo).
 * Si está pendiente, espera a que termine. Si no ha empezado, devuelve
 * inmediatamente.
 *
 * @returns Promesa que se resuelve cuando la inicialización termina.
 */
export async function waitForInitialization(): Promise<void> {
  // Si ya está inicializado o falló, se devuelve de inmediato.
  if (initializationState === 'success' || initializationState === 'failed') {
    return
  }

  // Si está pendiente y hay una promesa, se espera.
  if (initializationState === 'pending' && initializationPromise) {
    await initializationPromise
  }

  // Si no ha empezado, se devuelve de inmediato (nada que esperar).
}

/**
 * Inicializa el singleton del manager de servidores LSP.
 *
 * Se llama durante el arranque de Claude Code. Crea sincrónicamente la
 * instancia del manager, y luego arranca la inicialización asíncrona
 * (cargar configs de LSP) en segundo plano sin bloquear el arranque.
 *
 * Seguro de llamar varias veces — sólo se inicializa una vez (idempotente).
 * Sin embargo, si la inicialización previa falló, llamarla de nuevo la
 * reintenta.
 */
export function initializeLspServerManager(): void {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()

  // --bare / SIMPLE: sin LSP. LSP es para integración de editor
  // (diagnostics, hover, ir-a-definición en el REPL). Las llamadas -p
  // guionadas no lo necesitan.
  if (isBareMode()) {
    return
  }
  logForDebugging('[LSP MANAGER] initializeLspServerManager() called')

  // Se salta si ya está inicializado o inicializándose.
  if (lspManagerInstance !== undefined && initializationState !== 'failed') {
    logForDebugging(
      '[LSP MANAGER] Already initialized or initializing, skipping',
    )
    return
  }

  // Reset del estado para reintentar si la inicialización previa falló.
  if (initializationState === 'failed') {
    lspManagerInstance = undefined
    initializationError = undefined
  }

  // Crea la instancia del manager y marca como pendiente.
  lspManagerInstance = createLSPServerManager()
  initializationState = 'pending'
  logForDebugging('[LSP MANAGER] Created manager instance, state=pending')

  // Incrementa la generación para invalidar cualquier inicialización pendiente.
  const currentGeneration = ++initializationGeneration
  logForDebugging(
    `[LSP MANAGER] Starting async initialization (generation ${currentGeneration})`,
  )

  // Arranca la inicialización de forma asíncrona sin bloquear. Se guarda la
  // promesa para que quien llame pueda esperarla vía waitForInitialization().
  initializationPromise = lspManagerInstance
    .initialize()
    .then(() => {
      // Sólo se actualiza el estado si ésta sigue siendo la inicialización actual.
      if (currentGeneration === initializationGeneration) {
        initializationState = 'success'
        logForDebugging('LSP server manager initialized successfully')

        // Registra los handlers pasivos de notificación para diagnostics.
        if (lspManagerInstance) {
          registerLSPNotificationHandlers(lspManagerInstance)
        }
      }
    })
    .catch((error: unknown) => {
      // Sólo se actualiza el estado si ésta sigue siendo la inicialización actual.
      if (currentGeneration === initializationGeneration) {
        initializationState = 'failed'
        initializationError = error as Error
        // Se limpia la instancia ya que no es utilizable.
        lspManagerInstance = undefined

        logError(error as Error)
        logForDebugging(
          `Failed to initialize LSP server manager: ${errorMessage(error)}`,
        )
      }
    })
}

/**
 * Fuerza la re-inicialización del manager de servidores LSP, incluso
 * después de un init exitoso previo. Se llama desde refreshActivePlugins()
 * tras limpiar las cachés de plugins, para que los nuevos servidores LSP
 * de plugins recién cargados se detecten.
 *
 * Corrige https://github.com/anthropics/claude-code-how-works-how-works/issues/15521:
 * loadAllPlugins() está memoizado y puede llamarse muy temprano en el
 * arranque (vía el prefetch de getCommands en setup.ts) antes de que los
 * marketplaces se reconcilien, cacheando una lista de plugins vacía.
 * initializeLspServerManager() luego lee ese resultado memoizado obsoleto e
 * inicializa con 0 servidores. A diferencia de commands/agents/hooks/MCP,
 * LSP nunca se reinicializaba al refrescar plugins.
 *
 * Seguro de llamar cuando ningún plugin LSP cambió: initialize() sólo
 * parsea config (los servidores arrancan lazy en el primer uso). También
 * es seguro durante una init pendiente: el contador de generación invalida
 * la promesa en curso.
 */
export function reinitializeLspServerManager(): void {
  const { logForDebugging } = requireLocalObservabilityDebug()

  if (initializationState === 'not-started') {
    // initializeLspServerManager() nunca se llamó (p. ej. camino de
    // subcomando headless). No se arranca ahora.
    return
  }

  logForDebugging('[LSP MANAGER] reinitializeLspServerManager() called')

  // Shutdown best-effort de los servidores corriendo en la instancia vieja,
  // para que /reload-plugins no filtre procesos hijos. Fire-and-forget: el
  // caso de uso principal (issue #15521) tiene 0 servidores, así que
  // normalmente es un no-op.
  if (lspManagerInstance) {
    void lspManagerInstance.shutdown().catch(err => {
      const { errorMessage } = requireLocalObservabilityErrorHelpers()
      logForDebugging(
        `[LSP MANAGER] old instance shutdown during reinit failed: ${errorMessage(err)}`,
      )
    })
  }

  // Fuerza que el check de idempotencia de initializeLspServerManager() caiga
  // igual. El contador de generación maneja invalidar cualquier init en curso.
  lspManagerInstance = undefined
  initializationState = 'not-started'
  initializationError = undefined

  initializeLspServerManager()
}

/**
 * Apaga el manager de servidores LSP y limpia los recursos.
 *
 * Debe llamarse durante el apagado de Claude Code. Detiene todos los
 * servidores LSP corriendo y limpia el estado interno. Seguro de llamar
 * cuando no está inicializado (no-op).
 *
 * NOTA: los errores durante el apagado se loguean para monitoreo pero NO
 * se propagan a quien llama. El estado siempre se limpia aunque el apagado
 * falle, para prevenir acumulación de recursos. Esto es aceptable durante
 * la salida de la aplicación, cuando la recuperación no es posible.
 *
 * @returns Promesa que se resuelve cuando el apagado termina (los errores se tragan).
 */
export async function shutdownLspServerManager(): Promise<void> {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()

  if (lspManagerInstance === undefined) {
    return
  }

  try {
    await lspManagerInstance.shutdown()
    logForDebugging('LSP server manager shut down successfully')
  } catch (error: unknown) {
    logError(error as Error)
    logForDebugging(
      `Failed to shutdown LSP server manager: ${errorMessage(error)}`,
    )
  } finally {
    // Siempre se limpia el estado, aunque el apagado haya fallado.
    lspManagerInstance = undefined
    initializationState = 'not-started'
    initializationError = undefined
    initializationPromise = undefined
    // Incrementa la generación para invalidar cualquier inicialización pendiente.
    initializationGeneration++
  }
}
