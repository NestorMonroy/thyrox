/**
 * Puerto de `ccnmt: packages/config/remote/types.ts` (31 líneas fuente). No
 * es uno de los 15 del alcance — es la dependencia de hoja que
 * `remote/index.ts` necesita: cero dependencias cruzadas de paquete (sólo
 * `zod/v4`, `../internal/lazySchema.js` — ambos ya portados/resuelven — y un
 * tipo de `../settings/types.js`), se porta en el sitio.
 *
 * `SettingsJson` — la fuente la importa de `../settings/types.ts`, que en
 * este árbol NO declara ese nombre (declara `Settings`, sin sufijo `Json`,
 * inferido del mismo `SettingsSchema`). Se alía localmente por ser el mismo
 * concepto — un blob de settings ya parseado — con el nombre que este
 * archivo y `remote/index.ts` esperan.
 */
import { z } from 'zod/v4'
import { lazySchema } from '../internal/lazySchema.js'
import type { Settings as SettingsJson } from '../settings/types.js'

/**
 * Schema de la respuesta de settings gestionados remotamente.
 * Nota: usa `z.record()` permisivo en vez de `SettingsSchema` para evitar
 * una dependencia circular. La validación completa se hace en `index.ts`
 * tras el parseo, usando `SettingsSchema.safeParse()`.
 */
export const RemoteManagedSettingsResponseSchema = lazySchema(() =>
  z.object({
    uuid: z.string(), // UUID de los settings
    checksum: z.string(),
    settings: z.record(z.string(), z.unknown()) as z.ZodType<SettingsJson>,
  }),
)

export type RemoteManagedSettingsResponse = z.infer<
  ReturnType<typeof RemoteManagedSettingsResponseSchema>
>

/** Resultado de obtener settings gestionados remotamente. */
export type RemoteManagedSettingsFetchResult = {
  success: boolean
  settings?: SettingsJson | null // null = 304 Not Modified (la caché sigue siendo válida)
  checksum?: string
  error?: string
  skipRetry?: boolean // si es true, no reintentar ante un fallo (p. ej. errores de auth)
}
