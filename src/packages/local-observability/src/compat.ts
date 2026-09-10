/**
 * Puerto de `ccnmt: packages/local-observability/src/compat.ts` (21 líneas
 * fuente, 100 % portado). Capa de compatibilidad hacia atrás sobre
 * `core.ts` — sin dependencias externas.
 */

// La fuente importa también `logEventAsync` de `core.js` sin usarlo — se
// omite aquí (import muerto en la propia fuente; `tsconfig.json` de este
// árbol tiene `noUnusedLocals: true` y lo rechazaría).
import { logEvent, shutdownLocalObservability } from './core.js'
import type { EventMetadata } from './contracts.js'

export type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = never
export type AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED = never

export function stripProtoFields<V>(
  metadata: Record<string, V>,
): Record<string, V> {
  return metadata
}

export function attachAnalyticsSink(_newSink: unknown): void {}

export function logEventTo1P(eventName: string, metadata: EventMetadata): void {
  logEvent(eventName, metadata)
}

export async function shutdownEventLoggers(): Promise<void> {
  await shutdownLocalObservability()
}

export function _resetForTesting(): void {}
