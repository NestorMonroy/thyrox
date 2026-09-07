/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/claude.ts` — router
 * top-level de proveedor. Sus 2 funciones propias
 * (`queryModelWithoutStreaming`, `queryModelWithStreaming`) más el
 * `export * from './claudeLegacy.ts'` (uno de los 18), ninguna omitida.
 *
 * `getProviderAdapter` viene de `ccnmt: packages/provider/src/adapters.ts`
 * — el router multi-proveedor completo, NO asignado a este pase (docenas
 * de líneas, depende de `host.ts`/`auth.ts`/`network.ts`/`anthropic`,
 * `openai`, `gemini`, ninguno de los 18). `require()` diferido: la propia
 * fuente ya importaba `getProviderAdapter` desde su `index.ts` local, así
 * que el patrón de indirección no cambia, sólo el hecho de que aquí no
 * resuelve todavía. `Tools`/`StreamEvent`/`SystemAPIErrorMessage`
 * (`@claude-code-how-works/tool-registry`/`agent/messageShapes`) se
 * aproximan a `unknown[]`/`unknown` — sólo viajan por este archivo, no se
 * interpretan.
 */

import type { AssistantMessage, Message } from '@thyrox/agent/messageShapes'
import type { SystemPrompt } from './systemPromptType.ts'
import type { ThinkingConfig } from './internal/providerTypes.ts'
import type { Options } from './claudeLegacy.ts'

export * from './claudeLegacy.ts'

type Tools = unknown[]
type StreamEvent = unknown
type SystemAPIErrorMessage = unknown

function requireProviderAdapter(): {
  getProviderAdapter: (model: string) => {
    query: (args: Record<string, unknown>) => Promise<unknown>
    queryStream: (args: Record<string, unknown>) => AsyncGenerator<unknown, void>
  }
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./internal/adapters.ts')
}

export async function queryModelWithoutStreaming({
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): Promise<AssistantMessage> {
  // Ruteo por-modelo (V7 §11.6 Stage 2): si el usuario configuró
  // connections[], esto elige el protocolo correcto para el modelo
  // elegido. Cae a `getAPIProvider()` global cuando ninguna conexión
  // matchea.
  const adapter = requireProviderAdapter().getProviderAdapter(options.model)
  return (await adapter.query({
    messages,
    systemPrompt,
    thinkingConfig,
    tools,
    signal,
    options,
  })) as unknown as AssistantMessage
}

export async function* queryModelWithStreaming({
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void> {
  const adapter = requireProviderAdapter().getProviderAdapter(options.model)
  yield* adapter.queryStream({
    messages,
    systemPrompt,
    thinkingConfig,
    tools,
    signal,
    options,
  }) as AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void>
}
