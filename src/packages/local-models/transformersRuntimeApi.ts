/**
 * El cliente HTTP del servidor del runtime de Transformers de una unidad
 * (`transformers-runtime/transformers_runtime_server.py`, TASK-THYROX-0776). Sólo
 * traduce rutas y estados; quién puede llamar qué lo deciden el adapter (residencia)
 * y `admittedSeq2seq` (generación con ticket).
 */
export class TransformersRuntimeRequestError extends Error {
  constructor(readonly route: string, readonly status: number, body: string) {
    super(`${route} respondió ${status}: ${body.slice(0, 300)}`)
    this.name = 'TransformersRuntimeRequestError'
  }
}

/** La residencia tal como el runtime la informa. */
export type RuntimeResidency =
  | { readonly state: 'absent' }
  | { readonly state: 'resident'; readonly modelId: string; readonly artifactId: string; readonly format: string; readonly quantization: string | null }

export interface Seq2seqReply {
  readonly modelId: string
  readonly outputs: readonly string[]
}

export class TransformersRuntimeApi {
  constructor(private readonly endpoint: string) {}

  async health(): Promise<void> {
    await this.request('GET', '/health')
  }

  async verifyArtifact(artifactId: string): Promise<{ artifactId: string; matches: boolean }> {
    return this.request('POST', '/artifacts/verify', { artifactId })
  }

  async load(modelId: string, artifactId: string): Promise<RuntimeResidency> {
    return this.request('POST', '/residency', { modelId, artifactId })
  }

  async residency(): Promise<RuntimeResidency> {
    return this.request('GET', '/residency')
  }

  async unload(): Promise<void> {
    await this.request('DELETE', '/residency')
  }

  async seq2seq(inputs: readonly string[], maxNewTokens: number): Promise<Seq2seqReply> {
    return this.request('POST', '/v1/seq2seq', { inputs, maxNewTokens })
  }

  private async request<T>(method: string, route: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.endpoint}${route}`, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const text = await response.text()
    if (!response.ok) throw new TransformersRuntimeRequestError(`${method} ${route}`, response.status, text)
    return JSON.parse(text) as T
  }
}
