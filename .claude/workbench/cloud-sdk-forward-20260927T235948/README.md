# Reenvío por SDK a los upstreams de nube

El reenviador del proxy local (`src/packages/provider/src/proxy/upstreamForwarder.ts`)
habla HTTP crudo con la API de Anthropic y declaraba pendiente el camino por
SDK: Bedrock, Vertex y Foundry firman la petición a su manera (SigV4, OAuth de
Google, Entra ID) y traducen la ruta, así que no se les reenvían bytes.

La referencia es la pasarela del ejecutable 2.1.283. Extractos en `outputs/`:

- `gateway-sdk-upstreams.js`: `Fv` (cómo se construye un upstream `sdk` por
  proveedor) y `jv`/`Oj`/`kj` (cómo reenvía).
- `rejection-kind.js`: `HUn` y sus predicados (`chunk-5t3x93y6.js`), `BS`
  (`chunk-1ay853f5.js`) y `re` (`chunk-vq0drrah.js`).

Los nombres minificados no son globales: `HUn` también es una función
distinta en `chunk-csayct82.js`. Cada uno se leyó en el chunk del que la
pasarela lo importa.

## Fases

1. **El reenvío**: `src/proxy/sdk/sdkForward.ts` (`jv`, `Oj`, `kj`,
   `Pj`) y `src/proxy/sdk/rejectionKind.ts` (`HUn`, `ZTr`). Se prueba con un
   doble del cliente; ninguna prueba sale a la red.
2. La construcción del cliente por proveedor desde la configuración del
   upstream (las ramas `bedrock`/`vertex`/`foundry` de `Fv`).
3. El cableado en el reenviador y en `startServer`.

## Divergencias de la fase 1

- `kj` normaliza cada beta por su registro (`Yut`); para una cabecera
  conocida devuelve la misma cadena, así que el porte no consulta registro.
- `jv` devuelve `undefined` para una ruta que no es de mensajes, como la
  referencia; el tipo lo declara.

## Fase 2: el cliente por proveedor

`src/proxy/sdk/cloudClients.ts` construye `AnthropicBedrock`,
`AnthropicVertex` o `AnthropicFoundry` desde la configuración del upstream.
Qué URL y qué autorización produce cada SDK real se midió antes de escribir
las expectativas, con un `fetch` que intercepta (`probes/sdk-requests.ts`,
salida en `outputs/sdk-requests.jsonl`): SigV4 con el alcance
`<fecha>/<región>/bedrock/aws4_request`, `rawPredict` en Vertex, y en
Foundry la clave en `x-api-key` —la suposición previa, `api-key`, era
falsa—.

El portador de Bedrock es una divergencia medida: el `bedrock-sdk` 0.26.4
instalado no tiene `apiKey`, y la petición cae a la cadena de AWS y falla.
`skipAuth` con la cabecera `Authorization: Bearer` produce la petición que la
referencia envía.

Controles: `probes/annul-cloud.tsv`. La primera pasada dejó dos variantes en
pie —la anulación de cabeceras en Vertex y de `Authorization` en Foundry—
porque ninguna prueba ponía esa cabecera en el upstream; con esos dos casos
caen las 17 (`outputs/annul-cloud.out`).

## Fase 3: el cableado en el proxy

`src/proxy/sdk/cloudForwarder.ts` reparte por clase de upstream: los que
`startProxyServer` recibe en `cloud.upstreams` van por su SDK y el resto, por
`createHttpForwarder`. El cliente de cada upstream se construye en la primera
petición y se reutiliza; una construcción que falla no se recuerda.
`ForwardRequest` lleva ahora el `requestId`, que el SDK pone en el cuerpo de
sus errores y de su stream. Un upstream de nube no declara endpoint, y si no
declara credencial el selector recibe una sintética (`cloud:<nombre>`) por la
que enfriarlo y limitarlo.

**Hallazgo de la prueba de punta a punta.** Un 401 de Vertex llegaba al
cliente como 502: `forwardThroughSdk` reconocía el error con
`instanceof APIError`, y cada SDK de nube instala su propia copia de
`@anthropic-ai/sdk` (misma versión, 0.124.0, cuatro copias medidas en
`node_modules`). Su `APIError` es otra clase, el `instanceof` da falso, el
error se propaga y el servidor lo cuenta como fallo del upstream. La sonda es
`probes/error-path.ts`. El error se reconoce ahora por su forma. La pasarela
del ejecutable no lo necesita: empaqueta una sola copia.

Controles, `probes/annul-phase3.sh`: caen todas las variantes del reenviador
(`outputs/annul-forwarder.out`), del cableado (`outputs/annul-start.out`) y
del reconocimiento por forma (`outputs/annul-apierror.out`). El `requestId`
de `server.ts` se anula en una copia de `src/` que la prueba de
`startProxyServer` importa: cae el caso del 401, y los dos de
`createSelector` caen también sin anular nada
(`outputs/annul-request-id-base.out`) porque comparan clases del árbol
original con las de la copia.

*Métrica:* aserciones que caen por variante.
*Ciega a:* un servicio de nube real. La variante que retira el `fetch`
inyectado sale a la red: su caída depende de la respuesta de Google, no de un
doble.

## Controles de anulación

`probes/annul.sh`, salida en `outputs/annul.out`: las 35 variantes caen (17
de la clasificación, 18 del reenvío). Dos expectativas de la suite eran
falsas y se corrigieron contra el SDK, no el código: `APIError.message`
antepone el estado (`401 secret detail`).

*Métrica:* aserciones que caen por variante.
*Ciega a:* un SDK real contra el servicio de nube —el cliente es un doble—, y
a textos de error del upstream que los predicados no conocen.
