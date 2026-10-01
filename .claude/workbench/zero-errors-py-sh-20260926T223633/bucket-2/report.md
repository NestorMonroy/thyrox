# Informe — bucket-2 (pyright + ruff a cero)

## Conteos

| | pyright | ruff (`E9,F63,F7,F82,F401,F811,F841`) |
|---|---|---|
| antes | **105 errores** | **5 errores** |
| después | **0 errores** | **0 errores** |

Salidas completas: `pyright-before.out` / `pyright-after.out` /
`ruff-before.out` / `ruff-after.out`.

## Archivos tocados (21 de 21 de la lista)

```
src/graph/compare_neighbourhood.py
src/graph/graph_metrics.py
src/transcript/cache_probe.py
src/transcript/closing.py
tests/peer_mailbox/test_peer_mailbox.py
tests/session/hardware/test_gpu_admission_real.py
tests/session/test_adopt_background.py
tests/session/test_background.py
tests/session/test_bounded_scan.py
tests/session/test_generate_bin.py
tests/session/test_gpu_monitor.py
tests/session/test_gpu_scenarios.py
tests/session/test_job_runs.py
tests/session/test_pool_history.py
tests/session/test_probe_model_switch_cache.py
tests/session/test_session_restart.py
tests/session/test_shared_lock.py
tests/session/test_user_wiring.py
tests/store/test_agent_sessions.py
tests/workbench/test_home_resolution.py
tests/workbench/test_manifest.py
```

No se tocó ningún archivo fuera de la lista.

## Cómo se cerraron los errores

- **Import dinámico (`spec_from_file_location` → `module_from_spec` →
  `exec_module`)** — `compare_neighbourhood.py`, `test_bounded_scan.py`,
  `test_probe_model_switch_cache.py`, `test_user_wiring.py`: se añadió
  `assert spec is not None and spec.loader is not None` antes de usarlo —
  el spec nunca es `None` en la práctica (la ruta la construye el propio
  módulo), pero pyright no puede verlo.
- **`__doc__.splitlines()`** — `compare_neighbourhood.py`, `graph_metrics.py`,
  `cache_probe.py`: `__doc__` es `str | None` para pyright; se cambió a
  `(__doc__ or "").splitlines()[0]`.
- **Optional real que el test estrecha** — `test_adopt_background.py`,
  `test_gpu_monitor.py`, `test_gpu_scenarios.py`, `test_pool_history.py`,
  `test_shared_lock.py`, `test_home_resolution.py`, `test_manifest.py`:
  `assert x is not None` justo antes de usar el valor devuelto por
  `parse_notice`, `gm.watch`, `ph.record`, `manifest.latest_run`,
  `Popen(...).stdout/stdin`, etc. En varios sitios el `assert` de un ámbito
  exterior no alcanza porque el uso vive dentro de una función anidada
  (lambda o `def`) — pyright no propaga la estrechez a través de un cierre —
  así que el `assert` se repitió dentro de la función anidada
  (`test_user_wiring.py`, `test_pool_history.py::with_gpu`,
  `test_home_resolution.py`).
- **Asignación a atributo de un módulo cargado dinámicamente**
  (`w.CACHE_KEY_FIELDS = …`, etc. en `test_user_wiring.py`): `ModuleType`
  no declara esos atributos, así que la lectura funciona (`__getattr__`
  genérico) pero la escritura no. Se cambió a `setattr(w, "CAMPO", valor)`,
  que es la misma operación sin el chequeo estático de atributo conocido.
- **`reportIndexIssue` por sombra de nombre** — `compare_neighbourhood.py`:
  el bucle `for label, block in (...)` reusaba el nombre `block` de una
  función anidada ya definida en el mismo ámbito; pyright conservaba el tipo
  función en vez del dict real. Renombrado a `entry`.
- **`object` cannot be assigned to `list[str]`** — `graph_metrics.py`:
  `matrix.get(node)` es `dict | None`; se cambió a `matrix.get(node, {})`
  (el `if not rows` que sigue trata igual al `None` y al dict vacío, así que
  no cambia la conducta).
- **`list[Unknown | None]` no es `list[str]`** — `closing.py`: el tipo de
  `msg.get("content")` se ensancha a `Any` y el `.get("type")` de cada
  bloque puede ser `None` para pyright. Se anotó `msg: dict` y se filtró el
  resultado con `isinstance(t, str)` — si algún bloque no llevara `type`
  (nunca ocurre en un transcript bien formado), antes entraba un `None` en
  un campo declarado `list[str]`; ahora simplemente se omite. Es un
  endurecimiento defensivo, no un cambio de conducta observable.
- **kwarg inexistente usado A PROPÓSITO** — `test_peer_mailbox.py`:
  `test_post_has_no_authority_parameter` llama
  `self.box.post(..., authority='grant')` para comprobar que la API la
  rechaza en tiempo de ejecución (`TypeError`). Es exactamente el caso de
  "el analizador ve algo real que el test provoca a propósito": se marcó
  con `# pyright: ignore[reportCallIssue]` y el comentario explica por qué.
- **`dict()` con valores mixtos `int`/`float` se unifica a `float`** —
  `test_pool_history.py`: `gpu = dict(free_vram_mib=14000, ...,
  gpu_interval_s=0.5)` seguido de `**gpu` hacía que pyright viera `float`
  para los tres campos y `derive()` pide `int` en dos. Se sustituyó por un
  envoltorio `def with_gpu(history, **kw): return ph.derive(history, MODEL,
  catalog, free_vram_mib=14000, vram_reserve_mib=2000, gpu_interval_s=0.5,
  **kw)`, donde cada `**kw` de llamada conserva el tipo de cada argumento
  por separado.

## Bugs reales encontrados (y corregidos aparte de la anotación)

1. **`tests/session/test_generate_bin.py:43` (antes del fix) — `check()`
   concatenaba `extra` con `+` asumiendo `str`.** Varias llamadas del mismo
   archivo (líneas 328, 329, 333, 340, 372, 389, 414, 434, 470, 475) pasan
   una **lista** (`written1`, `removed1`, …) como `extra` para el mensaje
   de diagnóstico. Si cualquiera de esas aserciones hubiera fallado, `' — '
   + extra` habría lanzado `TypeError: can only concatenate str (not
   "list") to str` — el reporte de fallo, que es la única razón de que
   `extra` exista, habría reventado el test entero en vez de mostrar el
   diagnóstico. Corregido: `extra: object = ""` y `str(extra)` al formatear.
   No se pudo ejercitar el camino de fallo en este pase (todas las
   aserciones afectadas pasan), pero el defecto es real y estructural.

2. **`tests/session/hardware/test_gpu_admission_real.py:61` —
   `free // 4` sobre un `Optional[int]`.** `gm.free_vram_mib()` puede
   devolver `None` (nvidia-smi responde a `available()` pero la consulta de
   memoria falla o no parsea). Antes del fix, ese caso hacía
   `TypeError: unsupported operand type(s) for //: 'NoneType' and 'int'`
   en vez de rehusar limpio como el resto del script (`refuse(...)`).
   Corregido: se comprueba `free is None` y se rehúsa con exit 2 y un
   mensaje, igual que las demás condiciones de rehúso del mismo archivo.
   No se pudo reproducir el camino en este contenedor (no hay GPU: el
   script rehúsa una línea antes, en `available()`), pero el bug de tipo
   era real y el arreglo es consistente con el resto del archivo.

3. **`src/session/adopt_background.py:176` — `def adopt(...) -> object:`
   declara un retorno más amplio que el real.** `adopt()` siempre devuelve
   lo que `ledger.register(...)` construye, que es un `Job`. La anotación
   `-> object` es la causa de todos los errores de tipo en
   `tests/session/test_adopt_background.py` sobre el valor de `adopt()`
   (`.pid`, `.marker`, y pasarlo a `ledger.settle(job=...)`).
   **Este archivo NO está en la lista de bucket-2**, así que no se tocó:
   se reporta aparte. El arreglo correcto es anotar `adopt()` como
   `-> Job` en `src/session/adopt_background.py`; mientras tanto, en el
   test se añadió `assert isinstance(job, Job)` inmediatamente después de
   cada llamada a `adopt()`, que es una comprobación real y no un
   silenciamiento.

## Supresiones (una sola, con su razón)

- `tests/peer_mailbox/test_peer_mailbox.py:208` —
  `# pyright: ignore[reportCallIssue]` sobre
  `self.box.post('alice', 'bob', 'x', authority='grant')`: el propio test
  se llama `test_post_has_no_authority_parameter` y existe para comprobar
  que ese kwarg no es válido (`TypeError` en runtime). El error de pyright
  es el mismo hecho que el test verifica, no un defecto de tipo a corregir.

No se usó ningún `# type: ignore` a secas ni `cast`.

## Resultado de cada test ejecutado (antes / después)

Todos con `PYTHONPATH=src .venv/bin/python <archivo>` (o
`.venv/bin/python <archivo>` para los `unittest`). "Antes" se corrió sobre
un `git worktree` de HEAD (sin los cambios de este bucket); "después",
sobre el árbol editado.

| Test | Antes | Después |
|---|---|---|
| `tests/session/test_adopt_background.py` | 27 ok, 0 fallos (exit 0) | 27 ok, 0 fallos (exit 0) |
| `tests/session/test_background.py` | 21 ok, 0 fallos (exit 0) | 21 ok, 0 fallos (exit 0) |
| `tests/session/test_bounded_scan.py` | 0 fallo(s) (exit 0) | 0 fallo(s) (exit 0) |
| `tests/session/test_generate_bin.py` | 116 aprobadas, 0 fallidas (exit 0) | 118 aprobadas, 0 fallidas (exit 0)¹ |
| `tests/session/test_gpu_monitor.py` | 42 ok, 0 falla(s) (exit 0) | 42 ok, 0 falla(s) (exit 0) |
| `tests/session/test_gpu_scenarios.py` | 19 ok, 0 falla(s) (exit 0) | 19 ok, 0 falla(s) (exit 0) |
| `tests/session/test_job_runs.py` | 0 fallo(s) (exit 0) | 0 fallo(s) (exit 0) |
| `tests/session/test_pool_history.py` | 55 ok, 0 falla(s) (exit 0) | 55 ok, 0 falla(s) (exit 0) |
| `tests/session/test_probe_model_switch_cache.py` | 48 ok, 0 fallos (exit 0) | 48 ok, 0 fallos (exit 0) |
| `tests/session/test_session_restart.py` | OK=35 FAILED=0 (exit 0) | OK=35 FAILED=0 (exit 0) |
| `tests/session/test_shared_lock.py` | 27 ok, 0 falla(s) (exit 0) | 27 ok, 0 falla(s) (exit 0) |
| `tests/session/test_user_wiring.py` | 85 ok, 0 fallos (exit 0) | 85 ok, 0 fallos (exit 0) |
| `tests/store/test_agent_sessions.py` | 28 ok, 0 fallos (exit 0) | 28 ok, 0 fallos (exit 0) |
| `tests/workbench/test_manifest.py` | 27 ok, 0 fallos (exit 0) | 27 ok, 0 fallos (exit 0) |
| `tests/peer_mailbox/test_peer_mailbox.py` (unittest) | 33 tests OK (exit 0) | 33 tests OK (exit 0) |
| `tests/workbench/test_home_resolution.py` (unittest) | 7 tests OK (exit 0) | 7 tests OK (exit 0) |
| `tests/session/hardware/test_gpu_admission_real.py` | REHÚSA — sin nvidia-smi (exit 2) | REHÚSA — sin nvidia-smi (exit 2) |

¹ La diferencia (116→118) no es una regresión ni algo introducido por este
pase: `test_generate_bin.py` mide `glob("*.py")` sobre directorios reales
del árbol en tiempo de ejecución (línea 591), y el número de aserciones
generadas depende de cuántos `.py` hay ahí en el momento de correr — este
repo tiene otros trabajos concurrentes escribiendo archivos. Confirmado
corriendo el archivo editado dos veces seguidas: ambas dan 118, 0 fallidas.
En ningún caso hubo un fallo.

### Consumidores de los `src/` tocados (fuera de la lista, verificados igual)

`graph_metrics.py` y `compare_neighbourhood.py` no tienen test Python que
los importe (se invocan como script vía `bin/`); no se encontró ningún
`.py` de `tests/` que los importe. `cache_probe.py` y `closing.py` sí:

| Test | Antes | Después |
|---|---|---|
| `tests/transcript/test_cache_probe.py` | 37 ok, 0 fallos (exit 0) | 37 ok, 0 fallos (exit 0) |
| `tests/transcript/test_closing.py` | 10 ok, 0 fallos (exit 0) | 10 ok, 0 fallos (exit 0) |
| `tests/agents/test_final_message_closing.py` | 14 ok, 0 fallos (exit 0) | 14 ok, 0 fallos (exit 0) |

Salidas completas en `before-*.out` / `after-*.out` de este directorio.
