/**
 * Qué hace comparables dos evaluaciones de artefactos (TASK-THYROX-0721): la
 * misma fuente y revisión, el mismo corpus, la misma imagen de herramientas
 * y los mismos parámetros. Una perplejidad medida con otro corpus u otra
 * versión de `llama-perplexity` es un control de sanidad, no un término de
 * comparación; esta función lo rehúsa nombrando lo que difiere.
 */

export interface EvaluationIdentity {
  readonly sourceRepository: string
  readonly sourceRevision: string
  readonly corpusSha256: string
  readonly imageDigest: string
  readonly toolParameters: string
}

const IDENTITY_FIELDS: readonly (keyof EvaluationIdentity)[] = [
  'sourceRepository', 'sourceRevision', 'corpusSha256', 'imageDigest', 'toolParameters',
]

/** `undefined` si son comparables; si no, el motivo con cada campo que difiere. */
export function comparisonRefusal(left: EvaluationIdentity, right: EvaluationIdentity): string | undefined {
  const differing = IDENTITY_FIELDS.filter(field => left[field] !== right[field])
  if (differing.length === 0) return undefined
  return `evaluaciones no comparables: difieren ${differing.map(field => `${field} (${left[field]} ≠ ${right[field]})`).join(', ')}`
}
