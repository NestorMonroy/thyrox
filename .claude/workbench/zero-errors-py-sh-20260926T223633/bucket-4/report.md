# Cero errores — bucket-4

## Conteos

| Verificador | Antes | Después |
|---|---|---|
| `pyright` | 100 errores | **0** |
| `ruff --select E9,F63,F7,F82,F401,F811,F841` | 10 errores | **0** |

Salidas completas: `pyright-before.out`/`pyright-after.out`,
`ruff-before.out`/`ruff-after.out` en este directorio.

## Archivos tocados (20 de 31 de la lista; 11 ya estaban en cero)

- `src/paths/reach_roots.py`
- `src/typescript/close_exports.py`
- `src/typescript/emit_declarations.py`
- `tests/corpus/test_archive_build_corpus.py`
- `tests/corpus/test_archive_extract.py`
- `tests/corpus/test_censar_scripts.py`
- `tests/corpus/test_list_corpus_builds.py`
- `tests/hooks/test_detect_agent_dispatch.py`
- `tests/hooks/test_detect_awk_substr_target.py`
- `tests/hooks/test_detect_bare_awk.py`
- `tests/hooks/test_detect_client_background.py`
- `tests/hooks/test_detect_code_language.py`
- `tests/hooks/test_detect_dedicated_tool_usage.py`
- `tests/hooks/test_detect_ephemeral_citation.py`
- `tests/hooks/test_detect_foreground_long_command.py`
- `tests/hooks/test_detect_gawk_opportunity.py`
- `tests/hooks/test_detect_git_grep_opportunity.py`
- `tests/hooks/test_detect_irreversible_operation.py`
- `tests/hooks/test_detect_literal_replacement.py`
- `tests/hooks/test_detect_parallel_opportunity.py`
- `tests/hooks/test_detect_self_matching_pgrep.py`
- `tests/hooks/test_detect_stdin_reading_interpreter.py`
- `tests/hooks/test_detect_temp_home_write.py`
- `tests/hooks/test_detect_topic_duplication.py`
- `tests/hooks/test_detect_unbounded_traversal.py`
- `tests/hooks/test_detect_unbounded_wait.py`
- `tests/hooks/test_error_log.py`
- `tests/hooks/test_flow_selection.py`
- `tests/hooks/test_pretooluse_dispatch.py`
- `tests/hooks/test_stop_gate.py`
- `tests/repo/test_gitlink_bump.py`
- `tests/transcript/test_closing.py`

No tocados (ya en cero en ambos verificadores):
`tests/corpus/test_list_corpus_builds.py` (sólo ruff, ver arriba) — el resto de
la lista de 31 aparece arriba porque cada uno tenía al menos un error de
pyright o de ruff.

## Patrones de arreglo aplicados

1. **`spec_from_file_location` sin angostar** (18 archivos): pyright ve
   `spec_from_file_location(...)` como `ModuleSpec | None`, y el patrón de
   import dinámico de este árbol lo usa siempre sin comprobarlo. Se añadió
   `assert <spec> is not None and <spec>.loader is not None` justo antes de
   `module_from_spec`/`exec_module`, en cada ocurrencia (incluidas las dos de
   `test_detect_unbounded_traversal.py`).
2. **El módulo dinámico se anota `: Any`** (8 archivos: `test_censar_scripts.py`,
   `test_detect_bare_awk.py`, `test_detect_client_background.py`,
   `test_detect_code_language.py`, `test_detect_self_matching_pgrep.py`,
   `test_detect_stdin_reading_interpreter.py`, `test_detect_temp_home_write.py`,
   `test_detect_unbounded_traversal.py`): el test hace *monkeypatch* de un
   atributo del módulo cargado por `spec_from_file_location` (p. ej.
   `gate.has_bracket_class = lambda …`), y `ModuleType` no declara ese
   atributo — es la forma exacta que el criterio 2 admite para
   `pyright: ignore` (import dinámico), sólo que en vez de sembrar un
   `# pyright: ignore[reportAttributeAccessIssue]` por cada lectura/escritura
   se anotó la variable una sola vez como `Any`, que es la declaración honesta
   de «este objeto es dinámico» sin tocar el comportamiento.
3. **`Optional` sin angostar en un test** (`assert x is not None` antes de
   usarlo): `test_detect_self_matching_pgrep.py` (`notice`),
   `test_detect_unbounded_wait.py` (`text`), `test_error_log.py` (`result`,
   dos veces), `test_detect_irreversible_operation.py` (`result`).
4. **`bool(...)` explícito** en `test_gitlink_bump.py:100`: `check()` exige
   `bool` y la expresión `a and a != b` puede devolver `''`/`None` sin
   coercionar.
5. **`# pyright: ignore[reportArgumentType]`** en `test_pretooluse_dispatch.py`
   (dos veces, líneas ~117 y ~127): ver "Divergencia de tipo en `src`,
   reportada" abajo — el analizador no puede ver que `dispatch()` acepta
   también un `dict` porque su alias `Detector` lo declara más angosto que su
   propio cuerpo, y ese archivo (`src/hooks/pretooluse_dispatch.py`) no está en
   esta lista.
6. **`F401` (imports muertos)**: retirados en `src/paths/reach_roots.py`
   (`importlib.util`), `test_archive_build_corpus.py` (`subprocess`),
   `test_archive_extract.py` (`shutil`), `test_list_corpus_builds.py` (`os`),
   `test_detect_code_language.py` y `test_detect_dedicated_tool_usage.py`
   (`pathlib`, ya cubierto por `from pathlib import Path`),
   `test_flow_selection.py` (`io`, `contextlib.redirect_stderr`),
   `test_stop_gate.py` (`os`).
7. **`F841` (variable muerta) que resultó ser un bug real** — ver abajo.

## Bugs reales encontrados, y corregidos

- **`src/paths/reach_roots.py` — `_load_owner()` nunca insertaba el `src` del
  dueño en `sys.path`.** El propio docstring de la función dice *"poniendo el
  `src` del dueño en `sys.path` e importando por nombre…"*, y el código
  calculaba `src = str(path.parent.parent)` y nunca lo usaba (F841). Reproducido
  antes del fix: cargar `reach_roots.py` con `spec_from_file_location` en un
  proceso que NO tiene ya el `src` del dueño en su ruta de búsqueda da
  `ModuleNotFoundError: No module named 'paths'` en `from paths import reach`.
  Corregido con `if src not in sys.path: sys.path.insert(0, src)` antes del
  import; re-verificado con el mismo repro (ya no falla, y `reach_roots()`
  devuelve la tupla esperada). Es más que silenciar el lint: sin el insert, un
  consumidor cuyo propio `sys.path` ya tuviera un paquete `paths` DISTINTO
  habría importado ESE `paths.reach` en vez del del dueño, en silencio.
- **`tests/corpus/test_archive_extract.py` — la restauración de `$PATH` en
  `finally` asumía que `PATH` ya estaba definido.** `previous =
  os.environ.get("PATH")` es `str | None`; si `PATH` no estuviera declarado
  antes del test, `os.environ["PATH"] = previous` habría lanzado `TypeError`
  al querer asignar `None` a una variable de entorno (o, con el `str | None`
  sin angostar, pyright ya lo señalaba como error real de tipo). Enmascarado
  hasta ahora porque en este contenedor `PATH` siempre está definido. Corregido
  en las tres apariciones (líneas ~127, ~141, ~211): si `previous is None` se
  hace `os.environ.pop("PATH", None)` en vez de asignar `None`.
- **`src/typescript/emit_declarations.py:574`** — `_declaration_exists(...,
  source_entry: str = None)`: el default real es `None` pero la anotación
  decía `str`; el cuerpo ya maneja `None` correctamente (`if source_entry is
  None:`), así que es un bug de anotación, no de conducta. Corregido a
  `str | None = None`.

## Divergencia de tipo en `src`, reportada (no corregida — fuera de mi lista)

`src/hooks/pretooluse_dispatch.py` declara `Detector = tuple[str,
Callable[[dict], str | None]]`, pero su propia función `dispatch()` acepta
también un detector que devuelva `dict` (rama `isinstance(notice, dict)`, para
pedir `permissionDecision`). El test que ejercita esa rama (line ~113-127)
construye detectores así a propósito, y pyright lo marca porque el alias
`Detector` es más angosto que el comportamiento real. `pretooluse_dispatch.py`
no está en mi lista de archivos, así que no lo edité; en el test se dejó
`# pyright: ignore[reportArgumentType]` con el motivo en el comentario. Si se
quisiera cerrar en la fuente, el alias correcto sería algo como
`Callable[[dict], str | dict | None]`.

## Supresiones aplicadas (las dos únicas)

| Archivo:línea | Regla | Por qué |
|---|---|---|
| `tests/hooks/test_pretooluse_dispatch.py` (línea del primer `dispatch.dispatch({}, detectors=[asks, ...])`) | `reportArgumentType` | el analizador no puede ver que `dispatch()` acepta un detector que devuelva `dict` — ver sección anterior |
| `tests/hooks/test_pretooluse_dispatch.py` (línea del segundo `dispatch.dispatch({}, detectors=[asks, denies])`) | `reportArgumentType` | mismo motivo |

Ninguna otra supresión: todo lo demás se resolvió angostando el tipo
(`assert`), anotando bien (`Any` para el módulo dinámico, `str | None` para el
parámetro), o corrigiendo la conducta (el `sys.path.insert` y el `pop` de
`PATH`).

## Resultado de cada test tocado (antes y después son idénticos salvo el reloj)

Los 29 archivos de test de mi lista corrían en verde antes de tocarlos y
siguen en verde después; las salidas completas están en
`before-<nombre>.out` / `after-<nombre>.out` de este directorio. La única
diferencia de texto entre un before/after es el tiempo de reloj que reporta
`unittest` en `test_archive_extract.py` (0.110s -> 0.365s; mismos 18 tests,
mismo resultado `OK`).

Además se corrieron, como consumidores de los tres archivos de `src/` tocados
(no están en mi lista, no se editaron, sólo se verificó que siguen en verde):
`tests/paths/test_reach_roots_shim.py`, `tests/paths/test_reach_roots_declared.py`,
`tests/paths/test_reach.py`, `tests/paths/test_roster_declared_prefix.py`,
`tests/agents/test_store_import_without_roster.py`,
`tests/agents/test_document_root_default.py`,
`tests/task/test_census_open_tasks.py`, `tests/testing/test_clone_tree.py`,
`tests/typescript/test_close_exports.py`, `tests/typescript/test_emit_declarations.py`,
`tests/verify/test_package_typecheck.py` — los 11, exit 0.

No hubo ningún test que ya fallara antes de tocar nada (todos los
`before-*.out` de este directorio terminan en éxito).
