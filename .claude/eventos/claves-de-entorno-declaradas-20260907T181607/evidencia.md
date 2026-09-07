# Las claves de entorno que thyrox lee, contra las que declara

Fecha: 2026-09-07T18:16:07 (`date -u`).
Origen: directiva del ejecutor — *«¿por qué el thyrox/.env.example no tiene
todas las CONSTANTES que se usan?»*.

La salida va transcrita aquí y no como `.log` porque `*.log` está en
`.gitignore:29`: un log es tan durable como el contenedor, y la evidencia que
sostiene una afirmación tiene que sobrevivir al contenedor
(`build-logs.md`, «La prueba se guarda EN EL REPOSITORIO»).

## Antes

```
claves leidas del entorno (sin fixtures): 27
declaradas en .env.example:               9
leidas y NO declaradas:                   18
  FALTA  THYROX_AGENTS_DIR             <- src/agents/agents_paths.py
  FALTA  THYROX_BACKGROUND_LOG_DIR     <- src/session/background.py
  FALTA  THYROX_BOARD_ROOT             <- src/task/task_ids.py
  FALTA  THYROX_CONTRAPARTE_DECLARATION<- src/corpus/census_counterparts.py
  FALTA  THYROX_DEBUG                  <- src/packages/agent/misc/systemDirectories.ts
  FALTA  THYROX_ENV_FILE               <- install.sh
  FALTA  THYROX_EXTRA_REACH_ROOTS      <- src/paths/reach.py
  FALTA  THYROX_FEATURE_FLAGS          <- src/packages/config/feature-flags.ts
  FALTA  THYROX_MAILBOX_DIR            <- src/peer_mailbox/inbox.py
  FALTA  THYROX_MODEL_CATALOG          <- src/agents/model_catalog.py
  FALTA  THYROX_RESULTS_DIR            <- src/hooks/error_log.py
  FALTA  THYROX_SKILLS_DIR             <- src/skills/paths.ts
  FALTA  THYROX_STOP_TESTS_RUNNING     <- src/hooks/stop_tests.py
  FALTA  THYROX_STORE                  <- src/packages/observability/src/store.ts
  FALTA  THYROX_SURFACE_CONSUMERS      <- src/gates/check_python_surface.py
  FALTA  THYROX_TEST_RUNNER            <- src/hooks/stop_tests.py
  FALTA  THYROX_USER_CLAUDE_DIR        <- src/session/reconcile_user_hooks.py
  FALTA  THYROX_WATCHED_DIR            <- src/hooks/stop_tests.py
declaradas y no leidas por este censo:    0
```

## Después

```
claves leidas del entorno (sin fixtures): 27
declaradas en .env.example:               27
leidas y NO declaradas:                   0
declaradas y no leidas por este censo:    0
```

## Métrica y ceguera

*Métrica:* nombres con prefijo `THYROX_` que el árbol lee del entorno, por dos
vías: la lectura directa (`os.environ`, `os.getenv`, `process.env.X`,
`process.env['X']`, y en shell `${X}` sin asignación incondicional en el mismo
archivo) y la INDIRECTA (el nombre vive en una constante que se pasa a
`env_value(name)`, que el AST no puede seguir). Se excluyen fixtures de prueba
(`__tests__`, `/tests/`, `test_`, `.test.`).

*Ciega a:* una clave compuesta en tiempo de ejecución — la familia
`THYROX_REACH_<CLON>` de `reach.py::env_names(repo)` no aparece como literal en
ningún sitio; se documentó a mano en `.env.example`. Y la vía indirecta es una
COTA SUPERIOR: un literal `"THYROX_X"` en un docstring cuenta como lectura. Se
comprobaron a mano los cinco que sólo llegaban por esa vía —`THYROX_FEATURE_FLAGS`,
`THYROX_STORE`, `THYROX_SKILLS_DIR`, `THYROX_MAILBOX_DIR`,
`THYROX_CONTRAPARTE_DECLARATION`— y los cinco son lecturas reales.

## El error del instrumento anterior, y por qué importa

El primer censo publicó **11 sin declarar, 7 de contrato**. Las dos cifras eran
falsas y en direcciones opuestas:

- **Contaba de más.** `THYROX_DIR`, `THYROX_WPS`, `THYROX_WP_LIST` y
  `THYROX_SH_MARKER` son variables **asignadas** por su propio guion
  (`THYROX_DIR="$(cd … && pwd)"`), no claves que el consumidor declare.
  Exportarlas desde el entorno no cambia nada: la asignación las pisa. Es el
  sub-patrón **C** de `metrica-decide-la-conclusion.md` — se midió el
  significante (el nombre aparece) y se concluyó sobre el mecanismo (se lee).
- **Contaba de menos.** No seguía la indirección por constante, así que
  publicó *«6 claves declaradas y no leídas»* sobre seis que sí se leen —
  `THYROX_CONSUMER`, `THYROX_REACH_ROOT`, `THYROX_AGENT_STORE`,
  `THYROX_WORKBENCH_DIR`, `THYROX_STATE_DIR`, `THYROX_EVIDENCE_DIR`— y no vio
  las 12 que sólo llegan por esa vía.

Las dos mitades del defecto son la misma: el instrumento medía **apariciones
del nombre**, no **lecturas del entorno**, y ninguna de las dos cifras que
publicó describía el fenómeno sobre el que yo estaba concluyendo.

## Hallazgo colateral

`THYROX_CONTRAPARTE_DECLARATION` lleva una palabra en español en el nombre de
una clave de entorno, contra `identificadores-en-ingles.md`. NO se renombró en
este pase: una clave de entorno es contrato, y cambiarla en `.env.example` sin
cambiarla en `src/corpus/census_counterparts.py:60` daría dos grafías y ninguna
autoridad.
