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
