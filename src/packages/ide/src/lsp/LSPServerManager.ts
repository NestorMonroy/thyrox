/**
 * Puerto de `ccnmt: packages/ide/src/lsp/LSPServerManager.ts`.
 */
import * as path from 'path'
import { pathToFileURL } from 'url'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
} from '../internal/pendingCrossPackageDeps.js'
import { getAllLspServers } from './config.js'
import {
  createLSPServerInstance,
  type LSPServerInstance,
} from './LSPServerInstance.js'
import type { ScopedLspServerConfig } from './types.js'

/**
 * Interfaz del Manager de Servidores LSP, devuelta por createLSPServerManager.
 * Gestiona múltiples instancias de servidor LSP y enruta requests según la
 * extensión del archivo.
 */
export type LSPServerManager = {
  /** Inicializa el manager cargando todos los servidores LSP configurados. */
  initialize(): Promise<void>
  /** Apaga todos los servidores corriendo y limpia el estado. */
  shutdown(): Promise<void>
  /** Obtiene la instancia de servidor LSP para una ruta de archivo dada. */
  getServerForFile(filePath: string): LSPServerInstance | undefined
  /** Asegura que el servidor LSP apropiado esté iniciado para el archivo dado. */
  ensureServerStarted(filePath: string): Promise<LSPServerInstance | undefined>
  /** Envía un request al servidor LSP apropiado para el archivo dado. */
  sendRequest<T>(
    filePath: string,
    method: string,
    params: unknown,
  ): Promise<T | undefined>
  /** Obtiene todas las instancias de servidor corriendo. */
  getAllServers(): Map<string, LSPServerInstance>
  /** Sincroniza la apertura de un archivo al servidor LSP (envía notificación didOpen). */
  openFile(filePath: string, content: string): Promise<void>
  /** Sincroniza el cambio de un archivo al servidor LSP (envía notificación didChange). */
  changeFile(filePath: string, content: string): Promise<void>
  /** Sincroniza el guardado de un archivo al servidor LSP (envía notificación didSave). */
  saveFile(filePath: string): Promise<void>
  /** Sincroniza el cierre de un archivo al servidor LSP (envía notificación didClose). */
  closeFile(filePath: string): Promise<void>
  /** Comprueba si un archivo ya está abierto en un servidor LSP compatible. */
  isFileOpen(filePath: string): boolean
}

/**
 * Crea una instancia de manager de servidores LSP.
 *
 * Gestiona múltiples instancias de servidor LSP y enruta requests según la
 * extensión del archivo. Usa el patrón factory function con closures para
 * encapsular el estado (evitando clases).
 *
 * @returns Instancia del manager de servidores LSP.
 *
 * @example
 * const manager = createLSPServerManager()
 * await manager.initialize()
 * const result = await manager.sendRequest('/path/to/file.ts', 'textDocument/definition', params)
 * await manager.shutdown()
 */
export function createLSPServerManager(): LSPServerManager {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()

  // Estado privado gestionado vía closures.
  const servers: Map<string, LSPServerInstance> = new Map()
  const extensionMap: Map<string, string[]> = new Map()
  // Rastrea qué archivos se abrieron en qué servidores (URI -> nombre de servidor).
  const openedFiles: Map<string, string> = new Map()

  /**
   * Inicializa el manager cargando todos los servidores LSP configurados.
   *
   * @throws {Error} Si falla la carga de configuración.
   */
  async function initialize(): Promise<void> {
    let serverConfigs: Record<string, ScopedLspServerConfig>

    try {
      const result = await getAllLspServers()
      serverConfigs = result.servers
      logForDebugging(
        `[LSP SERVER MANAGER] getAllLspServers returned ${Object.keys(serverConfigs).length} server(s)`,
      )
    } catch (error) {
      const err = error as Error
      logError(
        new Error(`Failed to load LSP server configuration: ${err.message}`),
      )
      throw error
    }

    // Construye el mapeo extensión → servidor.
    for (const [serverName, config] of Object.entries(serverConfigs)) {
      try {
        // Valida la config antes de usarla.
        if (!config.command) {
          throw new Error(
            `Server ${serverName} missing required 'command' field`,
          )
        }
        if (
          !config.extensionToLanguage ||
          Object.keys(config.extensionToLanguage).length === 0
        ) {
          throw new Error(
            `Server ${serverName} missing required 'extensionToLanguage' field`,
          )
        }

        // Mapea extensiones de archivo a este servidor (derivado de extensionToLanguage).
        const fileExtensions = Object.keys(config.extensionToLanguage)
        for (const ext of fileExtensions) {
          const normalized = ext.toLowerCase()
          if (!extensionMap.has(normalized)) {
            extensionMap.set(normalized, [])
          }
          const serverList = extensionMap.get(normalized)
          if (serverList) {
            serverList.push(serverName)
          }
        }

        // Crea la instancia del servidor.
        const instance = createLSPServerInstance(serverName, config)
        servers.set(serverName, instance)

        // Registra el handler para requests workspace/configuration del servidor.
        // Algunos servidores (como TypeScript) los envían aunque digamos que no los soportamos.
        instance.onRequest(
          'workspace/configuration',
          (params: { items: Array<{ section?: string }> }) => {
            logForDebugging(
              `LSP: Received workspace/configuration request from ${serverName}`,
            )
            // Devuelve config vacía/nula para cada item solicitado.
            // Esto satisface el protocolo sin proveer configuración real.
            return params.items.map(() => null)
          },
        )
      } catch (error) {
        const err = error as Error
        logError(
          new Error(
            `Failed to initialize LSP server ${serverName}: ${err.message}`,
          ),
        )
        // Se continúa con los demás servidores - no se falla toda la inicialización.
      }
    }

    logForDebugging(`LSP manager initialized with ${servers.size} servers`)
  }

  /**
   * Apaga todos los servidores corriendo y limpia el estado. Sólo los
   * servidores en estado 'running' se detienen explícitamente; los que
   * están en otros estados se limpian sin apagado.
   *
   * @throws {Error} Si uno o más servidores fallan al detenerse.
   */
  async function shutdown(): Promise<void> {
    const toStop = Array.from(servers.entries()).filter(
      ([, s]) => s.state === 'running' || s.state === 'error',
    )

    const results = await Promise.allSettled(
      toStop.map(([, server]) => server.stop()),
    )

    servers.clear()
    extensionMap.clear()
    openedFiles.clear()

    const errors = results
      .map((r, i) =>
        r.status === 'rejected'
          ? `${toStop[i]![0]}: ${errorMessage(r.reason)}`
          : null,
      )
      .filter((e): e is string => e !== null)

    if (errors.length > 0) {
      const err = new Error(
        `Failed to stop ${errors.length} LSP server(s): ${errors.join('; ')}`,
      )
      logError(err)
      throw err
    }
  }

  /**
   * Obtiene la instancia de servidor LSP para una ruta de archivo dada. Si
   * varios servidores manejan la misma extensión, devuelve el primero
   * registrado. Devuelve `undefined` si ningún servidor maneja este tipo de archivo.
   */
  function getServerForFile(filePath: string): LSPServerInstance | undefined {
    const ext = path.extname(filePath).toLowerCase()
    const serverNames = extensionMap.get(ext)

    if (!serverNames || serverNames.length === 0) {
      return undefined
    }

    // Usa el primer servidor (se puede agregar prioridad después).
    const serverName = serverNames[0]
    if (!serverName) {
      return undefined
    }

    return servers.get(serverName)
  }

  /**
   * Asegura que el servidor LSP apropiado esté iniciado para el archivo
   * dado. Devuelve `undefined` si ningún servidor maneja este tipo de archivo.
   *
   * @throws {Error} Si el servidor falla al iniciarse.
   */
  async function ensureServerStarted(
    filePath: string,
  ): Promise<LSPServerInstance | undefined> {
    const server = getServerForFile(filePath)
    if (!server) return undefined

    if (server.state === 'stopped' || server.state === 'error') {
      try {
        await server.start()
      } catch (error) {
        const err = error as Error
        logError(
          new Error(
            `Failed to start LSP server for file ${filePath}: ${err.message}`,
          ),
        )
        throw error
      }
    }

    return server
  }

  /**
   * Envía un request al servidor LSP apropiado para el archivo dado.
   * Devuelve `undefined` si ningún servidor maneja este tipo de archivo.
   *
   * @throws {Error} Si el servidor falla al iniciarse o el request falla.
   */
  async function sendRequest<T>(
    filePath: string,
    method: string,
    params: unknown,
  ): Promise<T | undefined> {
    const server = await ensureServerStarted(filePath)
    if (!server) return undefined

    try {
      return await server.sendRequest<T>(method, params)
    } catch (error) {
      const err = error as Error
      logError(
        new Error(
          `LSP request failed for file ${filePath}, method '${method}': ${err.message}`,
        ),
      )
      throw error
    }
  }

  // Devuelve la interfaz pública.
  function getAllServers(): Map<string, LSPServerInstance> {
    return servers
  }

  async function openFile(filePath: string, content: string): Promise<void> {
    const server = await ensureServerStarted(filePath)
    if (!server) return

    const fileUri = pathToFileURL(path.resolve(filePath)).href

    // Se salta si ya está abierto en este servidor.
    if (openedFiles.get(fileUri) === server.name) {
      logForDebugging(
        `LSP: File already open, skipping didOpen for ${filePath}`,
      )
      return
    }

    // Obtiene el languageId del mapeo extensionToLanguage del servidor.
    const ext = path.extname(filePath).toLowerCase()
    const languageId = server.config.extensionToLanguage[ext] || 'plaintext'

    try {
      await server.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: fileUri,
          languageId,
          version: 1,
          text: content,
        },
      })
      // Rastrea que este archivo ahora está abierto en este servidor.
      openedFiles.set(fileUri, server.name)
      logForDebugging(
        `LSP: Sent didOpen for ${filePath} (languageId: ${languageId})`,
      )
    } catch (error) {
      const err = new Error(
        `Failed to sync file open ${filePath}: ${errorMessage(error)}`,
      )
      logError(err)
      // Se relanza para propagar el error a quien llama.
      throw err
    }
  }

  async function changeFile(filePath: string, content: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') {
      return openFile(filePath, content)
    }

    const fileUri = pathToFileURL(path.resolve(filePath)).href

    // Si el archivo no se abrió en este servidor todavía, se abre primero.
    // Los servidores LSP requieren didOpen antes de didChange.
    if (openedFiles.get(fileUri) !== server.name) {
      return openFile(filePath, content)
    }

    try {
      await server.sendNotification('textDocument/didChange', {
        textDocument: {
          uri: fileUri,
          version: 1,
        },
        contentChanges: [{ text: content }],
      })
      logForDebugging(`LSP: Sent didChange for ${filePath}`)
    } catch (error) {
      const err = new Error(
        `Failed to sync file change ${filePath}: ${errorMessage(error)}`,
      )
      logError(err)
      // Se relanza para propagar el error a quien llama.
      throw err
    }
  }

  /**
   * Guarda un archivo en los servidores LSP (envía notificación didSave).
   * Se llama tras escribir el archivo a disco, para disparar diagnostics.
   */
  async function saveFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return

    try {
      await server.sendNotification('textDocument/didSave', {
        textDocument: {
          uri: pathToFileURL(path.resolve(filePath)).href,
        },
      })
      logForDebugging(`LSP: Sent didSave for ${filePath}`)
    } catch (error) {
      const err = new Error(
        `Failed to sync file save ${filePath}: ${errorMessage(error)}`,
      )
      logError(err)
      // Se relanza para propagar el error a quien llama.
      throw err
    }
  }

  /**
   * Cierra un archivo en los servidores LSP (envía notificación didClose).
   *
   * NOTA: disponible pero aún no integrado con el flujo de compact.
   * TODO: integrar con compact - llamar a closeFile() cuando compact remueva archivos del contexto.
   * Esto notificará a los servidores LSP que ciertos archivos ya no están en uso activo.
   */
  async function closeFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return

    const fileUri = pathToFileURL(path.resolve(filePath)).href

    try {
      await server.sendNotification('textDocument/didClose', {
        textDocument: {
          uri: fileUri,
        },
      })
      // Se remueve del rastreo para que el archivo se pueda reabrir después.
      openedFiles.delete(fileUri)
      logForDebugging(`LSP: Sent didClose for ${filePath}`)
    } catch (error) {
      const err = new Error(
        `Failed to sync file close ${filePath}: ${errorMessage(error)}`,
      )
      logError(err)
      // Se relanza para propagar el error a quien llama.
      throw err
    }
  }

  function isFileOpen(filePath: string): boolean {
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    return openedFiles.has(fileUri)
  }

  return {
    initialize,
    shutdown,
    getServerForFile,
    ensureServerStarted,
    sendRequest,
    getAllServers,
    openFile,
    changeFile,
    saveFile,
    closeFile,
    isFileOpen,
  }
}
