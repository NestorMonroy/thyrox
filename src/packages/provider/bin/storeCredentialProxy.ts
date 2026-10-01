#!/usr/bin/env bun
/**
 * El proxy de credenciales del store como proceso
 * (`bin/provider-store-credential-proxy`, C3 de credenciales).
 *
 *   storeCredentialProxy --model <id> [--model <id>]... [--port N] [--upstream <url>]
 *
 * Abre el store de conexiones sólo si existe (`openExistingConnectionStore`),
 * comprueba que tiene una conexión Anthropic legible y levanta
 * `startProxyServer` (`../src/proxy/startServer.ts`) con el store como
 * fuente de credenciales de su único upstream, cuyo endpoint es `--upstream`
 * (por defecto `ANTHROPIC_BASE_URL` o `https://api.anthropic.com`). Escucha en
 * loopback en `--port` (0, efímero, por defecto) e imprime `url=<url>` cuando
 * ya escucha; atiende hasta SIGTERM o SIGINT, cuando cierra y sale 0.
 *
 * El upstream lleva el proveedor con que el store guarda las conexiones de
 * Anthropic (`ANTHROPIC_PROVIDER_ID`, `claude`): `startProxyServer` agrupa las
 * credenciales del store por el proveedor de cada fila, y el clasificador de
 * errores, el rate limit y el refresco de OAuth ya tratan ese nombre como
 * Anthropic. Con él, el enrutamiento no resuelve el catálogo (`firstParty` es
 * sólo del proveedor `anthropic`), así que cada modelo servido se declara con
 * `--model` y llega tal cual al upstream: el proxy sirve lo que el pool
 * declaró, no cualquier identificador, y uno no declarado se rehúsa sin tocar
 * el upstream.
 *
 * La clave de acceso local va en `THYROX_STORE_PROXY_ACCESS_KEY`: es lo único
 * que quien lo lanza reparte a sus hijos, junto con la URL. No es la
 * credencial del upstream, que sólo existe en el store y en este proceso. Va
 * por entorno y no por argumento porque la línea de comando se lee en `/proc`
 * desde cualquier usuario y el entorno sólo desde el mismo.
 *
 * Complementa `credentialProxy.ts` (`--credential-proxy` del pool): aquél
 * reenvía la credencial del ENTORNO por un socket Unix; éste sirve las del
 * store por HTTP en loopback, porque `startProxyServer` escucha con
 * `Bun.serve` y no tiene socket Unix.
 *
 * Sin store, sin conexión legible, sin clave de acceso o sin modelo rehúsa
 * con exit 2 y no escucha: un proxy sin credencial aceptaría peticiones que
 * el servicio rechazaría una a una.
 */
import packageJson from '../package.json'
import { openExistingConnectionStore, type ConnectionStore } from '../src/accounts/connectionStoreHome.ts'
import { ANTHROPIC_PROVIDER_ID } from '../src/accounts/imports/anthropicAuthFile.ts'
import { resolveCredential } from '../src/credentials.ts'
import { startProxyServer } from '../src/proxy/startServer.ts'
import type { GatewayModelEntry } from '../src/proxy/upstreamRouting.ts'

export const ACCESS_KEY_VARIABLE = 'THYROX_STORE_PROXY_ACCESS_KEY'
const UPSTREAM_NAME = ANTHROPIC_PROVIDER_ID
const LOOPBACK_HOST = '127.0.0.1'
const EPHEMERAL_PORT = 0
const MAX_PORT = 65535
const DEFAULT_UPSTREAM = 'https://api.anthropic.com'
const INVALID_INVOCATION_EXIT = 2

function refuse(reason: string): never {
  process.stderr.write(`storeCredentialProxy: ${reason}. NO se escucha.\n`)
  process.exit(INVALID_INVOCATION_EXIT)
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

/** Cada valor de una opción repetible, en el orden de la línea de comando. */
function argumentValues(name: string): string[] {
  const values: string[] = []
  process.argv.forEach((word, index) => {
    const value = process.argv[index + 1]
    if (word === name && value !== undefined) values.push(value)
  })
  return values
}

function listenPort(): number {
  const declared = argument('--port')
  if (declared === undefined) return EPHEMERAL_PORT
  const port = Number(declared)
  const isTcpPort = Number.isInteger(port) && port >= EPHEMERAL_PORT && port <= MAX_PORT
  if (!isTcpPort) refuse(`--port va entre ${EPHEMERAL_PORT} y ${MAX_PORT}, no: ${declared}`)
  return port
}

/** El modelo declarado se sirve tal cual: el upstream recibe el mismo identificador. */
function passthroughModel(id: string): GatewayModelEntry {
  return { id, upstream_model: { [UPSTREAM_NAME]: id } }
}

/**
 * Por qué el store no sirve, o `undefined` si sirve. Es la cadena de
 * `credentials.ts` sin ninguna variable del entorno: sólo la conexión del
 * store, con sus mismas causas (cifrada sin clave, clave que no descifra).
 */
function storeRefusal(store: ConnectionStore): string | undefined {
  const credential = resolveCredential({}, undefined, store)
  if (credential.source === 'PROVIDER_CONNECTION') return undefined
  return credential.error ?? `provider_connections no tiene una conexión activa de ${ANTHROPIC_PROVIDER_ID}`
}

const accessKey = process.env[ACCESS_KEY_VARIABLE]?.trim()
if (!accessKey) refuse(`falta ${ACCESS_KEY_VARIABLE}: la clave de acceso local que quien lo lanza reparte a sus hijos`)
const models = argumentValues('--model')
if (models.length === 0) refuse('falta --model <id>: el proxy sirve sólo los modelos declarados')
const port = listenPort()
const upstream = argument('--upstream') ?? process.env.ANTHROPIC_BASE_URL ?? DEFAULT_UPSTREAM
const opened = openExistingConnectionStore()
if (!opened) refuse('provider_connections no existe: no hay store de conexiones que servir')
const refusal = storeRefusal(opened.store)
if (refusal) {
  opened.close()
  refuse(refusal)
}

let proxy
try {
  proxy = startProxyServer({
    host: LOOPBACK_HOST,
    port,
    accessKeys: [accessKey],
    routing: {
      upstreams: [{ name: UPSTREAM_NAME, provider: UPSTREAM_NAME }],
      models: models.map(passthroughModel),
      auto_include_builtin_models: false,
    },
    endpoints: { [UPSTREAM_NAME]: { baseUrl: upstream } },
    credentials: {},
    // Una cuenta sirve hasta que falla: cada `thyrox -p` del pool comparte así
    // la caché de prompt de una misma credencial.
    selector: 'fill-first',
    connections: opened.store,
    version: packageJson.version,
    env: process.env,
  })
} catch (error) {
  opened.close()
  refuse((error as Error).message)
}
// Los manejadores van ANTES de anunciar: el anuncio es la señal de «listo»,
// y quien lo lee puede mandar SIGTERM en seguida.
const stop = (): void => {
  void proxy.stop().then(() => {
    opened.close()
    process.exit(0)
  })
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdout.write(`url=${proxy.url}\n`)
