/**
 * Puerto de `ccnmt: packages/memory/src/sessionMemoryUtils.ts`, con dos
 * ajustes declarados:
 *
 * 1. `getSessionMemoryPath` viene del sustituto local
 *    `./internal/pendingCrossPackageDeps.js` (`permission/filesystem` no
 *    está portado en `@thyrox/permission`).
 * 2. El fallback de `getFsImplementation` usa un `import` estático de
 *    `node:fs/promises` en vez del `require('node:fs/promises')`
 *    perezoso de la fuente — Bun/Node soportan el import estático sin el
 *    rodeo que la fuente necesitaba en su propio entorno de bundling.
 *
 * Funciones utilitarias de Session Memory que se pueden importar sin
 * dependencias circulares. Están separadas del sessionMemory.ts principal
 * para evitar importar runAgent.
 */

// isFsInaccessible inlineado abajo, para mantener a memory sin src/.
import { readFile as fsReadFile, mkdir as fsMkdir } from 'node:fs/promises'
import { getMemoryHostBindings } from './host.js'
import { getSessionMemoryPath } from './internal/pendingCrossPackageDeps.js'
// sleep inlineado abajo (una línea).
import { logEvent } from '@thyrox/local-observability'

// Inlineado desde src/utils/errors.ts y src/utils/sleep.ts para mantener a
// memory hoja de Wave-2 sin src/.
function isFsInaccessible(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  return code === 'EACCES' || code === 'EPERM' || code === 'ENOENT' || code === 'ENOTDIR' || code === 'EIO'
}
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
function getFsImplementation() {
  // Toma el fsImpl de los host bindings si está presente; si no, recae en
  // node:fs/promises.
  const bindings = getMemoryHostBindings() as { fsImpl?: unknown } | null
  if (bindings && typeof bindings === 'object' && 'fsImpl' in bindings && bindings.fsImpl) {
    return bindings.fsImpl as {
      readFile(path: string, opts: { encoding: string }): Promise<string> | string
      mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> | void
    }
  }
  return {
    readFile: (p: string, opts: { encoding: string }) => fsReadFile(p, opts.encoding as BufferEncoding) as unknown as Promise<string>,
    mkdir: (p: string, opts?: { recursive?: boolean }) => fsMkdir(p, { recursive: true, ...(opts ?? {}) }),
  }
}

const EXTRACTION_WAIT_TIMEOUT_MS = 15000
const EXTRACTION_STALE_THRESHOLD_MS = 60000 // 1 minuto

/**
 * Configuración para los umbrales de extracción de memoria de sesión.
 */
export type SessionMemoryConfig = {
  /** Mínimo de tokens de ventana de contexto antes de inicializar memoria
   * de sesión. Usa el mismo conteo de tokens que autocompact (input +
   * output + tokens de caché) para asegurar comportamiento consistente
   * entre ambas features. */
  minimumMessageTokensToInit: number
  /** Crecimiento mínimo de ventana de contexto (en tokens) entre
   * actualizaciones de memoria de sesión. Usa el mismo conteo de tokens
   * que autocompact (tokenCountWithEstimation) para medir el crecimiento
   * real de contexto, no el uso acumulado de API. */
  minimumTokensBetweenUpdate: number
  /** Número de llamadas a herramientas entre actualizaciones de memoria de sesión. */
  toolCallsBetweenUpdates: number
}

// Valores de configuración por defecto.
export const DEFAULT_SESSION_MEMORY_CONFIG: SessionMemoryConfig = {
  minimumMessageTokensToInit: 10000,
  minimumTokensBetweenUpdate: 5000,
  toolCallsBetweenUpdates: 3,
}

// Configuración de memoria de sesión actual.
let sessionMemoryConfig: SessionMemoryConfig = {
  ...DEFAULT_SESSION_MEMORY_CONFIG,
}

// Rastrea el ID del último mensaje resumido (estado compartido).
let lastSummarizedMessageId: string | undefined

// Rastrea el estado de extracción con timestamp (fijado por sessionMemory.ts).
let extractionStartedAt: number | undefined

// Rastrea el tamaño de contexto en la última extracción de memoria (para
// minimumTokensBetweenUpdate).
let tokensAtLastExtraction = 0

// Rastrea si la memoria de sesión ya se inicializó (cumplió
// minimumMessageTokensToInit).
let sessionMemoryInitialized = false

/**
 * Obtiene el ID de mensaje hasta el cual la memoria de sesión está al día.
 */
export function getLastSummarizedMessageId(): string | undefined {
  return lastSummarizedMessageId
}

/**
 * Fija el último ID de mensaje resumido (llamado desde sessionMemory.ts).
 */
export function setLastSummarizedMessageId(
  messageId: string | undefined,
): void {
  lastSummarizedMessageId = messageId
}

/**
 * Marca la extracción como iniciada (llamado desde sessionMemory.ts).
 */
export function markExtractionStarted(): void {
  extractionStartedAt = Date.now()
}

/**
 * Marca la extracción como completada (llamado desde sessionMemory.ts).
 */
export function markExtractionCompleted(): void {
  extractionStartedAt = undefined
}

/**
 * Espera a que cualquier extracción de memoria de sesión en curso termine
 * (con timeout de 15s). Devuelve inmediatamente si no hay extracción en
 * curso o si la extracción es stale (>1min de antigüedad).
 */
export async function waitForSessionMemoryExtraction(): Promise<void> {
  const startTime = Date.now()
  while (extractionStartedAt) {
    const extractionAge = Date.now() - extractionStartedAt
    if (extractionAge > EXTRACTION_STALE_THRESHOLD_MS) {
      // La extracción es stale, no esperar.
      return
    }

    if (Date.now() - startTime > EXTRACTION_WAIT_TIMEOUT_MS) {
      // Timeout — continuar de todas formas.
      return
    }

    await sleep(1000)
  }
}

/**
 * Obtiene el contenido actual de memoria de sesión.
 */
export async function getSessionMemoryContent(): Promise<string | null> {
  const fs = getFsImplementation()
  const memoryPath = getSessionMemoryPath()

  try {
    const content = await fs.readFile(memoryPath, { encoding: 'utf-8' })

    logEvent('tengu_session_memory_loaded', {
      content_length: content.length,
    })

    return content
  } catch (e: unknown) {
    if (isFsInaccessible(e)) return null
    throw e
  }
}

/**
 * Fija la configuración de memoria de sesión.
 */
export function setSessionMemoryConfig(
  config: Partial<SessionMemoryConfig>,
): void {
  sessionMemoryConfig = {
    ...sessionMemoryConfig,
    ...config,
  }
}

/**
 * Obtiene la configuración actual de memoria de sesión.
 */
export function getSessionMemoryConfig(): SessionMemoryConfig {
  return { ...sessionMemoryConfig }
}

/**
 * Registra el tamaño de contexto al momento de la extracción. Se usa para
 * medir el crecimiento de contexto para el umbral
 * minimumTokensBetweenUpdate.
 */
export function recordExtractionTokenCount(currentTokenCount: number): void {
  tokensAtLastExtraction = currentTokenCount
}

/**
 * Verifica si la memoria de sesión ya se inicializó (cumplió el umbral
 * minimumTokensToInit).
 */
export function isSessionMemoryInitialized(): boolean {
  return sessionMemoryInitialized
}

/**
 * Marca la memoria de sesión como inicializada.
 */
export function markSessionMemoryInitialized(): void {
  sessionMemoryInitialized = true
}

/**
 * Verifica si se cumplió el umbral para inicializar memoria de sesión.
 * Usa el total de tokens de ventana de contexto (igual que autocompact)
 * para comportamiento consistente.
 */
export function hasMetInitializationThreshold(
  currentTokenCount: number,
): boolean {
  return currentTokenCount >= sessionMemoryConfig.minimumMessageTokensToInit
}

/**
 * Verifica si se cumplió el umbral para la próxima actualización. Mide el
 * crecimiento real de ventana de contexto desde la última extracción
 * (misma métrica que autocompact y el umbral de inicialización).
 */
export function hasMetUpdateThreshold(currentTokenCount: number): boolean {
  const tokensSinceLastExtraction = currentTokenCount - tokensAtLastExtraction
  return (
    tokensSinceLastExtraction >= sessionMemoryConfig.minimumTokensBetweenUpdate
  )
}

/**
 * Obtiene el número configurado de llamadas a herramientas entre
 * actualizaciones.
 */
export function getToolCallsBetweenUpdates(): number {
  return sessionMemoryConfig.toolCallsBetweenUpdates
}

/**
 * Reinicia el estado de memoria de sesión (útil para tests).
 */
export function resetSessionMemoryState(): void {
  sessionMemoryConfig = { ...DEFAULT_SESSION_MEMORY_CONFIG }
  tokensAtLastExtraction = 0
  sessionMemoryInitialized = false
  lastSummarizedMessageId = undefined
  extractionStartedAt = undefined
}
