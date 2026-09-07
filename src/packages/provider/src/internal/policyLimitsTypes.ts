/**
 * Porte de `ccnmt: packages/provider/src/policyLimits/types.ts` — sibling
 * de `policyLimits/index.ts` (uno de los 18), NO asignado él mismo a este
 * pase, pero indispensable para que `policyLimits/index.ts` valide la
 * respuesta real de la API. `lazySchema` (`@claude-code-how-works/tool-registry`)
 * no está portado en ningún paquete `@thyrox/*` — sustituto local trivial
 * (memoiza la construcción del schema en la primera llamada).
 */

import { z } from 'zod/v4'

function lazySchema<T extends z.ZodType>(build: () => T): () => T {
  let cached: T | undefined
  return () => {
    if (!cached) cached = build()
    return cached
  }
}

/**
 * Schema de la respuesta de la API de policy limits. Sólo se incluyen las
 * políticas bloqueadas — si una clave está ausente, está permitida.
 */
export const PolicyLimitsResponseSchema = lazySchema(() =>
  z.object({
    restrictions: z.record(z.string(), z.object({ allowed: z.boolean() })),
    compliance_taints: z.array(z.string()).default([]),
  }),
)

export type PolicyLimitsResponse = z.infer<ReturnType<typeof PolicyLimitsResponseSchema>>

export type PolicyLimitsFetchResult = {
  success: boolean
  restrictions?: PolicyLimitsResponse['restrictions'] | null
  complianceTaints?: string[] | null
  etag?: string
  error?: string
  skipRetry?: boolean
}
