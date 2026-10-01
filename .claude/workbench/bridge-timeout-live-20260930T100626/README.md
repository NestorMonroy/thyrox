# El plazo del puente MCP, en vivo — TASK-THYROX-0646

Fecha: 2026-09-30. `thyrox -p` sin credencial propia, por el proxy local (C7),
con el upstream `claude-cli` (C5) y el `timeout` del puente declarado.

## Qué se midió

Una tool de thyrox que tarda MÁS que el corte de 2.1.283 para una petición a un
MCP `http` (`Ur`: `mr=60000` salvo `timeout` del servidor o `MCP_TOOL_TIMEOUT`).

| Corrida | Qué pasó | Vale como medida |
|---|---|---|
| `stdout.jsonl` (cwd en el repo) | el modelo siguió las reglas del repo y mandó el `sleep` a `thyrox-bg`; ninguna tool pasó de 60 s; cortó por `max_turns` | **no**: no ejercita el plazo |
| `run2-stdout.jsonl` (cwd fuera del repo) | una sola llamada `Bash` en primer plano: `sleep 75; echo FIN-75` | **sí** |

Resultado de la segunda: `exit=0`, `is_error: false`, `num_turns: 2`,
`result: "FIN-75"`, `duration_ms: 79409`, y **0** apariciones de
«timed out after 60s». Antes del arreglo, el pool D registró ese error en el
transcript de un `claude -p` hijo
(`~/.claude/projects/-home-user-thyrox--thyrox-pool-worktrees-d8dda5fc002a-1/d88e5c84-….jsonl`).

*Métrica:* una invocación con una tool de 75 s, su `result` y el conteo del
mensaje de corte en el stream.
*Ciega a:* un plazo entre 60 s y `pendingResultTtlMs` (30 min) distinto de 75 s,
que no se midió; y a `MCP_TIMEOUT` (`Gl`), que no se tocó.
