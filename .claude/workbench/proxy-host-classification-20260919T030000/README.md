# El proxy de omniroute: tres referentes bajo una palabra, y el que thyrox necesitaba

Fecha: 2026-09-19T03:00:00 · Tarea: TASK-THYROX-0204 · Hallazgo: H-THYROX-108
Fuente analizada: `omniroute@4d1282be` (solo lectura)

## Lo primero: «proxy» nombra TRES cosas distintas en omniroute

Concluir a traves de ellas es el error que este banco evita. Censadas en su
arbol:

| Referente | Donde vive en omniroute | Donde vive en thyrox | ¿Nos sirve? |
|---|---|---|---|
| **egreso**: mi llamada sale por un proxy | — (usa `HTTP_PROXY` solo en `cloudflaredTunnel`) | `provider/src/proxy.ts` | es el eje de este pase |
| **servidor**: YO soy el proxy de otro | `mitm/inspector/httpProxyServer.ts` | `server/src/upstreamproxy/` | fuera de alcance |
| **ruteo a upstream**: encamino a un proveedor | `shared/constants/providers/upstream-proxy.ts`, `Cliproxy*` | — | no aplica |

Y hay un cuarto, que la palabra no nombra y es el que mas aporta: la **guarda
de egreso** (`shared/network/outboundUrlGuard.ts`, `safeOutboundFetch.ts`,
`dnsPinnedFetch.ts`, `privateHost.ts`). Decide **a donde** se puede salir, no
**por donde**. thyrox no tiene nada equivalente — queda como sucesor, no se
mezcla con este pase.

## La disciplina del cierre: por CONDUCTA, no por comentario

El ejecutor pidio verificar que ningun guion candidato escribe archivos. Se
midio en dos ejes, y el segundo corrige al primero:

| Eje | Instrumento | Resultado |
|---|---|---|
| significante | `grep` de literales de escritura | `privateHost.ts` 0 · `dnsPinnedFetch.ts` 0 · `outboundUrlGuard.ts` 0 |
| **significado** | `bin/assert_no_writes` (strace, lee lo que vio el kernel) | **1 escritura**, y hay que saber leerla |

Esa «1 escritura» es `/sys/kernel/debug/tracing/trace_marker` — **del propio
tracer**, no del sujeto. El control lo separa:

```
comando inerte (`console.log(1+1)`)   -> 1 escritura  (solo el marker)
import de privateHost.ts              -> 1 escritura  (solo el marker)
comando que SI escribe un archivo     -> 2 escrituras (marker + el archivo)
```

O sea: `assert_no_writes` tiene un **piso de 1** que todo veredicto arrastra, y
`privateHost.ts` se queda exactamente en ese piso. El grep daba 0 y es una
**cota inferior** —ve el literal, no la llamada—; la traza es la que mide.

## Lo que SI se adopta, y lo que NO

**Se adopta la IDEA de `normalizeHost`**: desnudar los corchetes antes de
razonar sobre una IP. Es la causa #1 de la ceguera, y no se veia leyendo el
matcher.

**NO se porta su `ipVersion` vendorizado.** Su propio comentario declara por
que existe: `node:net` rompia su bundle de navegador (`Could not resolve
"node:net"`). thyrox no tiene bundle de navegador, asi que portar la regex
seria cargar el rodeo sin su razon — significante sin significado. Se usa
`isIP` y `BlockList` de `node:net`, que ademas es lo que la referencia ya
citada por el archivo —`golang.org/x/net/http/httpproxy`, via `net.ParseCIDR`—
hace en su propio stack.

**NO se porta `isPrivateHost`.** Es un clasificador de politica FIJA
(`.local`, `.internal`, `100.64/10`); `matchesCidrBlock` casa un patron que
**declara el operador**. Misma forma de predicado, contrato de entrada
distinto: uno no se puede meter dentro del otro.

## Las TRES causas, y solo una estaba en el enunciado

```
1. URL.hostname conserva los corchetes   -> isIP('[::1]') = 0, todo inerte
2. literal IPv6 desnudo cae en host:puerto -> '::1:8080' === '::1' es falso
3. matchesCidrBlock topaba el prefijo en 32 y parseaba cuatro octetos
```

Solo la 3 estaba enunciada. Las dos primeras salieron de medir por conducta.

## El control de anulacion, y lo que destapo de si mismo

| Mitad anulada | Aserciones que caen |
|---|---|
| `stripIpv6Brackets` a identidad | **3** |
| la rama `isIP(pattern) === 6` | **1** |
| `maxPrefix` de vuelta a 32 | **0**, y luego **1** |

El **0** es el hallazgo del propio control: los casos eran `fd00::/8` y
`fe80::/10`, prefijos 8 y 10, que el tope de 32 nunca rechazo. La guarda estaba
sin medir — sub-patron D con mi propio control como sujeto. Se anadio un caso de
prefijo 48 y entonces si cae exactamente 1.

## Una conducta que se adopta en vez de corregirse

`BlockList` con un bloque IPv4 **casa** su direccion IPv4-mapeada:
`::ffff:127.0.0.1` contra `127.0.0.0/8` da `true`. Medido, no supuesto. Coincide
con el `ParseIP().To4()` de la referencia, asi que se adopta y se fija en un
test para que un cambio futuro de Node no la mueva en silencio.

## Veredicto

955 -> **962 pass**, 41 -> **41 fail**. Los 41 son pre-existentes (medidos con
el arbol en `git stash`) y ninguno pertenece al sujeto. Los 7 nuevos son los de
`ipv6NoProxy.behavior.test.ts`.

*Metrica:* veredicto de `shouldBypassProxy` por conducta sobre pares
(URL, `NO_PROXY`), y `bun test` del subconjunto derivado.
*Ciega a:* si el agente que se construye despues honra el veredicto — eso lo
miden `getProxyAgent`/`getProxyFetchOptions`; y a la guarda de egreso, que es
otro eje y queda abierta.

## Queda abierto

La **guarda de egreso** de omniroute (`outboundUrlGuard` + `safeOutboundFetch` +
`dnsPinnedFetch`): thyrox decide por donde sale una llamada y no tiene nada que
decida **a donde** puede salir. Antes de portarla hay que medir si ccnmt tiene
una guarda en su camino de fetch — si la tiene, gobierna la referencia y
omniroute solo confirma. Sucesor: **TASK-THYROX-0205**.
