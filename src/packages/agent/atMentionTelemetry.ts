/**
 * Porte COMPLETO de `ccnmt: packages/agent/atMentionTelemetry.ts`.
 *
 * Envoltorio sobre el evento OTel estructurado `at_mention`. Extraído de
 * `attachments.ts` (ant v2.1.136 `Ak`, `2642.js`) para que los call-sites
 * queden en una línea y `attachments.ts` no exceda su presupuesto de líneas
 * heredado.
 *
 * `@thyrox/local-observability` ya es dependencia declarada de este paquete
 * y expone `logAtMentionEvent` en su subpath `./telemetry`
 * (`local-observability/src/telemetry/structuredEvents.ts`) — no hace falta
 * ningún cambio en `package.json`.
 */

import { logAtMentionEvent } from '@thyrox/local-observability/telemetry'

export type AtMentionType = 'file' | 'directory'

export function emitAtMention(mentionType: AtMentionType, success: boolean): void {
  void logAtMentionEvent({ mentionType, success })
}
