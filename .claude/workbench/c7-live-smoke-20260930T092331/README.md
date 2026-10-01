# C7 en vivo — `thyrox -p` sin credencial propia, por el proxy local

Fecha: 2026-09-30, tras aplicar TASK-THYROX-0500 (C7) sobre C5 (`77daa8798`)
en el árbol principal.

Entorno, medido sólo por NOMBRE: ninguna de `ANTHROPIC_API_KEY`,
`ANTHROPIC_AUTH_TOKEN`, `THYROX_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` ni
`THYROX_LOCAL_PROXY_SOCKET`; sí `ANTHROPIC_BASE_URL` del anfitrión. `claude`
en `/opt/node22/bin/claude`.

```bash
timeout 240 bash bin/cli -p "Responde exactamente con la palabra: listo" \
  --model claude-sonnet-5 --output-format stream-json --verbose \
  --max-turns 2 --no-session-persistence </dev/null
```

| Archivo | Qué es |
|---|---|
| `stdout.jsonl` | el stream: `system/init`, el mensaje y el `result` |
| `stderr.txt` | vacío (0 bytes) |
| `exit.txt` | `exit=0` |

Resultado: `result: "listo"`, `is_error: false`, `num_turns: 1`. El
`system/init` lista las herramientas del bucle de thyrox (`TodoRead`,
`Agent`, `Skill`…), así que el turno lo corrió thyrox; la delegación directa
en `claude -p` ya no existe en el código (C7). Sin proxy declarado,
`thyrox -p` levantó `bin/provider-local-proxy` y entró al túnel.

Dato a vigilar: `cache_creation_input_tokens: 72483` para una respuesta de
4 tokens. El upstream es `claude -p`, que carga su propio prompt de sistema
además del de thyrox.

*Métrica:* una invocación, su código de salida y los campos del `result`.
*Ciega a:* el reparto de esos 72 483 tokens entre los dos prompts de sistema
(no medido), el camino con `tool_use` de ida y vuelta (lo cubren las pruebas
de C5, no esta invocación) y el TTL de caché del upstream.
