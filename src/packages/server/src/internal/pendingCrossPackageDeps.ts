/**
 * Puerto de `ccnmt: packages/server/**`.
 *
 * Verificado en este turno (`Bun.resolveSync`, 2026-09-07): los once
 * especificadores `@thyrox/{agent,app-host,config,local-observability,
 * provider}/...` que el paquete original importa **no resuelven** desde
 * `/home/user/thyrox/src/packages/server` — los once dan
 * `Cannot find module '...' from '/home/user/thyrox/src/packages/server'`.
 * La causa NO es que el módulo no esté portado: los cinco paquetes
 * hermanos existen en este árbol (`src/packages/{agent,app-host,config,
 * local-observability,provider}`) y sus símbolos concretos también. La
 * causa es que `@thyrox/server` todavía no es miembro de
 * `src/packages/package.json:workspaces` (ruta que no se toca en este
 * porte) — sin eso, `node_modules/@thyrox/*` no tiene el symlink que el
 * resolver de Bun necesita para el especificador con paquete.
 *
 * Por eso las secciones 1 se resuelven con `require()` diferido (Rule 3):
 * el módulo SÍ existe, sólo que el especificador con paquete no resuelve
 * desde aquí. La sección 2 es reimplementación fiel recortada de
 * `fromSDKCompactMetadata` (`agent/messagesMappers.ts` no existe en este
 * árbol como archivo propio — sólo el símbolo que server consume). La
 * sección 3 es el punto de inyección para `sendEventToRemoteSession`
 * (`teleport/api.ts`): el paquete `teleport` no existe en este árbol en
 * absoluto (ni portado, ni bloqueado por workspace — ausente).
 */
import type { UUID } from 'crypto'

/* eslint-disable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------
// 1. require() diferido — el sibling existe, el especificador no resuelve
// ---------------------------------------------------------------------

export function requireAppHostCleanupRegistry(): {
  registerCleanup: (cleanupFn: () => Promise<void>) => () => void
} {
  return require('@thyrox/app-host/bootstrap/cleanupRegistry.js')
}

export function requireConfigEnvUtils(): {
  isEnvTruthy: (envVar: string | boolean | undefined) => boolean
} {
  return require('@thyrox/config/env/utils.js')
}

export function requireLocalObservabilityDebug(): {
  logForDebugging: (
    message: string,
    opts?: { level?: 'verbose' | 'debug' | 'info' | 'warn' | 'error' },
  ) => void
} {
  return require('@thyrox/local-observability/debug.js')
}

export function requireLocalObservabilityErrorHelpers(): {
  errorMessage: (e: unknown) => string
  isENOENT: (e: unknown) => boolean
} {
  return require('@thyrox/local-observability/errorHelpers.js')
}

export function requireLocalObservabilityLogging(): {
  logError: (error: unknown) => void
} {
  return require('@thyrox/local-observability/logging')
}

export function requireLocalObservabilitySlowOperations(): {
  jsonParse: typeof JSON.parse
  jsonStringify: (
    value: unknown,
    replacer?: unknown,
    space?: string | number,
  ) => string
} {
  return require('@thyrox/local-observability/slowOperations.js')
}

export function requireProviderOauthConstants(): {
  getOauthConfig: () => { BASE_API_URL: string; [key: string]: unknown }
} {
  return require('@thyrox/provider/oauthConstants.js')
}

export function requireProviderMtls(): {
  getWebSocketTLSOptions: () => import('tls').ConnectionOptions | undefined
} {
  return require('@thyrox/provider/mtls.js')
}

export function requireProviderProxy(): {
  getWebSocketProxyAgent: (url: string) => unknown
  getWebSocketProxyUrl: (url: string) => string | undefined
} {
  return require('@thyrox/provider/proxy.js')
}

export function requireProviderConnections(): {
  unpackModelId: (value: string) => {
    connectionId: string | undefined
    modelId: string
  }
} {
  return require('@thyrox/provider/connections.js')
}

export function requireAgentMessages(): {
  createUserMessage: (args: {
    content: string | unknown[]
    isMeta?: true
    uuid?: string
    timestamp?: string
  }) => {
    type: 'user'
    message: { role: 'user'; content: unknown }
    isMeta?: true
    uuid: string
    timestamp: string
  }
} {
  return require('@thyrox/agent/messages.js')
}

/* eslint-enable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------
// 2a. Reimplementación fiel — tool-registry/utils/lazySchema.js: mismo
// patrón "memoiza el resultado de un factory de schema zod" que ya se usó
// en `@thyrox/ide` y `@thyrox/headless-sdk` (el paquete `tool-registry` no
// existe en este árbol).
// ---------------------------------------------------------------------

export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

// ---------------------------------------------------------------------
// 2b. Reimplementación fiel recortada — `agent/messagesMappers.ts`
// (ccnmt: packages/agent/messages/mappers.ts:100-116). Sólo se porta
// `fromSDKCompactMetadata`, que es lo único que `remote/sdkMessageAdapter.ts`
// consume; `toSDKCompactMetadata`/`toSDKMessages` no tienen consumidor en
// este paquete y no se portan (Rule 2: declarado, no silencioso).
// ---------------------------------------------------------------------

export type CompactMetadata = {
  trigger?: string
  preTokens?: number
  preservedSegment?: {
    headUuid: UUID
    anchorUuid: UUID
    tailUuid: UUID
  }
}

type SDKCompactMetadataShape = {
  trigger?: string
  pre_tokens?: number
  preserved_segment?: {
    head_uuid: string
    anchor_uuid: string
    tail_uuid: string
  }
  [key: string]: unknown
}

/** Convertidor SDK→interno compartido de `compact_metadata` (snake_case→camelCase). */
export function fromSDKCompactMetadata(
  meta: SDKCompactMetadataShape,
): CompactMetadata {
  const seg = meta.preserved_segment
  return {
    trigger: meta.trigger,
    preTokens: meta.pre_tokens,
    ...(seg && {
      preservedSegment: {
        headUuid: seg.head_uuid as UUID,
        anchorUuid: seg.anchor_uuid as UUID,
        tailUuid: seg.tail_uuid as UUID,
      },
    }),
  }
}

// ---------------------------------------------------------------------
// 3. Punto de inyección — `teleport/api.ts` no existe en este árbol EN
// ABSOLUTO (ni portado, ni bloqueado por workspace: el paquete `teleport`
// no tiene directorio bajo `src/packages/`). `sendEventToRemoteSession`
// es la única función que `RemoteSessionManager.ts` consume de ahí.
// Default: lanza nombrando el módulo bloqueado, igual que `callIdeRpc` en
// `@thyrox/ide`. `setSendEventToRemoteSessionFn` es el punto de inyección
// para cuando `teleport` aterrice.
// ---------------------------------------------------------------------

export type RemoteMessageContent = string | unknown[]

type SendEventToRemoteSessionFn = (
  sessionId: string,
  content: RemoteMessageContent,
  opts?: { uuid?: string },
) => Promise<boolean>

let sendEventToRemoteSessionFn: SendEventToRemoteSessionFn = () => {
  throw new Error(
    'sendEventToRemoteSession: el paquete `teleport` no existe en este árbol ' +
      '(ccnmt: packages/teleport/api.ts). Llamar a setSendEventToRemoteSessionFn ' +
      'para inyectar la implementación real cuando `teleport` aterrice.',
  )
}

export function sendEventToRemoteSession(
  sessionId: string,
  content: RemoteMessageContent,
  opts?: { uuid?: string },
): Promise<boolean> {
  return sendEventToRemoteSessionFn(sessionId, content, opts)
}

export function setSendEventToRemoteSessionFn(
  fn: SendEventToRemoteSessionFn,
): void {
  sendEventToRemoteSessionFn = fn
}
