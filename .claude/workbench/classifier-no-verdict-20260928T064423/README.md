# El clasificador de auto mode sin veredicto: por qué pasó y qué se hizo

Hallazgo: **H-THYROX-235**. Binario del cliente: 2.1.283 (`claude --version`).

## Qué pasó (medido, no supuesto)

- `census-this-session.txt` (`bin/classifier_outages` sobre el transcript de
  esta sesión): **1 episodio, 6 rechazos sin veredicto sobre 16 564 resultados
  de Bash**. Primer rechazo 06:38:24, último 06:40:51, último Bash bien antes
  06:38:05, recuperado 06:42:08 UTC.
- `window.txt`: en esa ventana, **6 de 6 Bash rechazados** y **30 de 30**
  llamadas a Read (7), Grep (11), Write (9) y Edit (3) pasaron.
- `failed-commands.tsv`: los comandos rechazados iban de 67 a 5183 bytes (un
  `cat … | head`, `bun test`, un heredoc): ni el tamaño ni el tipo lo explican.

## Por qué (en el binario)

`_references/claude-code-bin/2.1.283/bunfs-root/chunk-csayct82.js`:

- `(error)` es la causa `server_call_unavailable_error` (función `k2`): la
  **llamada al clasificador del servidor falló**. No es un timeout
  (`timed out`), ni 5xx (`server error`), ni 429/529.
- El cliente la clasifica como **transitoria** («a later response may get a
  verdict») y corta el turno tras `hS = 10` respuestas seguidas sin veredicto.
  Otras causas (`input_too_long`, `refused`…) son **duras**: repetir da lo
  mismo.
- El hook `PermissionDenied` sí se dispara con estos rechazos (también con
  `noVerdict`), pero sólo puede devolver `retry`, que el cliente ignora cuando
  no hubo veredicto: sirve para observar, no para avisar al modelo.

La causa está fuera del contenedor y fuera del comando: no se puede impedir
desde aquí. Lo que sí se controla es cuánto cuesta cuando ocurre.

## La corrección que el propio censo hizo a esta medición

El primer conteo, por `grep` del texto, dio **8** rechazos (2 el 09-24). Era
falso: los del 09-24 eran salidas **exitosas** de Bash que imprimían cadenas
del binario al buscar este mismo código, y el censo marcó otros dos de hoy por
lo mismo (un `jq` y un `cat` del fixture). Medir el texto (el significante) no
es medir el rechazo (el significado). El discriminador está en los datos: un
rechazo real llega con `is_error: true` y su contenido **empieza** por el
mensaje; una salida que lo cita no es error, o empieza por `Exit code N`.

## Qué se hizo (TDD)

| Pieza | Qué hace |
|---|---|
| `src/hooks/classifier_rejection.py` | clasifica un `tool_result`: `transient` / `hard` / `judged` y su causa |
| `src/hooks/detect_classifier_outage.py` | detector 26 de `tool_use_preflight`: antes de un Bash, cuenta la racha (`k de 10`), dice cuántas quedan, prohíbe reintentar una falla dura y manda a Read/Grep/Glob/Write/Edit |
| `src/hooks/transcript_tail.py` | la cola del transcript y el corte de turno, sacados de `detect_edit_loop` para no duplicarlos |
| `src/session/classifier_outages.py` → `bin/classifier_outages` | el censo de episodios que aquí se hizo a mano |

El detector está **vivo en esta sesión**: el `PreToolUse` de
`/home/user/.claude/settings.local.json` corre `tool_use_preflight.py` con su
lista por defecto. Prueba de punta a punta por el comando real del hook, con
el transcript cortado antes del sexto rechazo: `5 de 10`. `replay.sh` →
`replay.txt` lo repite en cuatro cortes del transcript real.

## Anulaciones (`annul.sh` → `annul-results.txt`)

Doce mitades de juicio, cada una tumba exactamente sus dependientes: el corte
por Bash que pasa, por veredicto, por turno; contar sólo Bash; la rama dura;
reconocer el veredicto; hablar sólo antes de Bash; en el censo, la
recuperación, el filtro de Bash y el fin por veredicto; y las dos que
separan un rechazo de una salida que lo cita (`is_error`, primera línea).

## Lo que NO se hizo, y por qué

- **Reglas `allow` para no depender del clasificador.** En el motor portado
  (`permission/src/permissions.ts:983`) el clasificador sólo se consulta si
  las reglas devuelven `ask`, así que un `allow` estrecho (`Bash(bun test:*)`,
  `Bash(git status:*)`) evitaría la consulta. Pero ensancha permisos y no la
  cubre el modo auto para prefijos peligrosos (`bash`, `python`, `bun run`…,
  `permission/src/dangerousPatterns.ts`): es decisión del ejecutor, no de este
  banco.
- **Falso positivo conocido de `detect_history_comment`:** avisa por
  «duración» y «episodio» en los docstrings del censo, donde son el concepto
  que la herramienta mide, no historia.
