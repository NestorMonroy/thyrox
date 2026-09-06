/**
 * Adaptación de @claude-code-how-works/app-host: src/heapDumpService.ts.
 * Capa 1 tramo B — porte FIEL de la lógica; importaciones DECLARADAS
 * COLGANTES, sin traducir y sin stub.
 *
 * El servicio que respalda el comando `/heapdump`: captura un snapshot
 * de heap V8 más un archivo de diagnósticos de memoria (heap, RSS,
 * contextos detached, handles/requests activos, smaps de Linux cuando
 * está disponible) en `~/Desktop`. La mayor parte del cuerpo —
 * `captureMemoryDiagnostics` y la rama Bun/Node de `writeHeapSnapshot`—
 * es cómputo puro sobre `process`/`v8`, sin ningún paquete hermano de
 * por medio. Lo que SÍ bloquea el archivo entero:
 *
 *   - `getSessionId` de `./bootstrap/state.js` — SÍ es del propio
 *     paquete (se tradujo a ruta relativa), pero `bootstrap/` es zona
 *     PROHIBIDA de este pase (la escribe otro agente en paralelo) y
 *     `getSessionId` no está hoy en su `state.ts`. Mismo criterio que
 *     `activityManager.ts` (hermano ya portado en este paquete) fija
 *     para `getActiveTimeCounter`.
 *   - `@claude-code-how-works/local-observability` (`logEvent`),
 *     `/local-observability/debug.js` (`logForDebugging`),
 *     `/local-observability/errorHelpers.js` (`toError`),
 *     `/local-observability/log.js` (`logError`) y
 *     `/local-observability/slowOperations.js` (`jsonStringify`) — el
 *     paquete `local-observability` no existe en absoluto.
 *   - `@claude-code-how-works/storage/file.js` (`getDesktopPath`) y
 *     `/storage/fsOperations.js` (`getFsImplementation`) —
 *     `@thyrox/storage` SÍ existe (y su `file.ts` incluso menciona
 *     `getDesktopPath` en un comentario propio como símbolo de la
 *     fuente que su porte no incluyó), pero ninguno de los dos subpaths
 *     está en su `package.json` (`exports`); confirmado con un import
 *     dinámico real (`Cannot find module '@thyrox/storage/file.js'`).
 *
 * Ninguno de los siete símbolos se stubea localmente: se conservan
 * literales, mismo criterio que `providerHostSetup.ts` (hermano de este
 * mismo pase) y `agent/internal/macroFallback.ts`. `MACRO.VERSION` (el
 * global inyectado en build-time por Bun, o su relleno de
 * `agent/internal/macroFallback.ts` cuando corre bajo `bun:test`) se
 * conserva igual — el `tsconfig`/ambient global no se declara aquí, es
 * responsabilidad de quien consuma este módulo.
 *
 * Sin test: los cinco de `local-observability` y los dos de `storage`
 * bastan para que la resolución de módulos falle en el primer bloque de
 * imports; que el cuerpo de `captureMemoryDiagnostics` sea, en su
 * mayoría, cómputo puro no cambia eso — para ejercitarlo hay que poder
 * importar el módulo primero.
 */

import { createWriteStream, writeFileSync } from 'fs'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import {
  getHeapSnapshot,
  getHeapSpaceStatistics,
  getHeapStatistics,
  type HeapSpaceInfo,
} from 'v8'
import { getSessionId } from './bootstrap/state.js'
import { logEvent } from '@claude-code-how-works/local-observability'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'
import { toError } from '@claude-code-how-works/local-observability/errorHelpers.js'
import { getDesktopPath } from '@claude-code-how-works/storage/file.js'
import { getFsImplementation } from '@claude-code-how-works/storage/fsOperations.js'
import { logError } from '@claude-code-how-works/local-observability/log.js'
import { jsonStringify } from '@claude-code-how-works/local-observability/slowOperations.js'

export type HeapDumpResult = {
  success: boolean
  heapPath?: string
  diagPath?: string
  error?: string
}

/**
 * Diagnósticos de memoria capturados junto al heap dump.
 * Ayuda a identificar si el leak está en el heap V8 (capturado en el
 * snapshot) o en memoria nativa (no capturada).
 */
export type MemoryDiagnostics = {
  timestamp: string
  sessionId: string
  trigger: 'manual' | 'auto-1.5GB'
  dumpNumber: number // 1º, 2º, etc. dump auto en esta sesión (0 si es manual)
  uptimeSeconds: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    arrayBuffers: number
    rss: number
  }
  memoryGrowthRate: {
    bytesPerSecond: number
    mbPerHour: number
  }
  v8HeapStats: {
    heapSizeLimit: number // Máximo heap permitido
    mallocedMemory: number // Memoria asignada fuera del heap V8
    peakMallocedMemory: number // Pico de memoria nativa
    detachedContexts: number // Contextos con leak — indicador clave!
    nativeContexts: number // Contextos activos
  }
  v8HeapSpaces?: Array<{
    name: string
    size: number
    used: number
    available: number
  }>
  resourceUsage: {
    maxRSS: number // Pico de RSS en bytes
    userCPUTime: number
    systemCPUTime: number
  }
  activeHandles: number // Timers, sockets, file handles con leak
  activeRequests: number // Operaciones async pendientes
  openFileDescriptors?: number // Linux/macOS — indica leaks de recursos
  analysis: {
    potentialLeaks: string[]
    recommendation: string
  }
  smapsRollup?: string // Sólo Linux — desglose detallado de memoria
  platform: string
  nodeVersion: string
  ccVersion: string
}

/**
 * Captura diagnósticos de memoria.
 * Ayuda a identificar si el leak está en el heap V8 (capturado) o en
 * memoria nativa (no capturada).
 */
export async function captureMemoryDiagnostics(
  trigger: 'manual' | 'auto-1.5GB',
  dumpNumber = 0,
): Promise<MemoryDiagnostics> {
  const usage = process.memoryUsage()
  const heapStats = getHeapStatistics()
  const resourceUsage = process.resourceUsage()
  const uptimeSeconds = process.uptime()

  // getHeapSpaceStatistics() no está disponible en Bun
  let heapSpaceStats: HeapSpaceInfo[] | undefined
  try {
    heapSpaceStats = getHeapSpaceStatistics()
  } catch {
    // No disponible en runtime Bun
  }

  // Conteo de handles/requests activos (APIs internas, pero estables)
  const activeHandles = (
    process as unknown as { _getActiveHandles: () => unknown[] }
  )._getActiveHandles().length
  const activeRequests = (
    process as unknown as { _getActiveRequests: () => unknown[] }
  )._getActiveRequests().length

  // Intenta contar file descriptors abiertos (Linux/macOS)
  let openFileDescriptors: number | undefined
  try {
    openFileDescriptors = (await readdir('/proc/self/fd')).length
  } catch {
    // No es Linux — el approach de macOS requeriría lsof, se omite por ahora
  }

  // Intenta leer smaps_rollup de Linux para el desglose detallado
  let smapsRollup: string | undefined
  try {
    smapsRollup = await readFile('/proc/self/smaps_rollup', 'utf8')
  } catch {
    // No es Linux o sin acceso — está bien
  }

  // Calcula memoria nativa (RSS - heap) y tasa de crecimiento
  const nativeMemory = usage.rss - usage.heapUsed
  const bytesPerSecond = uptimeSeconds > 0 ? usage.rss / uptimeSeconds : 0
  const mbPerHour = (bytesPerSecond * 3600) / (1024 * 1024)

  // Identifica posibles leaks
  const potentialLeaks: string[] = []
  if (heapStats.number_of_detached_contexts > 0) {
    potentialLeaks.push(
      `${heapStats.number_of_detached_contexts} detached context(s) - possible iframe/context leak`,
    )
  }
  if (activeHandles > 100) {
    potentialLeaks.push(
      `${activeHandles} active handles - possible timer/socket leak`,
    )
  }
  if (nativeMemory > usage.heapUsed) {
    potentialLeaks.push(
      'Native memory > heap - leak may be in native addons (node-pty, sharp, etc.)',
    )
  }
  if (mbPerHour > 100) {
    potentialLeaks.push(
      `High memory growth rate: ${mbPerHour.toFixed(1)} MB/hour`,
    )
  }
  if (openFileDescriptors && openFileDescriptors > 500) {
    potentialLeaks.push(
      `${openFileDescriptors} open file descriptors - possible file/socket leak`,
    )
  }

  return {
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    trigger,
    dumpNumber,
    uptimeSeconds,
    memoryUsage: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
    },
    memoryGrowthRate: {
      bytesPerSecond,
      mbPerHour,
    },
    v8HeapStats: {
      heapSizeLimit: heapStats.heap_size_limit,
      mallocedMemory: heapStats.malloced_memory,
      peakMallocedMemory: heapStats.peak_malloced_memory,
      detachedContexts: heapStats.number_of_detached_contexts,
      nativeContexts: heapStats.number_of_native_contexts,
    },
    v8HeapSpaces: heapSpaceStats?.map(space => ({
      name: space.space_name,
      size: space.space_size,
      used: space.space_used_size,
      available: space.space_available_size,
    })),
    resourceUsage: {
      maxRSS: resourceUsage.maxRSS * 1024, // KB a bytes
      userCPUTime: resourceUsage.userCPUTime,
      systemCPUTime: resourceUsage.systemCPUTime,
    },
    activeHandles,
    activeRequests,
    openFileDescriptors,
    analysis: {
      potentialLeaks,
      recommendation:
        potentialLeaks.length > 0
          ? `WARNING: ${potentialLeaks.length} potential leak indicator(s) found. See potentialLeaks array.`
          : 'No obvious leak indicators. Check heap snapshot for retained objects.',
    },
    smapsRollup,
    platform: process.platform,
    nodeVersion: process.version,
    ccVersion: MACRO.VERSION,
  }
}

/**
 * Función núcleo del heap dump — captura heap snapshot + diagnósticos a
 * ~/Desktop.
 *
 * Los diagnósticos se escriben ANTES de capturar el heap snapshot,
 * porque la serialización del snapshot V8 puede fallar para heaps muy
 * grandes. Escribiendo primero los diagnósticos, se obtiene información
 * útil de memoria incluso si el snapshot falla.
 */
export async function performHeapDump(
  trigger: 'manual' | 'auto-1.5GB' = 'manual',
  dumpNumber = 0,
): Promise<HeapDumpResult> {
  try {
    const sessionId = getSessionId()

    // Captura diagnósticos antes de cualquier otra E/S async — el heap
    // dump en sí mismo asigna memoria y sesgaría los números.
    const diagnostics = await captureMemoryDiagnostics(trigger, dumpNumber)

    const toGB = (bytes: number): string =>
      (bytes / 1024 / 1024 / 1024).toFixed(3)
    logForDebugging(`[HeapDump] Memory state:
  heapUsed: ${toGB(diagnostics.memoryUsage.heapUsed)} GB (in snapshot)
  external: ${toGB(diagnostics.memoryUsage.external)} GB (NOT in snapshot)
  rss: ${toGB(diagnostics.memoryUsage.rss)} GB (total process)
  ${diagnostics.analysis.recommendation}`)

    const dumpDir = getDesktopPath()
    await getFsImplementation().mkdir(dumpDir)

    const suffix = dumpNumber > 0 ? `-dump${dumpNumber}` : ''
    const heapFilename = `${sessionId}${suffix}.heapsnapshot`
    const diagFilename = `${sessionId}${suffix}-diagnostics.json`
    const heapPath = join(dumpDir, heapFilename)
    const diagPath = join(dumpDir, diagFilename)

    // Escribe diagnósticos primero (barato, poco probable que falle)
    await writeFile(diagPath, jsonStringify(diagnostics, null, 2), {
      mode: 0o600,
    })
    logForDebugging(`[HeapDump] Diagnostics written to ${diagPath}`)

    // Escribe el heap snapshot (esto puede fallar para heaps muy grandes)
    await writeHeapSnapshot(heapPath)
    logForDebugging(`[HeapDump] Heap dump written to ${heapPath}`)

    logEvent('tengu_heap_dump', {
      triggerManual: trigger === 'manual',
      triggerAuto15GB: trigger === 'auto-1.5GB',
      dumpNumber,
      success: true,
    })

    return { success: true, heapPath, diagPath }
  } catch (err) {
    const error = toError(err)
    logError(error)
    logEvent('tengu_heap_dump', {
      triggerManual: trigger === 'manual',
      triggerAuto15GB: trigger === 'auto-1.5GB',
      dumpNumber,
      success: false,
    })
    return { success: false, error: error.message }
  }
}

/**
 * Escribe el heap snapshot a un archivo.
 * Usa pipeline() que maneja la limpieza de streams automáticamente ante
 * errores.
 */
async function writeHeapSnapshot(filepath: string): Promise<void> {
  if (typeof Bun !== 'undefined') {
    // En Bun, los heapsnapshots hoy no son streaming. Se usa E/S
    // síncrona pese al tamaño de archivo potencialmente grande, para
    // evitar clonar el string para uso cross-thread.
    //
    /* eslint-disable custom-rules/no-sync-fs -- síncrono a propósito para no clonar el string grande del heap snapshot para uso cross-thread */
    // @ts-expect-error el 2º argumento está en la próxima versión de Bun
    writeFileSync(filepath, Bun.generateHeapSnapshot('v8', 'arraybuffer'), {
      mode: 0o600,
    })
    /* eslint-enable custom-rules/no-sync-fs */

    // Fuerza GC para intentar liberar ese heap snapshot antes.
    Bun.gc(true)
    return
  }
  const writeStream = createWriteStream(filepath, { mode: 0o600 })
  const heapSnapshotStream = getHeapSnapshot()
  await pipeline(heapSnapshotStream, writeStream)
}
