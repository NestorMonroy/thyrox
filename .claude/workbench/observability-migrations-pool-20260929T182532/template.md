# Pool A4 — migraciones de observability en el store de agentes

Trabajas en un worktree de thyrox. Nombres de archivo, clases, funciones, firmas de funciones,
parámetros, variables y todo identificador en **inglés**; comentarios y docstrings en español
técnico, sin coloquialismos, con los términos técnicos en inglés (`trigger`, `ledger`,
`migration`, `schema`). Clean-code: nombres por el papel que cumplen, una responsabilidad por
función, sin números mágicos, sin banderas que elijan camino, sin código muerto ni comentado,
sin historial de cambios en los comentarios. No toques `_references/`, `.claude/`,
`.env.example` ni `agent-results/agent_store.sqlite3` (la base real): las pruebas crean sus
bases en un directorio temporal. Operaciones de archivo por Bash (`sed`, `gawk`,
`bin/replace_literal`); una herramienta de `src/` se invoca por su envoltorio de `bin/`, nunca
`python3 src/...` por ruta. Pruebas Python con `python3` (el worktree no tiene `.venv`), las
TypeScript con `bun test` dentro de su paquete.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma: el pool lo detecta y el ítem no se integra.
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Pruebas en primer plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `observability-store-migrations` (TASK-THYROX-0534, Datos D3-A4)

### Contexto medido

`agent_store.sqlite3` tiene **un solo dueño del schema: Python** (decisión del ejecutor, ya
integrada en TASK-THYROX-0532). `src/agents/agent_store.py` declara `CORE_MIGRATIONS`
(versiones 1..12, ledger `schema_migrations` con `version`/`name`/`applied_at`) y cada migración
lleva un chequeo de adopción que reutiliza la detección existente. Bun no ejecuta DDL sobre esa
base: `src/packages/tools/src/tasks.ts` la valida con `validateMigrationLedgerSync` contra las
migraciones que `pythonMigrations()` (en `src/packages/task/schema.ts`) extrae de
`agent_store.py`, y rehúsa sin ledger; las pruebas crean la base con `createMigratedTaskDb`
(mismo archivo), que invoca `bin/agent_store migrate-file`. Léelos antes de empezar.

`src/packages/observability` escribe en **esa misma base** y todavía ejecuta DDL propio:

- `src/store.ts::ensureUpdatedAtTrigger` crea el trigger `agent_sessions_stamp_updated`;
  lo llama `reconcileStaleRunningRows`.
- `src/clearedResults.ts::ensureClearedTable` crea la tabla `cleared_tool_results`; lo llama
  `makeClearedPersister`.

Un segundo ledger (`runMigrationsSync` con otra tabla en el mismo archivo) volvería a dar dos
dueños al schema. Por eso este ítem **no** usa `runMigrationsSync` en observability: sigue el
modelo de A2.

### Qué hacer

(a) En `src/agents/agent_store.py`: dos migraciones nuevas al final de `CORE_MIGRATIONS`, con
nombre en inglés y chequeo de adopción por detección (el objeto ya existe en `sqlite_master`
con ese nombre): una crea `cleared_tool_results` con **exactamente** las columnas, tipos, NOT
NULL y clave primaria de hoy; otra crea el trigger `agent_sessions_stamp_updated` con el
**mismo** cuerpo. Una base existente que ya los tiene los adopta sin re-ejecutar nada.

(b) En observability: `ensureUpdatedAtTrigger` y `ensureClearedTable` dejan de ejecutar DDL.
Antes de escribir, la base se valida contra el ledger con el mismo mecanismo que usa
`tasks.ts` (`validateMigrationLedgerSync` + `pythonMigrations()`): no dupliques ese
mecanismo; si hace falta compartirlo, extráelo a `src/packages/task/schema.ts` con un nombre
que describa su papel y haz que `tasks.ts` y observability lo usen. Si agregas `@thyrox/task`
como dependencia de `@thyrox/observability`, respeta la versión exacta del resto de
dependencias `@thyrox/*` del `package.json`. Sin ledger o con una versión pendiente, el error
es explícito y nombra la migración que falta; `makeClearedPersister` lo convierte en su motivo
`sin-store` con ese detalle (no lo tragues). La API pública (nombres y firmas exportados)
queda intacta salvo que retirar un export sea necesario: si lo retiras, actualiza todos sus
importadores.

(c) Pruebas:
- Python, en `tests/agents/test_agent_store_migrations.py` (ampliarlo, no reemplazar sus
  casos): base nueva con las dos tablas/trigger y el ledger completo; base existente que ya
  los tiene → adoptados sin duplicar; el trigger sigue estampando `updated_at` al cambiar
  `status`.
- TypeScript: `src/packages/agent/__tests__/storeReconcile.test.ts` y las pruebas de
  `src/packages/observability/__tests__/` crean sus bases con `createMigratedTaskDb`; añade el
  caso «base sin ledger → rehúsa» para cada uno de los dos escritores.
- Control de anulación: devuelve el DDL a observability o retira la validación y muestra qué
  aserciones caen.

Corre antes de terminar, y pon su última línea en el informe:
`python3 tests/agents/test_agent_store_migrations.py`,
`bash tests/agents/test-agent-store-usage-columns.sh`,
`bash tests/agents/test-agent-store-usage-source.sh`,
y `bun test` en `src/packages/observability`, `src/packages/tools`, `src/packages/task` y
`src/packages/agent`.
