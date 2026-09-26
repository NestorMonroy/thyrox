# Cómo autentica claude sus peticiones al modelo en esta sesión (2.1.282)

Instrumento: `bin/binary symbol <chunk> <nombre>` sobre
`_references/claude-code-bin/2.1.282/bunfs-root/`. Salidas verbatim:
`symbols-env.txt`, `symbols-lists.txt`, `symbols-credential-chain.txt`,
`context-wbbthbh9.txt`, `occurrences.txt`.

## Lo que el binario declara

- `jc()` (chunk-wbbthbh9) resuelve la fuente del token por orden:
  apiKeyHelper → ANTHROPIC_AUTH_TOKEN → CLAUDE_CODE_OAUTH_TOKEN →
  `KI()` → **CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR** (o CCR_OAUTH_TOKEN_FILE)
  → apiKeyHelper → profile (WIF) → login claude.ai guardado.
- `pc()` = `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`. No es un canal: es la
  bandera "las credenciales las administra el host". Con ella `wD()` da la
  sesión por válida sin exigir login, `rin()` no reprueba el modelo del
  proveedor, y `F0t()` es el error "credentials are managed by the desktop
  app, but none are available".
- `FNe()` (chunk-t6d3nxvc) sólo aplica con esa bandera: devuelve la lista de
  variables que se QUITAN del entorno de los procesos hijos —`vB`
  (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, …),
  ANTHROPIC_CUSTOM_HEADERS, CLAUDE_CODE_HOST_CREDS_FILE, y las de AWS si hay
  proveedor 3p—. `Gct()` hace el borrado.
- `ANTHROPIC_UNIX_SOCKET` es OTRA vía (claude ssh remote): `Jm()`, `KWn()`,
  `Lko()`; con él las peticiones van por el socket y el login viaja sólo si
  hay CLAUDE_CODE_OAUTH_TOKEN.

## Lo medido en el proceso (pid 106)

`CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` activo y
`CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` presente; sin `ANTHROPIC_UNIX_SOCKET`
ni `CLAUDE_CODE_HOST_AUTH_ENV_VAR`; `ANTHROPIC_BASE_URL=https://api.anthropic.com`.
El shell de herramientas sólo tiene los fd 0, 1, 2 y 10.

## Veredicto

El mecanismo es: el host abre un fd con un token OAuth (alcance
`user:ccr_inference`), claude lo lee (`jc` → `…_FILE_DESCRIPTOR`) y lo manda
por HTTPS a `ANTHROPIC_BASE_URL`; la bandera `PROVIDER_MANAGED_BY_HOST`
declara que ese token lo administra el host y hace que `FNe`/`Gct` lo
retiren del entorno de los hijos. La hipótesis "es por socket local" es
falsa para esta sesión: el único socket con ruta, `/tmp/cc-socks/106.sock`,
es de mensajería entre sesiones.

Consecuencia para `thyrox -p`: el token no llega al shell (el fd no se hereda
y `FNe` lo retira a propósito). Leerlo por `/proc/106/fd` sería reusar la
credencial de la sesión del harness contra su diseño: no se hace. Lo que sí
se porta es la cadena `jc()` con las fuentes que un usuario declara
(ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN,
ANTHROPIC_UNIX_SOCKET), y el borrado `FNe`/`Gct` para los hijos que thyrox
lance.

Métrica: definiciones de nivel superior resueltas por `bin/binary symbol`.
Ciega a: lo que el host hace antes de lanzar a claude (quién abre el fd).
