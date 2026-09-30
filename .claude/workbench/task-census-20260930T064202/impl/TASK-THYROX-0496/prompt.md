# TASK-THYROX-0496

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p5-credentials.md`

## La tarea

## [245] TASK-THYROX-0496 — Credenciales C3 — proceso del proxy local y cableado en headless-pool

Status on board: pending

TDD. Un bin que levanta startProxyServer (provider/src/proxy/startServer.ts) con las credenciales del store, y la opción del pool para lanzarlo y entregar a cada ítem su socket o URL sin credencial en el entorno del ítem. Complementa --credential-proxy, no lo reemplaza.


## Estado medido (2026-09-30, sesión que integra)

- C2 está hecha y cableada (`7dcd8bbc8`): `openExistingConnectionStore()` en `provider/src/accounts/connectionStoreHome.ts` abre el store sólo si existe y lee la clave de cifrado del proceso o del `.env` (`declaredStorageKey`). Úsalo; no abras el store de otra forma.
- `--credential-proxy` ya existe en el pool (`headless-pool.sh:361`, `bin/provider-credential-proxy`): tu opción lo complementa, no lo reemplaza.

## Archivos que te pertenecen

- un bin nuevo en `src/packages/provider/bin/` que levanta `startProxyServer` con las credenciales del store, y su prueba
- la opción del pool en `src/session/headless-pool.sh` y su caso en `tests/session/test-headless-pool.sh`
- NO toques `src/packages/provider/src/proxy/**`: otro ítem trabaja ahí; si necesitas un cambio en `startServer.ts`, dilo

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
