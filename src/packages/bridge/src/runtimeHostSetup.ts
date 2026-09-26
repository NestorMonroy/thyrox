import { installBridgeHostBindings } from './index.js'
import { bridgeMain } from './bridgeMain.js'
import { buildBridgeConnectUrl } from './bridgeStatusUtil.js'
import {
  getBridgeDisabledReason,
  isBridgeEnabledBlocking,
  isCcrMirrorEnabled,
} from './bridgeEnabled.js'
import { extractInboundMessageFields } from './inboundMessages.js'
import { resolveAndPrepend } from './inboundAttachments.js'
import { initReplBridge } from './initReplBridge.js'
import {
  clearTrustedDeviceToken,
  enrollTrustedDevice,
  getTrustedDeviceToken,
} from './trustedDevice.js'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type { Message } from '@thyrox/agent/messageShapes.js'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { InitBridgeOptions as HostInitBridgeOptions } from './contracts.js'

/**
 * Adaptadores entre el contrato laxo de host-bindings (`unknown` en
 * `contracts.ts`, deliberado — ver la cabecera de `initReplBridge.ts`) y las
 * firmas precisas de los módulos internos. En runtime este paquete es el
 * único llamador de `installBridgeHostBindings`, así que lo que aquí se
 * afirma siempre llega con la forma precisa.
 */
function extractInboundMessageFieldsForHost(message: unknown): unknown {
  return extractInboundMessageFields(message as SDKMessage)
}

function resolveAndPrependForHost(
  message: unknown,
  content: string | unknown[],
): Promise<string | unknown[]> {
  return resolveAndPrepend(message, content as string | ContentBlockParam[])
}

function initReplBridgeForHost(
  options?: HostInitBridgeOptions,
): ReturnType<typeof initReplBridge> {
  return initReplBridge(
    options && {
      ...options,
      initialMessages: options.initialMessages as Message[] | undefined,
      getMessages: options.getMessages as (() => Message[]) | undefined,
    },
  )
}

let installed = false

export function installBridgeBindings(): void {
  if (installed) {
    return
  }

  installBridgeHostBindings({
    bridgeMain,
    buildBridgeConnectUrl,
    extractInboundMessageFields: extractInboundMessageFieldsForHost,
    resolveAndPrepend: resolveAndPrependForHost,
    initReplBridge: initReplBridgeForHost,
    getBridgeDisabledReason,
    isCcrMirrorEnabled,
    isBridgeEnabledBlocking,
    clearTrustedDeviceToken,
    enrollTrustedDevice,
    getTrustedDeviceToken,
  })

  installed = true
}

installBridgeBindings()
