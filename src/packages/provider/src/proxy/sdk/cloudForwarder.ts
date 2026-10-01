/**
 * El reenviador que reparte por clase de upstream: los que el proxy declara
 * de nube (Bedrock, Vertex, Foundry) van por su SDK (`./sdkForward.ts`) con el
 * cliente que construye `./cloudClients.ts`; el resto, por el reenviador HTTP
 * que se le pasa. Es la pieza que une las dos mitades de la pasarela del
 * ejecutable 2.1.283 (`jv` frente al `fetch` crudo).
 *
 * El cliente de cada upstream se construye en la primera petición y se
 * reutiliza: construirlo resuelve la cadena de credenciales del proveedor, y
 * repetirla por petición la paga cada vez. Una construcción que falla no se
 * recuerda, para que la siguiente petición vuelva a intentarla cuando el
 * entorno ya la permita.
 */
import { errorResponse, type ForwardRequest } from '../server.ts'
import { createCloudUpstream, type CloudClientOptions, type CloudUpstream, type CloudUpstreamConfig } from './cloudClients.ts'
import { forwardThroughSdk } from './sdkForward.ts'

type Forwarder = (request: ForwardRequest) => Promise<Response>

export type CloudAwareForwarderConfig = {
  http: Forwarder
  /** La configuración de cada upstream de nube, por su nombre. */
  cloud: Record<string, CloudUpstreamConfig | undefined>
  /** La fábrica del cliente; por defecto, la de `./cloudClients.ts`. */
  create?: (config: CloudUpstreamConfig, options: CloudClientOptions) => Promise<CloudUpstream>
  options?: CloudClientOptions
}

export function createCloudAwareForwarder(config: CloudAwareForwarderConfig): Forwarder {
  const create = config.create ?? createCloudUpstream
  const clients = new Map<string, Promise<CloudUpstream>>()

  function clientFor(name: string, cloud: CloudUpstreamConfig): Promise<CloudUpstream> {
    let pending = clients.get(name)
    if (!pending) {
      pending = create(cloud, config.options ?? {})
      pending.catch(() => clients.delete(name))
      clients.set(name, pending)
    }
    return pending
  }

  return async request => {
    const cloud = config.cloud[request.upstream.name]
    if (!cloud) return config.http(request)
    const upstream = await clientFor(request.upstream.name, cloud)
    const response = await forwardThroughSdk({
      path: request.path,
      body: request.body,
      provider: upstream.provider,
      client: upstream.client,
      betaHeader: request.headers.get('anthropic-beta') ?? undefined,
      signal: request.signal,
      requestId: request.requestId,
    })
    return response ?? errorResponse(501, 'not_supported', 'upstream does not support this endpoint', request.requestId)
  }
}
