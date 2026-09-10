/**
 * Mapeo de forma interna (Anthropic, camelCase) al contrato de salida del
 * SDK (snake_case) — porte de `ccnmt: packages/agent/internal/sdkMappers.ts`.
 *
 * `toSDKCompactMetadata` traduce las claves de la metadata de compactación;
 * `localCommandOutputToSDKAssistantMessage` envuelve la salida cruda de un
 * comando local (que puede traer color ANSI y las etiquetas propias del
 * runner) en un mensaje de assistant sintético con la forma que el SDK
 * espera.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `stripAnsi` del
 * paquete `strip-ansi` y `NO_CONTENT_MESSAGE` de un
 * `constants/messages.ts` propio. Ninguno de los dos vive en este árbol —
 * `strip-ansi` no está en las dependencias declaradas del paquete, y el
 * segundo no tiene otro consumidor todavía (mismo criterio que
 * `messageShapes.ts`: se porta cuando lo tenga). Aquí ambos se reimplementan
 * localmente y acotados a lo que este módulo necesita: `stripAnsiCodes` sólo
 * cubre secuencias CSI (`ESC [ ... letra`), que es lo único que el runner
 * de comandos locales emite.
 */

/** El centinela cuando, tras limpiar, no queda contenido que mostrar. */
const NO_CONTENT_MESSAGE = '(no content)'

const SYNTHETIC_MODEL = '<synthetic>'

/** Secuencias CSI: ESC seguido de "[", parámetros numéricos/`;`, y una letra final. */
const ANSI_CSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g

function stripAnsiCodes(text: string): string {
  return text.replace(ANSI_CSI_PATTERN, '')
}

type PreservedSegment = {
  headUuid: string
  anchorUuid: string
  tailUuid: string
}

type CompactMetadata = {
  trigger?: unknown
  preTokens?: unknown
  preservedSegment?: PreservedSegment
}

type SDKCompactMetadata = {
  trigger?: unknown
  pre_tokens?: unknown
  preserved_segment?: {
    head_uuid: string
    anchor_uuid: string
    tail_uuid: string
  }
}

type SDKAssistantMessage = {
  type: 'assistant'
  content: Array<{ type: 'text'; text: string }>
  message: {
    id: string
    model: string
    role: 'assistant'
    content: Array<{ type: 'text'; text: string }>
    stop_reason: 'end_turn'
    usage: {
      input_tokens: number
      output_tokens: number
    }
  }
  parent_tool_use_id: null
  session_id: string
  uuid: string
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
): SDKAssistantMessage {
  const cleanContent = stripAnsiCodes(rawContent)
    .replace(new RegExp(`<${stdoutTag}>([\\s\\S]*?)</${stdoutTag}>`), '$1')
    .replace(new RegExp(`<${stderrTag}>([\\s\\S]*?)</${stderrTag}>`), '$1')
    .trim()

  const content = [
    {
      type: 'text' as const,
      text: cleanContent === '' ? NO_CONTENT_MESSAGE : cleanContent,
    },
  ]

  return {
    type: 'assistant',
    content,
    message: {
      id: `synthetic-${uuid}`,
      model: SYNTHETIC_MODEL,
      role: 'assistant',
      content,
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid,
  }
}
