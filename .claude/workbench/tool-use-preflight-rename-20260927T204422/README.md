# Renombre del preflight de PreToolUse

`src/hooks/pretooluse_dispatch.py` pasa a `src/hooks/tool_use_preflight.py`, y
su función `dispatch()` pasa a `preflight()`. El nombre dice el papel que ve el
cliente: lo que se evalúa antes de ejecutar cada `tool_use`. El reparto a todos
los detectores (Scatter-Gather) queda en el docstring (`clean-code.md`,
«Nombres»). `tool_use` es el término del árbol: 1618 + 2597 apariciones
(`tool_use`, `toolUse`) frente a 154 + 157 de `tool_call`/`toolCall` en `src/`.

## Migración sin cortar el hook vivo (H-THYROX-221)

1. `tool_use_preflight.py` creado junto al viejo; los dos presentes.
2. `user_wiring.declared_wiring` apunta al nuevo, y `bin/user_wiring --write
   --hooks-only` lo instaló en `~/.claude/settings.local.json`, con respaldo en
   `.claude/settings-backups/settings.local.json.20260927T204306`.
3. **La recarga se midió por el atime**, en un sistema de archivos `relatime`.
   Los dos módulos se llevaron a atime 2000-01-01; tras la siguiente llamada a
   herramienta, el nuevo marcaba 2026-09-27 20:43:08 y el viejo seguía en 2000.
4. Sólo entonces se retiró el viejo y se regeneró `bin/`.

La instalación aplicó también la deriva previa en `SessionStart`,
`SubagentStart` y `SubagentStop`: lo declarado incluye `kaupamex-api`, que
existe, y lo vivo no la tenía.

## Pruebas

`probes/checks.txt`, 11 suites, todas con salida 0 (`outputs/`).
`test_user_wiring` pasa 85 de 85; antes de instalar tenía 5 fallos que medían
esa misma deriva del cableado vivo.
