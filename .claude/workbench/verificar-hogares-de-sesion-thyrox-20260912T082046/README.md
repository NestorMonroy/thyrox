# verificar-hogares-de-sesion-thyrox

## El encargo

<!-- verbatim, sin parafrasear -->
"primero dime tienes acceso o puedes ejecutar TODO lo que se tiene en
thyrox/src/? vas a crear una nueva rama de feature/thyrox-l1/ llamada
feature/thyrox-l2 en ella vas a crear Crea un
THYROX_WORKBENCH=/home/user/thyrox/.claude/workbench/
THYROX_JOBS=/home/user/thyrox/.claude/build-logs/ revisa lo que se tiene en
THYROX_WORKBENCH y en THYROX_JOBS para que revises como se hace y los
implementes de manera correcta"

## La premisa, si se corrigio al primer comando

Se corrigio. La premisa implicita del encargo era que `THYROX_WORKBENCH` y
`THYROX_JOBS` no existian todavia y habia que crearlos, con `THYROX_JOBS`
apuntando a `.claude/build-logs/`. Las dos partes eran falsas, medidas contra
`thyrox/.env` y `thyrox/.env.example` antes de escribir nada:

- Las variables reales llevan el sufijo `_DIR`: `THYROX_WORKBENCH_DIR` y
  `THYROX_JOBS_DIR` (mas la familia por clon `THYROX_WORKBENCH_<CLON>` /
  `THYROX_JOBS_<CLON>`).
- Ambas YA estaban declaradas en `.env`, generado por
  `src/session/write-env.sh` el 2026-09-10T08:01:58 -- no en esta sesion:

  ```
  THYROX_WORKBENCH_DIR=/home/user/thyrox/.claude/workbench
  THYROX_JOBS_DIR=/home/user/thyrox/.claude/jobs
  ```

- `THYROX_WORKBENCH_DIR` ya coincidia exactamente con lo pedido.
- `THYROX_JOBS_DIR` apunta a `.claude/jobs`, NO a `.claude/build-logs`.
  `build-logs` es el nombre que usa `kaupamex-docs` para SU convencion propia
  (`build-logs.md`, especifica de Sphinx), sin relacion con el mecanismo de
  `bg.sh`/`wait-jobs.sh` de thyrox. Crear `THYROX_JOBS=.../build-logs/` habria
  fabricado una segunda fuente de verdad para el mismo hogar -- exactamente lo
  que `src/workbench/paths.py` (docstring de `workbench_dir`) declara que no
  se hace.

No se escribio ninguna variable nueva. Se uso el mecanismo tal como esta,
como prueba de que funciona.

## Las piezas

| archivo / comando | que hace |
|---|---|
| `uv sync` en `thyrox/` y en `kaupamex-api/` | crea `.venv` por repo, cada uno resuelto contra su propio `pyproject.toml` |
| `thyrox/.env`, `thyrox/.env.example:51-292` | declaran `THYROX_WORKBENCH_DIR`/`THYROX_JOBS_DIR` y su familia por clon |
| `src/workbench/paths.py::workbench_dir` | resuelve el hogar del banco: declarado > por-clon > default derivado; REHUSA solo si no hay consumidor que ascender |
| `src/session/instalar-hooks-sesion-multirepo.sh` + `user_wiring.declared_wiring()` | compone y escribe los hooks `SubagentStart`/`SubagentStop`/`PreModelSwitch` en el `settings.local.json` que el cliente realmente carga |
| `src/session/bg.sh start baseline-l2 -- bash tests/run.sh` | prueba real del hogar de jobs: escribio en `.claude/jobs/baseline-l2-20260912T081610/outputs/salida.log`, confirmando que `THYROX_JOBS_DIR` ya funciona sin tocarlo |

## Los resultados

**Acceso/ejecucion sobre `thyrox/src/`:** lectura completa (git). Ejecucion
verificada para los tres lenguajes que el `README.md` de thyrox declara --
Python (`.venv` con Python 3.11.15, `requires-python >=3.11,<3.15`), shell
(bash presente), y TypeScript (`bun 1.3.11`, `bun install --frozen-lockfile`
resolvio 5 paquetes). Node 22.22.2 tambien presente. No se ejecuto
`_archived/` (declarado congelado por DEC-02, "no se lee como vigente") ni
`_references/` (corpus vendorizado, material de apoyo, no producto).

**Entornos uv:** dos `.venv` separados y verificados sin cruce --
`thyrox/.venv` (Python 3.11.15, 24 paquetes: docutils, sphinx,
spacy-lookups-data...) y `kaupamex-api/.venv` (Python 3.12.3, ~60 paquetes:
Django 6, DRF, psycopg...). `sys.path` de cada uno resuelto contra su propio
`site-packages`; confirmado con `diff` que no coinciden.

**Hooks:** instalados en `/home/user/.claude/settings.local.json`, que no
existia al arranque de esta sesion. Smoke test de dos de los cuatro scripts
invocados (`register_session.py --help`, `measure_delta.py --help`) sin
traceback. Pendiente de confirmar si el proceso actual del harness ya los
tomo (el watcher solo recarga settings que existian al arranque de la
sesion, per H-DOCS-1010 citado en las reglas del consumidor).

**Suite baseline:** termino con `exit=1` tras ~20 min --
TypeScript 4829 pass / 827 fail (530 archivos), Python 120 suites / 22
rojo, shell 81 suites / 25 rojo. Es el punto de PARTIDA del arbol, no
una regresion de este banco -- no se toco ningun archivo de `src/` en
esta rama. Job: `.claude/jobs/baseline-l2-20260912T081610/`.

*Metrica:* existencia y contenido de `.env`/`.env.example` antes de escribir,
y un uso real del hogar de jobs (`bg.sh`) que aterrizo donde `THYROX_JOBS_DIR`
declara.
*Ciega a:* si el `.venv` de `kaupamex-api` resuelve TODAS sus dependencias en
tiempo de ejecucion real (solo se verifico que `uv sync` salio 0); si los
hooks instalados surtiran efecto en esta misma sesion o solo en la siguiente;
y el triaje de los 874 rojos totales (827+22+25), que queda fuera de este
banco puntual.
