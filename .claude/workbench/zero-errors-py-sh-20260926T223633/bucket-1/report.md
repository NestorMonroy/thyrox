# Cero pyright/ruff — bucket-1

## Conteos

| Herramienta | Antes | Después |
|---|---|---|
| `pyright` (53 archivos de la lista) | **100 errors** | **0 errors** |
| `ruff --select E9,F63,F7,F82,F401,F811,F841` | **10 errors** | **0 errors** ("All checks passed!") |

Comandos exactos (desde `/home/user/thyrox`):

```bash
pyright $(cat .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1.txt)
ruff check --no-cache --select E9,F63,F7,F82,F401,F811,F841 $(cat .claude/workbench/zero-errors-py-sh-20260926T223633/bucket-1.txt)
```

Salidas completas: `pyright-before.out` / `pyright-after.out` / `ruff-before.out` / `ruff-after.out` en este directorio.

## Archivos tocados

Los 53 de la lista (`bucket-1.txt`), confirmado con `git status --short` (ninguno fuera de la lista). No se tocó ningún archivo ajeno.

## Bugs reales encontrados

- **`src/verify/tsc_zero_step.py:181` — `applied` estaba mal tipado** (`dict[str, dict[str, str]]`)
  cuando `_apply()` puede devolver `dict[str, str | None]` (un archivo nuevo, sin original —
  `None` es un valor legítimo, no un error). El tipo declarado ocultaba el caso "creación de
  archivo" al lector; corregido a `dict[str, dict[str, str | None]]`. No cambia la conducta en
  runtime (Python no aplica la anotación), pero destapaba una anotación falsa.

- **`src/verify/annulment_control.py:167-168` — desempaquetado ambiguo por `*args.replace`**
  disparaba `reportCallIssue` porque pyright no puede contar los elementos de un `Any`
  desempaquetado. Cambiado a `old, new = args.replace` explícito antes de llamar a
  `run_substitution`. Comportamiento idéntico (mismo `nargs=2`), sólo más legible para el
  analizador y para quien lea el código.

- **Patrón repetido en `check_gitattributes.py`, `check_hook_script_token.py` y
  `check_script_deprecated.py`**: cada uno calculaba `src = str(path.parent.parent)` (la ruta al
  `src/` del dueño resuelto por `THYROX_ROOT`/vecino/hermano) y nunca lo usaba — ni había un
  `sys.path.insert(0, src)` correspondiente. Es indicio de un bug latente: si `_owner_path()`
  resuelve a un clon de thyrox *distinto* del que ya está en `sys.path` (vía la variable
  `THYROX_ROOT` apuntando a otro hermano), `from verify import <módulo>` podría importar el
  módulo equivocado (el que `sys.path` ya tenga cacheado) en vez del del dueño declarado. **No se
  corrigió** — arreglarlo (insertar `src` en `sys.path`) es un cambio de conducta real y la
  instrucción de esta tarea es no cambiar conducta; sólo se borró la variable muerta (F841). Se
  reporta aparte para que alguien con el contexto completo decida si insertar el `sys.path` es
  correcto o si el diseño ya asume que el dueño vive siempre en el mismo `sys.path` que el stub.

Ningún otro hallazgo de tipo apuntaba a un bug de comportamiento — el resto eran anotaciones
incompletas (falta de guardas de `None`/`Optional` sobre invariantes ya verdaderos en tiempo de
ejecución) o límites del propio analizador (ver Supresiones).

## Supresiones (con su razón)

Sólo **una** supresión de pyright en todo el bucket, y es de la clase que el criterio 2 autoriza
(el analizador no puede ver algo real — aquí, un patrón de uso de la librería `docutils` que su
propio stub no refleja):

- `src/verify/check_rst_sintaxis.py:287` — `# pyright: ignore[reportArgumentType]` sobre
  `get_default_settings(Parser)`. El stub de `docutils` (`typeshed-fallback/stubs/docutils`)
  tipa el parámetro como una *instancia* de `SettingsSpec`; en runtime, `Parser` (la CLASE)
  es un subtipo válido y es exactamente el patrón que el propio `docutils` documenta y usa —
  verificado con `issubclass(docutils.parsers.rst.Parser, docutils.SettingsSpec) == True`.

Ningún `# type: ignore` a secas, ningún `cast`.

## Cómo se cerró cada clase de error (resumen técnico)

- **`__doc__.splitlines()[0]` (32 archivos)** — `__doc__` es `str | None`; cambiado a
  `(__doc__ or "").splitlines()[0]`, que maneja el `None` real (p. ej. bajo `-OO`) sin
  cambiar el caso normal.
- **`importlib.util.spec_from_file_location(...)` sin verificar `None`/`.loader`**
  (`class_header.py`, `counterpart_body.py`, `symbol_home.py`, `symbol_presence.py`,
  `check_script_naming.py` ×2) — se agregó `if spec is None or spec.loader is None: raise
  ImportError(...)` antes de usarlo; el archivo vecino (`reader.py`, el léxico) siempre existe
  en este árbol, así que el `raise` documenta la única forma real en que fallaría.
- **Invariantes de control de flujo que pyright no puede seguir** (`check_hallazgos_index.py`,
  `detect_broken_references.py`, `tsc_cycle.py`, `tsc_routes.py`, `pool_pipeline.py`,
  `tsc_zero_step.py` ×3) — `assert x is not None` / `assert isinstance(x, Tipo)` justo donde el
  invariante ya era verdadero por construcción (el mismo patrón ya casó antes, o el valor viene
  de una lista que sólo contiene ese tipo). Cada `assert` lleva un comentario en español que
  explica por qué el valor no puede ser `None`/la otra rama del `Union`.
- **`vecinos_de_tarea.py`** — `kneighbors`/`radius_neighbors` no tenían anotación de tipo, así
  que pyright inferia una unión ambigua al desempaquetar `distancias, vecinos = ...`. Se les dio
  `@overload` con `Literal[True]`/`Literal[False]` sobre `return_distance`, que es exactamente el
  contrato real de la función.
- **`dict` invariante donde el uso es de sólo lectura** (`batch_verification.BatchReport.verdicts`,
  `tsc_zero_step.write()`) — cambiado a `Sequence`/`Mapping` (covariantes), siguiendo la propia
  sugerencia de pyright; ninguno de los dos muta el contenedor después de recibirlo.
- **`analyze_typescript_diagnostics.analyze()` devolvía `dict[str, object]`** para un dict
  genuinamente heterogéneo (int, dict, list) — anotado como `dict[str, Any]`, que es lo que
  realmente es.
- **`check_absence_claim.AbsenceClaim.kind`** tenía `= None` como default con tipo declarado
  `ClaimKind` (sin `Optional`) — el único sitio que construye la clase siempre pasa `kind`
  explícito; se hizo `field(kw_only=True)` sin default, que es el contrato real.
- **`check_identifier_language.code_suffix_families`** devolvía `set` donde el consumidor pide
  `frozenset` — cambiado a `frozenset` en el `return` (nunca se muta después).
- **`check_eventos_hook.py`** — `max(dict, key=dict.get)` confunde al resolutor de sobrecargas de
  pyright por el `default` opcional de `.get`; cambiado a `key=lambda v: dict[v]`, equivalente
  porque el dict ya se comprobó no vacío.
- **`check_suite_discrimina.py`** — el narrowing de tipo dentro de una expresión generadora
  anidada no se propaga; se extrajo a una lista intermedia (`constantes = [e for e in node.elts
  if isinstance(e, ast.Constant)]`) antes de acceder a `.value`.
- **`class_header.Header.selects`/`.relocated`** estaban tipados `object` — anotados como
  `Optional[Callable[...]]` reales. Nota de implementación: se probó primero con anotaciones en
  string (`"Callable[...] | None"`), pero **rompía en runtime**: el archivo se carga en los tests
  vía `importlib.util.module_from_spec` sin registrarlo en `sys.modules`, y `dataclasses` en
  Python 3.11 necesita `sys.modules[cls.__module__]` para resolver anotaciones-string dentro de
  un `@dataclass`. Se resolvió importando `Callable`/`Optional` de verdad y usando los tipos sin
  comillas.

## Identificadores / comentarios

Todo identificador nuevo (`_base`, `constantes`, `tipo`, `primero`, overloads) en inglés cuando
correspondía al vocabulario del código circundante y en español donde el archivo ya usaba
español para nombres de variable local (siguiendo la convención existente de cada archivo). Todos
los comentarios nuevos están en español, como el resto del archivo.

## Resultado de cada test ejecutado

39 scripts de test (los `.py` con correspondencia directa a los módulos tocados; no hay `pytest`
instalado en `.venv`, todos son scripts autocontenidos con su propio runner). Salida completa de
cada uno en `before-<nombre>.out` / `after-<nombre>.out` en este directorio; resumen en
`before-summary.txt` / `after-summary.txt`.

| Test | Antes | Después |
|---|---|---|
| tests/lib/test_compressibility.py | EXIT=0 | EXIT=0 |
| tests/task/test_board_sync.py | EXIT=0 | EXIT=0 |
| tests/task/test_census_open_tasks.py | EXIT=0 | EXIT=0 |
| tests/task/test_task_ids.py | EXIT=0 | EXIT=0 |
| tests/task/test_vecinos_de_tarea.py | EXIT=0 (44/44) | EXIT=0 (44/44) |
| tests/verify/test_agent_proposal.py | EXIT=0 | EXIT=0 |
| tests/verify/test_analyze_typescript_diagnostics.py | EXIT=0 | EXIT=0 |
| tests/verify/test_annulment_control.py | EXIT=0 | EXIT=0 |
| tests/verify/test_batch_verification.py | EXIT=0 | EXIT=0 |
| tests/verify/test_check_absence_claim.py | EXIT=0 | EXIT=0 (19/19) |
| tests/verify/test_check_cache_layout.py | EXIT=0 | EXIT=0 |
| tests/verify/test_class_header.py | EXIT=0 | EXIT=0 (23/23) |
| tests/verify/test_commit_identity.py | EXIT=0 | EXIT=0 |
| tests/verify/test_counterpart_body.py | EXIT=0 | EXIT=0 |
| tests/verify/test_gitattributes.py | EXIT=0 | EXIT=0 (23/23) |
| tests/verify/test_hook_script_token.py | EXIT=0 | EXIT=0 (21/21) |
| tests/verify/test_identifier_language.py | EXIT=0 | EXIT=0 (19/19) |
| tests/verify/test_manifest_language.py | EXIT=0 | EXIT=0 (28/28) |
| tests/verify/test_member_port.py | EXIT=0 | EXIT=0 (29/29) |
| tests/verify/test_package_boundary.py | EXIT=0 | EXIT=0 |
| tests/verify/test_package_typecheck.py | EXIT=0 | EXIT=0 |
| tests/verify/test_pool_pipeline.py | EXIT=0 | EXIT=0 (64/64) |
| tests/verify/test_reference_root_resolution.py | EXIT=0 | EXIT=0 |
| tests/verify/test_runner.py | EXIT=0 | EXIT=1 (**preexistente, ver nota**) |
| tests/verify/test_script_deprecated.py | EXIT=0 | EXIT=0 (23/23) |
| tests/verify/test_step_report.py | EXIT=0 | EXIT=0 (20/20) |
| tests/verify/test_symbol_home.py | EXIT=0 | EXIT=0 |
| tests/verify/test_symbol_presence.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_cycle.py | EXIT=0 | EXIT=0 (102/102) |
| tests/verify/test_tsc_reflect.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_routes.py | EXIT=0 | EXIT=0 (25/25) |
| tests/verify/test_tsc_schedule.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_sweep.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_sweep_breadth.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_zero_loop.py | EXIT=0 | EXIT=0 |
| tests/verify/test_tsc_zero_step.py | EXIT=0 | EXIT=0 (40/40) |
| tests/verify/test_bench_untracked.py | EXIT=0 | EXIT=0 |
| tests/hallazgo/test_finding_id_collision.py | **EXIT=1 (preexistente)** | EXIT=0 |
| tests/hallazgo/test_hallazgo_ids.py | EXIT=0 | EXIT=0 |

Además: `tests/workbench/test_provider_evidence.py` (invoca `check_provider_evidence.py` por
subproceso) — EXIT=0, 6/6 después de restituir el import que la propia prueba necesitaba.

### Notas sobre las dos discrepancias

- **`tests/hallazgo/test_finding_id_collision.py` — fallaba ANTES de tocar nada** (2 de 12
  aserciones), por contaminación del árbol: otras sesiones/lotes corriendo en paralelo dejaban
  archivos nuevos bajo `.claude/build-logs/job-.../` mientras el test medía "no aparecen archivos
  nuevos en el árbol". No es un fallo de este módulo — el caso mide el árbol entero, y el árbol
  cambiaba por trabajo ajeno. Al re-medir "después" ya no había esa contaminación y pasó limpio;
  se reporta como preexistente y no atribuible a estos cambios.
- **`tests/verify/test_runner.py` — pasaba antes y falla después**, pero la causa es **ajena a
  este bucket**: otra sesión concurrente creó `src/verify/check_lint_zero.py` (confirmado con
  `git log -1 --format=%cI -- src/verify/check_lint_zero.py`, commit de otro proceso, archivo
  fuera de mi lista) y el test detecta que ese gate nuevo no está registrado en `runner.py`.
  Verificado revirtiendo temporalmente mi único cambio a `runner.py` (el `import os` muerto) con
  `git stash` y re-corriendo el test: el mismo fallo persiste sin mi edición, así que no lo causé.
  `check_lint_zero.py` no está en mi lista de archivos y no lo toqué.

## Regresiones detectadas y corregidas durante la verificación

Dos supresiones de ruff F401 resultaron ser **re-exportaciones consumidas por otro módulo**, no
imports muertos de verdad — el `AttributeError` al correr los tests lo destapó:

- `check_manifest_language.py` importaba `corpus_available` de `check_identifier_language` sin
  usarlo dentro del archivo, pero `tests/verify/test_manifest_language.py` lo consume como
  `gate.corpus_available()` (atributo del módulo). Se restituyó el import con
  `# noqa: E402,F401` y un comentario que documenta el re-export.
- `check_provider_evidence.py` importaba `evidence_dir` sin usarlo; ningún test lo consume por
  atributo (los tests invocan el gate por subproceso), así que ese sí era un import muerto de
  verdad y se dejó borrado.

Ambos casos se verificaron re-corriendo pyright + ruff + el test correspondiente tras el ajuste;
los tres quedan en verde.
