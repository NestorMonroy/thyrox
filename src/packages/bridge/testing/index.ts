import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type {
  InboundMessageFields,
  InitBridgeOptions,
  ReplBridgeHandle,
} from '../src/contracts.js'

export class NullBridgeRuntime {
  async bridgeMain(_args: string[]): Promise<void> {}

  buildBridgeConnectUrl(environmentId: string): string {
    return `https://example.test/code?bridge=${environmentId}`
  }

  // Sin puente no hay mensaje entrante que extraer.
  extractInboundMessageFields(_message: unknown): InboundMessageFields | undefined {
    return undefined
  }

  async resolveAndPrepend(
    _message: unknown,
    content: string | ContentBlockParam[],
  ): Promise<string | ContentBlockParam[]> {
    return content
  }

  async initReplBridge(
    _options?: InitBridgeOptions,
  ): Promise<ReplBridgeHandle | null> {
    return null
  }
}

export function createScriptedBridgeHandle(
  overrides: Partial<ReplBridgeHandle> = {},
): ReplBridgeHandle {
  return {
    bridgeSessionId: 'bridge-session',
    environmentId: 'env-test',
    sessionIngressUrl: 'https://example.test/ingress',
    writeMessages: () => {},
    writeSdkMessages: () => {},
    sendControlRequest: () => {},
    sendControlResponse: () => {},
    sendControlCancelRequest: () => {},
    sendResult: () => {},
    teardown: async () => {},
    ...overrides,
  }
}
