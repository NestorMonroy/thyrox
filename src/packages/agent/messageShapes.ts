// La jerarquia canonica de tipos de Message del bucle conversacional del
// agente. Porte COMPLETO de `ccnmt: packages/agent/messageShapes.ts` (43
// exports): hasta TASK-THYROX-0233 este archivo era un porte MINIMO de 9
// exports que declaraba dos divergencias por ausencia, y las dos habian
// caducado —el censo de divergencia rancia las marco STALE—:
//
//   - `@anthropic-ai/sdk` esta declarado en el manifiesto de este paquete
//     (^0.124.0) y materializado en la raiz del workspace;
//   - `tool-registry/tools/shared/gitOperationTracking` existe en el arbol y
//     exporta los tres tipos que la fuente toma de el.
//
// DIVERGENCIA DECLARADA, una sola: la fuente importa de `'crypto'` y aqui se
// importa de `'node:crypto'`. Es el mismo modulo con el prefijo explicito que
// distingue un builtin de un paquete de npm homonimo; no cambia el tipo.
import type { UUID } from 'node:crypto'
import type {
  ContentBlockParam,
  ContentBlock,
} from '@anthropic-ai/sdk/resources/index.mjs'
import type { BetaUsage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type {
  BranchAction,
  CommitKind,
  PrAction,
} from '@thyrox/tool-registry/tools/shared/gitOperationTracking.js'

/**
 * Tipo base de mensaje, con el campo discriminante `type` y sus propiedades
 * comunes. Cada subtipo (UserMessage, AssistantMessage, …) lo extiende con un
 * literal de `type` mas estrecho y sus campos propios.
 */
export type MessageType = 'user' | 'assistant' | 'system' | 'attachment' | 'progress' | 'grouped_tool_use' | 'collapsed_read_search'

/** Un elemento de contenido dentro de los arreglos `message.content`. */
export type ContentItem = ContentBlockParam | ContentBlock

export type MessageContent = string | ContentBlockParam[] | ContentBlock[]

/**
 * Arreglo de contenido tipado — se usa en los subtipos estrechados para que
 * `message.content[0]` resuelva a `ContentItem` y no a
 * `string | ContentBlockParam | ContentBlock`.
 */
export type TypedMessageContent = ContentItem[]

export type Message = {
  type: MessageType
  uuid: UUID
  isMeta?: boolean
  isCompactSummary?: boolean
  toolUseResult?: unknown
  isVisibleInTranscriptOnly?: boolean
  attachment?: { type: string; toolUseID?: string; [key: string]: unknown }
  message?: {
    role?: string
    id?: string
    content?: MessageContent
    usage?: BetaUsage | Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * DIVERGENCIA DECLARADA, y su causa es el TOOLCHAIN, no la forma: la fuente
 * declara `AssistantMessage = Message & { type: 'assistant' }` y deja
 * `message` opcional, porque su raiz compila con `strict: false`
 * (`ccnmt: tsconfig.json`). Sus propios consumidores leen
 * `assistantMessage.message.content` sin guarda — legal ahi, TS18048 aqui.
 *
 * Este arbol compila con `strict: true`, asi que el opcional heredado
 * obligaria a sembrar `?.` en cada consumidor: ruido que la fuente no tiene
 * y que no describe ningun hecho del protocolo — un mensaje de asistente
 * SIEMPRE lleva `message`, es la respuesta del API. Se estrecha a requerido.
 * Mismo desenlace que TASK-THYROX-0228 ya fijo para `AppStateLike`.
 */
export type AssistantMessage = Message & {
  type: 'assistant'
  message: {
    role?: string
    id?: string
    content?: MessageContent
    usage?: BetaUsage | Record<string, unknown>
    [key: string]: unknown
  }
}
/**
 * El parametro de tipo lleva guion bajo, y es DIVERGENCIA DE IDENTIFICADOR, no
 * de forma: la fuente lo llama `T` y no lo usa en el cuerpo del alias. Aqui la
 * raiz declara `noUnusedParameters: true`, asi que `T` dispara TS6133 — medido
 * por sonda, `_T` no, y un consumidor sigue pudiendo escribir
 * `AttachmentMessage<AgentMentionAttachment>` porque el parametro se pasa por
 * POSICION, no por nombre. Retirarlo del todo SI romperia: hay tres
 * consumidores que lo parametrizan, en este arbol y en la fuente
 * (`repl/src/uiHelpers/groupToolUses.ts`,
 * `repl/src/processUserInput/processUserInput.ts`).
 */
export type AttachmentMessage<_T = unknown> = Message & { type: 'attachment'; attachment: { type: string; [key: string]: unknown } }
export type ProgressMessage<T = unknown> = Message & { type: 'progress'; data: T }
export type SystemLocalCommandMessage = Message & { type: 'system' }
export type SystemMessage = Message & { type: 'system' }
/**
 * DIVERGENCIA DECLARADA, misma clase y misma direccion que `AssistantMessage`
 * de arriba (TASK-THYROX-0228/0233): la fuente deja `message` opcional porque
 * su raiz compila con `strict: false`, y sus propios consumidores leen
 * `userMessage.message.content` sin guarda — `normalizeMessages` lo hace tres
 * veces. Un mensaje de usuario SIEMPRE lleva `message`: es su carga util, y el
 * unico sitio que lo construye (`createUserMessage`) lo asigna incondicional.
 * Se estrecha a requerido en vez de sembrar `?.` en cada consumidor.
 */
export type UserMessage = Message & {
  type: 'user'
  message: {
    role?: string
    id?: string
    content?: MessageContent
    usage?: BetaUsage | Record<string, unknown>
    [key: string]: unknown
  }
}
/** Un mensaje de usuario tras `normalizeMessages`: un bloque, en arreglo. */
export type NormalizedUserMessage = UserMessage & {
  message: UserMessage['message'] & { content: ContentItem[] }
}
export type RequestStartEvent = { type: string; [key: string]: unknown }
export type StreamEvent = { type: string; [key: string]: unknown }

/**
 * Marcador de frontera de compactacion en el transcript. Su
 * `preservedSegment` nombra los tres extremos del tramo que la compactacion
 * conserva: cabeza, cola y ancla. Lo consume `isCompactBoundaryMessage`, que
 * a su vez consume `storage/sessionStorage.ts` para no volver a compactar lo
 * ya compactado. Refs: TASK-GEN-0011 (la cita heredada decia
 * `TASK-THYROX-0199`, que en el store nombra otro sujeto — el ordinal
 * del board se habia citado como si fuera durable).
 */
export type SystemCompactBoundaryMessage = Message & {
  type: 'system'
  compactMetadata: {
    preservedSegment?: {
      headUuid: UUID
      tailUuid: UUID
      anchorUuid: UUID
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

export type TombstoneMessage = Message
export type ToolUseSummaryMessage = Message
export type MessageOrigin = string
export type CompactMetadata = Record<string, unknown>
export type SystemAPIErrorMessage = Message & { type: 'system' }
export type SystemFileSnapshotMessage = Message & { type: 'system' }
/** Un mensaje del asistente tras `normalizeMessages`: un bloque, en arreglo. */
export type NormalizedAssistantMessage<_T = unknown> = AssistantMessage & {
  message: AssistantMessage['message'] & { content: ContentItem[] }
}
/**
 * Un mensaje tras `normalizeMessages`: un bloque por mensaje, así que su
 * `content`, cuando hay `message`, es SIEMPRE un arreglo de bloques. El alias
 * plano a `Message` (`content` cadena u opcional) obligaba a los consumidores
 * de la vista (`Messages.tsx`: `filterForBriefTool`, `dropTextInBriefTurns`)
 * a recibir una forma más ancha que la que el normalizador produce.
 */
export type NormalizedMessage = Message & {
  message?: NonNullable<Message['message']> & { content: ContentItem[] }
}
export type PartialCompactDirection = string

export type StopHookInfo = {
  command?: string
  durationMs?: number
  [key: string]: unknown
}

export type SystemAgentsKilledMessage = Message & { type: 'system' }
export type SystemApiMetricsMessage = Message & { type: 'system' }
export type SystemAwaySummaryMessage = Message & { type: 'system' }
export type SystemBridgeStatusMessage = Message & { type: 'system' }
export type SystemInformationalMessage = Message & { type: 'system' }
export type SystemMemorySavedMessage = Message & { type: 'system' }
export type SystemMessageLevel = string
export type SystemMicrocompactBoundaryMessage = Message & { type: 'system' }
export type SystemPermissionRetryMessage = Message & { type: 'system' }
export type SystemScheduledTaskFireMessage = Message & { type: 'system' }

/**
 * DIVERGENCIA DECLARADA, y la causa es el TOOLCHAIN — misma clase que
 * `AssistantMessage` de arriba (TASK-THYROX-0228/0233), pero en la direccion
 * CONTRARIA: alla se estrecho a requerido, aqui se ensancha a opcional.
 *
 * La fuente se contradice a si misma y `strict: false` se lo tolera: declara
 * `hookLabel: string` REQUERIDO en esta forma, y su unico constructor
 * (`createStopHookSummaryMessage`) lo recibe `hookLabel?: string` OPCIONAL y
 * lo asigna tal cual. Bajo `strict: true` eso es TS2322 en el propio puerto.
 *
 * La direccion la decide el codigo, no la preferencia: los SEIS consumidores
 * del campo ya lo guardan —`!message.hookLabel`, `?? 'stop'`, `?? 'Stop'`, y
 * sobre todo `collapseHookSummaries.ts:12`, que declara el type guard
 * `msg.hookLabel !== undefined`—. Ese guard seria codigo muerto si el campo
 * fuera requerido. El protocolo NO garantiza el rotulo: un hook sin etiqueta
 * es un caso real que el constructor admite.
 */
export type SystemStopHookSummaryMessage = Message & {
  type: 'system'
  subtype: string
  hookLabel?: string
  hookCount: number
  totalDurationMs?: number
  hookInfos: StopHookInfo[]
}

export type SystemTurnDurationMessage = Message & { type: 'system' }

export type GroupedToolUseMessage = Message & {
  type: 'grouped_tool_use'
  toolName: string
  messages: NormalizedAssistantMessage[]
  results: NormalizedUserMessage[]
  displayMessage: NormalizedAssistantMessage | NormalizedUserMessage
}

// Lo que la vista pinta sale de `applyGrouping` sobre mensajes YA normalizados.
export type RenderableMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | (Message & { type: 'system' })
  | (Message & { type: 'attachment'; attachment: { type: string; memories?: { path: string; content: string; mtimeMs: number }[]; [key: string]: unknown } })
  | (Message & { type: 'progress' })
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

export type CollapsibleMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | GroupedToolUseMessage

export type CollapsedReadSearchGroup = {
  type: 'collapsed_read_search'
  uuid: UUID
  timestamp?: unknown
  searchCount: number
  readCount: number
  listCount: number
  replCount: number
  memorySearchCount: number
  memoryReadCount: number
  memoryWriteCount: number
  readFilePaths: string[]
  searchArgs: string[]
  latestDisplayHint?: string
  messages: CollapsibleMessage[]
  displayMessage: CollapsibleMessage
  mcpCallCount?: number
  mcpServerNames?: string[]
  bashCount?: number
  gitOpBashCount?: number
  commits?: { sha: string; kind: CommitKind }[]
  pushes?: { branch: string }[]
  branches?: { ref: string; action: BranchAction }[]
  prs?: { number: number; url?: string; action: PrAction }[]
  hookTotalMs?: number
  hookCount?: number
  hookInfos?: StopHookInfo[]
  relevantMemories?: { path: string; content: string; mtimeMs: number }[]
  teamMemorySearchCount?: number
  teamMemoryReadCount?: number
  teamMemoryWriteCount?: number
  [key: string]: unknown
}

export type HookResultMessage = Message
export type SystemThinkingMessage = Message & { type: 'system' }

/**
 * AÑADIDOS de este arbol, no de la fuente: los dos bloques que `messages.ts`
 * consume desde aqui. La fuente los toma directo del SDK en cada consumidor;
 * aqui se re-exportan desde un solo punto para que el consumidor no tenga que
 * declarar el SDK. No son divergencia de forma —son los tipos del SDK—, sino
 * de SITIO, y por eso se declaran.
 */
export type { ToolResultBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
