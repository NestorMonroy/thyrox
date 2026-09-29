Renombras al inglés, en TDD, las CLIs de `src/task/board_sync.py` y `src/hooks/task_lifecycle.py`
(#310). El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con
`sed`, `gawk` o `bash bin/replace_literal`; para Python usa `uv run --python 3.12 python`.

Decisión del ejecutor que rige (la misma de #300): el verbo es **assign**, nunca *mint* ni *acuñar*
— *mint* es metáfora, *assign* es el término estándar para dar un id a un objeto. Traducir no es
rebautizar: si una palabra ya está en inglés, no se toca.

| Actual | Nuevo |
|---|---|
| subcomando `acunar-tarjeta` de `board_sync.py` | `assign-card-id` |
| opción `--capa` (en las dos CLIs) | `--layer` |
| opción `--evento` de `board_sync.py` | `--event` |
| argumento posicional `sesion` | `session` |
| `p_mint`, `result.minted` y el vocabulario *mint*/*acuñar* en identificadores de `board_sync.py` | `assign`/`assigned` |

Los mensajes al usuario pueden seguir en español; los identificadores y nombres de CLI, en inglés.
El hook vivo (`src/session/user_wiring.py:191,194`) llama a `task_lifecycle.py` sin `--capa`: no
cambia. NO toques `tests/task/fixtures/` ni evidencia fechada (`.claude/workbench`, `.claude/jobs`).

Lo que se pide:
1. Mitad roja primero: pruebas que invoquen cada nombre nuevo y comprueben que el viejo ya no se
   acepta (exit 2 de argparse), en `tests/task/test_board_sync.py` y `tests/hooks/test_task_lifecycle.py`.
2. Renombra, actualiza las invocaciones de esas pruebas y quita del baseline de idioma
   (`.claude/baselines/identifier_language_baseline*.txt`) cada línea cuyo identificador desaparezca.
3. Control de anulación: devolver sólo `assign-card-id` a su nombre viejo hace caer exactamente sus
   aserciones y ninguna otra; publica los conteos. Restaura.
4. Comentarios en español sin coloquialismos.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano ni termines esperando una notificación.
- Tu mensaje final incluye la roja inicial, el verde final de cada suite del verify, el control de
  anulación con sus conteos y la salida de
  `git grep -nE "acunar-tarjeta|--capa\b|--evento\b|p_mint|\.minted" -- src tests ':!tests/task/fixtures'`
  (0 esperado, salvo las pruebas que comprueban que el nombre viejo se rechaza).
