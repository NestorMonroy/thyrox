/**
 * Puerto de `ccnmt: packages/ide/src/lsp/LSPServerInstance.ts`.
 * `InitializeParams` de `vscode-languageserver-protocol` se importa sólo
 * como tipo (erasado en runtime); `createLSPClientType` es el alias de tipo
 * de `createLSPClient` de `./LSPClient.js`.
 */
import * as path from 'path'
import { pathToFileURL } from 'url'
import type { InitializeParams } from 'vscode-languageserver-protocol'
import {
  requireAppHostBootstrapState,
  requireConfigSleep,
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
} from '../internal/pendingCrossPackageDeps.js'
import type { createLSPClient as createLSPClientType } from './LSPClient.js'
import type { LspServerState, ScopedLspServerConfig } from './types.js'

/**
 * Código de error LSP para "content modified" - indica que el estado del
 * servidor cambió durante el procesamiento del request (p. ej.
 * rust-analyzer sigue indexando el proyecto). Es un error transitorio que
 * se puede reintentar.
 */
const LSP_ERROR_CONTENT_MODIFIED = -32801

/**
 * Máximo de reintentos para errores LSP transitorios como "content modified".
 */
const MAX_RETRIES_FOR_TRANSIENT_ERRORS = 3

/**
 * Delay base en milisegundos para el backoff exponencial en errores transitorios.
 * Delays reales: 500ms, 1000ms, 2000ms
 */
const RETRY_BASE_DELAY_MS = 500
/**
 * Interfaz de instancia de servidor LSP devuelta por createLSPServerInstance.
 * Gestiona el ciclo de vida de un único servidor LSP con rastreo de estado
 * y monitoreo de salud.
 */
export type LSPServerInstance = {
  /** Identificador único del servidor. */
  readonly name: string
  /** Configuración del servidor. */
  readonly config: ScopedLspServerConfig
  /** Estado actual del servidor. */
  readonly state: LspServerState
  /** Cuándo se inició el servidor por última vez. */
  readonly startTime: Date | undefined
  /** Último error encontrado. */
  readonly lastError: Error | undefined
  /** Número de veces que se llamó a restart(). */
  readonly restartCount: number
  /** Inicia el servidor y lo inicializa. */
  start(): Promise<void>
  /** Detiene el servidor con gracia. */
  stop(): Promise<void>
  /** Reinicia manualmente el servidor (detener y luego iniciar). */
  restart(): Promise<void>
  /** Comprueba si el servidor está saludable y listo para requests. */
  isHealthy(): boolean
  /** Envía un request LSP al servidor. */
  sendRequest<T>(method: string, params: unknown): Promise<T>
  /** Envía una notificación LSP al servidor (fire-and-forget). */
  sendNotification(method: string, params: unknown): Promise<void>
  /** Registra un handler para notificaciones LSP. */
  onNotification(method: string, handler: (params: unknown) => void): void
  /** Registra un handler para requests LSP del servidor. */
  onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void
}

/**
 * Crea y gestiona una única instancia de servidor LSP.
 *
 * Usa el patrón factory function con closures para encapsular el estado
 * (evitando clases). Provee rastreo de estado, monitoreo de salud, y
 * reenvío de requests para un servidor LSP. Soporta reinicio manual con
 * límites de reintento configurables.
 *
 * Transiciones de la máquina de estados:
 * - stopped → starting → running
 * - running → stopping → stopped
 * - cualquiera → error (al fallar)
 * - error → starting (al reintentar)
 *
 * @param name - Identificador único para esta instancia de servidor.
 * @param config - Configuración del servidor, incluyendo comando, args y límites.
 * @returns Instancia de servidor LSP con métodos de gestión de ciclo de vida.
 *
 * @example
 * const instance = createLSPServerInstance('my-server', config)
 * await instance.start()
 * const result = await instance.sendRequest('textDocument/definition', params)
 * await instance.stop()
 */
export function createLSPServerInstance(
  name: string,
  config: ScopedLspServerConfig,
): LSPServerInstance {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()
  const { sleep } = requireConfigSleep()

  // Valida que los campos no implementados no estén fijados.
  if (config.restartOnCrash !== undefined) {
    throw new Error(
      `LSP server '${name}': restartOnCrash is not yet implemented. Remove this field from the configuration.`,
    )
  }
  if (config.shutdownTimeout !== undefined) {
    throw new Error(
      `LSP server '${name}': shutdownTimeout is not yet implemented. Remove this field from the configuration.`,
    )
  }

  // Estado privado encapsulado vía closures. Carga lazy de LSPClient para
  // que vscode-jsonrpc (~129KB) sólo se cargue cuando de verdad se
  // instancia un servidor LSP, no cuando la cadena estática de imports
  // llega a este módulo.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createLSPClient } = require('./LSPClient.js') as {
    createLSPClient: typeof createLSPClientType
  }
  let state: LspServerState = 'stopped'
  let startTime: Date | undefined
  let lastError: Error | undefined
  let restartCount = 0
  let crashRecoveryCount = 0
  // Propaga el estado de crash para que ensureServerStarted pueda
  // reiniciar en el próximo uso. Sin esto, el estado se queda en
  // 'running' tras un crash y el servidor nunca se reinicia (estado zombi).
  const client = createLSPClient(name, error => {
    state = 'error'
    lastError = error
    crashRecoveryCount++
  })

  /**
   * Inicia el servidor LSP y lo inicializa con información del workspace.
   *
   * Si el servidor ya está corriendo o iniciándose, este método retorna de
   * inmediato. Al fallar, fija el estado a 'error', loguea para monitoreo,
   * y lanza.
   *
   * @throws {Error} Si el servidor falla al iniciar o inicializar.
   */
  async function start(): Promise<void> {
    if (state === 'running' || state === 'starting') {
      return
    }

    // Limita los intentos de recuperación de crash para que un servidor
    // que crashea persistentemente no genere procesos hijos sin límite en
    // cada request entrante.
    const maxRestarts = config.maxRestarts ?? 3
    if (state === 'error' && crashRecoveryCount > maxRestarts) {
      const error = new Error(
        `LSP server '${name}' exceeded max crash recovery attempts (${maxRestarts})`,
      )
      lastError = error
      logError(error)
      throw error
    }

    let initPromise: Promise<unknown> | undefined
    try {
      state = 'starting'
      logForDebugging(`Starting LSP server instance: ${name}`)

      // Inicia el cliente.
      await client.start(config.command, config.args || [], {
        env: config.env,
        cwd: config.workspaceFolder,
      })

      // Inicializa con la información del workspace.
      const workspaceFolder =
        config.workspaceFolder || requireAppHostBootstrapState().getOriginalCwd()
      const workspaceUri = pathToFileURL(workspaceFolder).href

      const initParams: InitializeParams = {
        processId: process.pid,

        // Pasa las opciones de inicialización específicas del servidor, de
        // la config de plugin. Requerido por vue-language-server, opcional
        // para otros. Se provee un objeto vacío por defecto para evitar
        // errores de undefined en servidores que esperan que este campo exista.
        initializationOptions: config.initializationOptions ?? {},

        // Enfoque moderno (LSP 3.16+) - requerido por Pyright, gopls.
        workspaceFolders: [
          {
            uri: workspaceUri,
            name: path.basename(workspaceFolder),
          },
        ],

        // Campos deprecados - algunos servidores todavía los necesitan para
        // resolver URIs correctamente.
        rootPath: workspaceFolder, // Deprecado en LSP 3.8 pero algunos servidores lo necesitan
        rootUri: workspaceUri, // Deprecado en LSP 3.16 pero typescript-language-server lo necesita para goToDefinition

        // Capacidades del cliente - declara qué features soportamos.
        capabilities: {
          workspace: {
            // No se declara soporte de workspace/configuration porque no se implementa.
            // Esto previene que los servidores pidan config que no podemos proveer.
            configuration: false,
            // No se declara soporte de cambios en workspace folders porque
            // no se manejan notificaciones workspace/didChangeWorkspaceFolders.
            workspaceFolders: false,
          },
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: true,
            },
            publishDiagnostics: {
              relatedInformation: true,
              tagSupport: {
                valueSet: [1, 2], // Unnecessary (1), Deprecated (2)
              },
              versionSupport: false,
              codeDescriptionSupport: true,
              dataSupport: false,
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ['markdown', 'plaintext'],
            },
            definition: {
              dynamicRegistration: false,
              linkSupport: true,
            },
            references: {
              dynamicRegistration: false,
            },
            documentSymbol: {
              dynamicRegistration: false,
              hierarchicalDocumentSymbolSupport: true,
            },
            callHierarchy: {
              dynamicRegistration: false,
            },
          },
          general: {
            positionEncodings: ['utf-16'],
          },
        },
      }

      initPromise = client.initialize(initParams)
      if (config.startupTimeout !== undefined) {
        await withTimeout(
          initPromise,
          config.startupTimeout,
          `LSP server '${name}' timed out after ${config.startupTimeout}ms during initialization`,
        )
      } else {
        await initPromise
      }

      state = 'running'
      startTime = new Date()
      crashRecoveryCount = 0
      logForDebugging(`LSP server instance started: ${name}`)
    } catch (error) {
      // Limpia el proceso hijo generado, en caso de timeout/error.
      client.stop().catch(() => {})
      // Previene un rejection sin manejar de la promesa initialize abandonada.
      initPromise?.catch(() => {})
      state = 'error'
      lastError = error as Error
      logError(error)
      throw error
    }
  }

  /**
   * Detiene el servidor LSP con gracia.
   *
   * Si ya está detenido o deteniéndose, retorna de inmediato. Al fallar,
   * fija el estado a 'error', loguea para monitoreo, y lanza.
   *
   * @throws {Error} Si el servidor falla al detenerse.
   */
  async function stop(): Promise<void> {
    if (state === 'stopped' || state === 'stopping') {
      return
    }

    try {
      state = 'stopping'
      await client.stop()
      state = 'stopped'
      logForDebugging(`LSP server instance stopped: ${name}`)
    } catch (error) {
      state = 'error'
      lastError = error as Error
      logError(error)
      throw error
    }
  }

  /**
   * Reinicia manualmente el servidor, deteniéndolo y volviéndolo a iniciar.
   *
   * Incrementa restartCount y aplica el límite maxRestarts. Nota: esto NO
   * es automático - debe llamarse explícitamente.
   *
   * @throws {Error} Si stop o start fallan, o si restartCount excede config.maxRestarts (default: 3).
   */
  async function restart(): Promise<void> {
    try {
      await stop()
    } catch (error) {
      const stopError = new Error(
        `Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`,
      )
      logError(stopError)
      throw stopError
    }

    restartCount++

    const maxRestarts = config.maxRestarts ?? 3
    if (restartCount > maxRestarts) {
      const error = new Error(
        `Max restart attempts (${maxRestarts}) exceeded for server '${name}'`,
      )
      logError(error)
      throw error
    }

    try {
      await start()
    } catch (error) {
      const startError = new Error(
        `Failed to start LSP server '${name}' during restart (attempt ${restartCount}/${maxRestarts}): ${errorMessage(error)}`,
      )
      logError(startError)
      throw startError
    }
  }

  /**
   * Comprueba si el servidor está saludable y listo para manejar requests.
   *
   * @returns `true` si el estado es 'running' Y el cliente completó la inicialización.
   */
  function isHealthy(): boolean {
    return state === 'running' && client.isInitialized
  }

  /**
   * Envía un request LSP al servidor, con lógica de reintento para errores
   * transitorios.
   *
   * Comprueba la salud del servidor antes de enviar y envuelve los errores
   * con contexto. Reintenta automáticamente ante errores "content
   * modified" (código -32801), que ocurren cuando servidores como
   * rust-analyzer siguen indexando. Es comportamiento LSP esperado y los
   * clientes deben reintentar en silencio, según la especificación.
   *
   * @param method - Nombre del método LSP (p. ej. 'textDocument/definition').
   * @param params - Parámetros específicos del método.
   * @returns La respuesta del servidor.
   * @throws {Error} Si el servidor no está saludable o el request falla tras todos los reintentos.
   */
  async function sendRequest<T>(method: string, params: unknown): Promise<T> {
    if (!isHealthy()) {
      const error = new Error(
        `Cannot send request to LSP server '${name}': server is ${state}` +
          `${lastError ? `, last error: ${lastError.message}` : ''}`,
      )
      logError(error)
      throw error
    }

    let lastAttemptError: Error | undefined

    for (
      let attempt = 0;
      attempt <= MAX_RETRIES_FOR_TRANSIENT_ERRORS;
      attempt++
    ) {
      try {
        return await client.sendRequest(method, params)
      } catch (error) {
        lastAttemptError = error as Error

        // Comprueba si es un error transitorio de "content modified" que se
        // debe reintentar. Esto ocurre comúnmente con rust-analyzer durante
        // la indexación inicial del proyecto. Se usa duck typing en vez de
        // instanceof porque puede haber varias versiones de vscode-jsonrpc
        // en el árbol de dependencias (8.2.0 vs 8.2.1).
        const errorCode = (error as { code?: number }).code
        const isContentModifiedError =
          typeof errorCode === 'number' &&
          errorCode === LSP_ERROR_CONTENT_MODIFIED

        if (
          isContentModifiedError &&
          attempt < MAX_RETRIES_FOR_TRANSIENT_ERRORS
        ) {
          const delay = RETRY_BASE_DELAY_MS * 2 ** attempt
          logForDebugging(
            `LSP request '${method}' to '${name}' got ContentModified error, ` +
              `retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES_FOR_TRANSIENT_ERRORS})…`,
          )
          await sleep(delay)
          continue
        }

        // Error no reintentable o se agotaron los reintentos.
        break
      }
    }

    // Todos los reintentos fallaron o el error no era reintentable.
    const requestError = new Error(
      `LSP request '${method}' failed for server '${name}': ${lastAttemptError?.message ?? 'unknown error'}`,
    )
    logError(requestError)
    throw requestError
  }

  /**
   * Envía una notificación al servidor LSP (fire-and-forget). Se usa para
   * sincronización de archivos (didOpen, didChange, didClose).
   */
  async function sendNotification(
    method: string,
    params: unknown,
  ): Promise<void> {
    if (!isHealthy()) {
      const error = new Error(
        `Cannot send notification to LSP server '${name}': server is ${state}`,
      )
      logError(error)
      throw error
    }

    try {
      await client.sendNotification(method, params)
    } catch (error) {
      const notificationError = new Error(
        `LSP notification '${method}' failed for server '${name}': ${errorMessage(error)}`,
      )
      logError(notificationError)
      throw notificationError
    }
  }

  /**
   * Registra un handler para notificaciones LSP del servidor.
   *
   * @param method - Método de notificación LSP (p. ej. 'window/logMessage').
   * @param handler - Función callback para manejar la notificación.
   */
  function onNotification(
    method: string,
    handler: (params: unknown) => void,
  ): void {
    client.onNotification(method, handler)
  }

  /**
   * Registra un handler para requests LSP del servidor.
   *
   * Algunos servidores LSP envían requests HACIA el cliente (dirección
   * inversa). Esto permite registrar handlers para tales requests.
   *
   * @param method - Método de request LSP (p. ej. 'workspace/configuration').
   * @param handler - Función callback para manejar el request y devolver una respuesta.
   */
  function onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void {
    client.onRequest(method, handler)
  }

  // Devuelve la API pública.
  return {
    name,
    config,
    get state() {
      return state
    },
    get startTime() {
      return startTime
    },
    get lastError() {
      return lastError
    },
    get restartCount() {
      return restartCount
    },
    start,
    stop,
    restart,
    isHealthy,
    sendRequest,
    sendNotification,
    onNotification,
    onRequest,
  }
}

/**
 * Corre una promesa contra un timeout. Limpia el timer sin importar el
 * desenlace, para evitar rejections sin manejar de callbacks setTimeout huérfanos.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout((rej, msg) => rej(new Error(msg)), ms, reject, message)
  })
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer!),
  )
}
