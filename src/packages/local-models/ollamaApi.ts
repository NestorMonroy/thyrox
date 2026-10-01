/**
 * Cliente mínimo de la API nativa de Ollama: lo que necesitan declarar un
 * modelo instalado (`/api/tags`, `/api/show`, `/api/copy`) y cualificarlo
 * (`/api/chat`). Un estado HTTP distinto de 2xx es un error con la ruta y el
 * cuerpo, nunca una respuesta vacía.
 */

export class OllamaRequestError extends Error {
  constructor(readonly path: string, readonly status: number, body: string) {
    super(`Ollama ${path} respondió ${status}: ${body.trim()}`)
    this.name = 'OllamaRequestError'
  }
}

export interface InstalledModel {
  readonly name: string
  /** Digest del manifiesto, 64 hex. */
  readonly digest: string
}

export interface ModelDetails {
  readonly modelfile: string
  readonly quantizationLevel: string
  readonly capabilities: readonly string[]
}

export interface ChatToolCall {
  readonly name: string
  readonly arguments: Record<string, unknown>
}

export interface ChatReply {
  readonly content: string
  readonly toolCalls: readonly ChatToolCall[]
  readonly evalCount: number
  readonly evalDurationNs: number
}

const JSON_HEADERS = { 'content-type': 'application/json' }

type JsonObject = Record<string, unknown>

export class OllamaApi {
  constructor(private readonly baseUrl: string) {}

  async installedModels(): Promise<readonly InstalledModel[]> {
    const document = await this.request('/api/tags', undefined)
    const models = (document.models ?? []) as JsonObject[]
    return models.map(model => ({ name: String(model.name), digest: String(model.digest) }))
  }

  async modelDetails(model: string): Promise<ModelDetails> {
    const document = await this.request('/api/show', { model })
    const details = (document.details ?? {}) as JsonObject
    return {
      modelfile: String(document.modelfile ?? ''),
      quantizationLevel: String(details.quantization_level ?? ''),
      capabilities: (document.capabilities ?? []) as string[],
    }
  }

  async copyModel(source: string, destination: string): Promise<void> {
    await this.request('/api/copy', { source, destination })
  }

  async chat(body: JsonObject): Promise<ChatReply> {
    const document = await this.request('/api/chat', body)
    const message = (document.message ?? {}) as JsonObject
    const calls = (message.tool_calls ?? []) as { function: ChatToolCall }[]
    return {
      content: String(message.content ?? ''),
      toolCalls: calls.map(call => ({ name: call.function.name, arguments: call.function.arguments ?? {} })),
      evalCount: Number(document.eval_count ?? 0),
      evalDurationNs: Number(document.eval_duration ?? 0),
    }
  }

  /** GET sin cuerpo, POST con él; el cuerpo de respuesta vacío (`/api/copy`) es un objeto vacío. */
  private async request(path: string, body: JsonObject | undefined): Promise<JsonObject> {
    const init: RequestInit = body === undefined ? { method: 'GET' } : { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) }
    const response = await fetch(`${this.baseUrl}${path}`, init)
    const text = await response.text()
    if (!response.ok) throw new OllamaRequestError(path, response.status, text)
    return text === '' ? {} : JSON.parse(text) as JsonObject
  }
}
