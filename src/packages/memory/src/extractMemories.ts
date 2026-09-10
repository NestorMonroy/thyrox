/**
 * Puerto de `ccnmt: packages/memory/src/extractMemories.ts`, con dos
 * ajustes declarados:
 *
 * 1. `getFeatureValue_CACHED_MAY_BE_STALE` viene del sustituto local
 *    `./internal/pendingCrossPackageDeps.js`; `readEnv` viene de
 *    `@thyrox/config/env/utils` (mismo símbolo, subpath distinto).
 * 2. El `require()` perezoso de `teamMemPaths.js` (guardado por
 *    `feature('TEAMMEM')`) se porta como import estático — sin ciclo en
 *    este grafo (`teamMemPaths.ts` no importa de vuelta este archivo).
 *
 * Extrae memorias durables del transcript de la sesión actual y las
 * escribe al directorio de auto-memoria
 * (~/.claude/projects/<path>/memory/).
 *
 * Corre una vez al final de cada loop de query completo (cuando el modelo
 * produce una respuesta final sin llamadas a herramienta) vía
 * handleStopHooks en stopHooks.ts.
 *
 * Usa el patrón de agente forkeado (runForkedAgent) — un fork perfecto de
 * la conversación principal que comparte el prompt cache del padre.
 *
 * El estado vive en el closure de initExtractMemories() en vez de a nivel
 * de módulo, siguiendo el mismo patrón que confidenceRating.ts. Los tests
 * llaman a initExtractMemories() en beforeEach para obtener un closure
 * fresco.
 */

import { feature } from 'bun:bundle'
import { basename } from 'node:path'
import { ENTRYPOINT_NAME } from './memdir.js'
import {
  getAutoMemPath,
  isAutoMemoryEnabled,
  isAutoMemPath,
} from './paths.js'
import { getMemoryHostBindings } from './host.js'
import { count, uniq } from './internalUtils.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from './internal/pendingCrossPackageDeps.js'
import type {
  MemREPLContext,
  MemMessage,
  MemAssistantMessage,
  MemTool,
  MemToolPermissionResult,
  MemCanUseTool,
  MemSystemMessage,
} from './internalTypes.js'
import { readEnv } from '@thyrox/config/env/utils'
import * as teamMemPathsModule from './teamMemPaths.js'

const teamMemPaths = feature('TEAMMEM') ? teamMemPathsModule : null

// Constantes de nombre de herramienta — inlineadas para evitar importar de app-compat.
const BASH_TOOL_NAME = 'Bash'
const FILE_EDIT_TOOL_NAME = 'Edit'
const FILE_READ_TOOL_NAME = 'Read'
const FILE_WRITE_TOOL_NAME = 'Write'
const GLOB_TOOL_NAME = 'Glob'
const GREP_TOOL_NAME = 'Grep'
const REPL_TOOL_NAME = 'REPL'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Devuelve true si un mensaje es visible al modelo (se envía en llamadas
 * de API). Excluye mensajes de progreso, sistema y adjuntos.
 */
function isModelVisibleMessage(message: MemMessage): boolean {
  return message.type === 'user' || message.type === 'assistant'
}

function countModelVisibleMessagesSince(
  messages: MemMessage[],
  sinceUuid: string | undefined,
): number {
  if (sinceUuid === null || sinceUuid === undefined) {
    return count(messages, isModelVisibleMessage)
  }

  let foundStart = false
  let n = 0
  for (const message of messages) {
    if (!foundStart) {
      if (message.uuid === sinceUuid) {
        foundStart = true
      }
      continue
    }
    if (isModelVisibleMessage(message)) {
      n++
    }
  }
  // Si sinceUuid no se encontró (p. ej. eliminado por compactación de
  // contexto), recae en contar todos los mensajes visibles al modelo en
  // vez de devolver 0, que deshabilitaría la extracción permanentemente
  // por el resto de la sesión.
  if (!foundStart) {
    return count(messages, isModelVisibleMessage)
  }
  return n
}

/**
 * Devuelve true si algún mensaje de assistant posterior al UUID cursor
 * contiene un bloque tool_use de Write/Edit que apunta a una ruta de
 * auto-memoria.
 */
function hasMemoryWritesSince(
  messages: MemMessage[],
  sinceUuid: string | undefined,
): boolean {
  let foundStart = sinceUuid === undefined
  for (const message of messages) {
    if (!foundStart) {
      if (message.uuid === sinceUuid) {
        foundStart = true
      }
      continue
    }
    if (message.type !== 'assistant') {
      continue
    }
    const content = (message as MemAssistantMessage).message.content
    if (!Array.isArray(content)) {
      continue
    }
    for (const block of content) {
      const filePath = getWrittenFilePath(block)
      if (filePath !== undefined && isAutoMemPath(filePath)) {
        return true
      }
    }
  }
  return false
}

// ============================================================================
// Permisos de herramienta
// ============================================================================

function denyAutoMemTool(tool: MemTool, reason: string): MemToolPermissionResult {
  const bindings = getMemoryHostBindings()
  bindings.logDebug?.(`[autoMem] denied ${tool.name}: ${reason}`)
  bindings.logEvent?.('tengu_auto_mem_tool_denied', {
    tool_name: bindings.sanitizeToolNameForAnalytics?.(tool.name) ?? tool.name,
  })
  return {
    behavior: 'deny' as const,
    message: reason,
    decisionReason: { type: 'other' as const, reason },
  }
}

/**
 * Crea una función canUseTool que permite Read/Grep/Glob (sin
 * restricción), comandos Bash de solo lectura, y Edit/Write solo para
 * rutas dentro del directorio de auto-memoria. Compartida por
 * extractMemories y autoDream.
 */
export function createAutoMemCanUseTool(memoryDir: string): MemCanUseTool {
  return async (tool: MemTool, input: Record<string, unknown>) => {
    // Permite REPL.
    if (tool.name === REPL_TOOL_NAME) {
      return { behavior: 'allow' as const, updatedInput: input }
    }

    // Permite Read/Grep/Glob sin restricción — todas son inherentemente de solo lectura.
    if (
      tool.name === FILE_READ_TOOL_NAME ||
      tool.name === GREP_TOOL_NAME ||
      tool.name === GLOB_TOOL_NAME
    ) {
      return { behavior: 'allow' as const, updatedInput: input }
    }

    // Permite Bash solo para comandos que pasan BashTool.isReadOnly.
    if (tool.name === BASH_TOOL_NAME) {
      const parsed = tool.inputSchema.safeParse(input)
      if (parsed.success && tool.isReadOnly?.(parsed.data)) {
        return { behavior: 'allow' as const, updatedInput: input }
      }
      return denyAutoMemTool(
        tool,
        'Only read-only shell commands are permitted in this context (ls, find, grep, cat, stat, wc, head, tail, and similar)',
      )
    }

    if (
      (tool.name === FILE_EDIT_TOOL_NAME ||
        tool.name === FILE_WRITE_TOOL_NAME) &&
      'file_path' in input
    ) {
      const filePath = input.file_path
      if (typeof filePath === 'string' && isAutoMemPath(filePath)) {
        return { behavior: 'allow' as const, updatedInput: input }
      }
    }

    return denyAutoMemTool(
      tool,
      `only ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${BASH_TOOL_NAME}, and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} within ${memoryDir} are allowed`,
    )
  }
}

// ============================================================================
// Extraer rutas de archivo de la salida del agente
// ============================================================================

/**
 * Extrae file_path del input de un bloque tool_use, si está presente.
 */
function getWrittenFilePath(block: {
  type: string
  name?: string
  input?: unknown
}): string | undefined {
  if (
    block.type !== 'tool_use' ||
    (block.name !== FILE_EDIT_TOOL_NAME && block.name !== FILE_WRITE_TOOL_NAME)
  ) {
    return undefined
  }
  const input = block.input
  if (typeof input === 'object' && input !== null && 'file_path' in input) {
    const fp = (input as { file_path: unknown }).file_path
    return typeof fp === 'string' ? fp : undefined
  }
  return undefined
}

function extractWrittenPaths(agentMessages: unknown[]): string[] {
  const paths: string[] = []
  for (const message of agentMessages) {
    const msg = message as MemMessage
    if (msg.type !== 'assistant') {
      continue
    }
    const content = (msg as MemAssistantMessage).message.content
    if (!Array.isArray(content)) {
      continue
    }
    for (const block of content) {
      const filePath = getWrittenFilePath(block)
      if (filePath !== undefined) {
        paths.push(filePath)
      }
    }
  }
  return uniq(paths)
}

// ============================================================================
// Inicialización y estado en closure
// ============================================================================

type AppendSystemMessageFn = (
  msg: MemSystemMessage,
) => void

/** La función extractor activa, fijada por initExtractMemories(). */
let extractor:
  | ((
      context: MemREPLContext,
      appendSystemMessage?: AppendSystemMessageFn,
    ) => Promise<void>)
  | null = null

/** La función drain activa, fijada por initExtractMemories(). No-op hasta que se inicializa. */
let drainer: (timeoutMs?: number) => Promise<void> = async () => {}

/**
 * Inicializa el sistema de extracción de memoria. Crea un closure fresco
 * que captura todo el estado mutable (posición del cursor, guarda de
 * solape, contexto pendiente). Llamar una vez al arranque junto a
 * initConfidenceRating/initPromptCoaching, o por-test en beforeEach.
 */
export function initExtractMemories(): void {
  // --- Estado mutable en closure ---

  const inFlightExtractions = new Set<Promise<void>>()

  let lastMemoryMessageUuid: string | undefined

  let hasLoggedGateFailure = false

  let inProgress = false

  let turnsSinceLastExtraction = 0

  let pendingContext:
    | {
        context: MemREPLContext
        appendSystemMessage?: AppendSystemMessageFn
      }
    | undefined

  // --- Lógica interna de extracción ---

  async function runExtraction({
    context,
    appendSystemMessage,
    isTrailingRun,
  }: {
    context: MemREPLContext
    appendSystemMessage?: AppendSystemMessageFn
    isTrailingRun?: boolean
  }): Promise<void> {
    const bindings = getMemoryHostBindings()
    const { messages } = context
    const memoryDir = getAutoMemPath()
    const newMessageCount = countModelVisibleMessagesSince(
      messages,
      lastMemoryMessageUuid,
    )

    // Exclusión mutua: cuando el agente principal escribió memorias, se
    // salta el agente forkeado y se avanza el cursor más allá de este rango.
    if (hasMemoryWritesSince(messages, lastMemoryMessageUuid)) {
      bindings.logDebug?.(
        '[extractMemories] skipping — conversation already wrote to memory files',
      )
      const lastMessage = messages.at(-1)
      if (lastMessage?.uuid) {
        lastMemoryMessageUuid = lastMessage.uuid
      }
      bindings.logEvent?.('tengu_extract_memories_skipped_direct_write', {
        message_count: newMessageCount,
      })
      return
    }

    const teamMemoryEnabled = feature('TEAMMEM')
      ? teamMemPaths!.isTeamMemoryEnabled()
      : false

    const skipIndex = getFeatureValue_CACHED_MAY_BE_STALE(
      'tengu_moth_copse',
      false,
    )

    const canUseTool = createAutoMemCanUseTool(memoryDir)
    const cacheSafeParams = bindings.createCacheSafeParams?.(context)

    // Solo corre la extracción cada N turnos elegibles (tengu_bramble_lintel, default 1).
    if (!isTrailingRun) {
      turnsSinceLastExtraction++
      if (
        turnsSinceLastExtraction <
        (getFeatureValue_CACHED_MAY_BE_STALE('tengu_bramble_lintel', null) ?? 1)
      ) {
        return
      }
    }
    turnsSinceLastExtraction = 0

    inProgress = true
    const startTime = Date.now()
    try {
      bindings.logDebug?.(
        `[extractMemories] starting — ${newMessageCount} new messages, memoryDir=${memoryDir}`,
      )

      // Pre-inyecta el manifiesto del directorio de memoria para que el
      // agente no gaste un turno en `ls`. Reusa el escaneo de frontmatter
      // de findRelevantMemories.
      const abortController = bindings.createAbortController?.() ?? new AbortController()
      const scanned = await (bindings.scanMemoryFiles?.(memoryDir, abortController.signal) ?? Promise.resolve([]))
      const existingMemories = bindings.formatMemoryManifest?.(scanned) ?? ''

      const userPrompt =
        feature('TEAMMEM') && teamMemoryEnabled
          ? (bindings.buildExtractCombinedPrompt?.(
              newMessageCount,
              existingMemories,
              skipIndex,
            ) ?? '')
          : (bindings.buildExtractAutoOnlyPrompt?.(
              newMessageCount,
              existingMemories,
              skipIndex,
            ) ?? '')

      const result = await bindings.runForkedAgent?.({
        promptMessages: [bindings.createUserMessage?.({ content: userPrompt })],
        cacheSafeParams,
        canUseTool: canUseTool as (tool: unknown, input: Record<string, unknown>) => Promise<unknown>,
        querySource: 'extract_memories',
        forkLabel: 'extract_memories',
        skipTranscript: true,
        maxTurns: 5,
      })

      if (!result) return

      // Avanza el cursor solo tras una corrida exitosa.
      const lastMessage = messages.at(-1)
      if (lastMessage?.uuid) {
        lastMemoryMessageUuid = lastMessage.uuid
      }

      const writtenPaths = extractWrittenPaths(result.messages)
      const turnCount = count(result.messages as MemMessage[], m => m.type === 'assistant')

      const totalInput =
        result.totalUsage.input_tokens +
        result.totalUsage.cache_creation_input_tokens +
        result.totalUsage.cache_read_input_tokens
      const hitPct =
        totalInput > 0
          ? (
              (result.totalUsage.cache_read_input_tokens / totalInput) *
              100
            ).toFixed(1)
          : '0.0'
      bindings.logDebug?.(
        `[extractMemories] finished — ${writtenPaths.length} files written, cache: read=${result.totalUsage.cache_read_input_tokens} create=${result.totalUsage.cache_creation_input_tokens} input=${result.totalUsage.input_tokens} (${hitPct}% hit)`,
      )

      if (writtenPaths.length > 0) {
        bindings.logDebug?.(
          `[extractMemories] memories saved: ${writtenPaths.join(', ')}`,
        )
      } else {
        bindings.logDebug?.('[extractMemories] no memories saved this run')
      }

      // Las actualizaciones del archivo índice son mecánicas — el agente
      // toca MEMORY.md para agregar un enlace de tema, pero la "memoria"
      // visible al usuario es el archivo de tema en sí.
      const memoryPaths = writtenPaths.filter(
        p => basename(p) !== ENTRYPOINT_NAME,
      )
      const teamCount = feature('TEAMMEM')
        ? count(memoryPaths, teamMemPaths!.isTeamMemPath)
        : 0

      bindings.logEvent?.('tengu_extract_memories_extraction', {
        input_tokens: result.totalUsage.input_tokens,
        output_tokens: result.totalUsage.output_tokens,
        cache_read_input_tokens: result.totalUsage.cache_read_input_tokens,
        cache_creation_input_tokens:
          result.totalUsage.cache_creation_input_tokens,
        message_count: newMessageCount,
        turn_count: turnCount,
        files_written: writtenPaths.length,
        memories_saved: memoryPaths.length,
        team_memories_saved: teamCount,
        duration_ms: Date.now() - startTime,
      })

      bindings.logDebug?.(
        `[extractMemories] writtenPaths=${writtenPaths.length} memoryPaths=${memoryPaths.length} appendSystemMessage defined=${appendSystemMessage != null}`,
      )
      if (memoryPaths.length > 0) {
        const msg = bindings.createMemorySavedMessage?.(memoryPaths)
        if (msg) {
          if (feature('TEAMMEM')) {
            msg.teamCount = teamCount
          }
          appendSystemMessage?.(msg as MemSystemMessage)
        }
      }
    } catch (error) {
      bindings.logDebug?.(`[extractMemories] error: ${error}`)
      bindings.logEvent?.('tengu_extract_memories_error', {
        duration_ms: Date.now() - startTime,
      })
    } finally {
      inProgress = false

      const trailing = pendingContext
      pendingContext = undefined
      if (trailing) {
        bindings.logDebug?.(
          '[extractMemories] running trailing extraction for stashed context',
        )
        await runExtraction({
          context: trailing.context,
          appendSystemMessage: trailing.appendSystemMessage,
          isTrailingRun: true,
        })
      }
    }
  }

  // --- Punto de entrada público (capturado por extractor) ---

  async function executeExtractMemoriesImpl(
    context: MemREPLContext,
    appendSystemMessage?: AppendSystemMessageFn,
  ): Promise<void> {
    const bindings = getMemoryHostBindings()
    // Solo corre para el agente principal, no para subagentes.
    if (context.toolUseContext.agentId) {
      return
    }

    if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_passport_quail', false)) {
      if (process.env.USER_TYPE === 'ant' && !hasLoggedGateFailure) {
        hasLoggedGateFailure = true
        bindings.logEvent?.('tengu_extract_memories_gate_disabled', {})
      }
      return
    }

    // Verifica que la auto-memoria esté habilitada.
    if (!isAutoMemoryEnabled()) {
      return
    }

    // Se salta en modo remoto.
    if (bindings.getIsRemoteMode?.()) {
      return
    }

    if (inProgress) {
      bindings.logDebug?.(
        '[extractMemories] extraction in progress — stashing for trailing run',
      )
      bindings.logEvent?.('tengu_extract_memories_coalesced', {})
      pendingContext = { context, appendSystemMessage }
      return
    }

    await runExtraction({ context, appendSystemMessage })
  }

  extractor = async (context, appendSystemMessage) => {
    const p = executeExtractMemoriesImpl(context, appendSystemMessage)
    inFlightExtractions.add(p)
    try {
      await p
    } finally {
      inFlightExtractions.delete(p)
    }
  }

  drainer = async (timeoutMs = 60_000) => {
    if (inFlightExtractions.size === 0) return
    await Promise.race([
      Promise.all(inFlightExtractions).catch(() => {}),
      // eslint-disable-next-line no-restricted-syntax -- sleep() has no .unref(); timer must not block exit
      new Promise<void>(r => setTimeout(r, timeoutMs).unref()),
    ])
  }
}

// ============================================================================
// API pública
// ============================================================================

/**
 * Corre la extracción de memoria al final de un loop de query. Se llama
 * fire-and-forget desde handleStopHooks, junto a la sugerencia/coaching de
 * prompt. No hace nada hasta que se llame initExtractMemories().
 */
export async function executeExtractMemories(
  context: MemREPLContext,
  appendSystemMessage?: AppendSystemMessageFn,
  signal?: AbortSignal,
): Promise<void> {
  await extractor?.(context, appendSystemMessage)
}

/**
 * Espera todas las extracciones en vuelo (incluidas las corridas
 * trailing guardadas) con un timeout suave. Lo llama print.ts después de
 * que la respuesta se descargó pero antes de gracefulShutdownSync. No hace
 * nada hasta que se llame initExtractMemories().
 */
export async function drainPendingExtraction(
  timeoutMs?: number,
  signal?: AbortSignal,
): Promise<void> {
  await drainer(timeoutMs)
}
