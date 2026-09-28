/**
 * Si un modelo tiene una capacidad: la respuesta combina tres fuentes con un
 * orden fijo. Primero la anulación del entorno, que decide en los dos
 * sentidos; después la consulta que el servidor sirve, que sólo afirma y
 * sólo si la bandera de la capacidad lo permite; al final el catálogo, que
 * también sólo afirma. Si ninguna afirma, la respuesta es «no consta»
 * (`undefined`), no «no»: el llamador elige su propio respaldo.
 *
 * Porte de `$h`, `UYe`, `qFt`, `MBr`, `P`, `L`, `h`, `ENo` y `kNo`
 * (`chunk-4h0c4z04.js`) de 2.1.283. La variable del entorno se llama
 * `THYROX_CODE_MODEL_CAPABILITIES`.
 */
import { MODELS } from './models.ts'

export type ServedCapabilityLookup = (capability: string, models: string[]) => boolean | undefined
export type FeatureGateLookup = (gate: string) => boolean | undefined

/** `L`: las capacidades que además exigen una bandera abierta. */
export const CAPABILITY_FEATURE_GATES: Readonly<Record<string, string>> = { per_turn_effort: 'tengu_per_turn_effort' }

const lookups: { served: ServedCapabilityLookup | undefined; featureGate: FeatureGateLookup | undefined } = {
  served: undefined,
  featureGate: undefined,
}

/** `ENo`. */
export function setServedCapabilityLookup(lookup: ServedCapabilityLookup | undefined): void {
  lookups.served = lookup
}

/** `kNo`. */
export function setFeatureGateLookup(lookup: FeatureGateLookup | undefined): void {
  lookups.featureGate = lookup
}

export function resetCapabilityLookupsForTests(): void {
  lookups.served = undefined
  lookups.featureGate = undefined
}

/** `h`. */
export function stripOneMillionSuffix(model: string): string {
  return model.replace(/\[1m\]/gi, '')
}

/**
 * `UYe`. La variable son segmentos separados por `;`. Un segmento
 * `modelo=cap1,-cap2` aplica al modelo exacto, o a un prefijo si termina en
 * `*`; sin `=`, aplica a todos. Un `-` delante niega. La última mención de
 * la capacidad gana.
 */
export function capabilityOverrideFromEnv(capability: string, canonicalModel: string): boolean | undefined {
  const spec = process.env.THYROX_CODE_MODEL_CAPABILITIES
  if (spec === undefined) return undefined
  const model = stripOneMillionSuffix(canonicalModel)
  let decision: boolean | undefined
  for (const segment of spec.split(';')) {
    const separator = segment.indexOf('=')
    if (separator !== -1) {
      const pattern = segment.slice(0, separator).trim()
      if (pattern === '') continue
      const matches = pattern.endsWith('*') ? model.startsWith(pattern.slice(0, -1)) : model === pattern
      if (!matches) continue
    }
    const list = separator === -1 ? segment : segment.slice(separator + 1)
    for (const item of list.split(',')) {
      const entry = item.trim()
      const granted = !entry.startsWith('-')
      if ((granted ? entry : entry.slice(1)) === capability) decision = granted
    }
  }
  return decision
}

/** `MBr`: `undefined` si el catálogo no conoce el modelo. */
export function catalogDeclaresCapability(model: string, capability: string): boolean | undefined {
  return MODELS[stripOneMillionSuffix(model)]?.capabilities?.includes(capability)
}

/** `P`. */
export function isCapabilityGateOpen(capability: string): boolean {
  const gate = CAPABILITY_FEATURE_GATES[capability]
  if (gate === undefined) return true
  return lookups.featureGate?.(gate) === true
}

/** `qFt`. */
function servedOrCatalogCapability(canonicalModel: string, capability: string, requestedModel: string): true | undefined {
  const served = lookups.served?.(capability, [requestedModel, stripOneMillionSuffix(canonicalModel)])
  if (served === true && isCapabilityGateOpen(capability)) return true
  return catalogDeclaresCapability(canonicalModel, capability) ? true : undefined
}

/** `$h`. */
export function modelHasCapability(canonicalModel: string, capability: string, requestedModel: string): boolean | undefined {
  return capabilityOverrideFromEnv(capability, canonicalModel) ?? servedOrCatalogCapability(canonicalModel, capability, requestedModel)
}
