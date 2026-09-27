/**
 * Enrutamiento modelo→upstream de la pasarela — porte de 2.1.283:
 * `chunk-wg7ts4cy.js` `So` [1007033), `Nv` [1007129), `mj` [1006919),
 * `so` [1007262), `D_` [1063275); `GC` en `chunk-4h0c4z04.js` [24523).
 *
 * Divergencia declarada: `GC` recorre la tabla global `Po` del ejecutable;
 * aquí el catálogo se recibe como parámetro (por defecto el de
 * `model/configs.ts`), para poder medirlo sin depender de su vigencia.
 */
import { ALL_MODEL_CONFIGS } from '../model/configs.js'

/** Una familia: id por proveedor; `null` si ese proveedor no la sirve. */
export type CatalogFamily = Record<string, string | null | undefined>
export type ModelCatalog = Record<string, CatalogFamily>

export type GatewayUpstream = { name: string; provider: string; models?: string[] }
export type GatewayModelEntry = {
  id: string
  upstream_model: Record<string, string | undefined>
  /** Lo que `/v1/models` muestra como `display_name`; por defecto, el id. */
  label?: string
  description?: string
}
export type GatewayRoutingConfig = {
  upstreams: GatewayUpstream[]
  models: GatewayModelEntry[]
  auto_include_builtin_models: boolean
}

export type UpstreamModelResolution =
  | { ok: true; model: string }
  | { ok: false; error: string; listSkip?: true }

const DEFAULT_CATALOG = ALL_MODEL_CONFIGS as unknown as ModelCatalog

/** `GC`: la familia del catálogo que declara este id en cualquier proveedor. */
export function catalogFamilyOf(model: string, catalog: ModelCatalog = DEFAULT_CATALOG): CatalogFamily | null {
  const wanted = model.toLowerCase()
  for (const family of Object.values(catalog)) {
    for (const id of Object.values(family)) {
      if (typeof id === 'string' && id.toLowerCase() === wanted) return family
    }
  }
  return null
}

/** `So`: el id tal como puede ir en un mensaje de error. */
export function printableModel(model: string): string {
  const printable = model.replace(/[^\x20-\x7e]/g, '')
  return printable.length > 128 ? `${printable.slice(0, 128)}...` : printable
}

/** `Nv`: sin lista, el upstream sirve todo; con lista, por id o por familia. */
export function upstreamServesModel(
  upstream: GatewayUpstream,
  model: string,
  catalog: ModelCatalog = DEFAULT_CATALOG,
): boolean {
  if (!upstream.models) return true
  const family = catalogFamilyOf(model, catalog)
  return upstream.models.some(
    m => m.toLowerCase() === model.toLowerCase() || (family !== null && catalogFamilyOf(m, catalog) === family),
  )
}

/** `mj`: la entrada del operador para este modelo, por id o por familia. */
export function modelEntryFor(
  model: string,
  models: readonly GatewayModelEntry[],
  catalog: ModelCatalog = DEFAULT_CATALOG,
): GatewayModelEntry | undefined {
  const family = catalogFamilyOf(model, catalog)
  const wanted = model.toLowerCase()
  return models.find(
    entry => entry.id.toLowerCase() === wanted || (family !== null && catalogFamilyOf(entry.id, catalog) === family),
  )
}

/** `so`: el id que este upstream recibe para `model`, o por qué no. */
export function resolveUpstreamModel(
  model: string,
  upstream: GatewayUpstream,
  models: readonly GatewayModelEntry[],
  includeBuiltin = true,
  publicErrors = false,
  catalog: ModelCatalog = DEFAULT_CATALOG,
): UpstreamModelResolution {
  const family = catalogFamilyOf(model, catalog)
  const shown = printableModel(model)
  if (!upstreamServesModel(upstream, model, catalog)) {
    return {
      ok: false,
      listSkip: true,
      error: publicErrors
        ? `model ${shown} is not available on this upstream`
        : `model ${shown} is not served by upstream '${upstream.name}'`,
    }
  }
  const entry = modelEntryFor(model, models, catalog)
  const override = entry?.upstream_model[upstream.name]
  if (override) return { ok: true, model: override }
  if (family && (includeBuiltin || entry)) {
    const id = upstream.provider === 'anthropic' ? family.firstParty : family[upstream.provider]
    if (!id) {
      return {
        ok: false,
        error: publicErrors
          ? `model ${shown} is not available on this upstream`
          : `model ${shown} is not available on ${upstream.provider}`,
      }
    }
    return { ok: true, model: id }
  }
  if (entry) {
    return {
      ok: false,
      error: publicErrors
        ? `model ${shown} is not configured for this upstream`
        : `model ${shown} has no upstream_model.${upstream.name} configured`,
    }
  }
  return { ok: false, error: `model ${shown} is not in the operator's model allowlist` }
}

/** `D_`: el primer upstream, en orden de configuración, que resuelve el modelo. */
export function routeModel(
  config: GatewayRoutingConfig,
  model: string,
  catalog: ModelCatalog = DEFAULT_CATALOG,
): { upstream: GatewayUpstream; model: string } | undefined {
  for (const upstream of config.upstreams) {
    const resolved = resolveUpstreamModel(
      model,
      upstream,
      config.models,
      config.auto_include_builtin_models,
      false,
      catalog,
    )
    if (resolved.ok) return { upstream, model: resolved.model }
  }
  return undefined
}
