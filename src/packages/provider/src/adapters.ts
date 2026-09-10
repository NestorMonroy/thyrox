/**
 * La puerta del proveedor — porte de
 * `ccnmt: packages/provider/src/adapters.ts` (184 lineas, 1 export).
 *
 * El puerto es COMPLETO: `getProviderAdapter`, la unica exportacion de la
 * fuente, mas sus tres funciones privadas y su constante de modulo. Ninguna
 * queda fuera.
 *
 * Es el unico sitio del paquete donde se decide QUE proveedor atiende una
 * peticion. Todo lo demas —los dos subarboles de traduccion, los tres
 * proveedores de credencial, las dos capas del host— cuelga de aqui.
 */
import type {
  APIProvider,
  ProviderAdapter,
  ProviderAdapterOverrides,
  ProviderQueryArgs,
} from './types.js'
import { getProviderContextPipeline } from './contextPipeline.js'
import { getProviderNetworkLayer } from './network.js'
import { anthropicAuthProvider, geminiAuthProvider, openAIAuthProvider } from './auth.js'
import { getProviderHostBindings } from './host.js'
import { HostBindingsError, StreamError } from './errors.js'
import { queryModelOpenAI } from './openai/indexImpl.js'
import { queryModelGemini } from './gemini/indexImpl.js'
import { getProviderForModel } from './providers.js'
import { unpackModelId } from './connections.js'

// Centralizado para que `getProviderAdapter` distinga «me pasaste un id de
// proveedor» de «me pasaste un id de modelo». Anadir un `APIProvider` obliga
// a tocar ESTE conjunto Y la union de `./types.ts`.
const API_PROVIDER_VALUES: ReadonlySet<APIProvider> = new Set<APIProvider>([
  'firstParty',
  'bedrock',
  'vertex',
  'foundry',
  'openai',
  'gemini',
  'codex',
])

function isAPIProviderValue(value: string): value is APIProvider {
  return API_PROVIDER_VALUES.has(value as APIProvider)
}

/**
 * La forma comun de los tres adaptadores.
 *
 * El `query` por defecto se DERIVA del stream: recorre los eventos y se queda
 * con el ultimo mensaje de asistente. Un proveedor cuyo host traiga su propio
 * `query` lo pasa por `options.query` y ese gana.
 */
function createAdapter(
  id: APIProvider,
  options: {
    queryStream: ProviderAdapter['queryStream']
    query?: ProviderAdapter['query']
    authProvider: ProviderAdapter['authProvider']
  },
): ProviderAdapter {
  return {
    id,
    authProvider: options.authProvider,
    contextPipeline: getProviderContextPipeline(),
    networkLayer: getProviderNetworkLayer(),
    query:
      options.query ??
      (async args => {
        let assistantMessage
        for await (const event of options.queryStream(args)) {
          if (event.type === 'assistant') {
            assistantMessage = event
          }
        }
        if (!assistantMessage) {
          throw new StreamError(`Provider ${id} did not yield an assistant message.`)
        }
        return assistantMessage
      }),
    queryStream: options.queryStream,
    listModels(fastMode?: boolean) {
      return getProviderHostBindings().getModelOptions(fastMode)
    },
    async isAvailable() {
      return options.authProvider.isAvailable()
    },
  }
}

/**
 * Resuelve el adaptador de una peticion.
 *
 * `providerOrModel` admite dos cosas y las desambigua por conjunto, no por
 * heuristica de forma: si el valor ES uno de los `APIProvider`, se toma tal
 * cual (el llamador ya sabia lo que queria); si no, se lee como id de modelo
 * y se rutea por `getProviderForModel`, para que quien use el registro de
 * conexiones reciba el protocolo de SU conexion y no el respaldo global.
 * Omitido, decide el host.
 *
 * Sin esto el registro de conexiones seria decorativo: la ruta de consulta
 * leeria siempre el proveedor global, asi que elegir un modelo de otra
 * conexion en el selector seguiria pegando contra el stream de Anthropic.
 */
export function getProviderAdapter(
  providerOrModel?: APIProvider | string,
  overrides: ProviderAdapterOverrides = {},
): ProviderAdapter {
  const hostBindings = getProviderHostBindings()
  const provider: APIProvider = (() => {
    if (providerOrModel === undefined) {
      return hostBindings.getAPIProvider()
    }
    if (isAPIProviderValue(providerOrModel)) {
      return providerOrModel
    }
    return getProviderForModel(providerOrModel)
  })()

  // El prefijo de conexion se retira de `options.model` antes de que llegue a
  // ningun API de aguas arriba. El selector emite `<connId>:<modelId>` para
  // que dos conexiones que comparten nombre de modelo se distingan; los
  // adaptadores y los SDK solo ven el id desnudo. El ruteo ya se decidio
  // arriba, asi que el prefijo ya no hace falta.
  const stripModelPrefix = (args: ProviderQueryArgs): ProviderQueryArgs => {
    const opts = args.options
    if (!opts.model) return args
    const { connectionId, modelId } = unpackModelId(opts.model)
    if (!connectionId) return args
    return { ...args, options: { ...opts, model: modelId } }
  }

  // Codex NO se rutea aqui, y es deliberado: viaja por el camino del SDK de
  // Anthropic con un `fetch` sustituido en `getAnthropicClient`. Ese
  // sustituto ve el cuerpo final del cable y traduce ahi, que es mucho menos
  // fragil que traducir la forma interna de los mensajes. Un adaptador
  // paralelo aqui daria dos maneras de llegar a Codex y dos costuras de
  // adaptacion que mantener.
  switch (provider) {
    case 'openai':
      return createAdapter('openai', {
        authProvider: openAIAuthProvider,
        queryStream: rawArgs => {
          const args = stripModelPrefix(rawArgs)
          return queryModelOpenAI(
            args.messages,
            args.systemPrompt,
            args.tools,
            args.signal,
            args.options,
          )
        },
      })
    case 'gemini':
      return createAdapter('gemini', {
        authProvider: geminiAuthProvider,
        queryStream: rawArgs => {
          const args = stripModelPrefix(rawArgs)
          return queryModelGemini(
            args.messages,
            args.systemPrompt,
            args.tools,
            args.signal,
            args.options,
            args.thinkingConfig,
          )
        },
      })
    case 'bedrock':
    case 'vertex':
    case 'foundry':
    case 'firstParty':
    default: {
      if (!overrides.anthropicQueryStream && !hostBindings.anthropic.queryStream) {
        throw new HostBindingsError(
          `Provider ${provider} requires an Anthropic query stream implementation.`,
        )
      }
      // El stream de Anthropic ya acepta `ProviderQueryArgs`; se envuelve
      // para recortar el prefijo en la misma costura que los otros dos.
      const anthropicQueryStream =
        overrides.anthropicQueryStream ??
        (hostBindings.anthropic.queryStream as ProviderAdapter['queryStream'])
      return createAdapter(provider, {
        authProvider: anthropicAuthProvider,
        query: overrides.anthropicQuery ?? hostBindings.anthropic.query,
        queryStream: rawArgs => anthropicQueryStream(stripModelPrefix(rawArgs)),
      })
    }
  }
}
