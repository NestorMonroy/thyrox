/**
 * Puerto de `ccnmt: packages/ide/src/lsp/LSPDiagnosticRegistry.ts`.
 * `DiagnosticFile` viene de `@thyrox/tool-registry/diagnosticTracking.js` —
 * sólo como TIPO (`import type`), así que se erasa en tiempo de compilación
 * y no necesita sustituto: el paquete `tool-registry` no existe en este
 * árbol, pero eso no importa para un tipo — Bun lo descarta antes de
 * intentar resolverlo (verificado: `import type` de un especificador
 * inexistente no falla en tiempo de ejecución).
 */
import { randomUUID } from 'crypto'
import { LRUCache } from 'lru-cache'
import type { DiagnosticFile } from '@thyrox/tool-registry/diagnosticTracking.js'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireLocalObservabilitySlowOperations,
} from '../internal/pendingCrossPackageDeps.js'

/**
 * Notificación de diagnostic LSP pendiente.
 */
export type PendingLSPDiagnostic = {
  /** Servidor que envió el diagnostic. */
  serverName: string
  /** Archivos con diagnostics. */
  files: DiagnosticFile[]
  /** Cuándo se recibió el diagnostic. */
  timestamp: number
  /** Si el attachment ya se envió a la conversación. */
  attachmentSent: boolean
}

/**
 * Registro de diagnostics LSP.
 *
 * Guarda los diagnostics LSP recibidos de forma asíncrona desde los
 * servidores LSP vía notificaciones textDocument/publishDiagnostics. Sigue
 * el mismo patrón que AsyncHookRegistry para una entrega consistente de
 * attachments asíncronos.
 *
 * Patrón:
 * 1. El servidor LSP envía una notificación publishDiagnostics.
 * 2. registerPendingLSPDiagnostic() guarda el diagnostic.
 * 3. checkForLSPDiagnostics() recupera los diagnostics pendientes.
 * 4. getLSPDiagnosticAttachments() los convierte a Attachment[].
 * 5. getAttachments() los entrega a la conversación automáticamente.
 *
 * Similar a AsyncHookRegistry pero más simple, ya que los diagnostics
 * llegan sincrónicamente (no hace falta acumular output a lo largo del tiempo).
 */

// Constantes de límite de volumen.
const MAX_DIAGNOSTICS_PER_FILE = 10
const MAX_TOTAL_DIAGNOSTICS = 30

// Máximo de archivos a rastrear para deduplicación — evita crecimiento
// ilimitado de memoria.
const MAX_DELIVERED_FILES = 500

// Estado global del registro.
const pendingDiagnostics = new Map<string, PendingLSPDiagnostic>()

// Deduplicación entre turnos: rastrea qué diagnostics ya se entregaron.
// Mapea el URI del archivo a un conjunto de llaves de diagnostic (hash de
// mensaje+severidad+rango). Usa LRUCache para prevenir crecimiento
// ilimitado en sesiones largas.
const deliveredDiagnostics = new LRUCache<string, Set<string>>({
  max: MAX_DELIVERED_FILES,
})

/**
 * Registra diagnostics LSP recibidos de un servidor. Se entregarán como
 * attachments en la próxima query.
 *
 * @param serverName - Nombre del servidor LSP que envió los diagnostics.
 * @param files - Archivos con diagnostics a entregar.
 */
export function registerPendingLSPDiagnostic({
  serverName,
  files,
}: {
  serverName: string
  files: DiagnosticFile[]
}): void {
  const { logForDebugging } = requireLocalObservabilityDebug()

  // Usa UUID para unicidad garantizada (maneja registros rápidos sucesivos).
  const diagnosticId = randomUUID()

  logForDebugging(
    `LSP Diagnostics: Registering ${files.length} diagnostic file(s) from ${serverName} (ID: ${diagnosticId})`,
  )

  pendingDiagnostics.set(diagnosticId, {
    serverName,
    files,
    timestamp: Date.now(),
    attachmentSent: false,
  })
}

/**
 * Mapea la cadena de severidad a un valor numérico para ordenar.
 * Error=1, Warning=2, Info=3, Hint=4
 */
function severityToNumber(severity: string | undefined): number {
  switch (severity) {
    case 'Error':
      return 1
    case 'Warning':
      return 2
    case 'Info':
      return 3
    case 'Hint':
      return 4
    default:
      return 4
  }
}

/**
 * Crea una llave única para un diagnostic a partir de su contenido. Se usa
 * tanto para deduplicación dentro del mismo lote como entre turnos.
 */
function createDiagnosticKey(diag: {
  message: string
  severity?: string
  range?: unknown
  source?: string
  code?: unknown
}): string {
  const { jsonStringify } = requireLocalObservabilitySlowOperations()
  return jsonStringify({
    message: diag.message,
    severity: diag.severity,
    range: diag.range,
    source: diag.source || null,
    code: diag.code || null,
  })
}

/**
 * Deduplica diagnostics por URI de archivo y contenido del diagnostic.
 * También filtra los diagnostics ya entregados en turnos previos. Dos
 * diagnostics se consideran duplicados si comparten:
 * - URI de archivo
 * - Rango (línea/carácter de inicio y fin)
 * - Mensaje
 * - Severidad
 * - Source y code (si están presentes)
 */
function deduplicateDiagnosticFiles(
  allFiles: DiagnosticFile[],
): DiagnosticFile[] {
  const { logError } = requireLocalObservabilityLogging()
  const { toError } = requireLocalObservabilityErrorHelpers()

  // Agrupa los diagnostics por URI de archivo.
  const fileMap = new Map<string, Set<string>>()
  const dedupedFiles: DiagnosticFile[] = []

  for (const file of allFiles) {
    if (!fileMap.has(file.uri)) {
      fileMap.set(file.uri, new Set())
      dedupedFiles.push({ uri: file.uri, diagnostics: [] })
    }

    const seenDiagnostics = fileMap.get(file.uri)!
    const dedupedFile = dedupedFiles.find(f => f.uri === file.uri)!

    // Diagnostics ya entregados para este archivo (deduplicación entre turnos).
    const previouslyDelivered = deliveredDiagnostics.get(file.uri) || new Set()

    for (const diag of file.diagnostics) {
      try {
        const key = createDiagnosticKey(diag)

        // Se salta si ya se vio en este lote O ya se entregó en turnos previos.
        if (seenDiagnostics.has(key) || previouslyDelivered.has(key)) {
          continue
        }

        seenDiagnostics.add(key)
        dedupedFile.diagnostics.push(diag)
      } catch (error: unknown) {
        const err = toError(error)
        const truncatedMessage =
          diag.message?.substring(0, 100) || '<no message>'
        logError(
          new Error(
            `Failed to deduplicate diagnostic in ${file.uri}: ${err.message}. ` +
              `Diagnostic message: ${truncatedMessage}`,
          ),
        )
        // Se incluye el diagnostic de todas formas, para no perder información.
        dedupedFile.diagnostics.push(diag)
      }
    }
  }

  // Filtra los archivos que quedaron sin diagnostics tras la deduplicación.
  return dedupedFiles.filter(f => f.diagnostics.length > 0)
}

/**
 * Obtiene todos los diagnostics LSP pendientes que aún no se entregaron.
 * Deduplica los diagnostics para evitar enviar el mismo varias veces.
 * Marca los diagnostics como enviados para prevenir entrega duplicada.
 *
 * @returns Array de diagnostics pendientes listos para entrega (deduplicados).
 */
export function checkForLSPDiagnostics(): Array<{
  serverName: string
  files: DiagnosticFile[]
}> {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { logError } = requireLocalObservabilityLogging()
  const { toError } = requireLocalObservabilityErrorHelpers()

  logForDebugging(
    `LSP Diagnostics: Checking registry - ${pendingDiagnostics.size} pending`,
  )

  // Recoge todos los archivos con diagnostics de todas las notificaciones pendientes.
  const allFiles: DiagnosticFile[] = []
  const serverNames = new Set<string>()
  const diagnosticsToMark: PendingLSPDiagnostic[] = []

  for (const diagnostic of pendingDiagnostics.values()) {
    if (!diagnostic.attachmentSent) {
      allFiles.push(...diagnostic.files)
      serverNames.add(diagnostic.serverName)
      diagnosticsToMark.push(diagnostic)
    }
  }

  if (allFiles.length === 0) {
    return []
  }

  // Deduplica los diagnostics entre todos los archivos.
  let dedupedFiles: DiagnosticFile[]
  try {
    dedupedFiles = deduplicateDiagnosticFiles(allFiles)
  } catch (error: unknown) {
    const err = toError(error)
    logError(new Error(`Failed to deduplicate LSP diagnostics: ${err.message}`))
    // Se cae al conjunto sin deduplicar, para no perder diagnostics.
    dedupedFiles = allFiles
  }

  // Sólo se marca como enviado DESPUÉS de deduplicar con éxito; luego se
  // borra del mapa. Las entradas quedan rastreadas en el LRU de
  // deliveredDiagnostics para deduplicación, así que no hace falta
  // conservarlas en pendingDiagnostics tras la entrega.
  for (const diagnostic of diagnosticsToMark) {
    diagnostic.attachmentSent = true
  }
  for (const [id, diagnostic] of pendingDiagnostics) {
    if (diagnostic.attachmentSent) {
      pendingDiagnostics.delete(id)
    }
  }

  const originalCount = allFiles.reduce(
    (sum, f) => sum + f.diagnostics.length,
    0,
  )
  const dedupedCount = dedupedFiles.reduce(
    (sum, f) => sum + f.diagnostics.length,
    0,
  )

  if (originalCount > dedupedCount) {
    logForDebugging(
      `LSP Diagnostics: Deduplication removed ${originalCount - dedupedCount} duplicate diagnostic(s)`,
    )
  }

  // Aplica límite de volumen: tope por archivo y total.
  let totalDiagnostics = 0
  let truncatedCount = 0
  for (const file of dedupedFiles) {
    // Ordena por severidad (Error=1 < Warning=2 < Info=3 < Hint=4) para priorizar errores.
    file.diagnostics.sort(
      (a, b) => severityToNumber(a.severity) - severityToNumber(b.severity),
    )

    // Tope por archivo.
    if (file.diagnostics.length > MAX_DIAGNOSTICS_PER_FILE) {
      truncatedCount += file.diagnostics.length - MAX_DIAGNOSTICS_PER_FILE
      file.diagnostics = file.diagnostics.slice(0, MAX_DIAGNOSTICS_PER_FILE)
    }

    // Tope total.
    const remainingCapacity = MAX_TOTAL_DIAGNOSTICS - totalDiagnostics
    if (file.diagnostics.length > remainingCapacity) {
      truncatedCount += file.diagnostics.length - remainingCapacity
      file.diagnostics = file.diagnostics.slice(0, remainingCapacity)
    }

    totalDiagnostics += file.diagnostics.length
  }

  // Filtra los archivos que quedaron sin diagnostics tras el límite de volumen.
  dedupedFiles = dedupedFiles.filter(f => f.diagnostics.length > 0)

  if (truncatedCount > 0) {
    logForDebugging(
      `LSP Diagnostics: Volume limiting removed ${truncatedCount} diagnostic(s) (max ${MAX_DIAGNOSTICS_PER_FILE}/file, ${MAX_TOTAL_DIAGNOSTICS} total)`,
    )
  }

  // Rastrea los diagnostics entregados para deduplicación entre turnos.
  for (const file of dedupedFiles) {
    if (!deliveredDiagnostics.has(file.uri)) {
      deliveredDiagnostics.set(file.uri, new Set())
    }
    const delivered = deliveredDiagnostics.get(file.uri)!
    for (const diag of file.diagnostics) {
      try {
        delivered.add(createDiagnosticKey(diag))
      } catch (error: unknown) {
        // Se loguea pero se continúa - un fallo al rastrear no debe impedir la entrega.
        const err = toError(error)
        const truncatedMessage =
          diag.message?.substring(0, 100) || '<no message>'
        logError(
          new Error(
            `Failed to track delivered diagnostic in ${file.uri}: ${err.message}. ` +
              `Diagnostic message: ${truncatedMessage}`,
          ),
        )
      }
    }
  }

  const finalCount = dedupedFiles.reduce(
    (sum, f) => sum + f.diagnostics.length,
    0,
  )

  // Devuelve vacío si no hay diagnostics que entregar (todos filtrados por deduplicación).
  if (finalCount === 0) {
    logForDebugging(
      `LSP Diagnostics: No new diagnostics to deliver (all filtered by deduplication)`,
    )
    return []
  }

  logForDebugging(
    `LSP Diagnostics: Delivering ${dedupedFiles.length} file(s) with ${finalCount} diagnostic(s) from ${serverNames.size} server(s)`,
  )

  // Devuelve un único resultado con todos los diagnostics deduplicados.
  return [
    {
      serverName: Array.from(serverNames).join(', '),
      files: dedupedFiles,
    },
  ]
}

/**
 * Limpia todos los diagnostics pendientes. Se usa durante cleanup/shutdown
 * o para tests.
 * Nota: NO limpia deliveredDiagnostics - eso es para deduplicación entre
 * turnos y sólo debe limpiarse cuando se editan archivos o al resetear la sesión.
 */
export function clearAllLSPDiagnostics(): void {
  const { logForDebugging } = requireLocalObservabilityDebug()
  logForDebugging(
    `LSP Diagnostics: Clearing ${pendingDiagnostics.size} pending diagnostic(s)`,
  )
  pendingDiagnostics.clear()
}

/**
 * Resetea todo el estado de diagnostics, incluido el rastreo entre turnos.
 * Se usa al resetear la sesión o para tests.
 */
export function resetAllLSPDiagnosticState(): void {
  const { logForDebugging } = requireLocalObservabilityDebug()
  logForDebugging(
    `LSP Diagnostics: Resetting all state (${pendingDiagnostics.size} pending, ${deliveredDiagnostics.size} files tracked)`,
  )
  pendingDiagnostics.clear()
  deliveredDiagnostics.clear()
}

/**
 * Limpia los diagnostics entregados de un archivo específico. Debe
 * llamarse cuando se edita un archivo, para que los nuevos diagnostics de
 * ese archivo se muestren aunque coincidan con los ya entregados.
 *
 * @param fileUri - URI del archivo que se editó.
 */
export function clearDeliveredDiagnosticsForFile(fileUri: string): void {
  const { logForDebugging } = requireLocalObservabilityDebug()
  if (deliveredDiagnostics.has(fileUri)) {
    logForDebugging(
      `LSP Diagnostics: Clearing delivered diagnostics for ${fileUri}`,
    )
    deliveredDiagnostics.delete(fileUri)
  }
}

/**
 * Obtiene el conteo de diagnostics pendientes (para monitoreo).
 */
export function getPendingLSPDiagnosticCount(): number {
  return pendingDiagnostics.size
}
