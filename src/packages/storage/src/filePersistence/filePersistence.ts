/**
 * Puerto de `ccnmt: packages/storage/src/filePersistence/filePersistence.ts`
 * (8056 bytes fuente). Orquestador de persistencia de archivos al final de
 * cada turno: sube los archivos modificados de `outputs/` a la Files API
 * (modo BYOC) o consulta xattr en modo Cloud (sin implementar, ver
 * `executeCloudPersistence` — el TODO es de la propia fuente).
 *
 * File persistence orchestrator
 *
 * This module provides the main orchestration logic for persisting files
 * at the end of each turn:
 * - BYOC mode: Upload files to Files API and collect file IDs
 * - 1P/Cloud mode: Query Files API listDirectory for file IDs (rclone handles sync)
 *
 * Divergencias declaradas — cinco dependencias de paquete hermano ausente
 * (DEC-04), clasificadas por qué se hizo con cada una:
 *
 * 1. `feature('FILE_PERSISTENCE')` (macro `bun:bundle`) — GATEO OMITIDO,
 *    mismo precedente que `sessionStoragePredicates.ts`/
 *    `runtimeActivation.ts`: constante `false`. `isFilePersistenceEnabled`
 *    por tanto SIEMPRE devuelve `false` aquí — es fiel a lo que la fuente
 *    hace en cualquier build que no sea el de ant (la macro nunca
 *    evalúa a `true` fuera de ese build). `runFilePersistence` en sí NO
 *    depende de `feature()` — su lógica se porta y se testea igual.
 * 2. `logEvent`/`logError` (de `@claude-code-how-works/local-observability`)
 *    — inyectables vía setter, default no-op. `errorMessage` se
 *    reimplementa localmente (una línea, `errorHelpers.ts:106-108`).
 * 3. `getSessionIngressAuthToken` (de
 *    `@claude-code-how-works/provider/sessionIngressAuth.js`) — ese
 *    módulo depende TRANSITIVAMENTE de
 *    `app-host/bootstrap/state.js`, `./authFileDescriptor.js` y de
 *    `@thyrox/storage` mismo (`fsOperations.js` — ¡ciclo con este
 *    paquete si se importara real!), así que se recibe inyectado vía
 *    setter con default `() => null` (sin token ⇒ el llamador real ve
 *    "no autenticado", que es un resultado válido del contrato).
 * 4. `uploadSessionFiles`/`FilesApiConfig` (de
 *    `@claude-code-how-works/provider/filesApi.js`, 700+ líneas) — se
 *    declaran los tipos mínimos que ESTE módulo consume (no el archivo
 *    entero) y se inyecta la función vía setter; el default devuelve
 *    TODOS los archivos como fallidos con un mensaje explícito — un
 *    porte fiel no puede simular una subida real sin la Files API, y un
 *    default que "silenciosamente tuviera éxito" falsearía el resultado.
 * 5. `getCwd`/`readEnv` — reusan `../internal/pendingCrossPackageDeps.js`
 *    (ya establecidas para todo el paquete).
 */

import { join, relative } from 'path'
import { getCwd, readEnv } from '../internal/pendingCrossPackageDeps.js'
import {
  findModifiedFiles,
  getEnvironmentKind,
  logDebug,
} from './outputsScanner.js'
import {
  DEFAULT_UPLOAD_CONCURRENCY,
  type FailedPersistence,
  FILE_COUNT_LIMIT,
  type FilesPersistedEventData,
  OUTPUTS_SUBDIR,
  type PersistedFile,
  type TurnStartTime,
} from './types.js'

/** Sustituto local de `errorMessage` (`errorHelpers.ts:106-108`). */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

let _logEvent: (name: string, metadata?: Record<string, unknown>) => void = () => {}
/** Sólo para tests/inyección — reemplaza el sink de `logEvent`. */
export function setLogEventFn(fn: typeof _logEvent): void {
  _logEvent = fn
}
function logEvent(name: string, metadata?: Record<string, unknown>): void {
  _logEvent(name, metadata)
}

let _logError: (error: unknown) => void = () => {}
/** Sólo para tests/inyección — reemplaza el sink de `logError`. */
export function setLogErrorFn(fn: typeof _logError): void {
  _logError = fn
}
function logError(error: unknown): void {
  _logError(error)
}

let _getSessionIngressAuthToken: () => string | null = () => null
/** Sólo para tests/inyección — ver divergencia #3 del docstring del módulo. */
export function setGetSessionIngressAuthTokenFn(
  fn: () => string | null,
): void {
  _getSessionIngressAuthToken = fn
}
function getSessionIngressAuthToken(): string | null {
  return _getSessionIngressAuthToken()
}

/** Subconjunto de `FilesApiConfig` que ESTE módulo consume. */
export type FilesApiConfig = {
  oauthToken: string
  sessionId: string
}

export type UploadResult =
  | { success: true; path: string; fileId: string }
  | { success: false; path: string; error: string }

async function defaultUploadSessionFiles(
  files: { path: string; relativePath: string }[],
  _config: FilesApiConfig,
  _concurrency: number,
): Promise<UploadResult[]> {
  return files.map(f => ({
    success: false,
    path: f.path,
    error:
      'uploadSessionFiles no está conectado: @claude-code-how-works/provider/filesApi.js ' +
      'está ausente en este árbol (DEC-04); inyectar con setUploadSessionFilesFn().',
  }))
}

let _uploadSessionFiles: (
  files: { path: string; relativePath: string }[],
  config: FilesApiConfig,
  concurrency: number,
) => Promise<UploadResult[]> = defaultUploadSessionFiles

/** Sólo para tests/inyección — ver divergencia #4 del docstring del módulo. */
export function setUploadSessionFilesFn(fn: typeof _uploadSessionFiles): void {
  _uploadSessionFiles = fn
}

async function uploadSessionFiles(
  files: { path: string; relativePath: string }[],
  config: FilesApiConfig,
  concurrency: number,
): Promise<UploadResult[]> {
  return _uploadSessionFiles(files, config, concurrency)
}

/**
 * Execute file persistence for modified files in the outputs directory.
 *
 * Assembles all config internally:
 * - Checks environment kind (CLAUDE_CODE_ENVIRONMENT_KIND)
 * - Retrieves session access token
 * - Requires CLAUDE_CODE_REMOTE_SESSION_ID for session ID
 *
 * @param turnStartTime - The timestamp when the turn started
 * @param signal - Optional abort signal for cancellation
 * @returns Event data, or null if not enabled or no files to persist
 */
export async function runFilePersistence(
  turnStartTime: TurnStartTime,
  signal?: AbortSignal,
): Promise<FilesPersistedEventData | null> {
  const environmentKind = getEnvironmentKind()
  if (environmentKind !== 'byoc') {
    return null
  }

  const sessionAccessToken = getSessionIngressAuthToken()
  if (!sessionAccessToken) {
    return null
  }

  const sessionId = readEnv('CLAUDE_CODE_REMOTE_SESSION_ID')
  if (!sessionId) {
    logError(
      new Error(
        'File persistence enabled but CLAUDE_CODE_REMOTE_SESSION_ID is not set',
      ),
    )
    return null
  }

  const config: FilesApiConfig = {
    oauthToken: sessionAccessToken,
    sessionId,
  }

  const outputsDir = join(getCwd(), sessionId, OUTPUTS_SUBDIR)

  // Check if aborted
  if (signal?.aborted) {
    logDebug('Persistence aborted before processing')
    return null
  }

  const startTime = Date.now()
  logEvent('tengu_file_persistence_started', {
    mode: environmentKind,
  })

  try {
    let result: FilesPersistedEventData
    if (environmentKind === 'byoc') {
      result = await executeBYOCPersistence(
        turnStartTime,
        config,
        outputsDir,
        signal,
      )
    } else {
      result = executeCloudPersistence()
    }

    // Nothing to report
    if (result.files.length === 0 && result.failed.length === 0) {
      return null
    }

    const durationMs = Date.now() - startTime
    logEvent('tengu_file_persistence_completed', {
      success_count: result.files.length,
      failure_count: result.failed.length,
      duration_ms: durationMs,
      mode: environmentKind,
    })

    return result
  } catch (error) {
    logError(error)
    logDebug(`File persistence failed: ${error}`)

    const durationMs = Date.now() - startTime
    logEvent('tengu_file_persistence_completed', {
      success_count: 0,
      failure_count: 0,
      duration_ms: durationMs,
      mode: environmentKind,
      error: 'exception',
    })

    return {
      files: [],
      failed: [
        {
          filename: outputsDir,
          error: errorMessage(error),
        },
      ],
    }
  }
}

/**
 * Execute BYOC mode persistence: scan local filesystem for modified files,
 * then upload to Files API.
 */
async function executeBYOCPersistence(
  turnStartTime: TurnStartTime,
  config: FilesApiConfig,
  outputsDir: string,
  signal?: AbortSignal,
): Promise<FilesPersistedEventData> {
  // Find modified files via local filesystem scan
  // Uses same directory structure as downloads: {cwd}/{sessionId}/outputs
  const modifiedFiles = await findModifiedFiles(turnStartTime, outputsDir)

  if (modifiedFiles.length === 0) {
    logDebug('No modified files to persist')
    return { files: [], failed: [] }
  }

  logDebug(`Found ${modifiedFiles.length} modified files`)

  if (signal?.aborted) {
    return { files: [], failed: [] }
  }

  // Enforce file count limit
  if (modifiedFiles.length > FILE_COUNT_LIMIT) {
    logDebug(
      `File count limit exceeded: ${modifiedFiles.length} > ${FILE_COUNT_LIMIT}`,
    )
    logEvent('tengu_file_persistence_limit_exceeded', {
      file_count: modifiedFiles.length,
      limit: FILE_COUNT_LIMIT,
    })
    return {
      files: [],
      failed: [
        {
          filename: outputsDir,
          error: `Too many files modified (${modifiedFiles.length}). Maximum: ${FILE_COUNT_LIMIT}.`,
        },
      ],
    }
  }

  const filesToProcess = modifiedFiles
    .map(filePath => ({
      path: filePath,
      relativePath: relative(outputsDir, filePath),
    }))
    .filter(({ relativePath }) => {
      // Security: skip files that resolve outside the outputs directory
      if (relativePath.startsWith('..')) {
        logDebug(`Skipping file outside outputs directory: ${relativePath}`)
        return false
      }
      return true
    })

  logDebug(`BYOC mode: uploading ${filesToProcess.length} files`)

  // Upload files in parallel
  const results = await uploadSessionFiles(
    filesToProcess,
    config,
    DEFAULT_UPLOAD_CONCURRENCY,
  )

  // Separate successful and failed uploads
  const persistedFiles: PersistedFile[] = []
  const failedFiles: FailedPersistence[] = []

  for (const result of results) {
    if (result.success) {
      persistedFiles.push({
        filename: result.path,
        file_id: result.fileId,
      })
    } else {
      failedFiles.push({
        filename: result.path,
        error: result.error,
      })
    }
  }

  logDebug(
    `BYOC persistence complete: ${persistedFiles.length} uploaded, ${failedFiles.length} failed`,
  )

  return {
    files: persistedFiles,
    failed: failedFiles,
  }
}

/**
 * Execute Cloud (1P) mode persistence.
 * TODO: Read file_id from xattr on output files. xattr-based file IDs are
 * currently being added for 1P environments.
 */
function executeCloudPersistence(): FilesPersistedEventData {
  logDebug('Cloud mode: xattr-based file ID reading not yet implemented')
  return { files: [], failed: [] }
}

/**
 * Execute file persistence and emit result via callback.
 * Handles errors internally.
 */
export async function executeFilePersistence(
  turnStartTime: TurnStartTime,
  signal: AbortSignal,
  onResult: (result: FilesPersistedEventData) => void,
): Promise<void> {
  try {
    const result = await runFilePersistence(turnStartTime, signal)
    if (result) {
      onResult(result)
    }
  } catch (error) {
    logError(error)
  }
}

/**
 * Check if file persistence is enabled.
 * Requires: feature flag ON, valid environment kind, session access token,
 * and CLAUDE_CODE_REMOTE_SESSION_ID.
 * This ensures only public-api/sessions users trigger file persistence,
 * not normal Claude Code CLI users.
 *
 * Divergencia: `feature('FILE_PERSISTENCE')` se omite (constante `false`,
 * ver docstring del módulo) — esta función SIEMPRE devuelve `false` aquí.
 */
export function isFilePersistenceEnabled(): boolean {
  const featureGateActive = false
  if (featureGateActive) {
    return (
      getEnvironmentKind() === 'byoc' &&
      !!getSessionIngressAuthToken() &&
      !!readEnv('CLAUDE_CODE_REMOTE_SESSION_ID')
    )
  }
  return false
}
