# TASK-THYROX-0500 — la máscara de `thyrox -p` pasa por el proxy local, no por `claude -p` directo

Pregunta: sin credencial propia, ¿cómo atiende 2.1.283 una petición, y cómo se
porta eso a `thyrox -p` para que el proxy local con el upstream `claude-cli`
(C5) sustituya la delegación directa en `claude -p`?

Corpus: `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root`,
sólo lectura, con `bash bin/binary literal|symbol|references --root <corpus>`.
Banco previo que este análisis extiende:
`c7-proxy-route-analysis-20260930T074430/`.

## Lo consultado

| Consulta | Chunk y rango | Qué hace | Decisión |
|---|---|---|---|
| literal `ssh-placeholder` → `nRe` | `chunk-vmq4raye.js` [11052,11078) | el marcador que ocupa el lugar de la credencial | ya portado: `SSH_PLACEHOLDER` (`provider/src/credentials.ts`) |
| `i1` | `chunk-7y2gzc5g.js` [25187,25430) | el socket del túnel: `ANTHROPIC_UNIX_SOCKET` sin `ANTHROPIC_AUTH_TOKEN` y exactamente una credencial igual al marcador | ya portado: `tunnelSocket`; `tunnelEnv` compone ese entorno |
| `NB` | `chunk-bfkwjer3.js` [1597,1703) | con túnel cuenta como autenticado; con socket sin marcador, no | portado en `decidePrintRoute`: un túnel ya declarado es «credencial propia» (`resolveCredential` da `proxy`) |
| `Ty`, `Gn` | `chunk-4h0c4z04.js` [26270,26349), [25563,25604) | las otras mitades de `NB`: proveedor first-party y `ANTHROPIC_BASE_URL` sin sospecha | no se portan: thyrox decide por `--provider`, no por proveedor de nube |
| `references NB` | 10 usos en 5 chunks; leído `Gvo` `chunk-5t3x93y6.js` [619244,619536) | la cadena de derecho a una función lo consulta como «base URL de primera parte» | sólo confirma el papel de `NB`; nada que portar |
| `at` | `chunk-2r9e48vs.js` [4624,4869) | con túnel, la fuente de credencial es `"proxy"` | ya portado: `source: 'proxy'` |
| `dt` | `chunk-2r9e48vs.js` [5538,8929) | con túnel salta la autenticación propia y pasa `socketPath` al `fetch` | portado: en túnel el bucle no busca credencial |
| `ke` | `chunk-2r9e48vs.js` [2614,3118) | el helper de `fetch` con `socketPath` | ya portado: `unix` en `AnthropicHttpProvider` |
| `Ae` | `chunk-2r9e48vs.js` [3886,3953) | `i1() ? "http://localhost" : BASE_API_URL` — con túnel la URL base es `http://localhost` | **portado: `TUNNEL_BASE_URL`** (`printDelegation.ts`); ver medición de abajo |
| literal `selfInvocation` → `ie` | `chunk-n94xvwy3.js` [14291,15650) | cómo la referencia lanza su propio hijo: `cmd` + `prefixArgs`, stdin por tubería, cola de stderr como causa, `stop` con SIGTERM y SIGKILL tras la gracia | portado en parte: lanzamiento por ruta, stderr como causa, `kill` al cerrar. Divergencia: sin escalado a SIGKILL |
| literal `Please run /login`, `Not logged in`, `Invalid API key` | 0 declaraciones por `bin/binary literal` (las cadenas están partidas); `rg` sobre `claude_strings.txt`: líneas 599529-599530 y 599533 | `-p` sin credencial rehúsa nombrando la causa y el remedio | portado como exit 2 con causa; divergencia: el remedio aquí es el proxy local, no `/login` |

## Lo medido fuera del corpus

**`fetch` por el socket Unix decide TLS por el esquema, no por el host.**
Contra el lanzador real con el doble de `claude -p` (`scratchpad/debug-fetch.ts`):

| URL | con `HTTPS_PROXY` del entorno | sin ella |
|---|---|---|
| `http://localhost/v1/messages` + `unix` | 200 | 200 |
| `https://api.anthropic.com/v1/messages` + `unix` | «Unable to connect» | «Unable to connect» |

Es la razón de `Ae` en la referencia, y la razón de `TUNNEL_BASE_URL`. Antes de
medirlo, el primer e2e salía con exit 1 y ese mensaje.

*Métrica:* estado HTTP o error del `fetch` de Bun 1.3.11 con `unix` fijado, dos
esquemas × dos entornos, mismo socket.
*Ciega a:* un socket servido con TLS (el proxy local no lo hace) y a otros
runtimes que no sean Bun.

**El catálogo conoce `claude-sonnet-5`** (`provider/src/model/configs.ts:131`,
`firstParty`): el e2e lo usa y resuelve por familia; `real-model` no está y
sólo pasa si el lanzador lo recibe con `--model` (prueba 1 del lanzador).

**Resolución de `@thyrox/*` desde este worktree:** `import.meta.resolve` da
`/home/user/thyrox/src/packages/provider/...` (el árbol principal: el worktree no
tiene `node_modules`). El árbol principal está 1 commit por delante de `HEAD`
y `git diff --stat` sobre `src/packages/{provider,cli,agent}` entre los dos da
vacío, así que las suites miden el mismo código. El lanzador se localiza por
ruta de hermano (`../../../provider/bin/localProxy.ts`), no por paquete, por
esta misma razón.

## Qué se construyó

1. `src/packages/provider/bin/localProxy.ts` (`bin/provider-local-proxy`):
   `startProxyServer` en loopback con el upstream `claude-cli` y una clave de
   acceso aleatoria, detrás de `startCredentialProxy` por socket Unix que la
   antepone. Anuncia `socket=<ruta>`; sin `claude` (ni `--cli`) exit 2.
2. `printDelegation.ts`: `decidePrintRoute` (propia / proxy declarado en
   `THYROX_LOCAL_PROXY_SOCKET` / levantar), `tunnelEnv`,
   `credentialEnvironmentFor` con el lanzamiento y sus tres desenlaces.
3. `print.ts`: la ruta en lugar de la delegación; sin proxy, exit 2 con causa.
   `runLoop.ts`: `loopSetup` recibe el entorno del que el proveedor http
   resuelve su credencial.
4. Retirados `decidePrintDelegation`, `delegatedArgv` y `runDelegatedPrint`:
   ya no existe camino a `claude -p` directo.

## Controles de anulación (suite de cada archivo, aserciones que caen)

| Rama retirada | Caen | Total suite |
|---|---|---|
| cli b: credencial propia → `own` | 3 (propia, túnel declarado, conexión del store) | 13/16 |
| cli c: proxy declarado → `declared-proxy` | 2 (la decisión; `runPrint` declarado ausente) | 14/16 |
| cli d: existencia del socket declarado | 2 (`credentialEnvironmentFor`; `runPrint`) | 14/16 |
| cli e: plazo de anuncio | 1 (nunca anuncia: agota los 5000 ms de bun) | 15/16 |
| cli f: código y stderr en la causa | 1 | 15/16 |
| cli i: retirar credenciales propias del túnel | 1 | 15/16 |
| cli j: `ANTHROPIC_BASE_URL` llana del túnel | 5 (3 de entorno, 2 e2e) | 11/16 |
| lanzador g1: rehusar sin `claude` | 1 | 3/4 |
| lanzador g2: paso tal cual de `--model` | 1 | 3/4 |
| lanzador g3: rehusar sin `--socket` | 1 | 3/4 |

*Métrica:* `(fail)` que imprime `bun test` con la rama sustituida por su forma
inerte y el archivo restaurado desde una copia `mktemp` (`cmp` en 0).
*Ciega a:* ramas que caen juntas por compartir el mismo caso (c y d comparten
el e2e del proxy declarado ausente).

## Lo que queda fuera de este ítem, y por qué

- `provider/src/anthropicHttp.ts` toma `env.ANTHROPIC_BASE_URL ??
  'https://api.anthropic.com'` aunque haya `unixSocket`: un túnel declarado
  por el pool sin `ANTHROPIC_BASE_URL` intentaría TLS por el socket. Las
  pruebas del pool no lo ven porque fijan la URL del mock (http). El porte
  de `Ae` ahí es de otro ítem; aquí `tunnelEnv` lo cubre para `thyrox -p`.
- `src/session/headless-pool.sh:171` y `tests/session/test-headless-pool.sh`
  siguen diciendo «si `thyrox -p` delega en `claude -p`»: prosa que ya no
  describe el código; no son archivos de este ítem.
