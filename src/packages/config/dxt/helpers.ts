/**
 * Puerto de `ccnmt: packages/config/dxt/helpers.ts` (89 líneas fuente).
 * Validación de manifiestos DXT/MCPB y generación de extension ID.
 * Reimplementación fiel.
 *
 * `@anthropic-ai/mcpb` — dependencia externa real, no instalada en este
 * árbol (verificado con `Bun.resolveSync`). La fuente YA la importa
 * perezosamente vía `await import(...)` dentro de la función (no a nivel de
 * módulo) — por rendimiento de arranque, según su propio comentario: evita
 * cargar ~700KB de closures `.bind` de Zod v3 para sesiones que nunca tocan
 * `.dxt`/`.mcpb`. Se conserva ese mismo `await import()` verbatim en vez de
 * envolverlo con `require()`: no es un hueco de este porte, es la forma que
 * la fuente ya eligió. Como el paquete no está instalado, la función
 * lanzará en tiempo de ejecución si se invoca — el tipo `McpbManifestAny` se
 * declara localmente en su lugar (no se puede importar el tipo de un
 * paquete ausente).
 *
 * `errorMessage` y `jsonParse` — repuntados vía `require()` diferido
 * (`../internal/pendingCrossPackageDeps.ts`): `@thyrox/local-observability`
 * los declara y los tiene implementados; sólo falta el symlink de
 * workspace.
 */

import {
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilitySlowOperations,
} from '../internal/pendingCrossPackageDeps.js'

/**
 * Sustituto local del tipo `McpbManifestAny` de `@anthropic-ai/mcpb` — el
 * paquete no está instalado, así que su tipo no se puede importar. Se
 * declara el subconjunto que este módulo consume (`author.name`, `name`).
 */
export type McpbManifestAny = {
  author: { name: string }
  name: string
  [key: string]: unknown
}

/**
 * Parsea y valida un manifiesto DXT desde un objeto JSON.
 *
 * Import perezoso de `@anthropic-ai/mcpb`: ese paquete usa zod v3 que crea
 * eagerly 24 closures `.bind(this)` por instancia de esquema (~300
 * instancias entre `schemas.js` y `schemas-loose.js`). Diferir el import
 * mantiene ~700KB de closures fuera del heap de arranque para sesiones que
 * nunca tocan `.dxt`/`.mcpb`.
 */
export async function validateManifest(
  manifestJson: unknown,
): Promise<McpbManifestAny> {
  // @ts-expect-error — @anthropic-ai/mcpb no está instalado en este árbol;
  // la fuente ya lo importa perezosamente por la misma razón (ver docstring
  // del módulo). Se conserva el import diferido tal cual.
  const { vAny } = await import('@anthropic-ai/mcpb')
  const parseResult = vAny.McpbManifestSchema.safeParse(manifestJson)

  if (!parseResult.success) {
    const errors = parseResult.error.flatten()
    const errorMessages = [
      ...Object.entries(errors.fieldErrors).map(
        ([field, errs]: [string, unknown]) =>
          `${field}: ${(errs as string[] | undefined)?.join(', ') ?? ''}`,
      ),
      ...(errors.formErrors || []),
    ]
      .filter(Boolean)
      .join('; ')

    throw new Error(`Invalid manifest: ${errorMessages}`)
  }

  return parseResult.data as McpbManifestAny
}

/**
 * Parsea y valida un manifiesto DXT desde texto crudo.
 */
export async function parseAndValidateManifestFromText(
  manifestText: string,
): Promise<McpbManifestAny> {
  const { jsonParse } = requireLocalObservabilitySlowOperations()
  const { errorMessage } = requireLocalObservabilityErrorHelpers()
  let manifestJson: unknown

  try {
    manifestJson = jsonParse(manifestText)
  } catch (error) {
    throw new Error(`Invalid JSON in manifest.json: ${errorMessage(error)}`)
  }

  return validateManifest(manifestJson)
}

/**
 * Parsea y valida un manifiesto DXT desde datos binarios crudos.
 */
export async function parseAndValidateManifestFromBytes(
  manifestData: Uint8Array,
): Promise<McpbManifestAny> {
  const manifestText = new TextDecoder().decode(manifestData)
  return parseAndValidateManifestFromText(manifestText)
}

/**
 * Genera un extension ID a partir del nombre del autor y de la extensión.
 * Usa el mismo algoritmo que el backend de directorio, para consistencia.
 */
export function generateExtensionId(
  manifest: McpbManifestAny,
  prefix?: 'local.unpacked' | 'local.dxt',
): string {
  const sanitize = (str: string): string =>
    str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_.]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')

  const authorName = manifest.author.name
  const extensionName = manifest.name

  const sanitizedAuthor = sanitize(authorName)
  const sanitizedName = sanitize(extensionName)

  return prefix
    ? `${prefix}.${sanitizedAuthor}.${sanitizedName}`
    : `${sanitizedAuthor}.${sanitizedName}`
}
