# TASK-THYROX-0500

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p5-credentials.md`

## La tarea

## [249] TASK-THYROX-0500 — Credenciales C7 — la máscara de thyrox -p pasa por el proxy, no por claude -p directo

Decisión del ejecutor 2026-09-29: todo pasa por el proxy. `printDelegation.ts` hoy delega en `claude -p` directamente cuando no hay credencial. Tras C5, en esa condición `thyrox -p` apunta su provider http al proxy local (upstream `claude-cli`) y el bucle propio de thyrox ejecuta las herramientas. La delegación directa se retira sólo cuando C5a–C5c estén en verde. En TDD: con proxy disponible se usa el proxy; sin proxy se rehúsa con causa. Depende de C3 y C5.

## Estado medido (2026-09-30, sesión que integra)

- C5 está en `HEAD` (`77daa8798`): `src/packages/provider/src/proxy/claudeCli/` (upstream `claude-cli`, puente MCP `thyrox_bridge`, reanudación por `--session-id`), enrutado en `proxy/server.ts` y arranque en `proxy/startServer.ts` (`claudeCli.upstreams`). Sus pruebas: `src/packages/provider/src/proxy/__tests__/claudeCli*.test.ts`, con el doble `fakeCliUpstream.ts`. C5a–C5c tienen prueba.
- **No existe todavía un lanzador del proxy completo**: `startProxyServer` no tiene `bin/` y escucha por HTTP (`Bun.serve`). El único `bin` de proxy es `provider/bin/credentialProxy.ts` (proxy de credencial por socket Unix, sin upstream `claude-cli`).
- Análisis de la referencia para C7: `/home/user/thyrox/.claude/workbench/c7-proxy-route-analysis-20260930T074430/README.md`. La referencia no delega: el cliente sin credencial habla con un socket local (`ANTHROPIC_UNIX_SOCKET` + `ANTHROPIC_API_KEY=ssh-placeholder`, porte `tunnelSocket` en `provider/src/credentials.ts`) y ese socket pone la credencial. `resolveCredential` ya devuelve `source: 'proxy'` con túnel y `printDelegation.ts` ya no delega con esa fuente.
- Decisión del ejecutor: `ANTHROPIC_UNIX_SOCKET` conserva su nombre (contrato del proveedor). No renombrar.
- Gate `check_product_word`: ningún identificador nuevo lleva la palabra `Claude` con mayúscula; nombrar por papel (`CliUpstream…`, `LocalProxy…`).
- Restricción: la credencial del anfitrión no se reutiliza, no se imprime ningún valor de credencial y no se usa `--runner claude`.

Qué falta, en TDD con su control de anulación:

1. Un lanzador del proxy local con el upstream `claude-cli` (en `src/packages/provider/bin/`), que escuche en un socket Unix y anuncie `socket=<ruta>` como `credentialProxy.ts`.
2. En `thyrox -p`, cuando `resolveCredential` da `none`: localizar un proxy local declarado o levantar el del punto 1, y entrar al túnel (`ANTHROPIC_UNIX_SOCKET` + marcador) para que el bucle propio de thyrox ejecute las herramientas. Sin proxy disponible, rehusar con causa (nunca caer en silencio a `claude -p`).
3. Retirar la delegación directa en `claude -p` de `printDelegation.ts` sólo si 1 y 2 están en verde; si no llegas, deja la delegación y declara qué falta.

## Archivos que te pertenecen

- `src/packages/cli/src/entry/printDelegation.ts`, `print.ts`, `runLoop.ts` y sus pruebas en `src/packages/cli/__tests__/`
- `src/packages/provider/bin/` (el lanzador nuevo) y su prueba en `src/packages/provider/__tests__/`
- `bin/<nombre>` del lanzador nuevo, regenerado con `python3 src/session/generate_bin.py` (sólo ese envoltorio)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
