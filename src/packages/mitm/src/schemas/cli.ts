/**
 * Los cuerpos de arranque y parada del MITM desde la línea de órdenes, y de
 * dónde sale la clave con que el servidor habla al proxy local.
 *
 * Porte de `omniroute: src/shared/validation/schemas/cli.ts` (cliMitm*) y de
 * `src/shared/services/apiKeyResolver.ts::resolveApiKey` (MIT). La referencia
 * devuelve el marcador `sk_omniroute` cuando no hay clave y la ruta lo
 * rechaza después; aquí la ausencia es `null`, así que no hay cadena mágica
 * que pueda llegar al servidor.
 */
import { z } from 'zod'

export const cliMitmStartSchema = z.object({
  apiKey: z.string().trim().min(1).nullable().optional(),
  keyId: z.string().trim().min(1).nullable().optional(),
  sudoPassword: z.string().optional(),
})

export const cliMitmStopSchema = z.object({
  sudoPassword: z.string().optional(),
})

/**
 * La clave de arranque: la guardada bajo `keyId` si existe, si no la dada;
 * sin ninguna, `null` y el arranque se rechaza.
 */
export async function resolveStartApiKey(
  keyId: string | null | undefined,
  apiKey: string | null | undefined,
  lookupKeyById: (id: string) => Promise<string | null>,
): Promise<string | null> {
  if (keyId) {
    try {
      const stored = await lookupKeyById(keyId)
      if (stored) return stored
    } catch {
      // Una búsqueda que falla cae a la clave dada, como en la referencia.
    }
  }
  return apiKey || null
}
