/**
 * Clasificador basado en LLM — `ant 3921.js` kp7().
 *
 * Llama a Haiku (el modelo chico y rápido) con un system prompt que le
 * pide clasificar la cola de salida del worker en {state, detail, tempo,
 * needs?, output?}. Reintenta 2 veces. Cae a la heurística ante apiError.
 *
 * Reusa el `queryModelWithoutStreaming` existente de ccb → respeta la
 * configuración OAuth/api-key/Bedrock/Vertex existente del usuario sin
 * duplicar auth específica del daemon.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/classifier/llmClient.ts`. La
 * maquinaria real de invocación al modelo (`queryModelWithoutStreaming`,
 * `getSmallFastModel`, etc.) vive detrás de puntos de inyección en
 * `../internal/pendingCrossPackageDeps.js` — ver ese archivo para la
 * cita completa de origen y la condición de retiro.
 */

import { APIUserAbortError } from '@anthropic-ai/sdk'
import {
  type ClassifierResult,
  type WorkerState,
  LLM_TAIL_CHARS,
  truncate,
} from './state.js'
import {
  closingShape,
  fallbackHeuristic,
  mergeWithPrev,
  parseLlmJson,
  preClassify,
} from './heuristic.js'
import { CLASSIFIER_SYSTEM_PROMPT } from './systemPrompt.js'
import {
  asSystemPrompt,
  createUserMessage,
  getAssistantMessageText,
  getEmptyToolPermissionContext,
  getSmallFastModel,
  queryModelWithoutStreaming,
} from '../internal/pendingCrossPackageDeps.js'

interface LlmClassifyArgs {
  /** Texto completo de salida del worker (típicamente el ring buffer unido). */
  text: string
  /** Estado previo del clasificador (guía "pegajosa" para el LLM). */
  prevState: WorkerState
  /** Último prompt de usuario verbatim (para "qué se pidió"). */
  latestAsk?: string
  /** Resumen compacto de llamadas a herramientas recientes (p. ej. "Read×3, Bash×2"). */
  toolSummary?: string
  /** Minutos transcurridos en prevState. */
  minsInState: number
  /** Fuerza el motor: 'preclassify' sólo usa em7; 'heuristic' usa J08; 'llm' llama a Haiku. */
  engine: 'preclassify' | 'heuristic' | 'llm'
  signal?: AbortSignal
}

export interface LlmClassifyOutcome extends ClassifierResult {
  /** Motor realmente usado (puede diferir del pedido si hubo salida temprana). */
  engine: 'preclassify' | 'heuristic' | 'llm' | 'apiError'
  attempts: number
  durationMs: number
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number }
}

function buildUserPrompt(
  text: string,
  prev: WorkerState,
  latestAsk: string | undefined,
  toolSummary: string | undefined,
  minsInState: number,
): string {
  const tail = text.slice(-LLM_TAIL_CHARS)
  const askBlock = latestAsk ? `\nUser's most recent ask: "${latestAsk}"` : ''
  return `Current state: ${prev} (for ${minsInState}m)\nTool calls so far: ${toolSummary || 'none'}${askBlock}\n\nAssistant message tail (last ${tail.length} chars):\n${tail}`
}

/**
 * Corre el pipeline completo: preclassify → fallback heurístico → LLM si
 * engine='llm'.
 *
 * El orchestrator normalmente pide engine='llm', que igual intenta
 * preclassify primero como camino rápido; engine='heuristic' se salta el
 * LLM por completo (se usa cuando el gate GB está apagado o el LLM no
 * está disponible).
 */
export async function classify(args: LlmClassifyArgs): Promise<LlmClassifyOutcome> {
  const start = Date.now()
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  const pre = preClassify(args.text)

  if (pre) {
    return {
      ...pre,
      engine: 'preclassify',
      attempts: 0,
      durationMs: Date.now() - start,
      tokens,
    }
  }

  if (args.engine === 'heuristic') {
    const fb = fallbackHeuristic(args.text)
    return { ...fb, engine: 'heuristic', attempts: 0, durationMs: Date.now() - start, tokens }
  }

  // Ruta LLM
  let attempts = 0
  let parsed: Record<string, unknown> | null = null
  try {
    const userPrompt = buildUserPrompt(args.text, args.prevState, args.latestAsk, args.toolSummary, args.minsInState)
    const userMsg = createUserMessage({ content: userPrompt })
    for (let i = 0; i < 2 && !parsed; i++) {
      attempts++
      const response = await queryModelWithoutStreaming({
        messages: [userMsg],
        systemPrompt: asSystemPrompt([CLASSIFIER_SYSTEM_PROMPT]),
        thinkingConfig: { type: 'disabled' },
        tools: [],
        signal: args.signal ?? new AbortController().signal,
        options: {
          getToolPermissionContext: () => getEmptyToolPermissionContext(),
          model: getSmallFastModel(),
          toolChoice: undefined,
          isNonInteractiveSession: true,
          hasAppendSystemPrompt: false,
          agents: [],
          querySource: 'bg_classifier',
          mcpTools: [],
          skipCacheWrite: true,
        },
      })
      if (response.isApiErrorMessage) continue
      // Suma el usage si viene.
      const usage = response.message?.usage
      if (usage) {
        tokens.input += usage.input_tokens ?? 0
        tokens.output += usage.output_tokens ?? 0
        tokens.cacheRead += usage.cache_read_input_tokens ?? 0
        tokens.cacheCreation += usage.cache_creation_input_tokens ?? 0
      }
      const text = getAssistantMessageText(response).trim()
      if (!text) continue
      parsed = parseLlmJson(text)
    }
  } catch (e) {
    if (e instanceof APIUserAbortError) {
      const fb = fallbackHeuristic(args.text)
      return { ...fb, engine: 'apiError', branch: 'aborted', attempts, durationMs: Date.now() - start, tokens }
    }
    const fb = fallbackHeuristic(args.text)
    return { ...fb, engine: 'apiError', branch: `error: ${(e as Error).message?.slice(0, 80) ?? 'unknown'}`, attempts, durationMs: Date.now() - start, tokens }
  }
  if (!parsed) {
    const fb = fallbackHeuristic(args.text)
    return { ...fb, engine: 'apiError', branch: 'no-parse', attempts, durationMs: Date.now() - start, tokens }
  }
  const merged = mergeWithPrev(parsed, args.prevState, null)
  return {
    state: merged.state,
    detail: truncate(merged.detail),
    tempo: merged.tempo,
    needs: merged.needs ? truncate(merged.needs) : undefined,
    output: merged.output,
    source: 'llm',
    branch: 'llm-ok',
    engine: 'llm',
    attempts,
    durationMs: Date.now() - start,
    tokens,
  }
}

/** Re-exportado para que el orchestrator use la forma de cierre en su metadata. */
export { closingShape }
