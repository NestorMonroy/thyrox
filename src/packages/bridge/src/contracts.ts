import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type { UUID } from 'crypto'

export type BridgeState = 'ready' | 'connected' | 'reconnecting' | 'failed'

/**
 * Lo que `inboundMessages.ts` extrae de un mensaje entrante. La entrada de
 * los bindings sigue siendo `unknown` (deliberado, ver `initReplBridge.ts`),
 * pero la salida tiene una sola forma y cada consumidor la necesita: con
 * `unknown` también a la salida, `run-streaming.ts` leía `content` de `{}`.
 */
export type InboundMessageFields = {
  content: string | ContentBlockParam[]
  uuid: UUID | undefined
}

export type ReplBridgeHandle = {
  bridgeSessionId: string
  environmentId: string
  sessionIngressUrl: string
  writeMessages(messages: unknown[]): void
  writeSdkMessages(messages: unknown[]): void
  sendControlRequest(request: unknown): void
  sendControlResponse(response: unknown): void
  sendControlCancelRequest(requestId: string): void
  sendResult(): void
  teardown(): Promise<void>
}

export type InitBridgeOptions = {
  onInboundMessage?: (message: unknown) => void | Promise<void>
  onPermissionResponse?: (response: unknown) => void
  onInterrupt?: () => void
  onSetModel?: (model: string | undefined) => void
  onSetMaxThinkingTokens?: (maxTokens: number | null) => void
  onSetPermissionMode?: (
    mode: string,
  ) => { ok: true } | { ok: false; error: string }
  onStateChange?: (state: BridgeState, detail?: string) => void
  initialMessages?: unknown[]
  initialName?: string
  getMessages?: () => unknown[]
  previouslyFlushedUUIDs?: Set<string>
  perpetual?: boolean
  outboundOnly?: boolean
  tags?: string[]
}

export type BridgeHostBindings = {
  bridgeMain: (args: string[]) => Promise<void>
  buildBridgeConnectUrl: (
    environmentId: string,
    ingressUrl?: string,
  ) => string
  extractInboundMessageFields: (message: unknown) => InboundMessageFields | undefined
  resolveAndPrepend: (
    message: unknown,
    content: string | ContentBlockParam[],
  ) => Promise<string | ContentBlockParam[]>
  initReplBridge: (
    options?: InitBridgeOptions,
  ) => Promise<ReplBridgeHandle | null>
  getBridgeDisabledReason?: () => Promise<string | null>
  isCcrMirrorEnabled?: () => boolean
  isBridgeEnabledBlocking?: () => Promise<boolean>
  clearTrustedDeviceToken?: () => void
  enrollTrustedDevice?: () => Promise<void>
  getTrustedDeviceToken?: () => string | undefined
}
