/**
 * Puerto de `ccnmt: packages/local-observability/src/sentry.ts` (175
 * líneas fuente, 100 % portado). Integración con Sentry — inicializa el
 * SDK cuando `SENTRY_DSN` está fijada; sin DSN, todos los exports son
 * no-op. Única dependencia externa: `@sentry/node` (instalada como
 * dependencia real de este paquete).
 *
 * `isEnvTruthy`? no — este archivo usa `readEnv`, no `isEnvTruthy`.
 * Reapuntado a `@thyrox/*` real: `readEnv` — `@thyrox/config` exporta
 * `./env/utils`.
 *
 * `MACRO.VERSION`/`BUILD_ENV`: la fuente los declara `declare const` en
 * línea justamente para no depender de un `.d.ts` global — se conserva
 * el mismo patrón aquí (ver nota de `logging/error-log-sink.ts` sobre
 * `agent/internal/macroFallback.ts`).
 */

import * as Sentry from '@sentry/node'
import { readEnv } from '@thyrox/config/env/utils'
import { logForDebugging } from './debug.js'

// Constante de build-time inyectada vía Bun.build({ define }) en
// build.ts, o undefined en tiempo de desarrollo. Declarada en línea para
// que este paquete no dependa de src/types/global.d.ts (V7 §11.2).
declare const BUILD_ENV: string | undefined
declare const MACRO: { VERSION: string } | undefined

let initialized = false

/**
 * Inicializa el SDK de Sentry. Seguro de llamar varias veces —
 * las llamadas subsecuentes son no-op. Sólo se activa cuando la variable
 * de entorno SENTRY_DSN está fijada.
 */
export function initSentry(): void {
  if (initialized) {
    return
  }

  const dsn = readEnv('SENTRY_DSN')
  if (!dsn) {
    logForDebugging('[sentry] SENTRY_DSN not set, skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    release: typeof MACRO !== 'undefined' ? MACRO.VERSION : undefined,
    environment:
      typeof BUILD_ENV !== 'undefined'
        ? BUILD_ENV
        : readEnv('NODE_ENV') || 'development',

    // Limita breadcrumbs y attachments para controlar el tamaño del payload.
    maxBreadcrumbs: 20,

    // Tasa de muestreo para eventos de error (1.0 = captura todo).
    sampleRate: 1.0,

    // Filtra información sensible antes de enviar.
    beforeSend(event) {
      // Quita headers de autenticación de los datos de la petición.
      const request = event.request
      if (request?.headers) {
        const sensitiveHeaders = [
          'authorization',
          'x-api-key',
          'cookie',
          'set-cookie',
        ]
        for (const key of Object.keys(request.headers)) {
          if (sensitiveHeaders.includes(key.toLowerCase())) {
            delete request.headers[key]
          }
        }
      }

      return event
    },

    // Ignora patrones de error específicos.
    ignoreErrors: [
      // Errores de red de hosts inalcanzables — no accionables.
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      // Aborts iniciados por el usuario.
      'AbortError',
      'The user aborted a request',
      // Señales de cancelación interactiva.
      'CancelError',
    ],

    beforeSendTransaction() {
      // No enviar transacciones de performance por ahora — sólo errores.
      return null
    },
  })

  initialized = true
  logForDebugging('[sentry] Initialized successfully')
}

/**
 * Captura una excepción y la envía a Sentry.
 * No-op si Sentry no ha sido inicializado.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) {
    return
  }

  try {
    Sentry.withScope(scope => {
      if (context) {
        scope.setExtras(context)
      }
      Sentry.captureException(error)
    })
  } catch {
    // Sentry mismo falló — que no tumbe la app.
  }
}

/**
 * Fija un tag en el scope actual para agrupar/filtrar en Sentry.
 * No-op si Sentry no ha sido inicializado.
 */
export function setTag(key: string, value: string): void {
  if (!initialized) {
    return
  }

  try {
    Sentry.setTag(key, value)
  } catch {
    // Ignorar.
  }
}

/**
 * Fija el contexto de usuario en Sentry para atribución de errores.
 * No-op si Sentry no ha sido inicializado.
 */
export function setUser(user: {
  id?: string
  email?: string
  username?: string
}): void {
  if (!initialized) {
    return
  }

  try {
    Sentry.setUser(user)
  } catch {
    // Ignorar.
  }
}

/**
 * Flushea los eventos pendientes de Sentry y cierra el cliente.
 * Llamar durante el apagado ordenado para asegurar que los eventos se
 * envíen.
 */
export async function closeSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) {
    return
  }

  try {
    await Sentry.close(timeoutMs)
    logForDebugging('[sentry] Closed successfully')
  } catch {
    // Ignorar — ya nos estamos apagando de todas formas.
  }
}

/**
 * Verifica si Sentry está inicializado. Útil para renderizado
 * condicional de UI.
 */
export function isSentryInitialized(): boolean {
  return initialized
}
