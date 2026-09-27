# Informe — bucket-5 (zero-errors-py-sh)

## Conteos

| Herramienta | Antes | Después |
|---|---|---|
| `pyright` sobre la lista (36 archivos) | **98 errores** | **0 errores** |
| `ruff check --select E9,F63,F7,F82,F401,F811,F841` | **12 errores** (todos F401) | **0 errores** |

Evidencia: `pyright-before.out`, `pyright-mid.out`, `pyright-after.out`,
`ruff-before.out` en este directorio; `pyright-after.out` y el `ruff check`
final dan `0 errors, 0 warnings, 0 informations` / `All checks passed!`.

## Archivos tocados (18 en `src/`, 25 en `tests/`)

`src/`:
`cache/work_cache.py`, `corpus/archive_build_corpus.py`,
`corpus/archive_extract.py`, `corpus/backfill_findings_history.py`,
`corpus/bie_series.py`, `corpus/census_scripts.py`, `corpus/doc_to_text.py`,
`corpus/docx_to_text.py`, `corpus/extract_pptx.py`,
`corpus/find_reference_home.py`, `corpus/list_corpus_builds.py`,
`corpus/ooxml.py`, `corpus/pdf_to_text.py`, `corpus/term_census.py`,
`corpus/xls_to_text.py`, `corpus/xlsx_to_text.py`, `hallazgo/census_findings.py`,
`hallazgo/hallazgo_ids.py`.

`tests/`: los 25 archivos de la lista bajo `tests/agents/`, `tests/cache/`,
`tests/measurement/`, `tests/task/` y `tests/typescript/` (ver
`bucket-5.txt`); en `tests/measurement/test_distribution.py` y
`test_residual_structure.py` el único cambio fue el `import math` muerto,
retirado por `ruff --fix`.

## Qué se corrigió, por forma

- **`__doc__.splitlines()[0]`** (11 archivos en `src/corpus` y
  `src/hallazgo`): `__doc__` es `str | None` para pyright aunque el módulo
  siempre tenga docstring. Cambiado a `(__doc__ or "").splitlines()[0]`.
- **Patrón `spec_from_file_location` → `module_from_spec` → `spec.loader.exec_module`**
  (16 archivos, casi todos `tests/agents/` y `tests/task/`, más
  `src/corpus/backfill_findings_history.py`): se añadió
  `assert _spec is not None and _spec.loader is not None` inmediatamente
  después de `spec_from_file_location`, antes de usar `module_from_spec`.
  Dos archivos ya tenían un `assert spec.loader is not None` colocado
  *después* de `module_from_spec`, que no alcanzaba a cubrir esa llamada; se
  movió antes.
- **`re.search(...).group(1)` / `re.match(...).group(1)` sin verificar el
  `None`** (`src/corpus/docx_to_text.py`, `src/corpus/extract_pptx.py`): en
  `docx_to_text.py` se asignó el resultado a una variable con
  `assert match is not None` (el nombre ya viene filtrado por un
  `re.fullmatch` previo). En `extract_pptx.py` se extrajeron dos funciones
  con nombre (`_slide_number`, `_notes_number`) que hacen el mismo `assert`
  en vez de repetir el `.match()` en una lambda.
- **`dict.get()`/`__setitem__` con clave `str | None`** (`src/corpus/ooxml.py`,
  `src/corpus/xlsx_to_text.py`): se guardó el resultado de `.get("Id")` /
  `.get(REL + "id")` en una variable y se comprobó antes de usarla como clave.
- **Flujo `chart_list`/`format_charts`** (`src/corpus/docx_to_text.py`):
  reescrito el `... if args.charts else ...` como `if/else` explícito para
  que el tipo de `chart_list` (`list[Chart] | None`) se resuelva por rama, y
  se añadió un `assert chart_list is not None` en el bloque que ya lo
  garantiza por el guard anterior.
- **`_resolved_store()`** (`src/hallazgo/hallazgo_ids.py`): sin anotar,
  pyright infería el retorno como `Path | _StoreSentinel` porque las
  comparaciones `is RESOLVE_STORE` / `is NO_STORE` no estrechan el tipo de un
  centinela arbitrario. Se anotó la firma y se cambió a
  `isinstance(store_path, _StoreSentinel)`, que sí estrecha.
- **`conn = None if args.dry_run else agent_store.connect(...)`**
  (`src/corpus/backfill_findings_history.py`): se añadió
  `assert conn is not None` en la rama `else` (no dry-run) donde se usa
  `conn.execute(...)`.
- **Variables globales narrowed que un `def` anidado no hereda**
  (`tests/agents/test_measure_delta.py`, `tests/agents/test_register_session.py`,
  `tests/cache/test_work_cache.py`): se agregaron `assert` puntuales
  (`ruta is not None`, `cmd is not None`, `work_cache is not None` dentro de
  la función anidada) documentando la invariante ya garantizada por el
  código de arriba.
- **`sample(..., trace=True/False)` sin anotar**
  (`tests/measurement/test_rejection_sampling.py`,
  `test_rejection_sampling_brief.py`, `test_speculative_speedup.py`): la
  función vive en `src/measurement/rejection_sampling.py`, **fuera de esta
  lista**, así que no se tocó. En cada test se escribió un helper local
  anotado (`_sample_traced`/`_sample_index`) que llama a `sample(...)` y
  hace `assert isinstance(resultado, tuple)` / `assert isinstance(resultado, int)`
  antes de devolverlo con el tipo correcto.
- **`condition: bool` recibiendo `list | bool`** (`tests/task/test_board_sync.py`,
  `tests/task/test_task_ids.py`): la forma `x and x[0].algo` da
  `list[...] | bool` cuando `x` puede ser una lista vacía; se envolvió con
  `bool(...)`.
- **Anotación de retorno con un módulo cargado dinámicamente**
  (`tests/task/test_task_ids.py:65`): `-> kx.TaskRef` no es una forma de tipo
  válida para pyright porque `kx` es una variable (el módulo cargado por
  `importlib`), no un tipo estático. Se retiró la anotación y se dejó un
  comentario explicando por qué.
- **Monkeypatch de un atributo de `ModuleType`** (`tests/task/test_task_source_citas.py`):
  `ts._subject_key = ...` (control de anulación) no es un atributo que
  `ModuleType` declare. Se usó `# pyright: ignore[reportAttributeAccessIssue]`
  en las dos líneas (asignar y restaurar), con comentario en español
  explicando que `ts` es un módulo de import dinámico y que es el
  monkeypatch del propio control de anulación de la suite — no hay forma de
  que el analizador lo vea sin esa supresión.
- **`ruff` F401** (12 ocurrencias en 10 archivos): imports muertos, retirados
  con `ruff check --fix` (todas eran importaciones sin usar; ninguna F811/F841/F821).

## Bugs reales encontrados (aparte de los errores de tipo)

- **`src/corpus/ooxml.py:88-99` (`relationships()`)** — el código original
  usaba `rel.get("Id")` directo como clave de `output[...]`, así que una
  relación `<Relationship>` sin atributo `Id` (XML mal formado, o un
  `Relationship` incompleto) habría quedado guardada bajo la clave literal
  `None` en el diccionario de relaciones, en vez de descartarse. Con el
  fix, esa relación se salta (`continue`), igual que ya se hacía para un
  `Target` vacío. Es un cambio de conducta mínimo y en la dirección
  correcta (una relación sin `Id` no es usable vía `rels[algún_id]`), pero
  se reporta aparte porque el criterio #4 lo exige: no es sólo anotación,
  cambia qué entra al diccionario.

No se encontraron otros bugs reales: el resto de los 98 errores de pyright
eran, en todos los casos verificados, invariantes ya garantizadas por el
código circundante (un `re.fullmatch` previo, un guard de dry-run, un
control de anulación de test) que pyright no podía ver por falta de
anotación o de narrowing entre ámbitos.

## Supresiones (`# pyright: ignore`)

Sólo dos líneas, ambas en `tests/task/test_task_source_citas.py:148,154`
(`ts._subject_key = ...`), regla `reportAttributeAccessIssue`. Razón: `ts`
es un módulo cargado con `importlib.util.spec_from_file_location` +
`module_from_spec`, así que pyright lo tipa como `ModuleType` genérico —
no puede saber que el módulo real declara `_subject_key`, y asignarle un
atributo nuevo (el monkeypatch del control de anulación de esta misma
suite) no es una forma que `ModuleType` permita estáticamente. No hay
anotación posible que resuelva esto sin cambiar el mecanismo de carga
dinámica del módulo (fuera de alcance: es el patrón que usan todos los
tests de esta lista).

No se usó `# type: ignore` a secas ni `cast` en ningún archivo.

## Tests ejecutados

### Los 25 archivos de la lista (`tests/agents/`, `tests/cache/`,
`tests/measurement/`, `tests/task/`, `tests/typescript/`)

Antes de editar se hizo `git stash push` acotado exactamente a los 43
archivos que terminé tocando (18 de `src/` + 25 de `tests/`), se corrieron
los 25 tests contra ese estado "antes" (`before-tests_*.out`), se restauró
el stash (`git stash pop`, sin conflictos) y se corrieron de nuevo
(`after-tests_*.out`).

**Resultado: los 25 pasan `exit=0` antes y después — 0 regresiones, 0
fallas preexistentes en este subconjunto.**

### Tests que importan un `src/` tocado y NO están en la lista

Se buscó por nombre de módulo (`archive_build_corpus`, `docx_to_text`,
`ooxml`, `hallazgo_ids`, etc.) en todo `tests/` y se corrieron los 23
consumidores adicionales, con el mismo protocolo de `git stash` acotado
(esta vez sólo a los 18 archivos de `src/`) para medir antes/después:

| Test | Antes | Después |
|---|---|---|
| `tests/cache/test_work_cache.py` | 0 | 0 |
| `tests/corpus/test_archive_build_corpus.py` | 0 | 0 |
| `tests/corpus/test_archive_extract.py` | 0 | 0 |
| `tests/corpus/test_backfill_store_destination.py` | 0 | 0 |
| `tests/corpus/test_bie_series.py` | 0 | 0 |
| `tests/corpus/test_censar_scripts.py` | 0 | 0 |
| `tests/corpus/test_cfb.py` | 0 | 0 |
| `tests/corpus/test_doc_to_text.py` | 0 | 0 |
| `tests/corpus/test_docx_charts.py` | 0 | 0 |
| `tests/corpus/test_docx_to_text.py` | 0 | 0 |
| `tests/corpus/test_list_corpus_builds.py` | 0 | 0 |
| `tests/corpus/test_ooxml.py` | 0 | 0 |
| `tests/corpus/test_pdf_to_text.py` | 0 | 0 |
| `tests/corpus/test_term_census.py` | 0 | 0 |
| `tests/corpus/test_xls_to_text.py` | 0 | 0 |
| `tests/corpus/test_xlsx_to_text.py` | 0 | 0 |
| `tests/docs/test_scaffold_initiative.py` | 0 | 0 |
| `tests/hallazgo/test_census_findings.py` | 0 | 0 |
| `tests/hallazgo/test_finding_id_collision.py` | **1** (falla por `tests/verify/test_tsc_cycle.py`, archivo ajeno que apareció en el árbol por otro trabajo concurrente en este mismo repo) | 0 |
| `tests/hallazgo/test_hallazgo_ids.py` | 0 | 0 |
| `tests/lib/test_pyproject_declares_imports.py` | 0 | 0 |
| `tests/paths/test_deferred_names_not_used_bare.py` | 0 | 0 |
| `tests/session/test_generate_bin.py` | **1** (2 aserciones fallidas de 118) | **1** (idénticas — `diff` vacío entre el `.out` de antes y el de después) |
| `tests/verify/test_check_cache_layout.py` | 0 | 0 |

Los dos fallos son **preexistentes y no atribuibles a este trabajo**:

- `test_finding_id_collision.py` fallaba por una referencia a
  `tests/verify/test_tsc_cycle.py`, un archivo de otro lote de este mismo
  árbol (el repo tiene trabajo concurrente de otros buckets) — no depende
  de nada que yo haya tocado, y en la corrida "después" ya no aparece.
- `test_generate_bin.py` da las mismas 2 fallas de 118 aserciones tanto
  antes como después del cambio en `src/` (`diff` byte a byte de las dos
  salidas es vacío) — nada en `bin/`/`generate_bin.py` depende de los 18
  archivos que edité.

Todas las salidas (`before-*.out`, `after-*.out`,
`before-consumer-*.out`, `after-consumer-*.out`) quedan en este
directorio.

## Identificadores / idioma

Los cambios nuevos siguen la convención del árbol: identificadores en
inglés (`_slide_number`, `_notes_number`, `_sample_traced`, `_sample_index`,
`rel_id`), comentarios en español.
