/**
 * Puerto fiel de `ccnmt: packages/bridge/src/runtimeHostSetup.ts` (42
 * líneas fuente, 100% portado — símbolo único `installBridgeBindings`).
 *
 * Instala las ataduras REALES en el registro de `host.ts` que
 * `index.ts` consulta vía `getBridgeHostBindings()`. `index.ts` es la
 * superficie pública — cada una de sus funciones delega en el registro
 * en vez de importar directamente la implementación; este módulo es el
 * que puebla ese registro con los módulos ya portados, imitando el
 * diseño de indirección de la fuente (permite sustituir el bridge
 * entero — p. ej. en tests — sin tocar `index.ts`).
 */

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

let installed = false

export function installBridgeBindings(): void {
  if (installed) {
    return
  }

  installBridgeHostBindings({
    bridgeMain,
    buildBridgeConnectUrl,
    extractInboundMessageFields,
    resolveAndPrepend,
    initReplBridge,
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
