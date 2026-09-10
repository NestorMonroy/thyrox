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
