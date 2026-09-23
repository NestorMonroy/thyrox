/**
 * La superficie publica del paquete.
 *
 * Las dos primeras son NUESTRAS —del harness anterior a este porte— y se
 * conservan. El resto es lo que la suite de integracion de la fuente importa
 * de aqui (`ccnmt: .../__tests__/integration.test.ts`): la puerta del
 * proveedor y el ciclo de instalacion de bindings del host.
 *
 * Se reexporta por nombre y no con `export *` a proposito: los subarboles de
 * openai y gemini declaran simbolos homonimos —`anthropicToolsToOpenAI` y
 * `anthropicToolsToGemini` no chocan, pero sus tipos internos si— y una
 * fachada por comodin haria del choque un error de carga en vez de una
 * decision.
 */
export { RecordedProvider } from './recorded.ts'
export { AnthropicHttpProvider } from './anthropicHttp.ts'

export { getProviderAdapter } from './adapters.js'
export { getProviderContextPipeline } from './contextPipeline.js'
export { getProviderNetworkLayer } from './network.js'
export {
  getProviderHostBindings,
  installProviderHostBindings,
  installProviderRuntimeBindings,
  resetProviderRuntimeBindingsForTests,
} from './providerHostSetup.js'
export type { ProviderHostBindings } from './host.js'
export type {
  APIProvider,
  ProviderAdapter,
  ProviderAdapterOverrides,
  ProviderAvailability,
  ProviderQueryArgs,
} from './types.js'

// Adaptadores canónicos consumidos desde la raíz del paquete. Las
// implementaciones viven en sus módulos de protocolo; el barrel únicamente
// fija la frontera pública compartida por runtime y pruebas de compatibilidad.
export type { ProviderThinkingConfig } from './contracts.js'
export { getAnthropicClient } from './anthropic/client.js'
export { anthropicMessagesToGemini } from './gemini/convertMessages.js'
export { resolveGeminiModel } from './gemini/modelMapping.js'
export { adaptGeminiStreamToAnthropic } from './gemini/streamAdapter.js'
export { anthropicMessagesToOpenAI } from './openai/convertMessages.js'
export { resolveOpenAIModel } from './openai/modelMapping.js'
export { adaptOpenAIStreamToAnthropic } from './openai/streamAdapter.js'
