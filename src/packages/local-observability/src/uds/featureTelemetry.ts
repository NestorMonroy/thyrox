/**
 * La telemetría de una funcionalidad: salió bien, salió mal por culpa ajena
 * (`bad`), o se degradó sin error (`sad`). Los eventos van al registro local
 * de thyrox.
 *
 * Porte de `_`, `m` y `p` (`chunk-d09a8ccq.js`) y de `qde`
 * (`chunk-ern0s5ks.js`) de 2.1.283.
 */
import type { EventMetadata } from '../contracts.ts'
import { logEvent } from '../core.ts'

type EventSink = (name: string, metadata: Record<string, unknown>) => void
const localSink: EventSink = (name, metadata) => logEvent(name, metadata as EventMetadata)

const CONFORMING_CODE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/

/** `qde`: el código de error tal cual si es conforme, `nonconforming` si no, nada si no es texto. */
export function featureErrorCode(code: unknown): string | undefined {
  if (typeof code !== 'string') return undefined
  return CONFORMING_CODE.test(code) ? code : 'nonconforming'
}

/** `_`: la funcionalidad salió bien. */
export function reportFeatureOk(feature: string, metadata?: Record<string, unknown>, sink: EventSink = localSink): void {
  sink('tengu_feature_ok', { feature_name: feature, ...metadata })
}

/** `m`: la funcionalidad falló. */
export function reportFeatureBad(feature: string, code: unknown, metadata?: Record<string, unknown>, sink: EventSink = localSink): void {
  sink('tengu_feature_bad', { ...metadata, feature_name: feature, error_code: featureErrorCode(code) })
}

/** `p`: la funcionalidad se degradó sin fallar. */
export function reportFeatureSad(feature: string, code: unknown, metadata?: Record<string, unknown>, sink: EventSink = localSink): void {
  sink('tengu_feature_sad', { ...metadata, feature_name: feature, error_code: featureErrorCode(code) })
}
