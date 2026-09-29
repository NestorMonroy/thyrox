Implementas en thyrox, en TDD, el renombre al inglés de la CLI y los identificadores de
`src/task/task_ids.py`. El `Item:` de abajo es la tarea entera: un solo ítem, porque el renombre
cruza el módulo, sus pruebas, `bin/` y sus invocadores, y partirlo produciría conflictos.
Edita con `sed`, `gawk -i inplace` o `bash bin/replace_literal`; no reescribas archivos enteros.
Para renombrar identificadores Python por token usa `uv run --python 3.12 python` (3.12 tokeniza el
interior de los f-strings; 3.11 no). Nunca un binario de Python del sistema directo.

Nombres decididos por el ejecutor (`.claude/workbench/task-id-analysis-20260929T073702/README.md`,
«Naming decision»). El verbo es **assign**, nunca *mint*:

| Actual | Nuevo |
|---|---|
| subcomando `ingerir-board` | `ingest-board` |
| subcomando `acunar` | `assign-ids` |
| función `mint(mapping, refs)` | `assign_missing_ids` |
| subcomando `cita` | `lookup` |
| subcomando `censo` | `census` |
| subcomando `duplicados` | `duplicates` |
| subcomando `corregir-capa` | `fix-layer` |
| opción `--capa` | `--layer` |
| opción `--razon` | `--reason` |
| opción `--limite` | `--limit` |
| forma en prosa `TASK-<CAPA>-NNNN` | `TASK-<LAYER>-NNNN` |

`link-board-ordinal` ya está en inglés: no se toca. El docstring de `assign-ids`:
"Assigns the missing ID for tasks already in the store; never renumbers."

Lo que se pide:
1. Mitad roja primero: pruebas que invoquen cada subcomando y cada opción por su nombre nuevo, y que
   los nombres viejos ya no se acepten (exit 2 de argparse). Guarda la salida roja en tu respuesta.
2. Renombra en `src/task/task_ids.py` los subcomandos, opciones, la función `mint` y todo
   identificador en español del módulo que el gate `src/verify/check_identifier_language.py` marque
   o que su baseline congele para este archivo; quita del baseline
   (`.claude/baselines/identifier_language_baseline*.txt`) cada línea cuyo identificador desaparezca.
3. Actualiza TODOS los invocadores vivos. Encuéntralos con
   `git grep -nE "task_ids(\.py)? +(cita|censo|duplicados|ingerir-board|corregir-capa|acunar)|--capa|--razon|--limite|mint\(" -- src tests bin install.sh README.md .claude/CLAUDE.md .claude/rules`
   y revisa además `src/hooks/detect_ephemeral_citation.py`, `src/agents/agent_store.py`,
   `src/session/generate_bin.py` y `src/packages/task/schema.ts`.
   NO toques evidencia fechada: `.claude/build-logs/`, `.claude/workbench/`, `.claude/jobs/`,
   `.claude/eventos/`, `tests/task/fixtures/` ni `_references/`.
4. Los mensajes al usuario pueden seguir en español; los identificadores y nombres de CLI, en inglés.
   Comentarios en español sin coloquialismos.
5. Control de anulación: devolver un solo subcomando a su nombre viejo hace caer exactamente su
   prueba y ninguna otra; publica el conteo.

Criterio de cierre: todas las suites del `--verify` en verde, y
`git grep -nE "ingerir-board|acunar|corregir-capa" -- src tests bin README.md .claude/CLAUDE.md`
sin resultados.

Cierre del ítem (obligatorio):
- No lances trabajos en segundo plano ni termines el turno esperando una notificación: corre
  cada prueba en primer plano y lee su resultado antes de seguir.
- Tu mensaje final incluye: la salida roja inicial, el conteo verde final de cada suite del
  verify y la verificación de que no queda ningún nombre viejo (el `git grep` de arriba en 0).
