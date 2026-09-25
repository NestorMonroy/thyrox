/**
 * Porte de `ccnmt: packages/agent/compaction/compact.ts`: el orquestador de
 * la compactación con resumen. Ejecuta los hooks pre/post-compact, pide el
 * resumen al modelo (por el agente bifurcado que comparte la caché del
 * hilo principal, o por streaming directo), reintenta cuando el propio
 * pedido choca con prompt-too-long, y reconstruye el estado que el resumen
 * no conserva: archivos leídos, plan, skills invocadas, agentes en segundo
 * plano y los deltas de herramientas, agentes e instrucciones MCP.
 *
 * Cada dependencia se toma de su hogar en este árbol (`@thyrox/X` donde la
 * fuente dice `@claude-code-how-works/X`). Las divergencias, declaradas:
 *
 *  - `normalizeMessagesForAPI` viene de `../internal/queryRuntime.js` —el
 *    hogar del que `query.ts` la consume— y devuelve `AgentMessage[]`, la
 *    forma mínima del bucle; se estrecha a `Message[]` con una aserción
 *    porque `Message` es un subtipo de esa forma.
 *  - `isToolSearchEnabled` (asíncrono, con umbral automático) no está
 *    publicado por `@thyrox/provider`; el streaming de respaldo decide con
 *    sus dos mitades síncronas (`isToolSearchEnabledOptimistic` y
 *    `isToolSearchToolAvailable`), igual que `attachments.ts` en la fuente.
 *  - `queryModelWithStreaming` de este árbol tipa `thinkingConfig` con la
 *    forma del runtime heredado (`enabled`/`disabled`), sin `adaptive`, y
 *    `effortValue` como cadena; `toProviderThinkingConfig` y
 *    `effortValueForProvider` hacen la traducción en la frontera.
 *  - `getCompactUserSummaryMessage` de este árbol recibe dos banderas más
 *    que la fuente (`recentMessagesPreserved`, `isProactiveActive`) y las
 *    dependencias de idioma; la compactación completa no conserva mensajes
 *    y no sabe de modo proactivo, la parcial conserva los de `messagesToKeep`.
 *  - `annotateBoundaryWithPreservedSegment` se porta aquí con el tipo de la
 *    frontera (`SystemCompactBoundaryMessage`); `compactUtils.ts` conserva
 *    su versión de forma libre para quien no tenga el tipo a mano.
 *  - `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` es `never`
 *    en este árbol y `logEvent` acepta `Record<string, unknown>`, así que
 *    las aserciones de la fuente sobre cada literal de telemetría sobran.
 *  - `getMessagesAfterCompactBoundary` aquí no recibe el segundo argumento
 *    de opciones; la fuente tampoco lo pasa.
 *
 * Nota de tipos: `Message.message.content` en `messageShapes.ts` es la
 * unión de bloques del SDK; `stripImagesFromMessages` declara localmente los
 * bloques mínimos que necesita en vez de arrastrar el SDK completo.
 */
import { feature } from 'bun:bundle'
import uniqBy from 'lodash-es/uniqBy.js'

/* eslint-disable @typescript-eslint/no-require-imports */
const sessionTranscriptModule = feature('KAIROS')
  ? (require('../sessionTranscript/sessionTranscript.js') as typeof import('../sessionTranscript/sessionTranscript.js'))
  : null
/* eslint-enable @typescript-eslint/no-require-imports */

import { APIUserAbortError } from '@anthropic-ai/sdk'
import { getInvokedSkillsForAgent, markPostCompaction } from '@thyrox/app-host/bootstrap/state.js'
import type { CanUseToolFn } from '@thyrox/repl/hooks/useCanUseTool.js'
import type { Tool, ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { LocalAgentTaskState } from '../localAgentTask.js'
import { FileReadTool } from '@thyrox/tool-registry/tools/FileReadTool/FileReadTool.js'
import { FILE_READ_TOOL_NAME, FILE_UNCHANGED_STUB } from '@thyrox/tool-registry/tools/FileReadTool/prompt.js'
import { ToolSearchTool } from '@thyrox/tool-registry/tools/ToolSearchTool/ToolSearchTool.js'
import type { AgentId } from '../idTypes.js'
import type {
  AssistantMessage,
  AttachmentMessage,
  HookResultMessage,
  Message,
  PartialCompactDirection,
  SystemCompactBoundaryMessage,
  SystemMessage,
  UserMessage,
} from '../messageShapes.js'
import type { UUID } from 'node:crypto'
import {
  createAttachmentMessage,
  generateFileAttachment,
  getAgentListingDeltaAttachment,
  getDeferredToolsDeltaAttachment,
  getMcpInstructionsDeltaAttachment,
} from '../attachments.js'
import { getMemoryPath } from '@thyrox/config/global/config.js'
import { COMPACT_MAX_OUTPUT_TOKENS } from '../context.js'
import { analyzeContext, tokenStatsToStatsigMetrics } from '../contextAnalysis.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { hasExactErrorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { cacheToObject } from '@thyrox/tool-registry/fileStateCache'
import { type CacheSafeParams, runForkedAgent } from '../forkedAgent.js'
import { executePostCompactHooks, executePreCompactHooks } from '../hooks.js'
import { logError } from '@thyrox/local-observability/logging'
import { MEMORY_TYPE_VALUES } from '@thyrox/memory/memorySourceTypes'
import {
  createCompactBoundaryMessage,
  createUserMessage,
  getAssistantMessageText,
  getLastAssistantMessage,
  getMessagesAfterCompactBoundary,
  isCompactBoundaryMessage,
} from '../messages.js'
import { normalizeMessagesForAPI } from '../internal/queryRuntime.js'
import { expandPath } from '@thyrox/storage/path.js'
import { getPlan, getPlanFilePath } from '@thyrox/storage/plans.js'
import { isSessionActivityTrackingActive, sendSessionActivitySignal } from '@thyrox/storage/sessionActivity.js'
import { processSessionStartHooks } from '@thyrox/storage/sessionStart.js'
import { getTranscriptPath, reAppendSessionMetadata } from '@thyrox/storage/sessionStorage.js'
import { sleep } from '@thyrox/config/sleep'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { getTaskOutputPath } from '@thyrox/storage/task/diskOutput.js'
import { getTokenUsage, tokenCountFromLastAPIResponse, tokenCountWithEstimation } from '../tokens.js'
import { extractDiscoveredToolNames, isToolSearchEnabledOptimistic, isToolSearchToolAvailable } from '../toolSearch.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'
import { emitCompactionFailure, emitCompactionSuccess } from './compactionTelemetry.js'
import { getMaxOutputTokensForModel, queryModelWithStreaming } from '@thyrox/provider/claude.js'
import { getPromptTooLongTokenGap, PROMPT_TOO_LONG_ERROR_MESSAGE, startsWithApiErrorPrefix } from '@thyrox/provider/errors.js'
import { notifyCompaction } from '@thyrox/provider/promptCacheBreakDetection.js'
import { getRetryDelay } from '@thyrox/provider/withRetry.js'
import { logPermissionContextForAnts } from '../internalLogging.js'
import { roughTokenCountEstimation, roughTokenCountEstimationForMessages } from '../tokenEstimation.js'
import { groupMessagesByApiRound } from './grouping.js'
import { type CompactDirection, getCompactPrompt, getCompactUserSummaryMessage, getPartialCompactPrompt } from './prompt.js'
import { getInitialSettings } from '@thyrox/config/settings'
import type { RecompactionInfo } from './compactUtils.js'

// La superficie que sus consumidores piden y que vive en `compactUtils.ts`
// (medido con src/verify/namedImports.ts).
export type { RecompactionInfo } from './compactUtils.js'
export {
  ERROR_MESSAGE_INCOMPLETE_RESPONSE,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  ERROR_MESSAGE_USER_ABORT,
  mergeHookInstructions,
} from './compactUtils.js'
import {
  ERROR_MESSAGE_INCOMPLETE_RESPONSE,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  ERROR_MESSAGE_PROMPT_TOO_LONG,
  ERROR_MESSAGE_USER_ABORT,
  mergeHookInstructions,
} from './compactUtils.js'

export const POST_COMPACT_MAX_FILES_TO_RESTORE = 5
export const POST_COMPACT_TOKEN_BUDGET = 50_000
export const POST_COMPACT_MAX_TOKENS_PER_FILE = 5_000
// Las skills pueden ser grandes (verify=18.7KB, claude-api=20.1KB). Antes se
// re-inyectaban sin tope en cada compactación → 5-10K tok/compact. Truncar
// por skill gana a descartar: las instrucciones al inicio del archivo suelen
// ser la parte crítica. El presupuesto cabe ~5 skills al tope por skill.
export const POST_COMPACT_MAX_TOKENS_PER_SKILL = 5_000
export const POST_COMPACT_SKILLS_TOKEN_BUDGET = 25_000
const MAX_COMPACT_STREAMING_RETRIES = 2

type TextBlockLike = { type: 'text'; text: string }
type ImageBlockLike = { type: 'image'; [key: string]: unknown }
type DocumentBlockLike = { type: 'document'; [key: string]: unknown }
type ToolResultBlockLike = {
  type: 'tool_result'
  content?: unknown
  [key: string]: unknown
}
type ContentBlockLike =
  | TextBlockLike
  | ImageBlockLike
  | DocumentBlockLike
  | ToolResultBlockLike
  | { type: string; [key: string]: unknown }

/**
 * Retira los bloques de imagen de los mensajes de usuario antes de
 * enviarlos para compactación. Las imágenes no hacen falta para generar
 * un resumen de la conversación y pueden hacer que la propia llamada de
 * compactación choque con el límite de prompt-too-long, especialmente en
 * sesiones CCD donde los usuarios adjuntan imágenes con frecuencia.
 * Reemplaza los bloques de imagen con un marcador de texto para que el
 * resumen igual note que se compartió una imagen.
 *
 * Nota: sólo los mensajes de usuario contienen imágenes (ya sea adjuntas
 * directamente o dentro de contenido de tool_result). Los mensajes de
 * asistente contienen texto, tool_use y bloques de thinking pero no
 * imágenes.
 */
export function stripImagesFromMessages(messages: Message[]): Message[] {
  return messages.map(message => {
    if (message.type !== 'user') {
      return message
    }

    const content = message.message?.content
    if (!Array.isArray(content)) {
      return message
    }

    let hasMediaBlock = false
    const newContent = (content as ContentBlockLike[]).flatMap(block => {
      if (block.type === 'image') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[image]' }]
      }
      if (block.type === 'document') {
        hasMediaBlock = true
        return [{ type: 'text' as const, text: '[document]' }]
      }
      // También retira imágenes/documentos anidados dentro de arreglos
      // de contenido de tool_result.
      if (block.type === 'tool_result' && Array.isArray(block.content)) {
        let toolHasMedia = false
        const newToolContent = (block.content as ContentBlockLike[]).map(
          item => {
            if (item.type === 'image') {
              toolHasMedia = true
              return { type: 'text' as const, text: '[image]' }
            }
            if (item.type === 'document') {
              toolHasMedia = true
              return { type: 'text' as const, text: '[document]' }
            }
            return item
          },
        )
        if (toolHasMedia) {
          hasMediaBlock = true
          return [{ ...block, content: newToolContent }]
        }
      }
      return [block]
    })

    if (!hasMediaBlock) {
      return message
    }

    return {
      ...message,
      message: {
        ...message.message,
        content: newContent,
      },
    } as typeof message
  })
}

/**
 * Retira los adjuntos que de todas formas se re-inyectan tras compactar.
 * `skill_discovery`/`skill_listing` vuelven a aflorar con
 * `resetSentSkillNames()` y la señal de descubrimiento del turno siguiente,
 * así que dárselos al resumidor gasta tokens y ensucia el resumen con
 * sugerencias de skills caducas.
 *
 * No hace nada con EXPERIMENTAL_SKILL_SEARCH apagado (esos tipos de adjunto
 * no existen en las builds externas).
 */
export function stripReinjectedAttachments(messages: Message[]): Message[] {
  if (feature('EXPERIMENTAL_SKILL_SEARCH')) {
    return messages.filter(
      m =>
        !(
          m.type === 'attachment' &&
          (m.attachment.type === 'skill_discovery' || m.attachment.type === 'skill_listing')
        ),
    )
  }
  return messages
}

const MAX_PTL_RETRIES = 3
const PTL_RETRY_MARKER = '[earlier conversation truncated for compaction retry]'

/**
 * Descarta las rondas de API más antiguas hasta cubrir `tokenGap`. Si el
 * hueco no se pudo leer (algunos formatos de error de Vertex/Bedrock),
 * descarta el 20% de las rondas. Devuelve null cuando no hay nada que
 * descartar sin dejar vacío el conjunto a resumir.
 *
 * Es la salida de emergencia de CC-1180: cuando el propio pedido de
 * compactación choca con prompt-too-long, el usuario queda atascado.
 * Descartar el contexto más antiguo pierde información pero lo desbloquea.
 * La ruta reactiva (`reactiveCompact.ts`) tiene el bucle de reintento que
 * pela desde la cola; esto es el respaldo simple y seguro de la ruta
 * proactiva/manual que la unificación de bfdb472f no migró.
 */
export function truncateHeadForPTLRetry(messages: Message[], ptlResponse: AssistantMessage): Message[] | null {
  // Retira nuestro propio marcador sintético de un reintento previo antes de
  // agrupar. Si no, sería su propio grupo 0 y el respaldo del 20% se
  // estancaría (descarta sólo el marcador, lo vuelve a añadir, cero avance
  // en el reintento 2+).
  const input =
    messages[0]?.type === 'user' && messages[0].isMeta && messages[0].message.content === PTL_RETRY_MARKER
      ? messages.slice(1)
      : messages

  const groups = groupMessagesByApiRound(input)
  if (groups.length < 2) return null

  const tokenGap = getPromptTooLongTokenGap(ptlResponse)
  let dropCount: number
  if (tokenGap !== undefined) {
    let acc = 0
    dropCount = 0
    for (const g of groups) {
      // El estimador tipa su propia forma mínima de mensaje; la fuente aplica la misma aserción.
      acc += roughTokenCountEstimationForMessages(g as Parameters<typeof roughTokenCountEstimationForMessages>[0])
      dropCount++
      if (acc >= tokenGap) break
    }
  } else {
    dropCount = Math.max(1, Math.floor(groups.length * 0.2))
  }

  // Conserva al menos un grupo para que haya algo que resumir.
  dropCount = Math.min(dropCount, groups.length - 1)
  if (dropCount < 1) return null

  const sliced = groups.slice(dropCount).flat()
  // groupMessagesByApiRound pone el preámbulo en el grupo 0 y empieza cada
  // grupo siguiente con un mensaje de asistente. Descartar el grupo 0 deja
  // una secuencia que empieza por asistente, que la API rechaza (el primer
  // mensaje debe ser role=user). Se antepone un marcador de usuario
  // sintético — ensureToolResultPairing ya maneja los tool_results
  // huérfanos que esto cree.
  if (sliced[0]?.type === 'assistant') {
    return [createUserMessage({ content: PTL_RETRY_MARKER, isMeta: true }), ...sliced]
  }
  return sliced
}

/** El resultado de una compactación con resumen (`ccnmt: compaction/compact.ts:300-311`). */
export interface CompactionResult {
  boundaryMarker: SystemMessage
  summaryMessages: UserMessage[]
  attachments: AttachmentMessage[]
  hookResults: HookResultMessage[]
  messagesToKeep?: Message[]
  userDisplayMessage?: string
  preCompactTokenCount?: number
  postCompactTokenCount?: number
  truePostCompactTokenCount?: number
  compactionUsage?: ReturnType<typeof getTokenUsage>
}

/**
 * El arreglo de mensajes posterior a la compactación, en orden fijo para todas
 * las rutas: frontera, resumen, mensajes conservados, adjuntos, resultados de
 * hook (`ccnmt: compaction/compact.ts:326-340`).
 */
export function buildPostCompactMessages(result: CompactionResult): Message[] {
  return [
    result.boundaryMarker,
    ...result.summaryMessages,
    ...(result.messagesToKeep ?? []),
    ...result.attachments,
    ...result.hookResults,
  ]
}

/**
 * Anota una frontera de compactación con la metadata de re-enlace de
 * `messagesToKeep`. Los mensajes conservados guardan en disco sus
 * `parentUuid` originales (se saltan por deduplicación); el cargador usa
 * esto para parchear cabeza→ancla y los demás hijos del ancla→cola.
 *
 * `anchorUuid` = lo que queda justo antes de keep[0] en la cadena deseada:
 *   - conserva sufijo (reactiva/session-memory): el último mensaje de resumen
 *   - conserva prefijo (compactación parcial): la propia frontera
 */
export function annotateBoundaryWithPreservedSegment(
  boundary: SystemCompactBoundaryMessage,
  anchorUuid: UUID,
  messagesToKeep: readonly Message[] | undefined,
): SystemCompactBoundaryMessage {
  const keep = messagesToKeep ?? []
  const head = keep[0]
  const tail = keep.at(-1)
  if (head === undefined || tail === undefined) return boundary
  return {
    ...boundary,
    compactMetadata: {
      ...boundary.compactMetadata,
      preservedSegment: {
        headUuid: head.uuid,
        anchorUuid,
        tailUuid: tail.uuid,
      },
    },
  }
}

/** Las dependencias de idioma que `getCompactUserSummaryMessage` de este árbol exige. */
const summaryMessageDeps = {
  getLanguage: (): string | undefined => getInitialSettings().language,
}

/**
 * Crea una versión compacta de una conversación resumiendo los mensajes más
 * antiguos y conservando el historial reciente.
 */
export async function compactConversation(
  messages: Message[],
  context: ToolUseContext,
  cacheSafeParams: CacheSafeParams,
  suppressFollowUpQuestions: boolean,
  customInstructions?: string,
  isAutoCompact: boolean = false,
  recompactionInfo?: RecompactionInfo,
): Promise<CompactionResult> {
  // Reloj y disparador OTel de la compactación (compartidos por éxito y fallo).
  const compactStartMs = Date.now()
  const compactTrigger = isAutoCompact ? 'auto' : 'manual'
  try {
    if (messages.length === 0) {
      throw new Error(ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)
    }

    const preCompactTokenCount = tokenCountWithEstimation(messages)

    const appState = context.getAppState()
    void logPermissionContextForAnts(appState.toolPermissionContext, 'summary')

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'pre_compact',
    })

    // Hooks PreCompact
    context.setSDKStatus?.('compacting')
    const hookResult = await executePreCompactHooks(
      {
        trigger: isAutoCompact ? 'auto' : 'manual',
        customInstructions: customInstructions ?? null,
      },
      context.abortController.signal,
    )
    customInstructions = mergeHookInstructions(customInstructions, hookResult.newCustomInstructions)
    const userDisplayMessage = hookResult.userDisplayMessage

    // Modo de petición con flecha arriba y mensaje propio.
    context.setStreamMode?.('requesting')
    context.setResponseLength?.(() => 0)
    context.onCompactProgress?.({ type: 'compact_start' })

    // Default 3P: true — el agente bifurcado reutiliza la caché de prompt de
    // la conversación principal. Experimento (ene 2026): la ruta false es 98%
    // de fallos de caché, ~0.76% de cache_creation de la flota, concentrado
    // en entornos efímeros (CCR/GHA/SDK) con caché fría y proveedores 3P.
    // El gate se conserva como interruptor de emergencia.
    const promptCacheSharingEnabled = getFeatureValue_CACHED_MAY_BE_STALE('tengu_compact_cache_prefix', true)

    const compactPrompt = getCompactPrompt(customInstructions)
    const summaryRequest = createUserMessage({
      content: compactPrompt,
    })

    let messagesToSummarize = messages
    let retryCacheSafeParams = cacheSafeParams
    let summaryResponse: AssistantMessage
    let summary: string | null
    let ptlAttempts = 0
    for (;;) {
      summaryResponse = await streamCompactSummary({
        messages: messagesToSummarize,
        summaryRequest,
        appState,
        context,
        preCompactTokenCount,
        cacheSafeParams: retryCacheSafeParams,
      })
      summary = getAssistantMessageText(summaryResponse)
      if (!summary?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) break

      // CC-1180: el propio pedido de compactación chocó con prompt-too-long.
      // Se truncan las rondas más antiguas y se reintenta en vez de dejar al
      // usuario atascado.
      ptlAttempts++
      const truncated = ptlAttempts <= MAX_PTL_RETRIES ? truncateHeadForPTLRetry(messagesToSummarize, summaryResponse) : null
      if (!truncated) {
        logEvent('tengu_compact_failed', {
          reason: 'prompt_too_long',
          preCompactTokenCount,
          promptCacheSharingEnabled,
          ptlAttempts,
        })
        throw new Error(ERROR_MESSAGE_PROMPT_TOO_LONG)
      }
      logEvent('tengu_compact_ptl_retry', {
        attempt: ptlAttempts,
        droppedMessages: messagesToSummarize.length - truncated.length,
        remainingMessages: truncated.length,
      })
      messagesToSummarize = truncated
      // La ruta del agente bifurcado lee cacheSafeParams.forkContextMessages,
      // no el parámetro messages — el conjunto truncado viaja por las dos.
      retryCacheSafeParams = {
        ...retryCacheSafeParams,
        forkContextMessages: truncated,
      }
    }

    if (!summary) {
      logForDebugging(`Compact failed: no summary text in response. Response: ${jsonStringify(summaryResponse)}`, {
        level: 'error',
      })
      logEvent('tengu_compact_failed', {
        reason: 'no_summary',
        preCompactTokenCount,
        promptCacheSharingEnabled,
      })
      throw new Error(`Failed to generate conversation summary - response did not contain valid text content`)
    } else if (startsWithApiErrorPrefix(summary)) {
      logEvent('tengu_compact_failed', {
        reason: 'api_error',
        preCompactTokenCount,
        promptCacheSharingEnabled,
      })
      throw new Error(summary)
    }

    // Guarda el estado de archivos antes de vaciarlo.
    const preCompactReadFileState = cacheToObject(context.readFileState)

    // Vacía la caché.
    context.readFileState.clear()
    context.loadedNestedMemoryPaths?.clear()

    // A propósito NO se reinicia sentSkillNames: re-inyectar el skill_listing
    // completo (~4K tokens) tras compactar es pura cache_creation con
    // beneficio marginal. El modelo sigue teniendo SkillTool en su esquema y
    // el adjunto invoked_skills (abajo) conserva el contenido de las skills
    // usadas.

    // Generación asíncrona de adjuntos en paralelo.
    const [fileAttachments, asyncAgentAttachments] = await Promise.all([
      createPostCompactFileAttachments(preCompactReadFileState, context, POST_COMPACT_MAX_FILES_TO_RESTORE),
      createAsyncAgentAttachmentsIfNeeded(context),
    ])

    const postCompactFileAttachments: AttachmentMessage[] = [...fileAttachments, ...asyncAgentAttachments]
    const planAttachment = createPlanAttachmentIfNeeded(context.agentId)
    if (planAttachment) {
      postCompactFileAttachments.push(planAttachment)
    }

    // Instrucciones de modo plan si estamos en él, para que el modelo siga
    // operando en modo plan tras la compactación.
    const planModeAttachment = await createPlanModeAttachmentIfNeeded(context)
    if (planModeAttachment) {
      postCompactFileAttachments.push(planModeAttachment)
    }

    // Adjunto de skills si se invocaron skills en esta sesión.
    const skillAttachment = createSkillAttachmentIfNeeded(context.agentId)
    if (skillAttachment) {
      postCompactFileAttachments.push(skillAttachment)
    }

    // La compactación se comió los deltas previos. Se re-anuncian desde el
    // estado actual para que el modelo tenga contexto de herramientas e
    // instrucciones en el primer turno posterior. Historial vacío → diff
    // contra nada → anuncia el conjunto completo.
    for (const att of getDeferredToolsDeltaAttachment(context.options.tools, context.options.mainLoopModel, [], {
      callSite: 'compact_full',
    })) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }
    for (const att of getAgentListingDeltaAttachment(context, [])) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }
    for (const att of getMcpInstructionsDeltaAttachment(
      context.options.mcpClients,
      context.options.tools,
      context.options.mainLoopModel,
      [],
    )) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'session_start',
    })
    // Hooks SessionStart tras una compactación exitosa.
    const hookMessages = await processSessionStartHooks('compact', {
      model: context.options.mainLoopModel,
    })

    // La frontera y los mensajes de resumen se crean antes del evento para
    // poder calcular el tamaño real del contexto resultante.
    const boundaryMarker = createCompactBoundaryMessage(
      isAutoCompact ? 'auto' : 'manual',
      preCompactTokenCount ?? 0,
      messages.at(-1)?.uuid,
    )
    // Conserva el estado de herramientas cargadas — el resumen no conserva
    // los bloques tool_reference, así que el filtro de esquemas posterior
    // necesita esto para seguir mandando a la API los esquemas diferidos ya
    // cargados.
    const preCompactDiscovered = extractDiscoveredToolNames(messages)
    if (preCompactDiscovered.size > 0) {
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...preCompactDiscovered].sort()
    }

    const transcriptPath = getTranscriptPath()
    const summaryMessages: UserMessage[] = [
      createUserMessage({
        content: getCompactUserSummaryMessage(
          summary,
          suppressFollowUpQuestions,
          transcriptPath,
          false,
          undefined,
          summaryMessageDeps,
        ),
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
      }),
    ]

    // Antes "postCompactTokenCount" — renombrado porque es el uso total de la
    // llamada de compactación (input_tokens ≈ preCompactTokenCount), NO el
    // tamaño del contexto resultante. Se conserva por continuidad del evento.
    const compactionCallTotalTokens = tokenCountFromLastAPIResponse([summaryResponse])

    // Estimación por carga de mensajes del contexto resultante. El
    // shouldAutoCompact de la iteración siguiente verá esto MÁS ~20-40K de
    // system prompt + herramientas + userContext (vía usage.input_tokens).
    // Así que `willRetriggerNextTurn: true` es una señal fuerte; `false`
    // puede reactivar igual si está cerca del umbral.
    const truePostCompactTokenCount = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...summaryMessages,
      ...postCompactFileAttachments,
      ...hookMessages,
    ] as Parameters<typeof roughTokenCountEstimationForMessages>[0])

    // Métricas de uso de la API de compactación.
    const compactionUsage = getTokenUsage(summaryResponse)

    const querySourceForEvent = recompactionInfo?.querySource ?? context.options.querySource ?? 'unknown'

    logEvent('tengu_compact', {
      preCompactTokenCount,
      // Se conserva por continuidad — semánticamente es el uso total de la llamada.
      postCompactTokenCount: compactionCallTotalTokens,
      truePostCompactTokenCount,
      autoCompactThreshold: recompactionInfo?.autoCompactThreshold ?? -1,
      willRetriggerNextTurn:
        recompactionInfo !== undefined && truePostCompactTokenCount >= recompactionInfo.autoCompactThreshold,
      isAutoCompact,
      querySource: querySourceForEvent,
      queryChainId: context.queryTracking?.chainId ?? '',
      queryDepth: context.queryTracking?.depth ?? -1,
      isRecompactionInChain: recompactionInfo?.isRecompactionInChain ?? false,
      turnsSincePreviousCompact: recompactionInfo?.turnsSincePreviousCompact ?? -1,
      previousCompactTurnId: recompactionInfo?.previousCompactTurnId ?? '',
      compactionInputTokens: compactionUsage?.input_tokens,
      compactionOutputTokens: compactionUsage?.output_tokens,
      compactionCacheReadTokens: compactionUsage?.cache_read_input_tokens ?? 0,
      compactionCacheCreationTokens: compactionUsage?.cache_creation_input_tokens ?? 0,
      compactionTotalTokens: compactionUsage
        ? compactionUsage.input_tokens +
          (compactionUsage.cache_creation_input_tokens ?? 0) +
          (compactionUsage.cache_read_input_tokens ?? 0) +
          compactionUsage.output_tokens
        : 0,
      promptCacheSharingEnabled,
      // analyzeContext recorre cada bloque (~11ms en una sesión de 4.5K
      // mensajes) sólo para este desglose de telemetría. Se calcula aquí,
      // pasado el await de la API, para que el recorrido síncrono no
      // ahogue el bucle de render antes de empezar. Mismo patrón que
      // reactiveCompact.ts.
      ...(() => {
        try {
          return tokenStatsToStatsigMetrics(analyzeContext(messages))
        } catch (error) {
          logError(error)
          return {}
        }
      })(),
    })

    // Reinicia la base de lectura de caché para que la caída posterior no se
    // marque como rotura.
    if (feature('PROMPT_CACHE_BREAK_DETECTION')) {
      notifyCompaction(context.options.querySource ?? 'compact', context.agentId)
    }
    markPostCompaction()

    // Re-anexa la metadata de sesión (título, etiqueta) para que quede dentro
    // de la ventana de 16KB de cola que readLiteMetadata lee para --resume.
    // Sin esto, bastantes mensajes posteriores la empujan fuera de la ventana
    // y --resume muestra el título autogenerado en vez del nombre fijado.
    reAppendSessionMetadata()

    // Escribe un segmento reducido de transcripción para los mensajes previos
    // (sólo modo asistente). Sin esperar — los errores se registran dentro.
    if (feature('KAIROS')) {
      void sessionTranscriptModule?.writeSessionTranscriptSegment(messages)
    }

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'post_compact',
    })
    const postCompactHookResult = await executePostCompactHooks(
      {
        trigger: isAutoCompact ? 'auto' : 'manual',
        compactSummary: summary,
      },
      context.abortController.signal,
    )

    const combinedUserDisplayMessage = [userDisplayMessage, postCompactHookResult.userDisplayMessage]
      .filter(Boolean)
      .join('\n')

    emitCompactionSuccess(compactTrigger, compactStartMs, preCompactTokenCount, truePostCompactTokenCount)
    return {
      boundaryMarker,
      summaryMessages,
      attachments: postCompactFileAttachments,
      hookResults: hookMessages,
      userDisplayMessage: combinedUserDisplayMessage || undefined,
      preCompactTokenCount,
      postCompactTokenCount: compactionCallTotalTokens,
      truePostCompactTokenCount,
      compactionUsage,
    }
  } catch (error) {
    emitCompactionFailure(compactTrigger, compactStartMs, error)
    // La notificación de error sólo en /compact manual. Los fallos de
    // auto-compact se reintentan en el turno siguiente y la notificación
    // confunde cuando la compactación acaba por lograrse.
    if (!isAutoCompact) {
      addErrorNotificationIfNeeded(error, context)
    }
    throw error
  } finally {
    context.setStreamMode?.('requesting')
    context.setResponseLength?.(() => 0)
    context.onCompactProgress?.({ type: 'compact_end' })
    context.setSDKStatus?.(null)
  }
}

/** La dirección declarada por el consumidor, estrechada a las dos que el prompt admite. */
function compactDirectionOf(direction: PartialCompactDirection): CompactDirection {
  return direction === 'up_to' ? 'up_to' : 'from'
}

/**
 * Compacta parcialmente alrededor del índice de mensaje seleccionado.
 * Dirección 'from': resume los mensajes posteriores al índice y conserva los
 *   anteriores. La caché de prompt de los conservados se preserva.
 * Dirección 'up_to': resume los anteriores al índice y conserva los
 *   posteriores. La caché se invalida porque el resumen precede a los
 *   conservados.
 */
export async function partialCompactConversation(
  allMessages: Message[],
  pivotIndex: number,
  context: ToolUseContext,
  cacheSafeParams: CacheSafeParams,
  userFeedback?: string,
  direction: PartialCompactDirection = 'from',
): Promise<CompactionResult> {
  try {
    const compactDirection = compactDirectionOf(direction)
    const messagesToSummarize =
      compactDirection === 'up_to' ? allMessages.slice(0, pivotIndex) : allMessages.slice(pivotIndex)
    // 'up_to' debe retirar fronteras/resúmenes viejos: en 'up_to' el
    // resumen_B queda ANTES de lo conservado, así que una frontera_A caduca
    // entre lo conservado gana el barrido hacia atrás de
    // findLastCompactBoundaryIndex y descarta el resumen_B.
    // 'from' los conserva: el resumen_B queda DESPUÉS de lo conservado (el
    // barrido sigue funcionando), y retirar un resumen viejo perdería la
    // historia que cubre.
    const messagesToKeep =
      compactDirection === 'up_to'
        ? allMessages
            .slice(pivotIndex)
            .filter(m => m.type !== 'progress' && !isCompactBoundaryMessage(m) && !(m.type === 'user' && m.isCompactSummary))
        : allMessages.slice(0, pivotIndex).filter(m => m.type !== 'progress')

    if (messagesToSummarize.length === 0) {
      throw new Error(
        compactDirection === 'up_to'
          ? 'Nothing to summarize before the selected message.'
          : 'Nothing to summarize after the selected message.',
      )
    }

    const preCompactTokenCount = tokenCountWithEstimation(allMessages)

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'pre_compact',
    })

    context.setSDKStatus?.('compacting')
    const hookResult = await executePreCompactHooks(
      {
        trigger: 'manual',
        customInstructions: null,
      },
      context.abortController.signal,
    )

    // Une las instrucciones de los hooks con el comentario del usuario.
    let customInstructions: string | undefined
    if (hookResult.newCustomInstructions && userFeedback) {
      customInstructions = `${hookResult.newCustomInstructions}\n\nUser context: ${userFeedback}`
    } else if (hookResult.newCustomInstructions) {
      customInstructions = hookResult.newCustomInstructions
    } else if (userFeedback) {
      customInstructions = `User context: ${userFeedback}`
    }

    context.setStreamMode?.('requesting')
    context.setResponseLength?.(() => 0)
    context.onCompactProgress?.({ type: 'compact_start' })

    const compactPrompt = getPartialCompactPrompt(customInstructions, compactDirection)
    const summaryRequest = createUserMessage({
      content: compactPrompt,
    })

    const failureMetadata = {
      preCompactTokenCount,
      direction: compactDirection,
      messagesSummarized: messagesToSummarize.length,
    }

    // El prefijo de 'up_to' acierta la caché directamente; 'from' manda todo
    // (la cola no cachearía). El reintento PTL rompe el prefijo de caché pero
    // desbloquea al usuario (CC-1180).
    let apiMessages = compactDirection === 'up_to' ? messagesToSummarize : allMessages
    let retryCacheSafeParams =
      compactDirection === 'up_to' ? { ...cacheSafeParams, forkContextMessages: messagesToSummarize } : cacheSafeParams
    let summaryResponse: AssistantMessage
    let summary: string | null
    let ptlAttempts = 0
    for (;;) {
      summaryResponse = await streamCompactSummary({
        messages: apiMessages,
        summaryRequest,
        appState: context.getAppState(),
        context,
        preCompactTokenCount,
        cacheSafeParams: retryCacheSafeParams,
      })
      summary = getAssistantMessageText(summaryResponse)
      if (!summary?.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) break

      ptlAttempts++
      const truncated = ptlAttempts <= MAX_PTL_RETRIES ? truncateHeadForPTLRetry(apiMessages, summaryResponse) : null
      if (!truncated) {
        logEvent('tengu_partial_compact_failed', {
          reason: 'prompt_too_long',
          ...failureMetadata,
          ptlAttempts,
        })
        throw new Error(ERROR_MESSAGE_PROMPT_TOO_LONG)
      }
      logEvent('tengu_compact_ptl_retry', {
        attempt: ptlAttempts,
        droppedMessages: apiMessages.length - truncated.length,
        remainingMessages: truncated.length,
        path: 'partial',
      })
      apiMessages = truncated
      retryCacheSafeParams = {
        ...retryCacheSafeParams,
        forkContextMessages: truncated,
      }
    }
    if (!summary) {
      logEvent('tengu_partial_compact_failed', {
        reason: 'no_summary',
        ...failureMetadata,
      })
      throw new Error('Failed to generate conversation summary - response did not contain valid text content')
    } else if (startsWithApiErrorPrefix(summary)) {
      logEvent('tengu_partial_compact_failed', {
        reason: 'api_error',
        ...failureMetadata,
      })
      throw new Error(summary)
    }

    // Guarda el estado de archivos antes de vaciarlo.
    const preCompactReadFileState = cacheToObject(context.readFileState)
    context.readFileState.clear()
    context.loadedNestedMemoryPaths?.clear()
    // A propósito NO se reinicia sentSkillNames — ver compactConversation()
    // (~4K tokens ahorrados por compactación).

    const [fileAttachments, asyncAgentAttachments] = await Promise.all([
      createPostCompactFileAttachments(preCompactReadFileState, context, POST_COMPACT_MAX_FILES_TO_RESTORE, messagesToKeep),
      createAsyncAgentAttachmentsIfNeeded(context),
    ])

    const postCompactFileAttachments: AttachmentMessage[] = [...fileAttachments, ...asyncAgentAttachments]
    const planAttachment = createPlanAttachmentIfNeeded(context.agentId)
    if (planAttachment) {
      postCompactFileAttachments.push(planAttachment)
    }

    // Instrucciones de modo plan si estamos en él.
    const planModeAttachment = await createPlanModeAttachmentIfNeeded(context)
    if (planModeAttachment) {
      postCompactFileAttachments.push(planModeAttachment)
    }

    const skillAttachment = createSkillAttachmentIfNeeded(context.agentId)
    if (skillAttachment) {
      postCompactFileAttachments.push(skillAttachment)
    }

    // Re-anuncia sólo lo que estaba en la parte resumida — messagesToKeep se
    // escanea, así que lo ya anunciado ahí se salta.
    for (const att of getDeferredToolsDeltaAttachment(
      context.options.tools,
      context.options.mainLoopModel,
      messagesToKeep,
      { callSite: 'compact_partial' },
    )) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }
    for (const att of getAgentListingDeltaAttachment(context, messagesToKeep)) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }
    for (const att of getMcpInstructionsDeltaAttachment(
      context.options.mcpClients,
      context.options.tools,
      context.options.mainLoopModel,
      messagesToKeep,
    )) {
      postCompactFileAttachments.push(createAttachmentMessage(att))
    }

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'session_start',
    })
    const hookMessages = await processSessionStartHooks('compact', {
      model: context.options.mainLoopModel,
    })

    const postCompactTokenCount = tokenCountFromLastAPIResponse([summaryResponse])
    const compactionUsage = getTokenUsage(summaryResponse)

    logEvent('tengu_partial_compact', {
      preCompactTokenCount,
      postCompactTokenCount,
      messagesKept: messagesToKeep.length,
      messagesSummarized: messagesToSummarize.length,
      direction: compactDirection,
      hasUserFeedback: !!userFeedback,
      trigger: 'message_selector',
      compactionInputTokens: compactionUsage?.input_tokens,
      compactionOutputTokens: compactionUsage?.output_tokens,
      compactionCacheReadTokens: compactionUsage?.cache_read_input_tokens ?? 0,
      compactionCacheCreationTokens: compactionUsage?.cache_creation_input_tokens ?? 0,
    })

    // Los mensajes de progreso no se registran, así que forkSessionImpl
    // anularía un logicalParentUuid que apunte a uno. Ambas direcciones los
    // saltan.
    const lastPreCompactUuid =
      compactDirection === 'up_to'
        ? allMessages.slice(0, pivotIndex).findLast(m => m.type !== 'progress')?.uuid
        : messagesToKeep.at(-1)?.uuid
    const boundaryMarker = createCompactBoundaryMessage(
      'manual',
      preCompactTokenCount ?? 0,
      lastPreCompactUuid,
      userFeedback,
      messagesToSummarize.length,
    )
    // allMessages y no sólo messagesToSummarize — la unión de conjuntos es
    // idempotente, más simple que rastrear en qué mitad vivía cada
    // herramienta.
    const preCompactDiscovered = extractDiscoveredToolNames(allMessages)
    if (preCompactDiscovered.size > 0) {
      boundaryMarker.compactMetadata.preCompactDiscoveredTools = [...preCompactDiscovered].sort()
    }

    const transcriptPath = getTranscriptPath()
    const summaryMessages: UserMessage[] = [
      createUserMessage({
        content: getCompactUserSummaryMessage(
          summary,
          false,
          transcriptPath,
          messagesToKeep.length > 0,
          undefined,
          summaryMessageDeps,
        ),
        isCompactSummary: true,
        ...(messagesToKeep.length > 0
          ? {
              summarizeMetadata: {
                messagesSummarized: messagesToSummarize.length,
                userContext: userFeedback,
                direction,
              },
            }
          : { isVisibleInTranscriptOnly: true as const }),
      }),
    ]

    if (feature('PROMPT_CACHE_BREAK_DETECTION')) {
      notifyCompaction(context.options.querySource ?? 'compact', context.agentId)
    }
    markPostCompaction()

    // Re-anexa la metadata de sesión (título, etiqueta) para que quede dentro
    // de la ventana de 16KB de cola que readLiteMetadata lee para --resume.
    reAppendSessionMetadata()

    if (feature('KAIROS')) {
      void sessionTranscriptModule?.writeSessionTranscriptSegment(messagesToSummarize)
    }

    context.onCompactProgress?.({
      type: 'hooks_start',
      hookType: 'post_compact',
    })
    const postCompactHookResult = await executePostCompactHooks(
      {
        trigger: 'manual',
        compactSummary: summary,
      },
      context.abortController.signal,
    )

    // 'from': conserva prefijo → la frontera; 'up_to': sufijo → último resumen.
    const anchorUuid =
      compactDirection === 'up_to' ? (summaryMessages.at(-1)?.uuid ?? boundaryMarker.uuid) : boundaryMarker.uuid
    return {
      boundaryMarker: annotateBoundaryWithPreservedSegment(boundaryMarker, anchorUuid, messagesToKeep),
      summaryMessages,
      messagesToKeep,
      attachments: postCompactFileAttachments,
      hookResults: hookMessages,
      userDisplayMessage: postCompactHookResult.userDisplayMessage,
      preCompactTokenCount,
      postCompactTokenCount,
      compactionUsage,
    }
  } catch (error) {
    addErrorNotificationIfNeeded(error, context)
    throw error
  } finally {
    context.setStreamMode?.('requesting')
    context.setResponseLength?.(() => 0)
    context.onCompactProgress?.({ type: 'compact_end' })
    context.setSDKStatus?.(null)
  }
}

function addErrorNotificationIfNeeded(error: unknown, context: Pick<ToolUseContext, 'addNotification'>) {
  if (!hasExactErrorMessage(error, ERROR_MESSAGE_USER_ABORT) && !hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES)) {
    context.addNotification?.({
      key: 'error-compacting-conversation',
      text: 'Error compacting conversation',
      priority: 'immediate',
      color: 'error',
    })
  }
}

export function createCompactCanUseTool(): CanUseToolFn {
  return async () => ({
    behavior: 'deny' as const,
    message: 'Tool use is not allowed during compaction',
    decisionReason: {
      type: 'other' as const,
      reason: 'compaction agent should only produce text summary',
    },
  })
}

type ProviderThinkingConfig = Parameters<typeof queryModelWithStreaming>[0]['thinkingConfig']

/**
 * `queryModelWithStreaming` de este árbol tipa el pensamiento con la forma
 * del runtime heredado, que no conoce `adaptive`; ese modo deja el
 * presupuesto al modelo, así que viaja como `enabled` sin presupuesto.
 */
function toProviderThinkingConfig(config: ToolUseContext['options']['thinkingConfig']): ProviderThinkingConfig {
  switch (config.type) {
    case 'disabled':
      return { type: 'disabled' }
    case 'enabled':
      return { type: 'enabled', budgetTokens: config.budgetTokens }
    case 'adaptive':
      return { type: 'enabled' }
  }
}

/** El proveedor recibe el esfuerzo como cadena; un valor numérico viaja tal cual, en cadena. */
function effortValueForProvider(value: string | number | undefined): string | undefined {
  return typeof value === 'number' ? String(value) : value
}

/** Un evento de streaming, estrechado por forma: el generador del proveedor los emite sin tipo. */
function streamEventOf(value: unknown): { type: string; content_block?: unknown; delta?: unknown } | null {
  if (typeof value !== 'object' || value === null) return null
  if (!('type' in value) || value.type !== 'stream_event') return null
  if (!('event' in value) || typeof value.event !== 'object' || value.event === null) return null
  const event = value.event
  if (!('type' in event) || typeof event.type !== 'string') return null
  return {
    type: event.type,
    content_block: 'content_block' in event ? event.content_block : undefined,
    delta: 'delta' in event ? event.delta : undefined,
  }
}

function blockTypeOf(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('type' in value)) return undefined
  return typeof value.type === 'string' ? value.type : undefined
}

function textDeltaOf(value: unknown): string | undefined {
  if (blockTypeOf(value) !== 'text_delta') return undefined
  if (typeof value !== 'object' || value === null || !('text' in value)) return undefined
  return typeof value.text === 'string' ? value.text : undefined
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'assistant' &&
    'message' in value &&
    typeof value.message === 'object' &&
    value.message !== null
  )
}

async function streamCompactSummary({
  messages,
  summaryRequest,
  appState,
  context,
  preCompactTokenCount,
  cacheSafeParams,
}: {
  messages: Message[]
  summaryRequest: UserMessage
  appState: Awaited<ReturnType<ToolUseContext['getAppState']>>
  context: ToolUseContext
  preCompactTokenCount: number
  cacheSafeParams: CacheSafeParams
}): Promise<AssistantMessage> {
  // Con la compartición de caché activa, el agente bifurcado reutiliza el
  // prefijo cacheado de la conversación principal (system prompt,
  // herramientas, mensajes de contexto). Si falla, cae al streaming normal.
  // Default 3P: true — ver el comentario de tengu_compact_cache_prefix arriba.
  const promptCacheSharingEnabled = getFeatureValue_CACHED_MAY_BE_STALE('tengu_compact_cache_prefix', true)
  // Señales de actividad durante la compactación para que los timeouts de
  // inactividad del WebSocket de sesión remota no tiren la conexión del
  // bridge. La llamada puede tardar 5-10+ s sin que fluya otro mensaje por
  // el transporte. Dos señales: (1) latido PUT /worker vía sessionActivity y
  // (2) re-emitir el estado 'compacting' para que el stream de eventos del
  // SDK siga activo.
  const activityInterval = isSessionActivityTrackingActive()
    ? setInterval(
        (statusSetter?: (status: 'compacting' | null) => void) => {
          sendSessionActivitySignal()
          statusSetter?.('compacting')
        },
        30_000,
        context.setSDKStatus,
      )
    : undefined

  try {
    if (promptCacheSharingEnabled) {
      try {
        // NO fijar maxOutputTokens aquí. La bifurcación se monta sobre la
        // caché del hilo principal mandando parámetros de clave idénticos
        // (system, tools, model, prefijo de mensajes, config de thinking).
        // Fijarlo recortaría budget_tokens vía Math.min(budget,
        // maxOutputTokens-1) en claude.ts, creando un desajuste de thinking
        // que invalida la caché. El streaming de respaldo (abajo) sí puede
        // fijar maxOutputTokensOverride porque no comparte caché.
        const result = await runForkedAgent({
          promptMessages: [summaryRequest],
          cacheSafeParams,
          canUseTool: createCompactCanUseTool(),
          querySource: 'compact',
          forkLabel: 'compact',
          maxTurns: 1,
          skipCacheWrite: true,
          // El abortController del contexto de compactación, para que Esc
          // aborte la bifurcación — la misma señal que el respaldo usa en
          // `signal: context.abortController.signal`.
          overrides: { abortController: context.abortController },
        })
        const assistantMsg = getLastAssistantMessage(result.messages)
        const assistantText = assistantMsg ? getAssistantMessageText(assistantMsg) : null
        // Guarda de isApiErrorMessage: query() captura los errores de API
        // (incluido APIUserAbortError con ESC) y los entrega como mensajes de
        // asistente sintéticos. Sin esta comprobación, una compactación
        // abortada "acierta" con "Request was aborted." como resumen — el
        // texto no empieza por "API Error", así que la guarda
        // startsWithApiErrorPrefix del llamador no lo ve.
        if (assistantMsg && assistantText && !assistantMsg.isApiErrorMessage) {
          // Sin registro de éxito para el texto de error PTL — se devuelve
          // para que el bucle de reintento del llamador lo atrape, pero no
          // es un resumen logrado.
          if (!assistantText.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE)) {
            logEvent('tengu_compact_cache_sharing_success', {
              preCompactTokenCount,
              outputTokens: result.totalUsage.output_tokens,
              cacheReadInputTokens: result.totalUsage.cache_read_input_tokens,
              cacheCreationInputTokens: result.totalUsage.cache_creation_input_tokens,
              cacheHitRate:
                result.totalUsage.cache_read_input_tokens > 0
                  ? result.totalUsage.cache_read_input_tokens /
                    (result.totalUsage.cache_read_input_tokens +
                      result.totalUsage.cache_creation_input_tokens +
                      result.totalUsage.input_tokens)
                  : 0,
            })
          }
          return assistantMsg
        }
        logForDebugging(
          `Compact cache sharing: no text in response, falling back. Response: ${jsonStringify(assistantMsg)}`,
          { level: 'warn' },
        )
        logEvent('tengu_compact_cache_sharing_fallback', {
          reason: 'no_text_response',
          preCompactTokenCount,
        })
      } catch (error) {
        logError(error)
        logEvent('tengu_compact_cache_sharing_fallback', {
          reason: 'error',
          preCompactTokenCount,
        })
      }
    }

    // Streaming normal (respaldo cuando la compartición falla o está apagada).
    const retryEnabled = getFeatureValue_CACHED_MAY_BE_STALE('tengu_compact_streaming_retry', false)
    const maxAttempts = retryEnabled ? MAX_COMPACT_STREAMING_RETRIES : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Estado limpio para el reintento.
      let hasStartedStreaming = false
      let response: AssistantMessage | undefined
      context.setResponseLength?.(() => 0)

      // ¿Está activa la búsqueda de herramientas? Se decide con la lista de
      // herramientas del bucle principal (context.options.tools incluye las
      // MCP fusionadas por useMergedTools) y con las dos mitades síncronas
      // del criterio — ver la cabecera.
      const useToolSearch = isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(context.options.tools)

      // Con búsqueda de herramientas activa se incluyen ToolSearchTool y las
      // MCP: viajan con defer_loading: true y no cuentan contra el contexto
      // — la API las filtra de system_prompt_tools antes de contar tokens.
      // Se filtran las MCP de context.options.tools (no de appState.mcp.tools)
      // para tomar el conjunto ya filtrado por permisos de useMergedTools.
      // Se deduplica por nombre para evitar errores de API cuando una MCP
      // comparte nombre con una herramienta interna.
      const tools: Tool[] = useToolSearch
        ? uniqBy([FileReadTool, ToolSearchTool, ...context.options.tools.filter(t => t.isMcp)], 'name')
        : [FileReadTool]

      const apiMessages = normalizeMessagesForAPI(
        stripImagesFromMessages(stripReinjectedAttachments([...getMessagesAfterCompactBoundary(messages), summaryRequest])),
        [...context.options.tools],
      )
      const streamingGen = queryModelWithStreaming({
        // El normalizador devuelve la forma mínima del bucle; sus elementos
        // son los mismos `Message` que entraron.
        messages: apiMessages as Message[],
        systemPrompt: cacheSafeParams.systemPrompt,
        thinkingConfig: toProviderThinkingConfig(context.options.thinkingConfig),
        tools,
        signal: context.abortController.signal,
        options: {
          async getToolPermissionContext() {
            const appState = context.getAppState()
            return appState.toolPermissionContext
          },
          model: context.options.mainLoopModel,
          toolChoice: undefined,
          isNonInteractiveSession: context.options.isNonInteractiveSession,
          hasAppendSystemPrompt: !!context.options.appendSystemPrompt,
          maxOutputTokensOverride: Math.min(COMPACT_MAX_OUTPUT_TOKENS, getMaxOutputTokensForModel(context.options.mainLoopModel)),
          querySource: 'compact',
          agents: context.options.agentDefinitions.activeAgents,
          mcpTools: [],
          effortValue: effortValueForProvider(appState.effortValue),
        },
      })
      const streamIter = streamingGen[Symbol.asyncIterator]()
      let next = await streamIter.next()

      while (!next.done) {
        const event = next.value
        const streamEvent = streamEventOf(event)

        if (
          !hasStartedStreaming &&
          streamEvent !== null &&
          streamEvent.type === 'content_block_start' &&
          blockTypeOf(streamEvent.content_block) === 'text'
        ) {
          hasStartedStreaming = true
          context.setStreamMode?.('responding')
        }

        if (streamEvent !== null && streamEvent.type === 'content_block_delta') {
          const text = textDeltaOf(streamEvent.delta)
          if (text !== undefined) {
            const charactersStreamed = text.length
            context.setResponseLength?.(length => length + charactersStreamed)
          }
        }

        if (isAssistantMessage(event)) {
          response = event
        }

        next = await streamIter.next()
      }

      if (response) {
        return response
      }

      if (attempt < maxAttempts) {
        logEvent('tengu_compact_streaming_retry', {
          attempt,
          preCompactTokenCount,
          hasStartedStreaming,
        })
        await sleep(getRetryDelay(attempt), context.abortController.signal, {
          abortError: () => new APIUserAbortError(),
        })
        continue
      }

      logForDebugging(`Compact streaming failed after ${attempt} attempts. hasStartedStreaming=${hasStartedStreaming}`, {
        level: 'error',
      })
      logEvent('tengu_compact_failed', {
        reason: 'no_streaming_response',
        preCompactTokenCount,
        hasStartedStreaming,
        retryEnabled,
        attempts: attempt,
        promptCacheSharingEnabled,
      })
      throw new Error(ERROR_MESSAGE_INCOMPLETE_RESPONSE)
    }

    // No debería alcanzarse por el throw de arriba, pero TypeScript lo necesita.
    throw new Error(ERROR_MESSAGE_INCOMPLETE_RESPONSE)
  } finally {
    clearInterval(activityInterval)
  }
}

/**
 * Re-adjunta los archivos recientes tras la compactación con FileReadTool
 * (contenido fresco, validación propia). Se eligen por recencia; acotados
 * por número de archivos y presupuesto de tokens. Los que ya están en los
 * resultados de Read de `preservedMessages` se saltan — re-inyectarlos es
 * puro desperdicio (25K tok/compact ahorrados).
 */
export async function createPostCompactFileAttachments(
  readFileState: Record<string, { content: string; timestamp: number }>,
  toolUseContext: ToolUseContext,
  maxFiles: number,
  preservedMessages: Message[] = [],
): Promise<AttachmentMessage[]> {
  const preservedReadPaths = collectReadToolFilePaths(preservedMessages)
  const recentFiles = Object.entries(readFileState)
    .map(([filename, state]) => ({ filename, ...state }))
    .filter(
      file =>
        !shouldExcludeFromPostCompactRestore(file.filename, toolUseContext.agentId) &&
        !preservedReadPaths.has(expandPath(file.filename)),
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxFiles)

  const results = await Promise.all(
    recentFiles.map(async file => {
      const attachment = await generateFileAttachment(
        file.filename,
        {
          ...toolUseContext,
          fileReadingLimits: {
            maxTokens: POST_COMPACT_MAX_TOKENS_PER_FILE,
          },
        },
        'tengu_post_compact_file_restore_success',
        'tengu_post_compact_file_restore_error',
        'compact',
      )
      return attachment ? createAttachmentMessage(attachment) : null
    }),
  )

  let usedTokens = 0
  return results.filter((result): result is AttachmentMessage => {
    if (result === null) {
      return false
    }
    const attachmentTokens = roughTokenCountEstimation(jsonStringify(result))
    if (usedTokens + attachmentTokens <= POST_COMPACT_TOKEN_BUDGET) {
      usedTokens += attachmentTokens
      return true
    }
    return false
  })
}

/**
 * Crea un adjunto con el archivo de plan si existe uno para la sesión
 * actual, para que el plan sobreviva a la compactación.
 */
export function createPlanAttachmentIfNeeded(agentId?: AgentId): AttachmentMessage | null {
  const planContent = getPlan(agentId)

  if (!planContent) {
    return null
  }

  const planFilePath = getPlanFilePath(agentId)

  return createAttachmentMessage({
    type: 'plan_file_reference',
    planFilePath,
    planContent,
  })
}

/**
 * Crea un adjunto con las skills invocadas para conservar su contenido a
 * través de la compactación. Sólo incluye las skills del agente dado (o de
 * la sesión principal cuando agentId es null/undefined), para que sus
 * instrucciones sigan disponibles tras resumir sin filtrar skills de otros
 * contextos de agente.
 */
export function createSkillAttachmentIfNeeded(agentId?: string): AttachmentMessage | null {
  const invokedSkills = getInvokedSkillsForAgent(agentId)

  if (invokedSkills.size === 0) {
    return null
  }

  // Ordenadas de más reciente a más antigua, para que la presión de
  // presupuesto descarte las menos relevantes. La truncación por skill
  // conserva la cabecera de cada archivo (donde suelen vivir las
  // instrucciones de uso) en vez de descartar skills enteras.
  let usedTokens = 0
  const skills = Array.from(invokedSkills.values())
    .sort((a, b) => b.invokedAt - a.invokedAt)
    .map(skill => ({
      name: skill.skillName,
      path: skill.skillPath,
      content: truncateToTokens(skill.content, POST_COMPACT_MAX_TOKENS_PER_SKILL),
    }))
    .filter(skill => {
      const tokens = roughTokenCountEstimation(skill.content)
      if (usedTokens + tokens > POST_COMPACT_SKILLS_TOKEN_BUDGET) {
        return false
      }
      usedTokens += tokens
      return true
    })

  if (skills.length === 0) {
    return null
  }

  return createAttachmentMessage({
    type: 'invoked_skills',
    skills,
  })
}

/**
 * Crea un adjunto plan_mode si el usuario está en modo plan, para que el
 * modelo siga operando en modo plan tras la compactación (si no, perdería
 * las instrucciones de modo plan, que normalmente sólo se inyectan en los
 * turnos con uso de herramientas vía getAttachmentMessages).
 */
export async function createPlanModeAttachmentIfNeeded(context: ToolUseContext): Promise<AttachmentMessage | null> {
  const appState = context.getAppState()
  if (appState.toolPermissionContext.mode !== 'plan') {
    return null
  }

  const planFilePath = getPlanFilePath(context.agentId)
  const planExists = getPlan(context.agentId) !== null

  return createAttachmentMessage({
    type: 'plan_mode',
    reminderType: 'full',
    isSubAgent: !!context.agentId,
    planFilePath,
    planExists,
  })
}

/**
 * Crea adjuntos por los agentes asíncronos para que el modelo sepa de ellos
 * tras la compactación. Cubre los que siguen corriendo en segundo plano (para
 * que el modelo no lance un duplicado) y los que terminaron pero cuyo
 * resultado no se ha recogido.
 */
export async function createAsyncAgentAttachmentsIfNeeded(context: ToolUseContext): Promise<AttachmentMessage[]> {
  const appState = context.getAppState()
  const asyncAgents = Object.values(appState.tasks).filter(
    (task): task is LocalAgentTaskState => task.type === 'local_agent',
  )

  return asyncAgents.flatMap(agent => {
    if (agent.retrieved || agent.status === 'pending' || agent.agentId === context.agentId) {
      return []
    }
    return [
      createAttachmentMessage({
        type: 'task_status',
        taskId: agent.agentId,
        taskType: 'local_agent',
        description: agent.description,
        status: agent.status,
        deltaSummary: agent.status === 'running' ? (agent.progress?.summary ?? null) : (agent.error ?? null),
        outputFilePath: getTaskOutputPath(agent.agentId),
      }),
    ]
  })
}

/**
 * Recorre los mensajes buscando bloques tool_use de Read y recoge sus
 * file_path (normalizados con expandPath). Sirve para no re-inyectar tras
 * compactar lo que ya está visible en la cola conservada.
 *
 * Salta los Read cuyo tool_result es un stub de deduplicación — el stub
 * apunta a un Read completo anterior que puede haberse compactado, así que
 * createPostCompactFileAttachments debe re-inyectar el contenido real.
 */
function collectReadToolFilePaths(messages: Message[]): Set<string> {
  const stubIds = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'user' || !Array.isArray(message.message.content)) {
      continue
    }
    for (const block of message.message.content) {
      if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.startsWith(FILE_UNCHANGED_STUB)) {
        stubIds.add(block.tool_use_id)
      }
    }
  }

  const paths = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'assistant' || !Array.isArray(message.message.content)) {
      continue
    }
    for (const block of message.message.content) {
      if (block.type !== 'tool_use' || block.name !== FILE_READ_TOOL_NAME || stubIds.has(block.id)) {
        continue
      }
      const input = block.input
      if (input && typeof input === 'object' && 'file_path' in input && typeof input.file_path === 'string') {
        paths.add(expandPath(input.file_path))
      }
    }
  }
  return paths
}

const SKILL_TRUNCATION_MARKER =
  '\n\n[... skill content truncated for compaction; use Read on the skill path if you need the full text]'

/**
 * Trunca el contenido a unos maxTokens conservando la cabecera.
 * roughTokenCountEstimation usa ~4 chars/token (su bytesPerToken por
 * defecto), así que el presupuesto en caracteres es maxTokens * 4 menos el
 * marcador, para que el resultado quede dentro del presupuesto. El marcador
 * le dice al modelo que puede leer el archivo completo si hace falta.
 */
function truncateToTokens(content: string, maxTokens: number): string {
  if (roughTokenCountEstimation(content) <= maxTokens) {
    return content
  }
  const charBudget = maxTokens * 4 - SKILL_TRUNCATION_MARKER.length
  return content.slice(0, charBudget) + SKILL_TRUNCATION_MARKER
}

function shouldExcludeFromPostCompactRestore(filename: string, agentId?: AgentId): boolean {
  const normalizedFilename = expandPath(filename)
  // Excluye los archivos de plan.
  try {
    const planFilePath = expandPath(getPlanFilePath(agentId))
    if (normalizedFilename === planFilePath) {
      return true
    }
  } catch {
    // Sin ruta de plan, siguen las demás comprobaciones.
  }

  // Excluye todos los tipos de archivo claude.md.
  // TODO: usar isMemoryFilePath() de claudemd.ts por coherencia y para
  // cubrir también los archivos de memoria de directorios hijos
  // (.claude/rules/*.md, etc.).
  try {
    const normalizedMemoryPaths = new Set(MEMORY_TYPE_VALUES.map(type => expandPath(getMemoryPath(type))))

    if (normalizedMemoryPaths.has(normalizedFilename)) {
      return true
    }
  } catch {
    // Sin rutas de memoria, se sigue.
  }

  return false
}
