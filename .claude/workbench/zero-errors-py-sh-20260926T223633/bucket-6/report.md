# Lote 6 — cero errores pyright/ruff

Nota de continuidad: este informe cierra la tarea tras un corte por 429 de la
API. Las ediciones ya estaban aplicadas en el árbol al reanudar; no se
rehicieron. La "antes" de pyright/ruff se conservó de la corrida original
(`before-pyright.out`, `before-ruff.out`). Las corridas de test "antes" de
editar **no** se guardaron (el corte ocurrió después de empezar a editar) —
donde hizo falta distinguir preexistente de introducido, se verificó revirtiendo
sólo el archivo en cuestión con `git stash push -- <archivo>` y volviendo a
correr, en vez de confiar en memoria.

## Conteos

| | pyright | ruff (E9,F63,F7,F82,F401,F811,F841) |
|---|---|---|
| Antes | 100 errors, 1 warning | 10 errors |
| Después | **0 errors, 0 warnings** | **0 errors — All checks passed** |

Logs: `before-pyright.out` / `after-pyright.out` / `before-ruff.out` / `after-ruff.out`.

## Archivos tocados (34 de 37 de la lista)

- `src/agents/agent_store.py` — docstring a `r"""` (escape sin procesar en
  `\d+`); import `DOCUMENT_TYPES` muerto (ruff F401); `assert model_catalog is
  not None` antes de `usage_cost_usd` (la rama que puebla `catalogo` ya lo
  garantiza).
- `src/agents/anonymize_transcript.py` — `assert spec is not None and
  spec.loader is not None` tras `spec_from_file_location`.
- `src/agents/backfill_agent_sessions.py` — mismo patrón de `assert` en sus
  tres `spec_from_file_location`; `assert conn is not None` antes de
  `conn.execute` (la rama `--dry-run` ya hizo `continue`).
- `src/agents/measure_subagent_usage.py` — `acc: dict[str, Any]` (dict
  heterogéneo: enteros sumados + `modelo`/`attr` como str).
- `src/agents/merge_stores.py` — `(__doc__ or "").splitlines()[0]`.
- `src/agents/model_catalog.py` — `equivalent_tokens_with_basis` reordenado
  para narrowing real (`if catalog is None or model_id is None: return …`
  antes de leer el tier); `(__doc__ or "").split("\n\n")[0]`; import `os`
  muerto (ruff F401).
- `src/agents/reconcile_store.py` — `_retention_level` devuelve `int | None`
  (el código YA podía devolver `None` — bug de anotación real, ver abajo);
  `assert spec is not None and spec.loader is not None`.
- `src/agents/register_session.py` — `marca: dict[str, Any]` (dict
  heterogéneo: `sorted(payload)` + bools/dicts/paths luego).
- `src/board/graph.py` — import `Sequence` muerto (ruff F401).
- `src/packages/@ant/computer-use-mcp/src/legacy/win32/bridge.py` — puente
  SÓLO Windows; `# pyright: reportAttributeAccessIssue=false` a nivel de
  archivo (ya llevaba `reportMissingImports=false` con la misma razón: el
  typeshed de este contenedor Linux no declara `ctypes.windll`,
  `ctypes.WINFUNCTYPE` ni `TextIO.reconfigure`, símbolos reales en Windows);
  `# pyright: ignore[reportArgumentType]` puntual en `Image.frombuffer` (el
  stub de PIL no modela el protocolo de buffer de `ctypes.Array[c_char]`);
  import `UIAWrapper` muerto y `except Exception as e` con `e` sin usar
  (ruff F401/F841).
- `src/packages/agent/bin/extract_model_registry.py` — `ordenar()` anotada
  `(valor: Any) -> Any` para no arrastrar tipos literales espurios al resto
  de la función; `meta_alias: dict[str, Any]`; `assert destino is not None`
  antes de escribir los dos `.jsonl` (la rama `--stdout` ya hizo `return 0`).
- `src/roster/delivery.py` — `_blocks` filtra con `isinstance(t, str)` en la
  comprensión de set en vez de dejar pasar `None`.
- `src/roster/stdin_probe.py`, `src/roster/worktree_state.py`,
  `src/session/clone_bootstrap.py`, `src/session/generate_bin.py`,
  `src/session/gpu_monitor.py`, `src/session/gpu_trace.py`,
  `src/session/kernel_modules.py`, `src/session/measure_hook_firing.py`,
  `src/session/pool_history.py`, `src/session/probe_model_switch_cache.py`,
  `src/session/session_restart.py`, `src/session/shared_lock.py`,
  `src/session/sync_local_settings.py` — mismo patrón repetido 14 veces:
  `__doc__.splitlines()[0]` -> `(__doc__ or "").splitlines()[0]`.
- `src/session/adopt_background.py` — `adopt()` anotado `-> Job` en vez de
  `-> object` (el objeto real que `JobLedger.register` devuelve).
- `src/session/clone_bootstrap.py` — además de lo anterior, `render()`
  anotado `(value: Any, ...) -> Any` para no propagar tipos literales al
  `set()`/`sorted()` de `allow_final`.
- `src/session/gpu_trace.py` — además de lo anterior, `assert last.free_mib
  is not None` en `check_release_on_exit` (ya descartado por la guarda
  anterior sobre `exited[-1].free_mib`, pero `last` es una variable nueva y
  el analizador no lo hereda).
- `src/session/pool_history.py` — además de lo anterior: `_gpu_peak` decide
  por `reading.summary is not None` en vez de `reading.state == "measured"`
  (mismo invariante, correlación directa); dos `assert row is not None`
  dentro de `if calibrated:` en `vram_request`/`_vram_decision` (invariante:
  `vram_calibration` sólo devuelve `True` cuando `row` no es `None`).
- `src/session/probe_model_switch_cache.py` — además de lo anterior: las
  tres condiciones `ok(x) and ok(y)` (con `ok` como lambda) reescritas
  inline (`x is not None and y is not None and "cache_read" in x and
  "cache_read" in y`) para que el analizador estreche de verdad;
  `child_env(base: Mapping[str, str])` en vez de `dict` (recibe
  `os.environ`, que es `_Environ[str]`, no un `dict`).
- `src/session/reconcile_user_hooks.py` — los tres campos del `Patch`
  (`is_applied`, `is_broken`, `apply`) pasan de `object` a
  `Callable[[str], bool]`/`Callable[[str], str]` — son invocables y se
  llamaban como tales.
- `src/session/transcripts.py` — `transcripts_dir` normaliza `start: str |
  Path | None` a `Path | None` antes de pasarlo a `env_value` (bug real: un
  `start` de tipo `str` habría llegado a `env_value`/`production_declarations`,
  que operan con métodos de `Path`).
- `src/session/user_wiring.py` — `entrada: dict[str, Any]` (dict heterogéneo:
  `str` + `int` de `timeout`).
- `src/workbench/manifest.py` — `launch_keys: set[str]` (el `set()` de una
  tupla de dos literales no admite luego un tercer literal distinto).
- `tests/paths/test_declaration_port.py` — `assert _ROOT is not None` dentro
  del método (el guard vive a nivel de módulo y no cruza a un método).
- `tests/paths/test_reach.py` — import `subprocess` duplicado a mitad de
  archivo (ya estaba arriba) — ruff F811.
- `tests/paths/test_reach_roots_declared.py` — import `subprocess` muerto —
  ruff F401.
- `tests/paths/test_reach_roots_shim.py` — `load()` anotado `->
  types.ModuleType` (era `-> object`); `assert spec is not None and
  spec.loader is not None`.
- `tests/rules/test_provenance_parity.py` — tres `assert _RAIZ is not None`
  dentro de sus métodos (mismo patrón que `test_declaration_port.py`).

No se tocó `src/session/gpu_monitor.py`/`kernel_modules.py`/etc. más allá del
patrón `__doc__` — no había otros pyright/ruff pendientes en ellos.

## Bugs reales encontrados (más allá del acomodo de tipos)

1. **`src/session/transcripts.py:81` (`transcripts_dir`)** — la función
   aceptaba `start: str | pathlib.Path | None` pero lo pasaba tal cual a
   `env_value(name, start)`, que exige `Path | None` y opera sobre él con
   métodos de `Path` (`production_declarations`). Un llamador que pasara un
   `str` habría producido un `AttributeError` en tiempo de ejecución. Se
   corrigió normalizando `str -> Path` antes de la llamada.
2. **`src/agents/reconcile_store.py:540` (`_retention_level`)** — anotada
   `-> int`, pero el propio cuerpo (y su docstring, que dedica un párrafo a
   "hay un tercer desenlace: no escribir ninguno") retorna `None` cuando
   `status` no es `"completed"` ni `"failed"`. La anotación mentía sobre el
   contrato real de la función; los dos llamadores (`reconcile_store.py:773`)
   ya manejaban el `None` correctamente, así que no había bug de conducta,
   sólo de contrato declarado. Corregido a `-> int | None`.

Ningún otro hallazgo de tipo destapó un `None` que de verdad pudiera llegar
sin que el código ya lo manejara — el resto son o bien `assert` que
formalizan un invariante que el código ya cumplía (sólo no lo declaraba), o
bien anotaciones de tipo demasiado estrechas para un dict/callable
heterogéneo real.

## Supresiones — sólo una, y con razón declarada

`src/packages/@ant/computer-use-mcp/src/legacy/win32/bridge.py`:

- `# pyright: reportAttributeAccessIssue=false` a nivel de archivo (junto al
  `reportMissingImports=false` que ya llevaba con la misma razón): el
  archivo es un puente que sólo corre en Windows; `ctypes.windll`,
  `ctypes.WINFUNCTYPE` y `TextIO.reconfigure` son símbolos reales ahí, y el
  typeshed que pyright resuelve en este contenedor Linux no los declara.
- `# pyright: ignore[reportArgumentType]` en la llamada a
  `Image.frombuffer(...)`: el stub de PIL no modela `ctypes.Array[c_char]`
  como conforme al protocolo de buffer, aunque en tiempo de ejecución sí lo
  es.

No se usó `# type: ignore` a secas ni `cast` en ningún archivo.

## Tests ejecutados

Todos con `PYTHONPATH=src .venv/bin/python <archivo>` (son de `unittest`, no
de `pytest` — el entorno no tiene el módulo `pytest` instalado, confirmado
al intentarlo). 44 test files distintos, cubriendo los 5 de la lista propia
más los que importan cada módulo de `src/` tocado (`agent_store`,
`model_catalog`, `register_session`, `reconcile_store`, `merge_stores`,
`graph`, `delivery`, `stdin_probe`, `worktree_state`, `adopt_background`,
`generate_bin`, `gpu_monitor`, `gpu_trace`, `instruction_floor`, `job_runs`,
`kernel_modules`, `parallel`, `pool_history`, `probe_model_switch_cache`,
`reconcile_user_hooks`, `session_restart`, `shared_lock`, `transcripts`,
`user_wiring`, `manifest`, `anonymize_transcript`,
`backfill_agent_sessions`, `measure_subagent_usage`,
`extract_model_registry`, `clone_bootstrap`).

**Resultado: verdes salvo dos, y los dos preexistentes/ambientales — no
introducidos por este lote:**

| Test | Resultado | Causa |
|---|---|---|
| `tests/session/test_generate_bin.py` | 116 aprobadas · 2 falladas | `bin/` está desactualizado respecto a `src/session`, `src/verify`, `src/agents` — faltan `check_lint_zero` y `recovery`, dos archivos **nuevos añadidos por otros lotes** en paralelo (`src/verify/check_lint_zero.py`, `src/roster/recovery.py`, vistos como `??` en `git status` al momento de este informe). Mi edición en ese archivo fue de una sola línea (el docstring `__doc__`); confirmado con `git diff --stat` (1 línea) — el fallo no depende de eso. |
| `tests/session/test_gpu_trace.py` | 1 falla puntual (`FileNotFoundError: /proc/<pid>/task`), luego 3/3 corridas verdes (`14 ok, 0 falla(s)`) | Carrera de tiempo real: el proceso simulado que la sonda lanza puede desaparecer de `/proc` antes de que `gpu_monitor.tree(pid)` lo recorra. Verificado revirtiendo temporalmente mi único cambio en el archivo (`git stash push -- src/session/gpu_trace.py`, correr, `git stash pop`) — **también pasó en verde con el archivo original**, así que la falla no depende de mi `assert`; es intermitente en ambas versiones. |

Todo el resto (42 archivos) terminó en `exit=0`, incluido
`tests/session/hardware/test_gpu_admission_real.py`, que rehúsa con `exit=2`
por diseño (sin GPU real en este contenedor — comportamiento documentado, no
un fallo).

Salidas completas en `after-*.out` de este directorio (una por archivo de
test). No hay `before-*.out` por test: el corte de la sesión ocurrió después
de empezar a editar, así que no existe una corrida "antes" limpia que
guardar sin rehacer el trabajo ya hecho.

## No hecho / fuera de alcance

- No se corrigió el desfase de `bin/` (`test_generate_bin.py`): pertenece a
  otro lote (los archivos ausentes son de otras rutas fuera de mi lista).
- No se investigó más la carrera de `test_gpu_trace.py`: es de
  `gpu_monitor.tree()`/`_observe()`, fuera de mi lista de archivos (sólo
  toqué `gpu_trace.py` con un `assert` de narrowing puro).

Sin `git add`/`commit`/`push`.
