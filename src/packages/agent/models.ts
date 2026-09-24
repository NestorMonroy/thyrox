/**
 * El catálogo de modelos que el ejecutable vendorizado declara, tipado.
 *
 * La fuente es `src/models.jsonl`, que `bin/extract_model_registry.py --stdout`
 * deriva del volcado `_references/claude-code-bin/<versión>/claude_strings.txt`. No
 * se escribe a mano: la suite lo re-deriva y exige igualdad byte a byte, que
 * es el control que faltó cuando el extractor publicó los 63 booleanos del
 * catálogo invertidos (H-DOCS-1003).
 *
 * Es **JSON Lines**: 28 registros etiquetados con `kind` — una `meta`, un
 * `tier` por tier y un `model` por registro. Cada línea se clasifica por lo
 * que DICE, no por dónde está: una cabecera por posición repetiría el defecto
 * de :ref:`h-thyrox-37` un nivel más abajo. Por eso el módulo NO puede usar
 * el cargador JSON de bun (`import … with { type: 'json' }`), que exige un
 * documento único: lee el archivo y reconstruye el catálogo línea a línea.
 *
 * Por qué el paquete lo necesita (directiva del ejecutor 2026-09-02): un agente
 * NO se nombra por alias, porque el alias resuelve a tiers distintos según el
 * proveedor — `sonnet` es `claude-sonnet-5` (tier_2_10, ventana 1 M) en
 * first-party y `claude-sonnet-4-5` (tier_3_15, 200 k) en Bedrock. Con el
 * identificador completo el tier, la ventana y el coste quedan fijados en la
 * definición y no en quién sirva la petición.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Los seis precios de un tier, en USD por millón de tokens. */
export type PricingTier = {
  input: number
  output: number
  cache_write_5m: number
  cache_write_1h: number
  cache_read: number
  web_search: number
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type ModelRecord = {
  id: string
  family: string
  display_name: string
  knowledge_cutoff?: string
  provider_ids: Record<string, string>
  context?: { window: number; native_1m?: boolean; supports_1m_beta?: boolean }
  max_output_tokens?: { default: number; upper: number }
  /** El nombre del tier, tal como el catálogo lo declara (`pricing:"tier_5_25"`). */
  pricing_tier: string | null
  /** El tier ya resuelto a sus seis valores, o `null` si el registro no lo nombra. */
  pricing: PricingTier | null
  capabilities?: string[]
  default_effort?: EffortLevel
  effort_cost_index?: Record<EffortLevel, number>
  advisor_rank?: number
  fallback_3p?: string
  [otra: string]: unknown
}

type Catalog = {
  fuente: string
  schema_version: number
  pricing_tiers: Record<string, PricingTier>
  models: ModelRecord[]
  aliases: Record<string, { default: string; per_provider?: Record<string, string> }>
  defaults: Record<string, unknown>
  best: string | null
  latest_per_family: Record<string, string>
  alias_migration: Record<string, unknown>
}

/** El sobre que el extractor añade a cada línea; no es una clave del catálogo. */
type TaggedRecord = { kind: 'meta' | 'tier' | 'model'; [otra: string]: unknown }

/**
 * Reconstruye el catálogo de nueve claves desde los registros etiquetados.
 *
 * La propiedad que esto no puede romper: el objeto resultante es **igual** al
 * que producía el import estático — mismas nueve claves de raíz, mismos
 * modelos en el mismo orden, mismos tiers. Esa igualdad es el control, no
 * «el archivo parsea».
 *
 * `kind` se retira de cada registro: es nuestro sobre de transporte, y dejarlo
 * dentro haría que un `ModelRecord` declarara un campo que el ejecutable
 * vendorizado nunca emitió.
 */
function readCatalog(file: string): Catalog {
  const records = readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as TaggedRecord)

  const meta = records.find((r) => r.kind === 'meta')
  if (!meta) {
    // Rehusar, no devolver un catálogo vacío: un catálogo sin meta se leería
    // como «no hay modelos» en vez de «no pude leer el archivo».
    throw new Error(`${file}: ningún registro declara kind "meta"`)
  }

  const pricing_tiers: Record<string, PricingTier> = {}
  for (const r of records) {
    if (r.kind === 'tier') pricing_tiers[r.name as string] = r.pricing as PricingTier
  }

  const models: ModelRecord[] = []
  for (const r of records) {
    if (r.kind !== 'model') continue
    const { kind: _kind, ...fila } = r
    models.push(fila as unknown as ModelRecord)
  }

  const { kind: _k, ...resto } = meta
  return { ...resto, pricing_tiers, models } as unknown as Catalog
}

const HERE = dirname(fileURLToPath(import.meta.url))

export const CATALOG = readCatalog(join(HERE, 'models.jsonl'))

/** Los identificadores que el ejecutable vendorizado declara, en su orden. */
export const MODEL_IDS = CATALOG.models.map((m) => m.id) as readonly string[]
export type ModelId = (typeof MODEL_IDS)[number]

export const MODELS: Record<string, ModelRecord> = Object.fromEntries(
  CATALOG.models.map((m) => [m.id, m]),
)

export const PRICING_TIERS = CATALOG.pricing_tiers

/** ¿Es un identificador completo del catálogo? Un alias (`sonnet`) NO lo es. */
export function isModelId(value: string): value is ModelId {
  return Object.hasOwn(MODELS, value)
}

/** ¿Es uno de los alias que el tool `Agent` admite (`opus`, `sonnet`, …)? */
export function isModelAlias(value: string): boolean {
  return Object.hasOwn(CATALOG.aliases, value)
}

/**
 * A qué identificador resuelve un alias en un proveedor dado.
 *
 * `first_party` es el que sirve esta sesión; el resto reproduce el mapa
 * `per_provider` del ejecutable. Un identificador completo se devuelve tal
 * cual. Devuelve `null` si el alias no existe.
 */
export function resolveModel(
  aliasOrId: string,
  provider: string = 'first_party',
): string | null {
  if (isModelId(aliasOrId)) return aliasOrId
  const alias = CATALOG.aliases[aliasOrId]
  if (!alias) return null
  return alias.per_provider?.[provider] ?? alias.default
}

export type Usage = {
  input_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  output_tokens?: number
}

/**
 * Coste en USD de un consumo, con el tier del modelo y el TTL de caché.
 *
 * Es la forma que `eke` del ejecutable calcula (cuatro términos), sin el
 * multiplicador geográfico ni el reparto 5m/1h dentro de un mismo turno —
 * ver `analisis-catalogo-de-modelos-y-cache-en-el-binario`. Sirve para
 * comparar definiciones entre sí con la MISMA mezcla de tokens, no para
 * facturar.
 */
export function usageCostUsd(
  modelId: string,
  usage: Usage,
  cacheTtl: '5m' | '1h' = '1h',
): number {
  const model = MODELS[modelId]
  if (!model?.pricing) {
    throw new Error(`${modelId}: sin tier de precio en el catálogo`)
  }
  const p = model.pricing
  const write = cacheTtl === '1h' ? p.cache_write_1h : p.cache_write_5m
  return (
    ((usage.input_tokens ?? 0) * p.input +
      (usage.cache_creation_tokens ?? 0) * write +
      (usage.cache_read_tokens ?? 0) * p.cache_read +
      (usage.output_tokens ?? 0) * p.output) /
    1e6
  )
}

/**
 * Consumo en **tokens equivalentes**: la unidad de coste que NO depende de la
 * tarifa.
 *
 * `usageCostUsd` responde «cuánto se factura», y su respuesta cambia cuando
 * cambia la tabla de precios de una build. Ésta responde «cuánto consumió»
 * ponderando los cuatro componentes por los **cocientes** del tier respecto a
 * su token de entrada: el precio de lista se cancela y quedan las proporciones.
 * Dos ejecuciones se comparan con ella aunque la tarifa se mueva.
 *
 * Y es una tercera unidad distinta del **token crudo**, que es la de
 * *capacidad*: lo que cabe en la ventana no se pondera, se cuenta.
 *
 * `basis` fija el tier cuyos cocientes ponderan. Sin él, cada modelo se pesa
 * con los suyos —correcto para medir UN modelo contra sí mismo— y con él, dos
 * modelos se miden con la misma vara. Ponderar todo un corpus con una base
 * única tiene un sesgo declarado: `claude-fable-5-1` lee caché a 0.025 de su
 * entrada donde el tier 3/15 la lee a 0.1, así que una base sonnet lo
 * subestima 4x en el componente que domina el consumo de un subagente.
 *
 * `unit` responde otra pregunta y NO es intercambiable con `basis`: pondera
 * con los precios **reales del modelo** y sólo expresa el resultado en el
 * token de entrada de otro tier. La diferencia de precio entre dos modelos
 * **sobrevive** — que es exactamente lo que se compara al decidir una ruta de
 * cambio de modelo, y lo que `basis` borra por construcción (con la misma
 * base, dos modelos dan el mismo número). Pedir los dos a la vez lanza.
 *
 * Corolario que hace falta al comparar modelos: con `unit` fijo, el
 * equivalente es el USD dividido por un escalar positivo común, así que el
 * **orden** entre candidatos es idéntico en las dos unidades. Con la vara de
 * cada modelo no lo es — y ahí el ranking se invierte (`policy.ts`).
 */
export function usageEquivalentTokens(
  modelId: string,
  usage: Usage,
  opts: { basis?: string; unit?: string; cacheTtl?: '5m' | '1h' } = {},
): number {
  if (opts.basis !== undefined && opts.unit !== undefined) {
    throw new Error('basis y unit son dos varas distintas: pedir las dos a la vez no tiene respuesta única')
  }
  // `basis` descarta los precios del modelo; `unit` los conserva y sólo cambia
  // el denominador. Sin ninguno de los dos, el modelo es su propia vara.
  const tierDe = opts.basis ?? modelId
  const model = MODELS[tierDe]
  if (!model?.pricing) {
    throw new Error(`${tierDe}: sin tier de precio en el catálogo`)
  }
  const p = model.pricing
  const vara = opts.unit === undefined ? p.input : MODELS[opts.unit]?.pricing?.input
  if (vara === undefined) {
    throw new Error(`${opts.unit}: sin tier de precio en el catálogo`)
  }
  const write = (opts.cacheTtl ?? '1h') === '1h' ? p.cache_write_1h : p.cache_write_5m
  // Sin `unit`, el token de entrada del propio tier es la vara e `input` queda
  // en 1 por construcción. Con `unit`, la vara es ajena y ese 1 se pierde: es
  // justo lo que hace que la diferencia de precio entre dos modelos sobreviva.
  return (
    ((usage.input_tokens ?? 0) * p.input +
      (usage.cache_creation_tokens ?? 0) * write +
      (usage.cache_read_tokens ?? 0) * p.cache_read +
      (usage.output_tokens ?? 0) * p.output) /
    vara
  )
}

/**
 * El índice de coste relativo de un nivel de esfuerzo (`high` = 1) que el
 * registro declara. `null` si el modelo no lo declara — que es distinto de 1.
 */
export function effortCostIndex(modelId: string, level: EffortLevel): number | null {
  return MODELS[modelId]?.effort_cost_index?.[level] ?? null
}

/**
 * El identificador canonico de un modelo: la cadena de familias de `mSe`
 * (binario 2.1.275, `chunk-xbd48fav.js`) que reduce una variante fechada,
 * con sufijo de contexto o con prefijo de proveedor al registro del catalogo
 * — `claude-opus-4-7-20250101` -> `claude-opus-4-7`.
 *
 * Divergencia declarada: el binario consulta antes dos tablas que aqui no
 * existen —los overrides por organizacion (`Oye`) y el mapa de perfiles de
 * inferencia de Bedrock (`mR`/`DN`)— y cae a esta cadena cuando las dos
 * callan, que es siempre en este arbol. Sin familia reconocida devuelve la
 * entrada en minusculas y sin el sufijo `[1m]`.
 */
export function canonicalModelName(model: string): string {
  const e = model.toLowerCase()
  for (const family of CANONICAL_FAMILIES) if (e.includes(family)) return family
  if (/claude-opus-4(?!-\d(?!\d))/.test(e)) return 'claude-opus-4-0'
  if (/claude-sonnet-4(?!-\d(?!\d))/.test(e)) return 'claude-sonnet-4-0'
  return e.replace(/\[1m\]$/, '')
}

/** El orden de `mSe`: la variante mas especifica antes que su prefijo. */
const CANONICAL_FAMILIES = [
  'claude-fable-5-1', 'claude-fable-5', 'claude-mythos-5-1', 'claude-mythos-5', 'claude-opus-5',
  'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5', 'claude-opus-4-1',
  'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5',
  'claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus', 'claude-3-sonnet',
  'claude-3-haiku',
] as const
