# Informe — bucket-3 (zero-errors-py-sh)

Fecha: 2026-09-27T00:17:05

## Conteos

| Herramienta | Antes | Después |
|---|---|---|
| `pyright` | 95 errors | **0 errors** |
| `ruff` (E9,F63,F7,F82,F401,F811,F841) | 15 errors | **0 errors** |

Salidas guardadas en este directorio: `before-pyright.out`, `before-ruff.out`,
`after-pyright.out`, `after-ruff.out`.

## Archivos tocados (36 de 36 de la lista)

### `src/` (14)

- `src/docs/scaffold_initiative.py` — quitado `import re` muerto (ruff F401).
- `src/hooks/bridge_hooks.py` — `assert __doc__ is not None` antes de
  `__doc__.splitlines()[0]`.
- `src/hooks/compact_context.py` — idem.
- `src/hooks/detect_finding_layer.py` — quitado `import pathlib` muerto.
- `src/hooks/detect_literal_replacement.py` — `_PERL.search(command)` se
  llamaba dos veces (una para el `if`, otra para `.end()`); ahora se liga a
  `perl_match` una sola vez, con lo que pyright estrecha el `Optional` sin
  perder el early-return.
- `src/hooks/detect_rst_validation.py` — quitado `import pathlib` muerto.
- `src/hooks/flow_selection.py` — `assert __doc__ is not None`.
- `src/hooks/maintenance_chain.py` — quitado `from pathlib import Path`
  muerto; `assert __doc__ is not None`; anotado `Chain.stderr` como
  `TextIO | None` en vez de `object` (el campo recibe un stream escribible o
  `None`, nunca cualquier `object`).
- `src/hooks/stop_gate.py` — mismo cambio de anotación en `Gate._stderr`.
- `src/hooks/stop_pending_work.py` — quitado `from pathlib import Path` muerto.
- `src/hooks/task_lifecycle.py` — `assert __doc__ is not None`.
- `src/repo/gitlink_bump.py` — quitado `import sys` muerto; `assert __doc__
  is not None`.
- `src/repo/object_footprint.py` — tres funciones (`_blob_oids`,
  `_loose_oids`, `_total_blob_disk`) llamaban a `clone.run`/`clone.git_dir`
  (que devuelven `str | None` / `Path | None` cuando git no responde) y usaban
  el resultado sin comprobar. Se añadió `if ... is None: raise RuntimeError(...)`
  en las tres, con el mismo patrón que ya usa `gitlink_bump.py` para el mismo
  caso. Ver «Bugs reales» abajo. También `assert __doc__ is not None`.
- `src/repo/pack_headroom.py` — `assert __doc__ is not None`.
- `src/repo/pending_work.py` — `exigidos = list(WORK_FIELDS)` se inferia
  como `list[Literal['dirty','staged','untracked','ahead']]` y luego se le
  hacía `.append(TELEMETRY_FIELD)` con un quinto literal (`'telemetry'`);
  anotado explícitamente `exigidos: list[str]`.

### `tests/` (22)

- `test_annulment_control.py`, `test_bun_linker.py`, `test_pathspec_commit.py`,
  `test_tree_fingerprint.py`, `test_tsc_schedule.py`,
  `test_tsc_sweep_breadth.py` — imports muertos (`os`, `Path`, `shutil`,
  `sys`, `random`, `json`).
- `test_tsc_reflect.py` — `mem = root_mem = run / "gate"`; `root_mem` no se
  usaba (ruff F841); se quitó la asignación doble.
- `test_batch_verification.py` — `report.verdicts` (de `verify_batch`) es
  `list[Verdict | ProposalVerdict]`; se filtra con `isinstance(v, bv.Verdict)`
  al construir `by_provider` (siempre son `Verdict` en esa llamada). Y
  `regressed.verdicts[0].new_diagnostics` (de `verify_proposals`, siempre
  `ProposalVerdict`) se estrecha con `assert isinstance(..., bv.ProposalVerdict)`.
- `test_check_rst_toctree.py` — el nombre `original` se reusaba a nivel de
  módulo para dos capturas distintas (`crt.resolve` y luego
  `crt.LITERAL_DIRECTIVE`, un `Pattern[str]`); pyright unía los dos tipos y
  `original(...)` dejaba de ser invocable dentro del primer shim. Renombrada
  la segunda captura a `original_literal_directive`.
- `test_class_header.py`, `test_commit_message.py`, `test_counterpart_body.py`,
  `test_doc_citations.py`, `test_error_catalog.py`, `test_symbol_home.py`,
  `test_symbol_presence.py` — el idiom `importlib.util.spec_from_file_location`
  devuelve `ModuleSpec | None`; se añade `assert spec is not None and
  spec.loader is not None` (el archivo siempre existe en este árbol).
- `test_step_close.py` — `subprocess.Popen(..., stdout=subprocess.PIPE)`
  tipa `.stdout` como `IO[str] | None`; `assert holder.stdout is not None`
  antes de `.readline()`.
- `test_finding_id_unique.py` — `ROOT = next(..., None)` con un `if ROOT is
  None: raise` que no propaga la estrechez a las funciones que usan `ROOT`
  más abajo (pyright no reduce el tipo de un global a través de límites de
  función). Reescrito como `_root = next(...); if _root is None: raise ...;
  ROOT: pathlib.Path = _root`.
- `test_manifest_language.py` — `real_run = next(..., None)`; ya había un
  `check(...)` que verificaba `real_run is not None` pero no narrowaba;
  añadido `assert real_run is not None` inmediatamente después.
- `test_pool_pipeline.py` — tres cosas: (1) `pp.build_candidate(...)` y
  `pp.build_module_candidate(...)` devuelven `tuple[dict | None, ...]`; se
  añaden dos `assert candidate is not None` justo tras cada llamada donde el
  candidato es seguro (hay ediciones válidas). (2) `base_args = dict(ledger=Path(...), ..., seed=3, tsc=["tsc"])`
  se inferia como `dict[str, Path | int | list[str]]`, y al desempaquetarlo
  con `**base_args` en `pp.step_command(...)` (que tiene parámetros de tipos
  distintos) pyright exigía que CADA parámetro aceptara la unión completa.
  Anotado `base_args: dict[str, Any]` (import de `typing.Any`) — es
  exactamente el caso de "dict de kwargs heterogéneo" del criterio 1.
- `test_tsc_cycle.py` — el nombre `run` se usaba a nivel de módulo para dos
  cosas: la función `def run(argv) -> tuple[int,str,str]` (definida arriba,
  llamada 9 veces) y, en dos bloques `with tempfile.TemporaryDirectory()`
  bien separados, una variable `Path` que apunta al directorio `run/` del
  paso. pyright unía los dos tipos bajo el mismo nombre de módulo y
  `run.mkdir()` / `run / "..."` dejaban de tipar. Renombrada la variable
  `Path` a `run_dir` en los dos bloques (14 usos), siguiendo la convención
  que el propio archivo ya usa en otro punto (`run_dir = root / "run"`,
  línea 118). **No se tocó ningún literal `"--run"` de las listas de
  argumentos** — sólo el identificador de la variable Python.

## Bugs reales encontrados (aparte de los errores de tipo)

- **`src/repo/object_footprint.py`** — `_blob_oids`, `_loose_oids` y
  `_total_blob_disk` no comprobaban el resultado de `clone.run`/
  `clone.git_dir`, que devuelven `None` cuando git no puede responder (repo
  ausente, índice bloqueado, etc.). Antes del arreglo, ese caso terminaba en
  un `AttributeError`/`TypeError` genérico y sin contexto
  (`'NoneType' object has no attribute 'splitlines'`); con el arreglo, la
  falla es un `RuntimeError` explícito que nombra la raíz y el comando que
  falló. `src/repo/gitlink_bump.py` ya seguía este patrón para el mismo
  `clone.run`; `object_footprint.py` era la excepción.

## Supresiones — ninguna

No se usó `# pyright: ignore`, `# type: ignore` ni `cast` en ningún archivo.
Todos los errores de tipo se resolvieron con narrowing real (`assert
... is not None`, `isinstance`), anotaciones más precisas (`TextIO | None`,
`list[str]`, `dict[str, Any]`), o eliminando la causa (colisión de nombre a
nivel de módulo, doble llamada a `.search()`, chequeo de `None` faltante).

## Tests ejecutados

Todos con `PYTHONPATH=src .venv/bin/python <archivo>` salvo el `.sh` marcado.
Salidas en este directorio como `before-<nombre>.out` / `after-<nombre>.out`
(sólo se guardó "antes" para los dos casos con fallos preexistentes, vía
`git stash push -- <archivo>` + re-ejecución + `git stash pop`, ya que las
ediciones de este bucket ya estaban aplicadas cuando se retomó la tarea tras
el 429).

### De la lista (todos con ediciones)

| Test | Resultado |
|---|---|
| `test_annulment_control.py` | OK |
| `test_batch_verification.py` | OK |
| `test_bun_linker.py` | OK |
| `test_check_rst_toctree.py` | OK |
| `test_class_header.py` | OK |
| `test_commit_message.py` | OK |
| `test_counterpart_body.py` | OK |
| `test_doc_citations.py` | **7 fallos — PREEXISTENTES**, idénticos antes y después (ver abajo) |
| `test_error_catalog.py` | OK |
| `test_finding_id_unique.py` | **7 fallos — PREEXISTENTES**, idénticos antes y después (ver abajo) |
| `test_identifier_language.py` | OK |
| `test_manifest_language.py` | OK |
| `test_pathspec_commit.py` | OK |
| `test_pool_pipeline.py` | OK |
| `test_step_close.py` | OK |
| `test_symbol_home.py` | OK |
| `test_symbol_presence.py` | OK |
| `test_tree_fingerprint.py` | OK |
| `test_tsc_cycle.py` | OK |
| `test_tsc_reflect.py` | OK |
| `test_tsc_schedule.py` | OK |
| `test_tsc_sweep_breadth.py` | OK |

**`test_doc_citations.py` y `test_finding_id_unique.py`**: se confirmó que
son preexistentes reconstruyendo la versión sin editar de cada archivo
(`git stash push -- <archivo>`, correr, `git stash pop`) y comparando: el
conteo de fallos y sus mensajes son **exactamente los mismos** antes y
después de mis ediciones (7 fallos en ambos, mismo `ModuleNotFoundError: No
module named 'docs'` y las mismas 7 aserciones en `check_finding_id_unique`).
Mis cambios en esos dos archivos fueron sólo de tipo (un import muerto
retirado y un `assert`/anotación de narrowing); no tocan la lógica que falla.

### Consumidores de los `src/` tocados (sin ediciones, para no romper nada aguas abajo)

| Test | Resultado |
|---|---|
| `tests/hooks/test_detect_topic_duplication.py` (consume `detect_finding_layer`) | OK |
| `tests/hooks/test_flow_selection.py` | OK |
| `tests/hooks/test_maintenance_chain.py` | OK |
| `tests/hooks/test_stop_gate.py` | OK |
| `tests/hooks/test_stop_pending_work.py` | OK |
| `tests/hooks/test_compact_context.py` | OK |
| `tests/hooks/test_detect_literal_replacement.py` | OK |
| `tests/hooks/test_task_lifecycle.py` | OK |
| `tests/hooks/test_pretooluse_dispatch.py` (consume `detect_rst_validation`, `detect_finding_layer`, `detect_literal_replacement`) | OK |
| `tests/repo/test_gitlink_bump.py` | OK |
| `tests/repo/test_object_footprint.py` | OK |
| `tests/repo/test_pack_headroom.py` | OK |
| `tests/roster/test_job_liveness.py` (consume `pending_work`) | OK |
| `tests/repo/test_pending_work_telemetry.py` | OK |
| `tests/repo/test_pending_work.py` | OK |
| `tests/docs/test_initiative_placement.py` (consume `scaffold_initiative`) | OK |
| `tests/docs/test_scaffold_initiative.py` | OK |
| `tests/hooks/test-bridge-hooks.sh` (consume `bridge_hooks`, único test disponible — es `.sh`) | OK, 11/11 |

Todos verdes. Ningún consumidor de los módulos de `src/` que edité se rompió.

## Nota sobre el árbol compartido

Durante esta tarea `src/verify/pool_pipeline.py` cambió en disco por otro
bucket paralelo (no está en mi lista); no lo toqué ni lo revertí.
