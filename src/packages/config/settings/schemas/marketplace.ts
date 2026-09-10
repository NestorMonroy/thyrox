/**
 * Puerto de `ccnmt: packages/config/settings/schemas/marketplace.ts` (23
 * líneas fuente). Reimplementación fiel VERBATIM.
 *
 * Esquema de fuente de marketplace — stub para compatibilidad hacia atrás
 * de settings. La feature Plugins/Marketplace fue retirada en la fuente; este
 * stub preserva la compatibilidad de archivos de settings: los archivos de
 * config existentes que contengan entradas `marketplaceSource` se aceptan
 * sin error.
 */
import { z } from 'zod/v4'
import { lazySchema } from '../../internal/lazySchema.ts'

/**
 * Esquema permisivo de fuente de marketplace.
 *
 * Acepta cualquier objeto con un discriminante `source: string`. La
 * feature está retirada, así que no hace falta más validación — el
 * passthrough garantiza que los archivos de settings existentes se acepten
 * sin lanzar errores de validación.
 */
export const MarketplaceSourceSchema = lazySchema(() =>
  z.object({ source: z.string() }).passthrough(),
)
