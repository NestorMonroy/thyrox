/**
 * Puerto de `ccnmt: packages/ide/src/lsp/passiveFeedback.ts`.
 * `PublishDiagnosticsParams` es sólo TIPO (erasado). `DiagnosticFile` viene
 * de `@thyrox/tool-registry/diagnosticTracking.js` — también sólo TIPO;
 * el paquete `tool-registry` no existe en este árbol, pero al ser un tipo
 * no necesita resolver en runtime.
 */
import { fileURLToPath } from 'url'
import type { PublishDiagnosticsParams } from 'vscode-languageserver-protocol'
import type { DiagnosticFile } from '@thyrox/tool-registry/diagnosticTracking.js'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireLocalObservabilitySlowOperations,
} from '../internal/pendingCrossPackageDeps.js'
import { registerPendingLSPDiagnostic } from './LSPDiagnosticRegistry.js'
import type { LSPServerManager } from './LSPServerManager.js'

/**
 * Mapea la severidad LSP a la severidad de diagnostic de Claude.
 *
 * Mapea números de severidad LSP a cadenas de severidad de Claude. Acepta
 * valores numéricos de severidad (1=Error, 2=Warning, 3=Information,
 * 4=Hint) o undefined, y por defecto usa 'Error' para valores
 * inválidos/faltantes.
 */
function mapLSPSeverity(
  lspSeverity: number | undefined,
): 'Error' | 'Warning' | 'Info' | 'Hint' {
  // Enum DiagnosticSeverity de LSP:
  // 1 = Error, 2 = Warning, 3 = Information, 4 = Hint
  switch (lspSeverity) {
    case 1:
      return 'Error'
    case 2:
      return 'Warning'
    case 3:
      return 'Info'
    case 4:
      return 'Hint'
    default:
      return 'Error'
  }
}

/**
 * Convierte diagnostics LSP al formato de diagnostic de Claude.
 *
 * Convierte PublishDiagnosticsParams de LSP a formato DiagnosticFile[],
 * usado por el sistema de attachments de Claude.
 */
export function formatDiagnosticsForAttachment(
  params: PublishDiagnosticsParams,
): DiagnosticFile[] {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { toError } = requireLocalObservabilityErrorHelpers()

  // Parsea el URI (puede ser file:// o una ruta plana) y lo normaliza a ruta de sistema de archivos.
  let uri: string
  try {
    // Maneja tanto URIs file:// como rutas planas.
    uri = params.uri.startsWith('file://')
      ? fileURLToPath(params.uri)
      : params.uri
  } catch (error) {
    const err = toError(error)
    logError(err)
    logForDebugging(
      `Failed to convert URI to file path: ${params.uri}. Error: ${err.message}. Using original URI as fallback.`,
    )
    // Se degrada con gracia al URI original - los servidores LSP pueden enviar URIs malformados.
    uri = params.uri
  }

  const diagnostics = params.diagnostics.map(
    (diag: {
      message: string
      severity?: number
      range: {
        start: { line: number; character: number }
        end: { line: number; character: number }
      }
      source?: string
      code?: string | number
    }) => ({
      message: diag.message,
      severity: mapLSPSeverity(diag.severity),
      range: {
        start: {
          line: diag.range.start.line,
          character: diag.range.start.character,
        },
        end: {
          line: diag.range.end.line,
          character: diag.range.end.character,
        },
      },
      source: diag.source,
      code:
        diag.code !== undefined && diag.code !== null
          ? String(diag.code)
          : undefined,
    }),
  )

  return [
    {
      uri,
      diagnostics,
    },
  ]
}

/**
 * Resultado del registro de handlers, con datos de rastreo.
 */
export type HandlerRegistrationResult = {
  /** Total de servidores. */
  totalServers: number
  /** Número de registros exitosos. */
  successCount: number
  /** Errores de registro por servidor. */
  registrationErrors: Array<{ serverName: string; error: string }>
  /** Rastreo de fallos en runtime (compartido entre todas las invocaciones del handler). */
  diagnosticFailures: Map<string, { count: number; lastError: string }>
}

/**
 * Registra handlers de notificación LSP en todos los servidores.
 *
 * Configura handlers para escuchar notificaciones
 * textDocument/publishDiagnostics de todos los servidores LSP y las enruta
 * al sistema de diagnostics de Claude. Usa la API pública getAllServers()
 * para acceso limpio a las instancias de servidor.
 *
 * @returns Datos de rastreo del estado de registro y fallos en runtime.
 */
export function registerLSPNotificationHandlers(
  manager: LSPServerManager,
): HandlerRegistrationResult {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { toError } = requireLocalObservabilityErrorHelpers()
  const { jsonStringify } = requireLocalObservabilitySlowOperations()

  // Registra handlers en todos los servidores configurados, para capturar diagnostics de cualquier lenguaje.
  const servers = manager.getAllServers()

  // Rastrea fallos parciales - permite registros exitosos aunque algunos fallen.
  const registrationErrors: Array<{ serverName: string; error: string }> = []
  let successCount = 0

  // Rastrea fallos consecutivos por servidor, para avisar tras 3+ fallos.
  const diagnosticFailures: Map<string, { count: number; lastError: string }> =
    new Map()

  for (const [serverName, serverInstance] of servers.entries()) {
    try {
      // Valida que la instancia de servidor tenga el método onNotification.
      if (
        !serverInstance ||
        typeof serverInstance.onNotification !== 'function'
      ) {
        const errorMsg = !serverInstance
          ? 'Server instance is null/undefined'
          : 'Server instance has no onNotification method'

        registrationErrors.push({ serverName, error: errorMsg })

        const err = new Error(`${errorMsg} for ${serverName}`)
        logError(err)
        logForDebugging(
          `Skipping handler registration for ${serverName}: ${errorMsg}`,
        )
        continue // Se salta este servidor pero se rastrea el fallo.
      }

      // Los errores se aíslan para no romper otros servidores.
      serverInstance.onNotification(
        'textDocument/publishDiagnostics',
        (params: unknown) => {
          logForDebugging(
            `[PASSIVE DIAGNOSTICS] Handler invoked for ${serverName}! Params type: ${typeof params}`,
          )
          try {
            // Valida la estructura de params antes de castear.
            if (
              !params ||
              typeof params !== 'object' ||
              !('uri' in params) ||
              !('diagnostics' in params)
            ) {
              const err = new Error(
                `LSP server ${serverName} sent invalid diagnostic params (missing uri or diagnostics)`,
              )
              logError(err)
              logForDebugging(
                `Invalid diagnostic params from ${serverName}: ${jsonStringify(params)}`,
              )
              return
            }

            const diagnosticParams = params as PublishDiagnosticsParams
            logForDebugging(
              `Received diagnostics from ${serverName}: ${diagnosticParams.diagnostics.length} diagnostic(s) for ${diagnosticParams.uri}`,
            )

            // Convierte diagnostics LSP al formato de Claude (puede lanzar ante URIs inválidos).
            const diagnosticFiles =
              formatDiagnosticsForAttachment(diagnosticParams)

            // Sólo se envía notificación si hay diagnostics.
            const firstFile = diagnosticFiles[0]
            if (
              !firstFile ||
              diagnosticFiles.length === 0 ||
              firstFile.diagnostics.length === 0
            ) {
              logForDebugging(
                `Skipping empty diagnostics from ${serverName} for ${diagnosticParams.uri}`,
              )
              return
            }

            // Registra los diagnostics para entrega asíncrona vía el sistema de attachments.
            // Sigue el mismo patrón que AsyncHookRegistry para entrega asíncrona consistente.
            try {
              registerPendingLSPDiagnostic({
                serverName,
                files: diagnosticFiles,
              })

              logForDebugging(
                `LSP Diagnostics: Registered ${diagnosticFiles.length} diagnostic file(s) from ${serverName} for async delivery`,
              )

              // Éxito - se resetea el contador de fallos de este servidor.
              diagnosticFailures.delete(serverName)
            } catch (error) {
              const err = toError(error)
              logError(err)
              logForDebugging(
                `Error registering LSP diagnostics from ${serverName}: ` +
                  `URI: ${diagnosticParams.uri}, ` +
                  `Diagnostic count: ${firstFile.diagnostics.length}, ` +
                  `Error: ${err.message}`,
              )

              // Rastrea fallos consecutivos y avisa tras 3+.
              const failures = diagnosticFailures.get(serverName) || {
                count: 0,
                lastError: '',
              }
              failures.count++
              failures.lastError = err.message
              diagnosticFailures.set(serverName, failures)

              if (failures.count >= 3) {
                logForDebugging(
                  `WARNING: LSP diagnostic handler for ${serverName} has failed ${failures.count} times consecutively. ` +
                    `Last error: ${failures.lastError}. ` +
                    `This may indicate a problem with the LSP server or diagnostic processing. ` +
                    `Check logs for details.`,
                )
              }
            }
          } catch (error) {
            // Captura cualquier error inesperado de todo el handler, para no romper el loop de notificaciones.
            const err = toError(error)
            logError(err)
            logForDebugging(
              `Unexpected error processing diagnostics from ${serverName}: ${err.message}`,
            )

            // Rastrea fallos consecutivos y avisa tras 3+.
            const failures = diagnosticFailures.get(serverName) || {
              count: 0,
              lastError: '',
            }
            failures.count++
            failures.lastError = err.message
            diagnosticFailures.set(serverName, failures)

            if (failures.count >= 3) {
              logForDebugging(
                `WARNING: LSP diagnostic handler for ${serverName} has failed ${failures.count} times consecutively. ` +
                  `Last error: ${failures.lastError}. ` +
                  `This may indicate a problem with the LSP server or diagnostic processing. ` +
                  `Check logs for details.`,
              )
            }

            // No se relanza - se aíslan los errores sólo a este servidor.
          }
        },
      )

      logForDebugging(`Registered diagnostics handler for ${serverName}`)
      successCount++
    } catch (error) {
      const err = toError(error)

      registrationErrors.push({
        serverName,
        error: err.message,
      })

      logError(err)
      logForDebugging(
        `Failed to register diagnostics handler for ${serverName}: ` +
          `Error: ${err.message}`,
      )
    }
  }

  // Reporta el estado general de registro.
  const totalServers = servers.size
  if (registrationErrors.length > 0) {
    const failedServers = registrationErrors
      .map(e => `${e.serverName} (${e.error})`)
      .join(', ')
    // Loguea los fallos agregados para rastreo.
    logError(
      new Error(
        `Failed to register diagnostics for ${registrationErrors.length} LSP server(s): ${failedServers}`,
      ),
    )
    logForDebugging(
      `LSP notification handler registration: ${successCount}/${totalServers} succeeded. ` +
        `Failed servers: ${failedServers}. ` +
        `Diagnostics from failed servers will not be delivered.`,
    )
  } else {
    logForDebugging(
      `LSP notification handlers registered successfully for all ${totalServers} server(s)`,
    )
  }

  // Devuelve los datos de rastreo para monitoreo y tests.
  return {
    totalServers,
    successCount,
    registrationErrors,
    diagnosticFailures,
  }
}
