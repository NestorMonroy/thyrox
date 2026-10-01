# TASK-THYROX-0496 — proxy con credenciales del store y su cableado en headless-pool

Ítem del pool `task-census-20260930T064202`, worktree 2. Corpus de referencia:
`/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/` (sólo lectura,
`bin/binary symbol|literal … --root <bunfs-root>` y `rg`).

## Qué se entrega

- `src/packages/provider/bin/storeCredentialProxy.ts` (+ `bin/provider-store-credential-proxy`,
  generado con `generate_bin.py`): levanta `startProxyServer` con el store de conexiones como
  fuente de credenciales, anuncia `url=http://127.0.0.1:<puerto>`, exige
  `THYROX_STORE_PROXY_ACCESS_KEY` y `--model`.
- `src/session/headless-pool.sh --store-credential-proxy`: lanza ese bin con una clave de acceso
  por ejecución, espera `url=`, y entrega a cada ítem `ANTHROPIC_BASE_URL` + `ANTHROPIC_API_KEY`
  (la clave de acceso) con toda credencial y `THYROX_STORAGE_ENCRYPTION_KEY` retiradas.
  Rehúsa junto con `--credential-proxy`.

## Cómo lo hace la referencia (2.1.283)

| Símbolo / literal | Dónde | Qué hace | Decisión |
|---|---|---|---|
| `f3n` | `chunk-vmq4raye.js` [21151,21750) | Lista de variables que un hijo hereda; conserva `CLAUDE_CODE_OAUTH_TOKEN`/`ANTHROPIC_API_KEY` sólo cuando valen `nRe` (`ssh-placeholder`) y hay `ANTHROPIC_UNIX_SOCKET`. | El marcador es la convención del túnel por socket, ya portada en `--credential-proxy`. Con el proxy del store por HTTP el ítem lleva una clave de acceso REAL del proxy local, no un marcador: `startProxyServer` rehúsa arrancar abierto. Divergencia declarada. |
| `DBr` | `chunk-4h0c4z04.js` [26349,26515) | El host de `ANTHROPIC_BASE_URL` se reporta como pasarela sólo si es firstParty, no hay socket Unix y no es `api.anthropic.com`. | Confirma que `ANTHROPIC_BASE_URL` es la vía del cliente para apuntar a un proxy; thyrox la lee en `provider/src/internal/anthropicClient.ts:40`. Portado: el pool la fija por ítem. |
| `j$` | `chunk-wg7ts4cy.js` [1034364,1034931) | La pasarela entrega al cliente `inferenceProvider:"gateway"`, `inferenceGatewayBaseUrl` y `inferenceCredentialKind:"interactive"`: una URL y una credencial DE LA PASARELA, nunca la del upstream. | Misma forma: el pool entrega URL + clave de acceso del proxy local. Divergencia: por variables de entorno, no por un payload de settings gestionado. |
| `V$`, `Kre` | `chunk-wg7ts4cy.js` [1058088,1060004), [1061613,1062492) | `listen.public_url` sólo gobierna políticas gestionadas y el reenvío OTLP. | No aplica a un proxy de loopback para un pool; la misma divergencia que `startServer.ts` ya declara. |
| `$_`/`K$` | `chunk-wg7ts4cy.js` [1037042) (citado en `netGuards.ts`) | Escucha sólo en loopback salvo `public_url`. | Ya portado (`isLoopbackListenHost`); el bin fija `127.0.0.1`. |
| `c_e` (puente socat) | `chunk-gpsyc3w1.js` línea 72 | `UNIX-LISTEN:claude-http-<hex>.sock` → `TCP:localhost:<puerto>`: la referencia tiende un socket Unix a un puerto local con `socat` para hijos aislados. | `startProxyServer` escucha con `Bun.serve` (TCP) y no tiene socket Unix; un puente socat añadiría dependencia. El ítem recibe la URL, no un socket. Divergencia declarada; si C6 exige socket, es cambio en `startServer.ts` (ajeno a este ítem). |
| literal `public_url` | 7 declaraciones en 2 de 2138 chunks (`bin/binary literal`) | — | Medido para acotar: la pasarela vive en `chunk-wg7ts4cy.js`. |
| literal `ANTHROPIC_UNIX_SOCKET` | 18 chunks de `bunfs-root` + 32 líneas en `claude_strings.txt` (`rg -c`) | — | Sólo `chunk-vmq4raye.js` y `chunk-csayct82.js` deciden credencial con ella; el resto es telemetría/UX. |

*Métrica:* offsets `[inicio,fin)` que imprime `bin/binary symbol`; conteos de `rg -c -F` por archivo.
*Ciega a:* código que llegue al mismo efecto sin nombrar el literal (una pasarela configurada por
objeto ya parseado no aparece en `rg -F 'public_url'`).

## Lo que la medición corrigió en el diseño

1. **El proveedor del store no es el del enrutamiento.** `ANTHROPIC_PROVIDER_ID = 'claude'`
   (`accounts/imports/anthropicAuthFile.ts:15`); `resolveUpstreamModel` sirve el catálogo
   (`family.firstParty`) sólo si `upstream.provider === 'anthropic'`. El primer diseño usó un
   adaptador que traducía el FILTRO (`anthropic` → `claude`), y `storeCredentialsOf` agrupa por el
   `provider` de cada FILA: el pool de `anthropic` quedó vacío y el proxy respondió 502
   `all upstreams failed (1 attempted)`. Con `fetch` instrumentado en proceso: 0 llamadas al
   upstream. Decisión: el upstream se llama y es `claude` —`rateLimitManager.ts:134`,
   `errorClassifier.ts:208`, `affinitySelector.ts:324` y `refresh/providerCredentials.ts:24` ya lo
   tratan como Anthropic— y los modelos se declaran con `--model` como passthrough.
   *Métrica:* código HTTP y cuerpo de la respuesta del proxy; conteo de llamadas al `fetch` global.
   *Ciega a:* un fallo posterior a la selección de credencial (no llegó a haberla).
2. **El catálogo no cubría el modelo del pool de todas formas.** `model/configs.ts` declara 18
   `firstParty`; `claude-sonnet-5` (el modelo de la suite del pool) no está. `--model` obligatorio
   es lo que hace explícito lo que se sirve.
3. **La clave de acceso va por entorno.** La línea de comando se lee en `/proc/<pid>/cmdline`
   desde cualquier usuario; el entorno sólo desde el mismo. Por eso el bin lee
   `THYROX_STORE_PROXY_ACCESS_KEY` y el pool la genera por ejecución (`/proc/sys/kernel/random/uuid`).

## Estado de partida y controles

| Suite | Partida | Rojo | Verde |
|---|---|---|---|
| `tests/session/test-headless-pool.sh` | 123 de 130 (7 fallos ajenos: `THYROX_CODE_PROMPT_CACHE_TTL` y `ANTHROPIC_BASE_URL` fijadas en el shell de la sesión; el entorno gana a la opción) | 133 de 139 con esas dos variables retiradas: caen exactamente las 6 nuevas | 139 de 139 |
| `__tests__/storeCredentialProxyProcess.test.ts` | — (nuevo) | 0 de 4 (el bin no existía) | 5 de 5 |
| `__tests__/credentialProxyProcess.test.ts` + `proxyStartServer.test.ts` | 27 de 27 | — | sin cambios |

Anulaciones (se copia el archivo con `mktemp`, se retira la rama, se mide, se restaura y `cmp` da igual):

| Rama retirada | Cae | De |
|---|---|---|
| bin: guarda de `THYROX_STORE_PROXY_ACCESS_KEY` | caso 4 | 1 de 5 |
| bin: guarda de `--model` | caso 5 | 1 de 5 |
| bin: `storeRefusal` (conexión ilegible) | caso 3 | 1 de 5 |
| pool: exclusión mutua de los dos proxies | «los dos proxies a la vez» | 1 de 139 |
| pool: `unset THYROX_STORAGE_ENCRYPTION_KEY` en el ítem | «sin credencial ni clave de cifrado» (`skey=clave-secreta`) | 1 de 139 |
| pool: línea `credencial: proxy con credenciales del store` | «declara la fuente» | 1 de 139 |
| pool: `--model "$MODEL"` al lanzar el proxy | «recibe el modelo del pool» (`sin`) | 1 de 139 |

Duración de la suite del pool: 197 s, 186 s y 148 s en tres corridas; la primera anulación con
`timeout 280` se cortó a 113 de 139 aserciones y se repitió con tope holgado.

*Métrica:* líneas `FALLA` y el resumen `aserciones: N de M` de cada corrida; `(fail)` de bun.
*Ciega a:* la ruta OAuth del store (bearer + refresco, `ensureFreshOAuthConnections`) —el proceso
de prueba sólo siembra una conexión `apikey`—; el `.env` del árbol, que `declaredStorageKey` lee
del disco: retirar la variable del entorno del ítem no le impide leer el archivo; y a `pool`
real contra el bin real: la suite del pool usa un proxy falso y el bin se prueba aparte.

## Verificación de cierre

- `bash bin/check_package_typecheck --strict provider`: 0 errores propios.
- `bash bin/check_lint_zero src/session/headless-pool.sh tests/session/test-headless-pool.sh`:
  shellcheck 0 hallazgos en 2 archivos (hizo falta `uv sync --group lint` en el worktree).
- `python3 src/session/generate_bin.py --check`: `bin/` al día, 291 entrypoints (1 escrito).
- `bash bin/provider-store-credential-proxy --model claude-sonnet-5` sin store: exit 2 nombrando
  `provider_connections`.
