# TASK-THYROX-0497

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p5-credentials.md`

## La tarea

## [246] TASK-THYROX-0497 — Credenciales C4 — alta de una credencial Anthropic: providers add y login claude

Status on board: pending

TDD. `thyrox providers add anthropic` con una clave de API guardada cifrada; `providers login claude` exige THYROX_CLAUDE_OAUTH_CLIENT_ID, que declara el consumidor y nunca se publica. Después, test/validate contra el proxy local. Depende de C1.


## Estado medido (2026-09-30, sesión que integra)

- C1 está hecha: la clave la genera `bin/provider-generate-storage-key` y se lee del `.env` (`declaredStorageKey`, `7dcd8bbc8`).
- DEFECTO MEDIDO a cerrar aquí: `resolveCredential` busca `ANTHROPIC_PROVIDER_ID = 'claude'` (`provider/src/accounts/imports/anthropicAuthFile.ts:15`), pero `providers add anthropic --dry-run` guarda `"provider": "anthropic"`: una fila que nadie lee. Decide con la referencia cómo se nombra el proveedor de Anthropic y haz que el alta y la resolución coincidan, con prueba.
- Las pruebas usan un store temporal (`THYROX_PROVIDERS_DATA_DIR`) y claves falsas; nunca una credencial real.

## Archivos que te pertenecen

- `src/packages/cli/src/commands/providers/**` y sus pruebas en `src/packages/cli/__tests__/`

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.
