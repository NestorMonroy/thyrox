# `claude -p` desde el shell de herramientas (2.1.284)

Pregunta: ¿puede un proceso lanzado desde el shell correr `claude -p` en este
entorno, sin que thyrox lea ni reutilice ninguna credencial?

Instrumento: invocar el cliente tal cual (`claude -p … --max-turns 1
--output-format json`) y leer su `result`, su `is_error` y su `session_id`.
No se listó ni se leyó ninguna variable ni ningún descriptor de credencial.

| Prueba | Salida | Resultado |
|---|---|---|
| `claude -p` sin más | `stdout.json` | exit 0, `result: listo`, `is_error: false`, 1 turno |
| `--no-session-persistence` | `nopersist.json` | exit 0, **mismo `session_id` que la sesión que lo lanza** |
| además `env -u CLAUDE_CODE_SESSION_ID` | `unset-sid.json` | exit 0, **sigue el mismo `session_id`** |
| `--session-id <uuid propio>` | `own-sid.json` | exit 0, `session_id` = el uuid pedido |

## Lo que corrige

`binary-host-auth-20260926T223508` concluyó, sobre 2.1.282, que el token del
anfitrión no llega a los hijos y que `claude -p` desde el shell no autentica.
En 2.1.284 el cliente autentica solo: la autenticación la resuelve el propio
`claude`, y thyrox no toca la credencial. Aquella conclusión era cierta para
su versión y no se generaliza.

## Lo que obliga al pool

Un `claude -p` hijo hereda el `session_id` de quien lo lanza, y retirar
`CLAUDE_CODE_SESSION_ID` no lo separa. Cada ítem lleva por eso
`--session-id` propio además de `--no-session-persistence`.

Métrica: exit, `result`, `is_error` y `session_id` del JSON de salida.
Ciega a: el límite de uso de la cuenta, que los ítems en paralelo comparten
(la salida que el ejecutor pegó de otra sesión registra 16 errores 429), y
el costo por ítem, que el JSON declara en `total_cost_usd`.
