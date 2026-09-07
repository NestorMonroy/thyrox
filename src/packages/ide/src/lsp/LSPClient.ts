/**
 * Puerto de `ccnmt: packages/ide/src/lsp/LSPClient.ts`. `vscode-jsonrpc` es
 * una dependencia npm real de este paquete (VALUE import — transporte
 * JSON-RPC real, no reimplementable localmente). `InitializeParams`/
 * `InitializeResult`/`ServerCapabilities` de `vscode-languageserver-protocol`
 * son sólo TIPOS.
 */
import { type ChildProcess, spawn } from 'child_process'
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  Trace,
} from 'vscode-jsonrpc/node.js'
import type {
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
} from 'vscode-languageserver-protocol'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireShellSubprocessEnv,
} from '../internal/pendingCrossPackageDeps.js'

/**
 * Interfaz de cliente LSP.
 */
export type LSPClient = {
  readonly capabilities: ServerCapabilities | undefined
  readonly isInitialized: boolean
  start: (
    command: string,
    args: string[],
    options?: {
      env?: Record<string, string>
      cwd?: string
    },
  ) => Promise<void>
  initialize: (params: InitializeParams) => Promise<InitializeResult>
  sendRequest: <TResult>(method: string, params: unknown) => Promise<TResult>
  sendNotification: (method: string, params: unknown) => Promise<void>
  onNotification: (method: string, handler: (params: unknown) => void) => void
  onRequest: <TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ) => void
  stop: () => Promise<void>
}

/**
 * Crea un envoltorio de cliente LSP usando vscode-jsonrpc. Gestiona la
 * comunicación con un proceso de servidor LSP vía stdio.
 *
 * @param onCrash - Se llama cuando el proceso del servidor termina
 *   inesperadamente (código de salida distinto de cero durante operación,
 *   no durante una parada intencional). Permite que el dueño propague el
 *   estado de crash para que el servidor pueda reiniciarse en el próximo uso.
 */
export function createLSPClient(
  serverName: string,
  onCrash?: (error: Error) => void,
): LSPClient {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()
  const { subprocessEnv } = requireShellSubprocessEnv()

  // Variables de estado en el closure.
  let childProcess: ChildProcess | undefined
  let connection: MessageConnection | undefined
  let capabilities: ServerCapabilities | undefined
  let isInitialized = false
  let startFailed = false
  let startError: Error | undefined
  let isStopping = false // Rastrea el apagado intencional para evitar logueo espurio de errores.
  // Cola de handlers registrados antes de que la conexión esté lista (soporte de inicialización lazy).
  const pendingHandlers: Array<{
    method: string
    handler: (params: unknown) => void
  }> = []
  const pendingRequestHandlers: Array<{
    method: string
    handler: (params: unknown) => unknown | Promise<unknown>
  }> = []

  function checkStartFailed(): void {
    if (startFailed) {
      throw startError || new Error(`LSP server ${serverName} failed to start`)
    }
  }

  return {
    get capabilities(): ServerCapabilities | undefined {
      return capabilities
    },

    get isInitialized(): boolean {
      return isInitialized
    },

    async start(
      command: string,
      args: string[],
      options?: {
        env?: Record<string, string>
        cwd?: string
      },
    ): Promise<void> {
      try {
        // 1. Genera el proceso del servidor LSP.
        childProcess = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...subprocessEnv(), ...options?.env },
          cwd: options?.cwd,
          // Previene una ventana de consola visible en Windows (no-op en otras plataformas).
          windowsHide: true,
        })

        if (!childProcess.stdout || !childProcess.stdin) {
          throw new Error('LSP server process stdio not available')
        }

        // 1.5. Espera a que el proceso arranque con éxito antes de usar los streams.
        // Esto es CRÍTICO: spawn() retorna de inmediato, pero el evento
        // 'error' (p. ej. ENOENT si no se encuentra el comando) se dispara
        // de forma asíncrona. Si se usan los streams antes de confirmar que
        // el spawn tuvo éxito, se obtienen rejections sin manejar cuando
        // las escrituras fallan sobre streams inválidos.
        const spawnedProcess = childProcess // Se captura para el closure.
        await new Promise<void>((resolve, reject) => {
          const onSpawn = (): void => {
            cleanup()
            resolve()
          }
          const onError = (error: Error): void => {
            cleanup()
            reject(error)
          }
          const cleanup = (): void => {
            spawnedProcess.removeListener('spawn', onSpawn)
            spawnedProcess.removeListener('error', onError)
          }
          spawnedProcess.once('spawn', onSpawn)
          spawnedProcess.once('error', onError)
        })

        // Captura stderr para diagnóstico y errores del servidor.
        if (childProcess.stderr) {
          childProcess.stderr.on('data', (data: Buffer) => {
            const output = data.toString().trim()
            if (output) {
              logForDebugging(`[LSP SERVER ${serverName}] ${output}`)
            }
          })
        }

        // Maneja errores del proceso (tras un spawn exitoso, p. ej. un crash en operación).
        childProcess.on('error', error => {
          if (!isStopping) {
            startFailed = true
            startError = error
            logError(
              new Error(
                `LSP server ${serverName} failed to start: ${error.message}`,
              ),
            )
          }
        })

        childProcess.on('exit', (code, _signal) => {
          if (code !== 0 && code !== null && !isStopping) {
            isInitialized = false
            startFailed = false
            startError = undefined
            const crashError = new Error(
              `LSP server ${serverName} crashed with exit code ${code}`,
            )
            logError(crashError)
            onCrash?.(crashError)
          }
        })

        // Maneja errores del stream stdin, para prevenir rejections sin
        // manejar cuando el proceso del servidor termina antes de que
        // terminemos de escribir.
        childProcess.stdin.on('error', (error: Error) => {
          if (!isStopping) {
            logForDebugging(
              `LSP server ${serverName} stdin error: ${error.message}`,
            )
          }
          // El error se loguea pero no se lanza - el handler de error de la conexión lo captura.
        })

        // 2. Crea la conexión JSON-RPC.
        const reader = new StreamMessageReader(childProcess.stdout)
        const writer = new StreamMessageWriter(childProcess.stdin)
        connection = createMessageConnection(reader, writer)

        // 2.5. Registra handlers de error/close ANTES de listen(), para
        // capturar todos los errores. Esto previene rejections sin manejar
        // cuando el servidor crashea o se cierra inesperadamente.
        connection.onError(([error, _message, _code]) => {
          // Sólo se loguea si no se está deteniendo intencionalmente (evita errores espurios durante el apagado).
          if (!isStopping) {
            startFailed = true
            startError = error
            logError(
              new Error(
                `LSP server ${serverName} connection error: ${error.message}`,
              ),
            )
          }
        })

        connection.onClose(() => {
          // Sólo se trata como error si no se está deteniendo intencionalmente.
          if (!isStopping) {
            isInitialized = false
            // No se fija startFailed aquí - la conexión puede cerrarse tras un apagado exitoso.
            logForDebugging(`LSP server ${serverName} connection closed`)
          }
        })

        // 3. Empieza a escuchar mensajes.
        connection.listen()

        // 3.5. Habilita el tracing del protocolo para depuración.
        // Nota: trace() envía una notificación $/setTrace que puede fallar
        // si el proceso del servidor ya terminó. Se captura y loguea el
        // error en vez de dejar que se vuelva un rejection sin manejar.
        connection
          .trace(Trace.Verbose, {
            log: (message: string) => {
              logForDebugging(`[LSP PROTOCOL ${serverName}] ${message}`)
            },
          })
          .catch((error: Error) => {
            logForDebugging(
              `Failed to enable tracing for ${serverName}: ${error.message}`,
            )
          })

        // 4. Aplica cualquier handler de notificación en cola.
        for (const { method, handler } of pendingHandlers) {
          connection.onNotification(method, handler)
          logForDebugging(
            `Applied queued notification handler for ${serverName}.${method}`,
          )
        }
        pendingHandlers.length = 0 // Vacía la cola.

        // 5. Aplica cualquier handler de request en cola.
        for (const { method, handler } of pendingRequestHandlers) {
          connection.onRequest(method, handler)
          logForDebugging(
            `Applied queued request handler for ${serverName}.${method}`,
          )
        }
        pendingRequestHandlers.length = 0 // Vacía la cola.

        logForDebugging(`LSP client started for ${serverName}`)
      } catch (error) {
        const err = error as Error
        logError(
          new Error(`LSP server ${serverName} failed to start: ${err.message}`),
        )
        throw error
      }
    },

    async initialize(params: InitializeParams): Promise<InitializeResult> {
      if (!connection) {
        throw new Error('LSP client not started')
      }

      checkStartFailed()

      try {
        const result: InitializeResult = await connection.sendRequest(
          'initialize',
          params,
        )

        capabilities = result.capabilities

        // Envía la notificación initialized.
        await connection.sendNotification('initialized', {})

        isInitialized = true
        logForDebugging(`LSP server ${serverName} initialized`)

        return result
      } catch (error) {
        const err = error as Error
        logError(
          new Error(
            `LSP server ${serverName} initialize failed: ${err.message}`,
          ),
        )
        throw error
      }
    },

    async sendRequest<TResult>(
      method: string,
      params: unknown,
    ): Promise<TResult> {
      if (!connection) {
        throw new Error('LSP client not started')
      }

      checkStartFailed()

      if (!isInitialized) {
        throw new Error('LSP server not initialized')
      }

      try {
        return await connection.sendRequest(method, params)
      } catch (error) {
        const err = error as Error
        logError(
          new Error(
            `LSP server ${serverName} request ${method} failed: ${err.message}`,
          ),
        )
        throw error
      }
    },

    async sendNotification(method: string, params: unknown): Promise<void> {
      if (!connection) {
        throw new Error('LSP client not started')
      }

      checkStartFailed()

      try {
        await connection.sendNotification(method, params)
      } catch (error) {
        const err = error as Error
        logError(
          new Error(
            `LSP server ${serverName} notification ${method} failed: ${err.message}`,
          ),
        )
        // No se relanza para notificaciones - son fire-and-forget.
        logForDebugging(`Notification ${method} failed but continuing`)
      }
    },

    onNotification(method: string, handler: (params: unknown) => void): void {
      if (!connection) {
        // Encola el handler para aplicarlo cuando la conexión esté lista (inicialización lazy).
        pendingHandlers.push({ method, handler })
        logForDebugging(
          `Queued notification handler for ${serverName}.${method} (connection not ready)`,
        )
        return
      }

      checkStartFailed()

      connection.onNotification(method, handler)
    },

    onRequest<TParams, TResult>(
      method: string,
      handler: (params: TParams) => TResult | Promise<TResult>,
    ): void {
      if (!connection) {
        // Encola el handler para aplicarlo cuando la conexión esté lista (inicialización lazy).
        pendingRequestHandlers.push({
          method,
          handler: handler as (params: unknown) => unknown | Promise<unknown>,
        })
        logForDebugging(
          `Queued request handler for ${serverName}.${method} (connection not ready)`,
        )
        return
      }

      checkStartFailed()

      connection.onRequest(method, handler)
    },

    async stop(): Promise<void> {
      let shutdownError: Error | undefined

      // Marca que se está deteniendo, para prevenir que los handlers de error logueen errores espurios.
      isStopping = true

      try {
        if (connection) {
          // Intenta enviar el request shutdown y la notificación exit.
          await connection.sendRequest('shutdown', {})
          await connection.sendNotification('exit', {})
        }
      } catch (error) {
        const err = error as Error
        logError(
          new Error(`LSP server ${serverName} stop failed: ${err.message}`),
        )
        shutdownError = err
        // Se continúa con la limpieza a pesar del fallo de apagado.
      } finally {
        // Siempre se limpian los recursos, aunque shutdown/exit hayan fallado.
        if (connection) {
          try {
            connection.dispose()
          } catch (error) {
            // Se loguea pero no se lanza - los errores de disposición son menos críticos.
            logForDebugging(
              `Connection disposal failed for ${serverName}: ${errorMessage(error)}`,
            )
          }
          connection = undefined
        }

        if (childProcess) {
          // Remueve los listeners de eventos, para prevenir memory leaks.
          childProcess.removeAllListeners('error')
          childProcess.removeAllListeners('exit')
          if (childProcess.stdin) {
            childProcess.stdin.removeAllListeners('error')
          }
          if (childProcess.stderr) {
            childProcess.stderr.removeAllListeners('data')
          }

          try {
            childProcess.kill()
          } catch (error) {
            // El proceso puede ya estar muerto, lo cual está bien.
            logForDebugging(
              `Process kill failed for ${serverName} (may already be dead): ${errorMessage(error)}`,
            )
          }
          childProcess = undefined
        }

        isInitialized = false
        capabilities = undefined
        isStopping = false // Se resetea para un posible reinicio.
        // No se resetea startFailed - se preserva el estado de error para diagnóstico.
        // startFailed y startError se quedan como están.
        if (shutdownError) {
          startFailed = true
          startError = shutdownError
        }

        logForDebugging(`LSP client stopped for ${serverName}`)
      }

      // Se relanza el error de apagado tras completar la limpieza.
      if (shutdownError) {
        throw shutdownError
      }
    },
  }
}
