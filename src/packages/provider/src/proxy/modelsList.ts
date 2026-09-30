/**
 * La lista de `GET /v1/models` del proxy local — porte de `Ih` y `qv`
 * (pasarela del ejecutable 2.1.283, `chunk-wg7ts4cy.js`, leída como
 * referencia): primero los modelos que el operador declara; con
 * `auto_include_builtin_models`, además cada familia del catálogo que algún
 * upstream puede servir.
 *
 * El orden de las familias es el del ejecutable: `opus46`, `sonnet45` y
 * `haiku45` primero, y el resto de su lista de familias (`Ij`) invertida
 * —lo más nuevo antes—. Una clave que el catálogo no tenga se salta.
 *
 * Divergencia declarada: el cuarto argumento de `Ih` filtra por la lista de
 * modelos permitidos de la política administrada (`bh`); el proxy local no
 * tiene política administrada.
 */
import {
  type GatewayModelEntry,
  type GatewayUpstream,
  type ModelCatalog,
  upstreamServesModel,
} from './upstreamRouting.ts'
import { ALL_MODEL_CONFIGS } from '../model/configs.js'

/** `Ij` del ejecutable, en su orden declarado. */
const CATALOG_KEYS = ['haiku45', 'sonnet45', 'sonnet46', 'sonnet5', 'opus41', 'opus46', 'opus47', 'opus48', 'opus5', 'opus55', 'fable5', 'fable51']
/** `bLr`, `Q$` y `ace`: las tres que van primero. */
const LEADING_KEYS = ['opus46', 'sonnet45', 'haiku45']

export const BUILTIN_MODEL_ORDER: readonly string[] = [
  ...LEADING_KEYS,
  ...CATALOG_KEYS.filter(key => !LEADING_KEYS.includes(key)).reverse(),
]

export type ListedModel = { type: 'model'; id: string; display_name: string; description?: string }

/** `Ih`. */
export function listGatewayModels(
  models: readonly GatewayModelEntry[],
  upstreams: readonly GatewayUpstream[],
  includeBuiltin: boolean,
  catalog: ModelCatalog = ALL_MODEL_CONFIGS as unknown as ModelCatalog,
): ListedModel[] {
  const listed = new Map<string, ListedModel>()
  for (const entry of models) {
    listed.set(entry.id, {
      type: 'model',
      id: entry.id,
      display_name: entry.label ?? entry.id,
      ...(entry.description && { description: entry.description }),
    })
  }
  if (!includeBuiltin) return [...listed.values()]
  for (const key of BUILTIN_MODEL_ORDER) {
    const family = catalog[key]
    const firstParty = family?.firstParty
    if (!family || typeof firstParty !== 'string' || listed.has(firstParty)) continue
    const served = upstreams.some(
      upstream =>
        upstream.provider === 'anthropic' ||
        (family[upstream.provider] !== null && upstreamServesModel(upstream, firstParty, catalog)),
    )
    if (served) listed.set(firstParty, { type: 'model', id: firstParty, display_name: firstParty })
  }
  return [...listed.values()]
}

/** `qv`: la respuesta con la forma paginada de la API, en una sola página. */
export function modelsResponse(
  models: readonly GatewayModelEntry[],
  upstreams: readonly GatewayUpstream[],
  includeBuiltin: boolean,
): Response {
  return Response.json({ data: listGatewayModels(models, upstreams, includeBuiltin), has_more: false, first_id: null, last_id: null })
}
