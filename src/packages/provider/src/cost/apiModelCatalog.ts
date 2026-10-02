/**
 * El catálogo de modelos de API de un proveedor ajeno a Anthropic, transcrito
 * de su página pública a un TSV versionado (`apiModels/<proveedor>.tsv`).
 * El catálogo de Anthropic sigue en `@thyrox/agent/models`; éste cubre los
 * proveedores cuyo catálogo no viaja en el cliente.
 *
 * Cada fila declara sólo lo que la página publica: la capacidad (chat →
 * `completion`, embedding → `embeddings`), el precio de entrada y de salida
 * en USD por millón de tokens (un rango cuando el proveedor cobra por
 * tramos), el contexto, la salida máxima y el ciclo de vida. Una celda `-`
 * significa «no publicado», nunca cero. Ninguna capacidad se infiere del
 * nombre: lo que el modelo sabe hacer de verdad lo mide su cualificación.
 *
 * El nombre de cada entrada es `api:<proveedor>:<modelo>`, y con él compite
 * en la misma selección que un modelo local (`qualifiedEmbeddingModels`).
 *
 * Métrica: las cifras de la página, con su redondeo («131.1 K» se lee como
 * 131 100 tokens, «1 M» como 1 000 000).
 * Ciega a: el valor exacto que el redondeo de la página oculta, y a cambios
 * de precio o de ciclo de vida posteriores a la transcripción.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ModelCapability } from '@thyrox/model-artifacts/catalogEntry.ts'

export const ALIBABA_MODEL_STUDIO_CATALOG_PATH = join(dirname(fileURLToPath(import.meta.url)), 'apiModels', 'alibaba-model-studio.tsv')

export const API_MODEL_LIFECYCLES = ['active', 'partially-retiring', 'retiring'] as const
export type ApiModelLifecycle = (typeof API_MODEL_LIFECYCLES)[number]

const API_MODEL_CAPABILITIES: readonly ModelCapability[] = ['completion', 'embeddings']

export interface PriceRange {
  readonly min: number
  readonly max: number
}

export interface ApiModelEntry {
  readonly name: string
  readonly provider: string
  readonly model: string
  readonly displayName: string
  readonly route: 'api'
  readonly capabilities: readonly ModelCapability[]
  readonly lifecycle: ApiModelLifecycle
  readonly inputUsdPerMTokens: PriceRange
  readonly outputUsdPerMTokens?: PriceRange
  readonly contextTokens?: number
  readonly maxOutputTokens?: number
}

export class InvalidApiModelCatalogError extends Error {
  constructor(readonly path: string, readonly line: number, readonly field: string, reason: string) {
    super(`catálogo de API inválido (${path}), línea ${line}: ${field}: ${reason}`)
    this.name = 'InvalidApiModelCatalogError'
  }
}

const COLUMNS = ['id', 'displayName', 'inputUsdPerMTokens', 'outputUsdPerMTokens', 'context', 'maxOutput', 'lifecycle', 'capability'] as const
type Column = (typeof COLUMNS)[number]
type Row = Readonly<Record<Column, string>>

const UNPUBLISHED = '-'
const SIZE_PATTERN = /^(\d+(?:\.\d+)?) (K|M)$/
const SIZE_MULTIPLIERS: Readonly<Record<string, number>> = { K: 1_000, M: 1_000_000 }
const PRICE_PATTERN = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/
const FIRST_DATA_LINE = 2

export async function loadApiModelCatalog(path: string, provider: string): Promise<ApiModelEntry[]> {
  const [header, ...lines] = (await readFile(path, 'utf8')).split('\n').filter(line => line.trim() !== '')
  if (header !== COLUMNS.join('\t')) throw new InvalidApiModelCatalogError(path, 1, '<cabecera>', `se espera ${COLUMNS.join(', ')}`)
  return lines.map((line, index) => entryOf(new RowReader(path, index + FIRST_DATA_LINE, line), provider))
}

function entryOf(reader: RowReader, provider: string): ApiModelEntry {
  const model = reader.text('id')
  const output = reader.optional('outputUsdPerMTokens', reader.price)
  const context = reader.optional('context', reader.size)
  const maxOutput = reader.optional('maxOutput', reader.size)
  return {
    name: `api:${provider}:${model}`,
    provider,
    model,
    displayName: reader.text('displayName'),
    route: 'api',
    capabilities: [reader.oneOf('capability', API_MODEL_CAPABILITIES)],
    lifecycle: reader.oneOf('lifecycle', API_MODEL_LIFECYCLES),
    inputUsdPerMTokens: reader.price('inputUsdPerMTokens'),
    ...(output === undefined ? {} : { outputUsdPerMTokens: output }),
    ...(context === undefined ? {} : { contextTokens: context }),
    ...(maxOutput === undefined ? {} : { maxOutputTokens: maxOutput }),
  }
}

/** Una fila del TSV: cada lectura nombra su línea y su columna al rehusar. */
class RowReader {
  private readonly row: Row

  constructor(private readonly path: string, private readonly line: number, text: string) {
    const cells = text.split('\t')
    if (cells.length !== COLUMNS.length) this.refuse('<fila>', `se esperan ${COLUMNS.length} columnas, hay ${cells.length}`)
    this.row = Object.fromEntries(COLUMNS.map((column, index) => [column, cells[index] ?? ''])) as Row
  }

  text(column: Column): string {
    const value = this.row[column]
    if (value === '' || value === UNPUBLISHED) this.refuse(column, 'se espera un valor publicado')
    return value
  }

  oneOf<Value extends string>(column: Column, allowed: readonly Value[]): Value {
    const value = this.row[column]
    if (!(allowed as readonly string[]).includes(value)) this.refuse(column, `«${value}» no es ${allowed.join(', ')}`)
    return value as Value
  }

  optional<Value>(column: Column, read: (column: Column) => Value): Value | undefined {
    return this.row[column] === UNPUBLISHED ? undefined : read.call(this, column)
  }

  price(column: Column): PriceRange {
    const match = PRICE_PATTERN.exec(this.row[column])
    if (match === null) return this.refuse(column, `«${this.row[column]}» no es un precio ni un rango de precios`)
    const min = Number(match[1])
    const max = match[2] === undefined ? min : Number(match[2])
    if (max < min) this.refuse(column, `el rango ${min}-${max} está invertido`)
    return { min, max }
  }

  size(column: Column): number {
    const match = SIZE_PATTERN.exec(this.row[column])
    if (match === null) return this.refuse(column, `«${this.row[column]}» no es un tamaño publicado («131.1 K», «1 M»)`)
    return Math.round(Number(match[1]) * (SIZE_MULTIPLIERS[match[2] as string] as number))
  }

  private refuse(field: string, reason: string): never {
    throw new InvalidApiModelCatalogError(this.path, this.line, field, reason)
  }
}
