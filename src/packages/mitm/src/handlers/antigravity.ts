/**
 * El agente `antigravity`, el IDE sobre Gemini. Sus peticiones llegan en el
 * formato nativo de Gemini GenerateContent (`contents`, `systemInstruction`,
 * `generationConfig`, …) y el proxy local espera OpenAI Chat Completions: el
 * cuerpo se traduce antes de reenviarlo, porque los campos de Gemini que el
 * upstream no conoce terminan en un 400 «invalid argument».
 *
 * `fetchAvailableModels` es otra cosa: va al upstream de Google tal cual, y a
 * su catálogo se le suman los modelos que sirve el proxy local, para que el
 * IDE los ofrezca en su selector.
 *
 * Porte de `omniroute: src/mitm/handlers/antigravity.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PRODUCT_NAME } from '@thyrox/config/product'
import { proxyBaseUrl, proxyClientKey } from '@thyrox/provider/proxy/proxyEndpoint'
import type { InterceptedRequest } from '../inspector/types.ts'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase, createBoundedCollector } from './base.ts'
import { withCliToolNames } from './cliToolNames.ts'

interface GeminiPart {
  text?: string
}

interface GeminiContent {
  role?: string
  parts?: GeminiPart[]
}

interface GeminiGenerationConfig {
  maxOutputTokens?: number
  temperature?: number
  topP?: number
  stopSequences?: string[]
}

interface GeminiRequestBody {
  systemInstruction?: GeminiContent
  contents?: GeminiContent[]
  generationConfig?: GeminiGenerationConfig
  /**
   * El sobre de `cloudcode-pa.googleapis.com/v1internal:generateContent`, que
   * es lo que envía el IDE: la petición de Gemini va un nivel abajo. La ruta
   * `/v1beta/models/<modelo>:generateContent` la lleva en la raíz.
   */
  request?: GeminiRequestBody
  [key: string]: unknown
}

/** El objeto que lleva la conversación: el interior del sobre, o la raíz. */
function conversationOf(body: GeminiRequestBody): GeminiRequestBody {
  const inner = body.request
  const holdsConversation =
    inner && typeof inner === 'object' && ('contents' in inner || 'systemInstruction' in inner || 'generationConfig' in inner)
  return holdsConversation ? inner : body
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIChatBody {
  model: string
  messages: OpenAIChatMessage[]
  stream: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  stop?: string[]
}

function joinPartsText(parts: GeminiPart[] | undefined): string {
  return (parts ?? [])
    .map(p => p.text)
    .filter((t): t is string => Boolean(t))
    .join('\n')
}

/** Un cuerpo Gemini GenerateContent como cuerpo OpenAI chat.completions. */
export function convertGeminiToOpenAI(geminiBody: GeminiRequestBody, model: string, stream: boolean): OpenAIChatBody {
  const source = conversationOf(geminiBody)
  const messages: OpenAIChatMessage[] = []
  const systemText = joinPartsText(source.systemInstruction?.parts)
  if (systemText) messages.push({ role: 'system', content: systemText })
  for (const content of source.contents ?? []) {
    messages.push({ role: content.role === 'model' ? 'assistant' : 'user', content: joinPartsText(content.parts) })
  }

  const openaiBody: OpenAIChatBody = { model, messages, stream }
  const config = source.generationConfig ?? {}
  if (config.maxOutputTokens != null) openaiBody.max_tokens = config.maxOutputTokens
  if (config.temperature != null) openaiBody.temperature = config.temperature
  if (config.topP != null) openaiBody.top_p = config.topP
  if (config.stopSequences?.length) openaiBody.stop = config.stopSequences
  return openaiBody
}

export interface DynamicCatalogModel {
  id: string
  displayName?: string
  description?: string
}

type CatalogEntry = Record<string, unknown>

function describe(model: DynamicCatalogModel): CatalogEntry {
  return {
    displayName: model.displayName || model.id,
    descriptionText: model.description || `${PRODUCT_NAME} dynamic model (${model.id})`,
  }
}

/** Un catálogo en arreglo: cada modelo nuevo copia el primero. */
function mergeIntoArray(models: CatalogEntry[], dynamicModels: DynamicCatalogModel[], injected: string[]): CatalogEntry[] {
  const merged = [...models]
  const template = merged[0] ?? {}
  for (const model of dynamicModels) {
    if (!model.id || merged.some(existing => existing.id === model.id || existing.name === model.id)) continue
    injected.push(model.id)
    merged.push({ ...template, id: model.id, name: model.id, ...describe(model) })
  }
  return merged
}

/** Los modelos nativos que sirven de plantilla, en orden de preferencia. */
const TEMPLATE_MODEL_IDS = ['claude-sonnet-4-6', 'gemini-2.5-pro', 'gemini-3.7-flash-medium']

/** Un catálogo en objeto: cada modelo nuevo copia uno nativo conocido. */
function mergeIntoObject(
  models: Record<string, CatalogEntry>,
  dynamicModels: DynamicCatalogModel[],
  injected: string[],
): Record<string, CatalogEntry> {
  const merged = { ...models }
  const template = TEMPLATE_MODEL_IDS.map(id => merged[id]).find(Boolean) ?? Object.values(merged)[0] ?? {}
  for (const model of dynamicModels) {
    if (!model.id || merged[model.id]) continue
    injected.push(model.id)
    merged[model.id] = {
      ...template,
      ...(typeof template.id === 'string' ? { id: model.id } : {}),
      ...(typeof template.name === 'string' ? { name: model.id } : {}),
      ...describe(model),
    }
  }
  return merged
}

/** Los modelos inyectados, al frente del primer grupo recomendado. */
function withInjectedFirst(sortsValue: unknown, injected: string[]): CatalogEntry[] {
  const sorts = Array.isArray(sortsValue) && sortsValue.length > 0 ? [...(sortsValue as CatalogEntry[])] : [{ groups: [] }]
  const firstSort = { ...sorts[0] }
  const groups = Array.isArray(firstSort.groups) && firstSort.groups.length > 0 ? [...(firstSort.groups as CatalogEntry[])] : [{}]
  const firstGroup = { ...groups[0] }
  const existing = Array.isArray(firstGroup.modelIds) ? (firstGroup.modelIds as string[]) : []
  firstGroup.modelIds = [...injected, ...existing.filter(id => !injected.includes(id))]
  groups[0] = firstGroup
  firstSort.groups = groups
  sorts[0] = firstSort
  return sorts
}

/**
 * El catálogo de `fetchAvailableModels` con los modelos dinámicos sumados. Un
 * modelo nativo con el mismo id se conserva intacto.
 */
export function mergeAntigravityCatalog(catalog: CatalogEntry, dynamicModels: DynamicCatalogModel[]): CatalogEntry {
  if (dynamicModels.length === 0) return catalog
  const injected: string[] = []
  const models = Array.isArray(catalog.models)
    ? mergeIntoArray(catalog.models as CatalogEntry[], dynamicModels, injected)
    : mergeIntoObject(
        catalog.models && typeof catalog.models === 'object' ? (catalog.models as Record<string, CatalogEntry>) : {},
        dynamicModels,
        injected,
      )
  return { ...catalog, models, agentModelSorts: withInjectedFirst(catalog.agentModelSorts, injected) }
}

interface ListedModel {
  id?: unknown
  display_name?: unknown
  description?: unknown
}

/** Los modelos que lista el proxy local; si no responde, ninguno. */
export async function proxyCatalogModels(): Promise<DynamicCatalogModel[]> {
  try {
    const key = proxyClientKey()
    const response = await fetch(`${proxyBaseUrl()}/v1/models`, {
      headers: key ? { authorization: `Bearer ${key}` } : {},
    })
    if (!response.ok) return []
    const { data } = (await response.json()) as { data?: ListedModel[] }
    return (data ?? []).flatMap(model =>
      typeof model.id === 'string' && model.id
        ? [
            {
              id: model.id,
              displayName: typeof model.display_name === 'string' ? model.display_name : model.id,
              ...(typeof model.description === 'string' ? { description: model.description } : {}),
            },
          ]
        : [],
    )
  } catch {
    // Sin proxy no hay modelos que sumar: el catálogo nativo sigue sirviendo.
    return []
  }
}

/** Las cabeceras de la petición del IDE, sin las que describen la conexión saliente. */
const CONNECTION_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding'])

function upstreamHeadersOf(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase()
    if (value === undefined || CONNECTION_HEADERS.has(lower)) continue
    headers[lower] = Array.isArray(value) ? value.join(', ') : value
  }
  headers['content-type'] ??= 'application/json'
  return headers
}

const DEFAULT_CATALOG_HOST = 'cloudcode-pa.googleapis.com'

export class AntigravityHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'antigravity'

  /** `catalogModels` fija los modelos dinámicos; sin él, los del proxy local. */
  constructor(private readonly catalogModels?: DynamicCatalogModel[]) {
    super()
  }

  getDynamicCatalogModels(): Promise<DynamicCatalogModel[]> {
    return this.catalogModels ? Promise.resolve(this.catalogModels) : proxyCatalogModels()
  }

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    const startedAt = this.now()
    const intercepted = await this.hookBufferStart(req, body, mappedModel)
    try {
      const url = req.url ?? ''
      if (url.includes(':fetchAvailableModels')) {
        await this.interceptFetchAvailableModels(req, res, body, intercepted, startedAt)
        return
      }
      const geminiBody = JSON.parse(body.toString()) as GeminiRequestBody
      const payload = convertGeminiToOpenAI(geminiBody, mappedModel, url.includes(':streamGenerateContent'))
      const upstreamStart = this.now()
      const upstream = await this.fetchRouter(payload, '/v1/chat/completions', req.headers)
      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '')
        throw new Error(`proxy ${upstream.status}: ${errText}`)
      }
      // La copia del inspector lleva los nombres del CLI; al IDE le llega la respuesta tal cual.
      const sink = createBoundedCollector()
      await this.pipeSSE(upstream, res, chunk => sink.push(withCliToolNames(chunk.toString())))
      const total = this.now() - startedAt
      this.hookBufferUpdate(intercepted, {
        status: upstream.status,
        responseHeaders: Object.fromEntries(upstream.headers.entries()),
        responseBody: sink.text,
        responseSize: sink.totalBytes,
        proxyLatencyMs: upstreamStart - startedAt,
        upstreamLatencyMs: total - (upstreamStart - startedAt),
      })
    } catch (err) {
      this.hookBufferError(intercepted, err)
      this.writeError(res, err)
    }
  }

  private async interceptFetchAvailableModels(
    req: IncomingMessage,
    res: ServerResponse,
    body: Buffer,
    intercepted: InterceptedRequest,
    startedAt: number,
  ): Promise<void> {
    const host = (typeof req.headers.host === 'string' && req.headers.host) || DEFAULT_CATALOG_HOST
    const upstreamStart = this.now()
    const upstream = await fetch(`https://${host}${req.url || '/v1internal:fetchAvailableModels'}`, {
      method: req.method || 'POST',
      headers: upstreamHeadersOf(req),
      body: body.length > 0 ? body.toString() : JSON.stringify({}),
    })
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      throw new Error(`Google upstream ${upstream.status}: ${errText}`)
    }

    const catalog = (await upstream.json()) as CatalogEntry
    const text = JSON.stringify(mergeAntigravityCatalog(catalog, await this.getDynamicCatalogModels()))
    const responseHeaders = {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(text)),
    }
    if (!res.headersSent) res.writeHead(upstream.status, responseHeaders)
    res.end(text)

    const total = this.now() - startedAt
    this.hookBufferUpdate(intercepted, {
      status: upstream.status,
      responseHeaders,
      responseBody: text,
      responseSize: Buffer.byteLength(text),
      proxyLatencyMs: upstreamStart - startedAt,
      upstreamLatencyMs: total - (upstreamStart - startedAt),
    })
  }
}
