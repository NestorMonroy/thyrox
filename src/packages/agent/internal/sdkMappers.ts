import type {
  BetaContentBlock,
  BetaTextBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type {
  SDKAssistantMessage,
  SDKCompactBoundaryMessage,
} from '@thyrox/headless-sdk/agentSdkTypes.js'
import stripAnsi from 'strip-ansi'
import type { CompactMetadata } from '../messageShapes.js'
import { NO_CONTENT_MESSAGE } from '../constants/messages.js'

const SYNTHETIC_MODEL = '<synthetic>'

type SDKCompactMetadata = SDKCompactBoundaryMessage['compact_metadata']

/**
 * El mensaje sintético lleva además `content` en la raíz, como el de la
 * fuente (`ccnmt: messages/mappers.ts`), que el esquema del SDK no declara.
 */
type SyntheticSDKAssistantMessage = SDKAssistantMessage & {
  content: Array<BetaContentBlock>
}

export function toSDKCompactMetadata(
  meta: CompactMetadata,
): SDKCompactMetadata {
  const seg = meta.preservedSegment
  return {
    trigger: meta.trigger,
    pre_tokens: meta.preTokens,
    ...(seg
      ? {
          preserved_segment: {
            head_uuid: seg.headUuid,
            anchor_uuid: seg.anchorUuid,
            tail_uuid: seg.tailUuid,
          },
        }
      : {}),
  }
}

export function localCommandOutputToSDKAssistantMessage(
  rawContent: string,
  uuid: string,
  sessionId: string,
  stdoutTag: string,
  stderrTag: string,
): SyntheticSDKAssistantMessage {
  const cleanContent = stripAnsi(rawContent)
    .replace(
      new RegExp(`<${stdoutTag}>([\\s\\S]*?)</${stdoutTag}>`),
      '$1',
    )
    .replace(
      new RegExp(`<${stderrTag}>([\\s\\S]*?)</${stderrTag}>`),
      '$1',
    )
    .trim()

  const content: BetaTextBlock[] = [
    {
      type: 'text',
      text: cleanContent === '' ? NO_CONTENT_MESSAGE : cleanContent,
      citations: [],
    },
  ]

  // Los campos anulables en `null` y los contadores en 0, como el mensaje
  // sintético que 2.1.281 arma para el SDK; `diagnostics` y
  // `fallback_credit` los exige la versión del SDK de este árbol.
  return {
    type: 'assistant',
    content,
    message: {
      id: `synthetic-${uuid}`,
      type: 'message',
      model: SYNTHETIC_MODEL,
      role: 'assistant',
      content,
      container: null,
      context_management: null,
      diagnostics: null,
      stop_details: null,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: null,
        fallback_credit: null,
        inference_geo: null,
        iterations: null,
        output_tokens_details: null,
        server_tool_use: null,
        service_tier: null,
        speed: null,
      },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid,
  }
}
