/**
 * Puerto de `ccnmt: packages/headless-sdk/src/runtimeTypes.ts` (verbatim —
 * sin imports en la fuente).
 *
 * Tipos SDK en tiempo de ejecución (aún no publicados como open-source):
 * callbacks e interfaces con métodos — no serializables, por eso viven
 * fuera de `coreTypes.generated.ts`.
 */

export type AnyZodRawShape = Record<string, unknown>
export type InferShape<T extends AnyZodRawShape> = { [K in keyof T]: unknown }

export type ForkSessionOptions = { dir?: string; upToMessageId?: string; title?: string }
export type ForkSessionResult = { sessionId: string }
export type GetSessionInfoOptions = { dir?: string }
export type GetSessionMessagesOptions = { dir?: string; limit?: number; offset?: number; includeSystemMessages?: boolean }
export type ListSessionsOptions = { dir?: string; limit?: number; offset?: number }
export type SessionMutationOptions = { dir?: string }
export type SessionMessage = { role: string; content: unknown; [key: string]: unknown }

export interface SDKSession {
  sessionId: string
  prompt(input: string | AsyncIterable<unknown>): Promise<unknown>
  abort(): void
  [key: string]: unknown
}

export type SDKSessionOptions = {
  model?: string
  systemPrompt?: string
  [key: string]: unknown
}

export interface SdkMcpToolDefinition<T extends AnyZodRawShape = AnyZodRawShape> {
  name: string
  description: string
  inputSchema: T
  handler: (args: InferShape<T>, extra: unknown) => Promise<unknown>
  [key: string]: unknown
}

export type McpSdkServerConfigWithInstance = {
  name: string
  version?: string
  tools?: SdkMcpToolDefinition[]
  [key: string]: unknown
}

export interface Options {
  model?: string
  systemPrompt?: string
  [key: string]: unknown
}

export interface InternalOptions extends Options {
  [key: string]: unknown
}

export interface Query {
  [Symbol.asyncIterator](): AsyncIterator<unknown>
  [key: string]: unknown
}

export interface InternalQuery extends Query {
  [key: string]: unknown
}
// Niveles de esfuerzo cross-proveedor. `none` sólo se expone cuando la
// metadata de conexión declara soporte explícito (hoy, modelos GPT-5.6
// Codex).
//   low / medium / high — soportados en todos los modelos con capacidad de esfuerzo
//   xhigh                — razonamiento extendido en Claude/Codex compatibles
//   max                  — Mythos / Opus 4.7 / Opus 4.6 / Sonnet 4.6
// El orden importa: inteligencia ascendente, lo usa el selector de la UI.
export type EffortLevel = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
