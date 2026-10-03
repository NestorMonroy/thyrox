# TASK-THYROX-0498

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p5-credentials.md`

## La tarea

## [247] TASK-THYROX-0498 — Credenciales C5 — upstream claude-cli en el proxy local, con tool_use de ida y vuelta

Status on board: pending

Decisión del ejecutor 2026-09-29: todo pasa por el proxy. Es un upstream del proxy que atiende /v1/messages dentro de un entorno claude sin credencial propia, lanzando `claude -p`. Restricción medida: claude ejecuta sus propias herramientas y no devuelve tool_use al cliente. Por eso las tools de la petición se exponen a claude como un servidor MCP puente: cuando claude invoca una, el puente suspende, el proxy responde al cliente con ese tool_use (stop_reason tool_use), y la siguiente petición, con el tool_result, reanuda la misma conversación (--session-id por conversación, afinidad por prefijo con session_cache). En TDD por subfases: C5a, petición sin tools → texto; C5b, puente MCP que devuelve el tool_use; C5c, reanudar con tool_result; C5d, stream SSE.


## Estado medido (2026-09-30, sesión que integra)

- C1 y C2 están hechas: `provider/bin/generateStorageKey.ts` (`c348eed2b`) y la rama `PROVIDER_CONNECTION` de `resolveCredential`, cableada en sus tres llamadores (`7dcd8bbc8`).
- El proxy de credencial actual es `provider/src/credentialProxy.ts` + `provider/bin/credentialProxy.ts` (sin upstream claude-cli). El servidor de proxy completo es `provider/src/proxy/server.ts` / `startServer.ts`.
- Mide antes cómo 2.1.283 trata `claude -p` en modo SDK/stream-json y MCP: su corpus está en `/home/user/thyrox/_references/claude-code-bin/2.1.283/`.
- Entrega por subfases: C5a (petición sin tools → texto) es el mínimo; C5b–C5d si caben en tu plazo.

## Archivos que te pertenecen

- `src/packages/provider/src/proxy/**` (el upstream nuevo, el puente MCP, su enrutado en el servidor del proxy) y sus pruebas en `src/packages/provider/src/proxy/__tests__/`

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
