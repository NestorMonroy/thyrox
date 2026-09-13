/**
 * Porte RECORTADO de `updateProviderConnectionSchema` en OmniRoute
 * `src/shared/validation/schemas/provider.ts` (MIT) + el campo
 * `blockExtraUsage` de `validateProviderSpecificData` en
 * `src/shared/validation/providerSpecificData.ts` (MIT). NO es el esquema
 * completo de la fuente -- es la unica superficie que
 * `tests/unit/claude-extra-usage.test.ts` ejercita:
 *
 *   updateProviderConnectionSchema.safeParse({
 *     providerSpecificData: { blockExtraUsage: false },
 *   }).success === true
 *
 *   updateProviderConnectionSchema.safeParse({
 *     providerSpecificData: { blockExtraUsage: "false" },
 *   }).success === false
 *
 * DIVERGENCIA DE ALCANCE, declarada:
 *
 * - La fuente valida ~20 campos mas de nivel superior (`name`, `priority`,
 *   `rateLimitOverrides`, `quotaWindowThresholds`, credenciales, etc.) y un
 *   `superRefine` de nivel superior que rechaza un cuerpo sin ningun campo.
 *   Ninguno de los dos se porta: pertenecen al modelo de conexion completo
 *   de un gateway multi-tenant, que este arbol no tiene.
 * - `validateProviderSpecificData` valida ~15 claves mas de
 *   `providerSpecificData` (`gheUrl`, `codexFingerprintMode`,
 *   `preserveEncryptedReasoning`, `peakHourProtection`, `autoFetchModels`,
 *   `timeoutMs`, `preset`, etc.) -- ninguna se porta, por la misma razon
 *   que en `claudeExtraUsageNormalization.ts`: dependen de dominio propio
 *   de OmniRoute.
 *
 * Se conserva `z.record(z.string(), z.unknown())` como forma del campo
 * (no un objeto tipado con `blockExtraUsage?: boolean`): asi un consumidor
 * puede seguir enviando otras claves de `providerSpecificData` sin que
 * este esquema recortado las rechace -- fiel a que la fuente tampoco las
 * rechaza, solo no las valida todas.
 */
import { z } from 'zod'

/**
 * Espejo exacto del chequeo `blockExtraUsage` de `validateProviderSpecificData`
 * (mismo mensaje, mismo `path`) -- el UNICO de sus ~16 chequeos que se porta.
 */
function validateBlockExtraUsageField(
  data: Record<string, unknown> | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!data) return
  const blockExtraUsage = data.blockExtraUsage
  if (blockExtraUsage !== undefined && typeof blockExtraUsage !== 'boolean') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'providerSpecificData.blockExtraUsage must be a boolean',
      path: ['blockExtraUsage'],
    })
  }
}

export const updateProviderConnectionSchema = z.object({
  providerSpecificData: z
    .record(z.string(), z.unknown())
    .optional()
    .superRefine((data, ctx) => {
      validateBlockExtraUsageField(data, ctx)
    }),
})
