/**
 * Cliente mínimo de la API nativa de Ollama: lo que necesitan declarar un
 * modelo instalado (`/api/tags`, `/api/show`, `/api/copy`), observar su
 * residencia (`/api/version`, `/api/ps`), cualificarlo
 * (`/api/chat`) e instalarlo desde un GGUF (`/api/blobs`, `/api/create`,
 * TASK-THYROX-0729). Un estado HTTP distinto de 2xx es un error con la ruta y
 * el cuerpo, nunca una respuesta vacía.
 *
 * Este módulo sólo importa por ruta relativa: `bin/installModel.ts` lo carga
 * dentro del trabajo de Podman, con el repositorio montado en `/w`, donde los
 * enlaces absolutos de `node_modules/@thyrox` no resuelven.
 */

import type { InstallOutcome, ModelInstallRequest } from './modelInstaller.js'

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
const HTTP_OK = 200
const HTTP_NOT_FOUND = 404
/** Nombre del archivo del modelo en `/api/create`: el que la sonda de cuantización midió. */
const CREATE_MODEL_FILE = 'model.gguf'
const SHA256_HEX = /^[0-9a-f]{64}$/

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

  /** Como `modelDetails`, pero un 404 de `/api/show` es «no instalado»; cualquier otro error se propaga. */
  async findModelDetails(model: string): Promise<ModelDetails | undefined> {
    try {
      return await this.modelDetails(model)
    } catch (error) {
      if (isNotFound(error)) return undefined
      throw error
    }
  }

  /** `HEAD /api/blobs/sha256:<hex>`: 200 es presente, 404 ausente, otro estado es error. */
  async hasBlob(sha256: string): Promise<boolean> {
    const path = blobPath(sha256)
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'HEAD' })
    if (response.status === HTTP_OK) return true
    if (response.status === HTTP_NOT_FOUND) return false
    throw new OllamaRequestError(path, response.status, await response.text())
  }

  /**
   * Sube el archivo como blob. El cuerpo es `Bun.file`, con longitud
   * declarada: una subida en flujo se midió colgada (H-THYROX-303).
   */
  async pushBlob(sha256: string, artifactPath: string): Promise<void> {
    await this.send(blobPath(sha256), { method: 'POST', body: Bun.file(artifactPath) })
  }

  /** Crea `name` desde un blob ya subido, sin respuesta en flujo. */
  async createModel(name: string, sha256: string): Promise<void> {
    await this.request('/api/create', { model: name, files: { [CREATE_MODEL_FILE]: `sha256:${sha256}` }, stream: false })
  }

  /** `GET /api/version`: la versión del runtime; un error de red o de estado se propaga. */
  async version(): Promise<string> {
    const document = await this.request('/api/version', undefined)
    return String(document.version ?? '')
  }

  /** `GET /api/ps`: los nombres residentes. Su `digest` es el del manifiesto, no el del blob. */
  async residentModelNames(): Promise<readonly string[]> {
    const document = await this.request('/api/ps', undefined)
    const models = (document.models ?? []) as JsonObject[]
    return models.map(model => String(model.name))
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
    const text = await this.send(path, init)
    return text === '' ? {} : JSON.parse(text) as JsonObject
  }

  /** Envía la petición y devuelve el cuerpo; un estado distinto de 2xx es `OllamaRequestError`. */
  private async send(path: string, init: RequestInit): Promise<string> {
    const response = await fetch(`${this.baseUrl}${path}`, init)
    const text = await response.text()
    if (!response.ok) throw new OllamaRequestError(path, response.status, text)
    return text
  }
}

function blobPath(sha256: string): string {
  return `/api/blobs/sha256:${sha256}`
}

function isNotFound(error: unknown): boolean {
  return error instanceof OllamaRequestError && error.status === HTTP_NOT_FOUND
}

/**
 * Deja `request.name` creado en Ollama desde el GGUF de `request.artifactPath`:
 * sube el blob sólo si Ollama no lo tiene y crea el modelo. Es la lógica que
 * corre dentro del trabajo de instalación. Que `/api/create` responda 200 no
 * prueba el contenido servido: quien la invoca vuelve a inspeccionar.
 */
export async function installModelIntoOllama(api: OllamaApi, request: ModelInstallRequest): Promise<InstallOutcome> {
  if (!SHA256_HEX.test(request.contentSha256)) {
    return { status: 'failed', reason: `el digest «${request.contentSha256}» no es un sha256 de 64 hex` }
  }
  try {
    if (!await api.hasBlob(request.contentSha256)) await api.pushBlob(request.contentSha256, request.artifactPath)
    await api.createModel(request.name, request.contentSha256)
    return { status: 'installed' }
  } catch (error) {
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}
