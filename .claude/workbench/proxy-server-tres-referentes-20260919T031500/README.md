# «Servidor de proxy» nombra TRES cosas; thyrox ya tiene la que importa

Fecha: 2026-09-19T03:15:00 · Hallazgo: H-THYROX-109
Fuentes: `cybercode@7fac4f14`, `omniroute@4d1282be` (las dos, solo lectura)

## La pregunta

> «considerar que para lo del proxy se requiera un server como en cybercode;
> de igual manera en omniroute también tiene un server, si es así, analiza,
> documenta e implementalo»

## Por que casi respondo mal: busque por NOMBRE

El primer censo fue `find src -iname '*proxy*'` y encontro un solo archivo,
`upstreamproxy.ts` — que es **configuracion de cliente**: lee un token, baja un
bundle de CA y compone `getUpstreamProxyEnv()`. No escucha nada.

De ahi salio la impresion de que a thyrox le faltaba el servidor. Es falsa: la
mitad servidor **si esta**, en el mismo directorio, y se llama **`relay.ts`**.
El nombre no lleva «proxy», asi que un censo por nombre de archivo es ciego a
ella. Significante contra significado, con el censo como sujeto.

Medido por conducta, no por el nombre ni por el docstring:

```
relay.ts:28   import { createServer, type Socket } from 'node:net'
relay.ts:274  const server = createServer(sock => {
relay.ts:299  server.listen(0, '127.0.0.1', () => {
```

Escucha en TCP local, acepta `CONNECT` de curl/gh/kubectl y tunelea por
WebSocket hacia el endpoint de upstreamproxy. Es un servidor.

## La procedencia NO es cybercode

```
ccnmt: packages/server/src/upstreamproxy/relay.ts          <- existe
thyrox: src/packages/server/src/upstreamproxy/relay.ts:2   <- «Puerto de ccnmt: ...»
```

thyrox porta de **ccnmt**. cybercode tiene el mismo archivo porque comparte
linaje, asi que aqui es **confirmacion**, no fuente. Importa para el veredicto:
si hubiera divergencia, gobierna ccnmt.

## Los tres referentes, separados por lo que HACEN

| | Referente | Que hace | thyrox | Veredicto |
|---|---|---|---|---|
| **A** | relay al proxy de egreso | escucha CONNECT local, tunela por WS | **tiene**, completo | nada que implementar |
| **B** | embedded provider proxy | origen HTTP local que enruta a N proveedores | no tiene | decision de arquitectura |
| **C** | inspector MITM / TPROXY | termina TLS, CA dinamica por SNI | no tiene | decision del ejecutor |

## A — completo, y medido por CUERPO, no por conteo

`porte-completo-no-parcial.md` avisa que la forma puede fallar sin que falle el
conteo (H-API-350). Conteo: **5/5 y 4/4 simbolos**, 0 ausentes en ninguna
direccion. Cuerpo, sin comentarios ni lineas en blanco, con digest estable:

```
simbolo                       ccnmt              cyber             thyrox
encodeChunk              15L 62c2c20b       15L 62c2c20b       15L 62c2c20b
decodeChunk              17L 9298416d       17L 9298416d       17L 9298416d
startUpstreamProxyRelay   5L a961775b        5L a961775b        5L a961775b
startNodeRelay           40L 5d234743       40L dc4ec278       41L e08f1765
```

El codec de trama y el punto de entrada son **identicos byte a byte** en los
tres. `startNodeRelay` diverge, y las dos divergencias son benignas:

```
ccnmt -> thyrox:  + const { logForDebugging } = requireLocalObservabilityDebug()
ccnmt -> cyber:   - sock.on('data', (data: Buffer) => ...
                  + sock.on('data', data => ...
```

La nuestra es el accesor diferido del logger, adaptacion propia; la de
cybercode es una anotacion de tipo que se cayo. Ninguna toca el protocolo.

### Defecto de mi propia medicion, corregido en el pase

El primer diff de cuerpos uso `hash()` de Python en **tres procesos
separados**. `PYTHONHASHSEED` es aleatorio por proceso, asi que los tres
digests eran incomparables — habrian mostrado divergencia siempre, incluso en
archivos identicos. Rehecho con `md5` en un solo proceso. Un instrumento que
siempre dice «distinto» no discrimina: sub-patron D.

## B — thyrox SI tiene el problema, y lo resuelve en otra capa

La pregunta que decide no es «¿tiene thyrox `embeddedProxy`?» sino «¿tiene el
problema que resuelve?». Medido: el paquete `provider` tiene **42** menciones
de `getEnabledConnections`/`connections`, o sea **si** enruta a N proveedores.

Lo que no tiene es la **forma** de cybercode: un `Bun.serve` local que enruta
por HTTP. `embeddedProxy.ts` importa `routingService`, `gateway/handler` y
`ProviderService`, y sus 7 consumidores son todos producto —
`ProviderSetupWizard.tsx`, `commands/node/node.tsx`, `commands/routing/
routing.tsx`, `entrypoints/init.ts`—. thyrox resuelve el proveedor **en
proceso**, sin origen HTTP intermedio.

Adoptar un origen local no es completar un porte: es cambiar donde vive el
ruteo. Decision de arquitectura del ejecutor. Sucesor: **TASK-THYROX-0206**.

## C — ausente, y el instrumento me engano dos veces

Primer patron: `mitm|interceptTls|dynamicCert|transparent.?proxy` -> **5
archivos**, todos falsos positivos. Segundo, con `SNI` anadido -> **10**,
porque `SNI` casa dentro de `snip`* (`snipCompact`, `snipProjection`).

Tercero, con frontera de palabra:

```
grep -rlE "tproxy|TPROXY|dynamicCert|IP_TRANSPARENT|\bSNI\b" --include='*.ts' src/
  -> 4 archivos, los CUATRO en node_modules/@types/node (tls, process, https, quic)
```

Cero archivos propios. **Control positivo del instrumento**: el mismo patron
encuentra **18** archivos en omniroute, asi que el 0 es ausencia real y no un
patron roto.

Y C no es solo «no lo tenemos»: `mitm/tproxy/dynamicCert.ts` emite una CA
**por SNI**, lo que implica instalar una autoridad en el sistema. Eso es
decision del ejecutor, no del agente. Sucesor: **TASK-THYROX-0207**.

## Veredicto

**No se implementa nada en este pase**, y no por omision: la pieza que la
pregunta suponia ausente esta presente y completa contra su fuente declarada,
verificada por cuerpo. Las otras dos no son porte parcial — son arquitectura
(B) y postura de seguridad (C), las dos con sucesor registrado.

*Metrica:* simbolos exportados por regex sobre `export function|const|type`,
cuerpos sin comentario con digest md5 en un proceso, y conteo de archivos por
patron con frontera de palabra.
*Ciega a:* una divergencia de conducta que no cambie el texto del cuerpo —dos
cuerpos identicos bajo runtimes distintos pueden diferir—; y a cualquier
mecanismo de A que viva fuera de los dos archivos de `upstreamproxy/`.
