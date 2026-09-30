# Afinidad de sesión del proxy — porte de CLIProxyAPI `sdk/cliproxy/session/`

Fase 1: `identity.go` → `src/packages/provider/src/proxy/session/`
(`identity.ts`, `payload.ts`, `goJson.ts`). Prueba:
`src/packages/provider/__tests__/proxySessionIdentity.test.ts`, casos de
`identity_test.go` salvo `Enrich`, que depende de `ExtractSessionInfo` (fase 2).

## Fidelidad del hash contra Go

`DeriveID` es el sha256 de `json.Marshal(canonicalRoot)`. Si un byte difiere,
thyrox y un proxy con la referencia derivan identidades distintas para la
misma conversación. `probes/gomarshal/main.go` copia el struct verbatim
(`identity.go:27-40`) y deja en `outputs/gomarshal-known-answers.tsv` el JSON y su
hash para tres raíces: orden de campos, `omitempty` y los escapes de Go
(`<`, `>`, `&`, U+2028, U+2029). La prueba `goMarshal` las exige byte a byte.

```bash
cd probes/gomarshal && GO111MODULE=off go run main.go
```

## Controles de anulación

`probes/annul.sh` aplica un reemplazo literal, corre la prueba y restaura
(hash del archivo igual antes y después). Salida por caso en `outputs/annul/`.

| Anulación | Caen |
|---|---|
| sin escapes de Go | `escapa <, >, &, U+2028 y U+2029` |
| `omitempty` ignorado | los tres de `goMarshal` |
| límite de instrucciones 50 → 5000 | `las instrucciones cuentan hasta 50` |
| `caller_scope` vacío | `aísla por llamador` |
| sin prefijos conocidos | `prefijos sin cuerpo dan vacío`, `quita prefijos encadenados` |

El caso `un prefijo … delante de un UUID se quita` sobrevive a la última: lo
cubre también la rama genérica «`algo:` + UUID», que es su otra mitad.

## Episodio

El primer `bun test` dio `Syntax Error` sin archivo: `goJson.ts` llevaba
U+2028 literal dentro de una regex, y para el parser de JavaScript es un fin
de línea. Se escribe como ` `.

*Métrica:* igualdad de bytes contra `encoding/json` de Go 1.x del contenedor.
*Ciega a:* claves de mapa no-ASCII y números (el struct sólo lleva cadenas).

## Fase 2: `info.go` (`ExtractSessionInfo`) y `Enrich`

`src/proxy/session/info.ts` y `enrich.ts`, escritos primero en `drafts/`
mientras el pool corría sus suites (su huella del árbol cubre `src/`).
Pruebas: `__tests__/proxySessionInfo.test.ts` (`info_test.go` e
`info_duplicate_test.go`) y `__tests__/proxySessionEnrich.test.ts` (los
casos de `Enrich` de `identity_test.go`). `TestDeprecatedInMemorySessionTreeStoreCompatibility`
es de `tree_compat.go` y va con la caché de sesiones (fase 3).

Los nombres de cabecera de clientes ajenos van en minúscula, en una sola
lista (`SESSION_HEADERS`), y se buscan sin distinguir mayúsculas: la forma de
OmniRoute.

Anulaciones (`probes/annul-cases2/`, salida en `outputs/annul2/`):

| Anulación | Caen |
|---|---|
| sin padre candidato del cuerpo | 16 |
| cabeceras sensibles a mayúsculas | 14 |
| sin la rama de bifurcación de Codex | 3 |
| sin el `user_id` de Messages antes de las cabeceras genéricas | 4 |
| decodificador UTF-8 no estricto al acotar | 1 |
| `Enrich` sin la rama de sesión explícita | 13 |
| `Enrich` sin la rama de sesión de ejecución | 3 |

El caso «cabecera de sesión con cuerpo que no es JSON» sobrevive a la
anulación de la sesión explícita: sin JSON no hay contenido que derivar, así
que el resultado vacío coincide por otra vía.

Episodio: `test.each` con filas más cortas que los parámetros de la función
hace que bun tome el parámetro sobrante por la retrollamada `done` y espere
5 s; las filas se rellenan hasta su longitud.

Divergencias declaradas en `info.ts`: con claves duplicadas `JSON.parse`
conserva la última y gjson la primera que responda; `Headers` une valores
repetidos y `http.Header` los recorre (con un objeto de listas se conserva la
conducta de la referencia). En `enrich.ts`, la metadata de petición y la de
opciones se mantienen separadas como en la referencia.

## Fase 3: `session_cache.go`

`src/proxy/session/sessionCache.ts`; prueba `__tests__/proxySessionCache.test.ts`
(los seis casos de `session_cache_test.go` más caducidad, alias y
compactación con el reloj inyectado). La prueba se corrió primero sin la
implementación (módulo ausente) y después en verde.

Divergencias declaradas en la cabecera del módulo: sin candados (un solo
hilo; la prueba concurrente intercala los ocho escritores), reloj inyectable,
y limpieza periódica con temporizador `unref`. Los casos de receptor nulo de
Go no tienen equivalente: un método de TypeScript no se llama sobre `null`.

`tree_compat.go` (`InMemorySessionTreeStore`) no se porta: la referencia lo
marca *Deprecated* y lo conserva como stub de migración para los usuarios de
su SDK («Session tree management has moved to Home»); thyrox no tiene esos
consumidores, y la jerarquía que el stub guardaba viaja en `SessionInfo`
(`parentSessionId`, `agentName`, `isFork`, `nodeKind`).

| Anulación (`probes/annul-cases3/`) | Caen |
|---|---|
| sin desalojo por capacidad | 4 |
| `getAndRefresh` sin refrescar | 1 |
| mover a otra credencial sin conservar alias | 1 |
| retirar un alias sin quitarlo de los supervivientes | 2 |
| sin límite de una clave de caché de prompt | 1 |

## Fase 4: `SessionAffinitySelector`

`src/proxy/session/affinitySelector.ts`; prueba
`__tests__/proxySessionAffinity.test.ts` (los casos de `selector_test.go`,
`selector_subagent_affinity_test.go`, `selector_antigravity_subagent_test.go`,
`session_affinity_lookup_test.go`, `session_affinity_metadata_test.go` y
`session_affinity_priority_test.go` que no dependen del comparador LCP ni del
`Manager`). Corrida primero con el módulo ausente, después en verde (61).

Los hashes `msg:` se comparan con vectores de prueba conocidos producidos por
`probes/msghash/main.go`, que copia verbatim `computeSessionHash` y
`truncateString`: `outputs/msghash-known-answers.tsv`. Dos de los seis cortan
un texto de más de 100 bytes, uno en frontera de carácter y otro a mitad de
uno: el corte es por bytes, como `s[:100]` en Go.

Los casos que en Go tocan `cache.entries[...].expiresAt` usan aquí el reloj
inyectado: el alias de la conversación sigue vivo porque el tráfico del
primario refresca todo el grupo, y `lookupAffinity` no refresca (tras 50 s de
lecturas, la vinculación caduca a los 61 s igual).

Una prueba que Go no tiene: revincular al padre no arrastra la vinculación
del subagente. La de Go sobre alias de subagentes (`SubagentAliasIsolation`)
no discrimina en ninguno de los dos lenguajes —`CompareAndDelete` sólo retira
el alias pedido—; la revinculación sí, porque `SetAliases` fusiona el grupo.

Cableado: `server.ts` pasa al selector las cabeceras y el cuerpo del cliente
(con una metadata propia por upstream) e informa cada intento por
`onResult`; un 4xx que no conmuta es de la petición y conserva la
vinculación. `startServer.ts` gana `sessionAffinity` (apagada si no se
declara, como `routing.session-affinity`) y `createSelector`.

| Anulación (`probes/annul-cases4/`, selector) | Caen |
|---|---|
| corte por caracteres en vez de bytes | 1 |
| sin herencia del respaldo | 5 |
| sin `skipCooldown` | 1 |
| el respaldo ve todos los niveles de prioridad | 1 |
| sin filtro de peso positivo con el ponderado | 1 |
| `lookupAffinity` con `getAndRefresh` | 1 |
| el subagente vincula el alias del padre | 1 |

| Anulación (`probes/annul-cases5/`, servidor) | Caen |
|---|---|
| `pick` sin cabeceras ni cuerpo | 3 |
| sin `onResult` | 1 |
| todo 4xx culpa a la credencial | 1 |

Comprobación del paquete (`probes/phase4-checks.txt`, por `run-task-pool`):
`tsc --noEmit` sin errores en `proxy/`, y 2220 pruebas en verde.

Pendiente declarado en la cabecera del módulo: `pickLCP` y la mitad LCP de
`onResult`/`lookupAffinity` (tarea #90), y el clasificador que decide
`skipCooldown` (tarea #91).

## Fase 5a y 5b: turnos canónicos y comparador LCP (`lcp.go`)

`src/proxy/session/rawJson.ts` (semántica de gjson: `Raw`, primera clave,
`ForEach`/`Array()`), `canonicalTurns.ts` (`ExtractCanonicalTurns` a
`FastTurnFingerprint` y `EnvironmentDigest`) y `lcpMatcher.ts`
(`MerklePrefixMatcher`).

**La prueba es diferencial contra el paquete de Go sin tocar.**
`probes/lcpgo` importa `sdk/cliproxy/session` con un `replace` a
`_references/cliproxyapi` (sus dependencias bajan a la caché de módulos de
Go, fuera del árbol; `_references/` queda sin cambios) y reproduce un guion
JSON por línea con un reloj virtual. `probes/lcp-script.ts` genera el guion:
casos de extracción a mano, los escenarios de `lcp_test.go` y
`lcp_lookup_test.go` que la aleatoriedad no alcanzaba (ambigüedad de
compactación, linaje de compactaciones consecutivas, guarda de generación,
consulta con dos credenciales) y 24 sesiones al azar con semilla fija
(extensiones, bifurcaciones, compactaciones, cambios de sistema, saltos de
reloj, retiros por generación, límites estrechos). Guion y salida de Go se
copian a `__tests__/fixtures/`; `proxyLcpDifferential.test.ts` compara las
1047 líneas, una prueba por línea.

Los valores se guardan como cadenas de bytes (un carácter por byte): con eso
las longitudes, los cortes de 12 KiB que parten un carácter, las expresiones
(`\s` de Go es `[\t\n\f\r ]`; `(?i)k` casa U+212A) y el orden coinciden con
los de `string` en Go. `goMarshal` corrigió tres diferencias con Go que el
diferencial destapó: el orden de claves es por bytes UTF-8, un sustituto
suelto sale como U+FFFD y `-0` conserva el signo (prueba con la salida de Go
en `proxySessionIdentity.test.ts`).

| Anulación (`probes/annul-cases6/`, corre `probes/annul-run6.sh`) | Caen |
|---|---|
| longitud en caracteres, no en bytes | 3 |
| centro de la muestra desplazado | 3 |
| sin quitar `<think>` | 1 |
| sin enmascarar fechas y UUID del sistema | 113 |
| `trim()` de JavaScript sobre bytes | 1 |
| sin ordenar llamadas a herramienta | 1 |
| tope de partes al doble en la lista | 1 |
| sin descartar razonamiento | 2 |
| sin reserializar el JSON | 6 |
| digest de sistema muestreado en la huella | 1 |
| sin inferir Responses por `instructions` | 1 |
| número reserializado en vez de crudo | 1 |
| última clave repetida en vez de la primera | 1 |
| `ForEach` de un escalar vacío | 2 |
| sin bifurcaciones | 101 |
| sin compactaciones | 229 |
| varias hojas de linaje aceptadas | 2 |
| sin guarda de generación | 3 |
| éxito tardío pisa la revinculación | 35 |
| desalojo sólo por grupos | 45 |
| sin preferir la trayectoria más larga | 20 |
| grupos caducados siguen casando | 68 |
| consulta sin ordenar credenciales | 1 |
| prefijo mínimo 1 | 103 |
| `String()` de un decimal sin formato `f` | 1 |
| `(?i)k` sin U+212A | 1 |
| `ToLower` de U+0130 con `toLowerCase` | 1 |
| `TrimSpace` de rol con `trim()` | 1 |
| claves por unidades UTF-16 | 2 |
| sustituto suelto sin U+FFFD | 2 |
| `-0` sin signo | 2 |

Los recuentos de la tabla son de la última corrida de cada caso; los que se
añadieron escenarios después se volvieron a correr (`rerun*.txt`).

## Fase 5c: el LCP en el selector y en el servidor

`affinitySelector.ts` gana `pickLcp` (sin identidad explícita y con
`caller_scope`, antes de la derivada y el hash), la mitad LCP de `onResult`
(refresca o retira la secuencia exacta con las huellas que `pick` dejó en la
metadata, y deja en paz las vinculaciones por sesión) y de
`lookupAffinity` (por id publicado o por hash sin prefijo, con los alias de
proveedor: `gemini`/`vertex`/`aistudio` son `google`, `codex` es `openai`).
Prueba `__tests__/proxySessionAffinityLcp.test.ts`, de `selector_lcp_test.go`
y la parte LCP de `session_affinity_lookup_test.go`; corrida primero en rojo
(11 de 15).

`server.ts` da a la selección el `caller_scope` de la clave de acceso
(`requestCallerScope`: SHA-256 con dominio, nunca la clave en claro), el
cuerpo como llegó con su protocolo (`claude` en `/v1/messages`, `openai` en
`/v1/chat/completions`) y la metadata de `Enrich`.

Tres pruebas que Go no tiene, porque sus equivalentes no discriminaban:
refrescar sin el cuerpo (en Go el enlace sobrevive igual sin el refresco;
aquí, con reloj, caduca si no se refresca), una secuencia enlazada a una
credencial ya no disponible, y que el resultado de una petición LCP no toque
las vinculaciones por sesión. En el servidor, la compactación y el
aislamiento por clave necesitan tres credenciales: con dos, el reparto por
turno devuelve la misma por casualidad.

| Anulación (`probes/annul-cases7/`, corre `probes/annul-run7.sh`) | Caen |
|---|---|
| sin `pickLcp` | 6 |
| LCP sin exigir `caller_scope` | 1 |
| sin publicar la identidad del acierto | 4 |
| sin la mitad LCP de `onResult` | 3 |
| el resultado LCP toca la caché de sesiones | 1 |
| acierto con credencial no disponible | 1 |
| `lookupAffinity` sin el comparador | 3 |
| sin alias de proveedor | 1 |
| `onResult` recalcula en vez de usar las huellas | 1 |
| `invalidateAuth` sin el comparador | 1 |
| servidor sin `caller_scope` | 2 |
| servidor sin `Enrich` | **0** |

`Enrich` no tiene efecto observable mientras el LCP aplique, y con una clave
de acceso siempre hay `caller_scope`: la identidad derivada sólo decide
cuando la conversación no tiene un turno que no sea de sistema. Se conserva
por fidelidad con `conductor_execution.go`, que la calcula antes de elegir.

Comprobación del paquete (`probes/phase4-checks.txt`, por `run-task-pool`):
`tsc --noEmit` sin errores en `proxy/`, y 3289 pruebas en verde.
