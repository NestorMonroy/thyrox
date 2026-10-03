# TASK-THYROX-0499 — la fuente de credencial del pool, contra 2.1.283

Pregunta: ¿cómo decide el ejecutable de referencia de dónde sale su
credencial, y cómo lo declara? Sólo lectura sobre
`/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/` con `rg`;
`bin/binary literal` devolvió 0 chunks con `--root` apuntando al corpus y a
la raíz del árbol principal, así que las líneas de abajo salen de `rg -n -o`.

## Símbolos y literales consultados

| Símbolo / literal | Chunk:línea | Qué hace | Decisión |
|---|---|---|---|
| `dc()` | `chunk-t6pwageh.js:77` | Devuelve `{source, hasToken}`: `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR`, `CCR_OAUTH_TOKEN_FILE`, `apiKeyHelper`, `profile`, `claude.ai` o `none`. Nombra la fuente por el NOMBRE de la variable; nunca devuelve el valor. | **Portado**: `first_present_credential_variable` recorre los cuatro nombres de la cadena de `credentials.ts` y el pool escribe el nombre, no el valor. |
| `nf()` / `pb()` | `chunk-t6pwageh.js:77` | La misma cadena para la llave (`key`, `source`); `WLr()` publica `source` y una huella (`Kt(e)`), no la llave. | Portado en espíritu: el pool publica `credencial: <fuente> (<por qué>)`; la huella no se porta (no hay consumidor). |
| `no = { ANTHROPIC_API_KEY: " from ANTHROPIC_API_KEY", … }` | `chunk-t6pwageh.js:26` | Tabla fuente → texto para el usuario («from the OAuth token file descriptor», «from the saved claude.ai login»). | **Portado** como el `por qué` de la línea: una razón por fuente, en español. |
| `Tx` (`claude-ai-external-token`) | `chunk-qr9an5z2.js:15` | Aviso «`<source>` overriding Claude subscription login» cuando conviven dos fuentes: la que gana se DECLARA. | **Portado** como principio: cuando `proxy-store` se pide con una variable en el entorno, la línea dice `<VAR> se retira del entorno del proxy`; cuando hay varias, la línea nombra la primera de la cadena, que es la que ganaría. |
| `i1()` | `chunk-7y2gzc5g.js:20` | El túnel: `ANTHROPIC_UNIX_SOCKET` sin `ANTHROPIC_AUTH_TOKEN` y exactamente un marcador `nRe`. | Ya portado en `tunnelSocket` (`credentials.ts`); el pool sigue entregando socket + marcador sin cambio. |
| `nRe = "ssh-placeholder"` | `chunk-vmq4raye.js:11` | El marcador del túnel. | Sin cambio (`SSH_PLACEHOLDER`). |
| Barrido bajo `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` | `chunk-m5drh1xg.js:29` | Borra `[...I0, ...LL, ...G1]` del entorno del hijo cuando el anfitrión administra la credencial. `I0` (`chunk-379zyrv7.js:12`) = `ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, AWS_BEARER_TOKEN_BEDROCK, …`. | **Portado en dirección inversa**: para `proxy-store` el pool retira del entorno del PROXY las cuatro variables de la cadena (`env -u …`), para que la fuente usada sea la pedida. **Divergencia**: sólo las cuatro que lee `credentials.ts`, no `I0` entero (Bedrock/Foundry no entran en la cadena de thyrox). |
| `env=${…OAUTH_TOKEN?"set":"unset"}, fd=${…?"set":"unset"}` | `chunk-bfkwjer3.js:11` (también en el mensaje de `CLAUDE_CODE_REMOTE`) | Diagnóstico por presencia: cada variable de credencial se publica como `set`/`unset`, nunca su valor. | **Portado**: los dobles de la suite registran nombres presentes, y la suite mide 0 apariciones del valor en salida y artefactos. |

## Lo que la referencia NO tiene y el pool sí

- **Una fuente pedida que rehúsa en vez de caer.** `dc()` y `pb()` siempre
  caen a la siguiente fuente y terminan en `none`; la advertencia `Tx` avisa
  de la coexistencia pero no rehúsa. El pool, con `--credential-source`,
  rehúsa con exit 2 si la fuente pedida no está (`proxy-env` sin variable;
  `proxy-store` si el proxy no resuelve el store). Divergencia declarada:
  aquí el llamador pide una fuente concreta y el pool es un despachador,
  no un cliente interactivo que pueda preguntar.
- **La derivación declarada.** `--credential-proxy` sin `--credential-source`
  deriva `proxy-env`/`proxy-store` por presencia y la línea dice
  `derivada de --credential-proxy`; una fuente `declarada` o `por defecto`
  también lo dice. La referencia no distingue en su salida cómo llegó a la
  fuente.

## Cifras

- Casos de la suite nueva: 39 aserciones, 17 en rojo antes de implementar,
  39 en verde después.
  *Métrica:* `check` de `tests/session/test-headless-pool-credential-source.sh`.
  *Ciega a:* el proxy real y el store real (la suite usa dobles); el
  extremo a extremo con proxy real lo mide `test-headless-pool-thyrox-p.sh`.
- Controles de anulación, una línea cambiada cada uno, y lo que cae:
  A (sin exigir credencial para `proxy-env`) → 4 de 39, todas del caso 6;
  B (sin retirar variables para `proxy-store`) → 1 de 39, la del proxy que
  no debía verlas; C (sin derivar) → 4 de 39, todas del caso 4;
  D (sin la contradicción `inherit` + `--credential-proxy`) → 2 de 39.
  *Métrica:* conteo de `FALLA` por ejecución sobre el archivo mutado con
  `gawk`, restaurado desde una copia `mktemp`.
  *Ciega a:* una anulación de dos ramas a la vez (no se midió).
- Literales `ssh-placeholder`, `ANTHROPIC_UNIX_SOCKET`,
  `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` con `bin/binary literal --root`: 0
  chunks en las dos raíces probadas; con `rg -l` sobre el corpus: 1, ≥1, ≥1.
  *Métrica:* salida de cada comando.
  *Ciega a:* por qué `bin/binary literal` no ve el corpus desde un worktree
  sin `_references/` (no se investigó: está fuera de los archivos del ítem).

## Lo que la medición corrigió

- **El archivo de la decisión no puede vivir en `<out>` mientras el pool
  corre.** La primera versión escribía `<out>/credential-source` al decidir,
  y `tests/session/test-headless-pool-lifecycle.sh` cayó en «en curso, git
  status del banco no cambia» (0 esperado, 1 obtenido) — la invariante I1:
  la salida sólo cambia al publicar. Contra HEAD esa suite no tenía ningún
  `FAIL`, así que el fallo era del cambio. Corrección: la línea sale por
  stdout al decidir; el archivo se escribe en el runtime junto al índice y se
  copia a `<out>` justo antes de `close-run`. Un rehúso previo al runtime
  deja sólo la línea, y la suite lo mide (`sin-archivo`).
  *Métrica:* `FAIL` de esa suite con la versión de HEAD del pool (copia
  `mktemp`, sin stash) contra la versión con el cambio.
  *Ciega a:* la forma más limpia —añadir `credential-source` a
  `pool_lifecycle.RUN_ARTIFACTS`— toca un archivo que no es de este ítem.
- **`test-headless-pool-worktree.sh` falla 1 de 46 igual en HEAD** («su
  node_modules sigue siendo el del runner»: este worktree no tiene
  `node_modules` y hereda el del árbol principal). No es de este cambio.
- **`test-headless-pool.sh` falla 7 de 130 igual en HEAD**, todas de
  `cache-ttl`; ninguna nombra credencial, proxy ni socket.
