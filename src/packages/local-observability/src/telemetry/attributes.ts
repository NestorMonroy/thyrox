/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/attributes.ts`
 * (78 líneas fuente, 100 % portado). `getTelemetryAttributes()` — arma
 * la bolsa de atributos OpenTelemetry para las emisiones de métricas.
 *
 * Reapuntado a `@thyrox/*` real (verificado contra su `exports`):
 * - `isEnvTruthy` — `@thyrox/config` exporta `./env/utils`.
 * - `toTaggedId` — `@thyrox/agent` exporta `./taggedId`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`, ninguno
 * exportado por su sibling real):
 * - `getSessionId` — app-host/bootstrap/state, subpath no exportado.
 * - `getOrCreateUserID` — config (bare barrel), símbolo no declarado en
 *   el `.` de `@thyrox/config`.
 * - `envDynamic` — config/env/dynamic.js, archivo ausente.
 * - `getOauthAccountInfo` — provider/authAlias.js, subpath no exportado.
 *
 * `MACRO.VERSION`: la fuente lo usa SIN guarda (asume que
 * `agent/internal/macroFallback.ts` ya corrió). Este árbol no cablea esa
 * garantía para este paquete, así que aquí se guarda con `typeof MACRO
 * !== 'undefined'` (mismo patrón que `sentry.ts`/`error-log-sink.ts`) —
 * es la única divergencia de comportamiento de este archivo, declarada.
 */

import type { Attributes } from '@opentelemetry/api'

import { isEnvTruthy } from '@thyrox/config/env/utils'
import { toTaggedId } from '@thyrox/agent/taggedId'
import {
  envDynamic,
  getOauthAccountInfo,
  getOrCreateUserID,
  getSessionId,
} from '../internal/pendingCrossPackageDeps.js'

declare const MACRO: { VERSION: string } | undefined

const getTerminalType = (): string | undefined => envDynamic.terminal

const METRICS_CARDINALITY_DEFAULTS = {
  OTEL_METRICS_INCLUDE_SESSION_ID: true,
  OTEL_METRICS_INCLUDE_VERSION: false,
  OTEL_METRICS_INCLUDE_ACCOUNT_UUID: true,
}

function shouldIncludeAttribute(
  envVar: keyof typeof METRICS_CARDINALITY_DEFAULTS,
): boolean {
  const defaultValue = METRICS_CARDINALITY_DEFAULTS[envVar]
  const envValue = process.env[envVar]
  if (envValue === undefined) return defaultValue
  return isEnvTruthy(envValue)
}

export function getTelemetryAttributes(): Attributes {
  const userId = getOrCreateUserID()
  const sessionId = getSessionId()

  const attributes: Attributes = {
    'user.id': userId,
  }

  if (shouldIncludeAttribute('OTEL_METRICS_INCLUDE_SESSION_ID')) {
    attributes['session.id'] = sessionId
  }
  if (shouldIncludeAttribute('OTEL_METRICS_INCLUDE_VERSION')) {
    attributes['app.version'] =
      typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0-dev'
  }

  const oauthAccount = getOauthAccountInfo()
  if (oauthAccount) {
    const orgId = oauthAccount.organizationUuid
    const email = oauthAccount.emailAddress
    const accountUuid = oauthAccount.accountUuid

    if (orgId) attributes['organization.id'] = orgId
    if (email) attributes['user.email'] = email

    if (
      accountUuid &&
      shouldIncludeAttribute('OTEL_METRICS_INCLUDE_ACCOUNT_UUID')
    ) {
      attributes['user.account_uuid'] = accountUuid
      attributes['user.account_id'] =
        process.env.CLAUDE_CODE_ACCOUNT_TAGGED_ID ||
        toTaggedId('user', accountUuid)
    }
  }

  const terminal = getTerminalType()
  if (terminal) attributes['terminal.type'] = terminal

  return attributes
}
