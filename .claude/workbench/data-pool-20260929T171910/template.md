# Pool de Datos — migraciones versionadas en tres stores (un ítem de tres)

Trabajas en un worktree de thyrox. Identificadores, nombres de archivo, funciones, firmas y
variables en inglés; comentarios en español técnico, sin coloquialismos, con los términos
técnicos en inglés (clean-code: nombres por el papel, una responsabilidad por función, sin
números mágicos). No toques `_references/`, `agent-results/`, `.claude/` ni `.env.example`.
**No edites nada bajo `src/packages/store/`**: el contrato de migraciones ya existe y lo
consumes tal cual; si te falta algo del contrato, dilo en el informe en vez de cambiarlo (dos
ítems lo tocarían y se pisarían). Operaciones de archivo por Bash (`sed`, `gawk`,
`bin/replace_literal`). Las pruebas TypeScript se corren con `bun test` dentro del paquete.

## Reglas, sin excepción

- **Prohibido `git stash`** en cualquier forma (el pool lo rehúsa y el ítem no se integra).
- **Nada en segundo plano y nunca termines el turno para esperar algo**: si cierras el turno,
  el ítem termina. Pruebas en primer plano, acotadas con `timeout`.
- TDD: la prueba primero, en rojo; luego el cambio. Todo arreglo trae su **control de
  anulación**: retira la causa, comprueba que caen exactamente las aserciones que dependen de
  ella, restáurala y vuelve a verde. Informa las dos salidas.
- La prueba de adopción usa una base **creada con el esquema que existe HOY** (léelo de `git
  show HEAD:<archivo>` si ya lo cambiaste), con filas dentro, y comprueba que tras migrar las
  filas siguen intactas y el ledger registra la versión 1 sin re-ejecutar el DDL.
- Tu último mensaje es un informe: qué cambiaste, las pruebas con su salida y lo que queda.

## El contrato que consumes (`@thyrox/store`, no se edita)

- `@thyrox/store/migrationsSync.ts`: `runMigrationsSync(db, { table, migrations })` para
  `bun:sqlite`. Cada `Migration` = `{ version, name, statements: { sqlite: [...], postgres:
  [...] }, alreadyApplied?: (db) => boolean }`. `alreadyApplied` que da verdadero registra la
  versión sin ejecutar sus sentencias: es la vía para adoptar una base creada antes del ledger.
- `@thyrox/store/migrations.ts`: `runMigrations(sql, { table, migrations })` para `Bun.SQL`
  (SQLite y PostgreSQL); `alreadyApplied` análogo, asíncrono (léelo en el archivo).
- `@thyrox/store/migrationLedger.ts`: `validateMigrationLedger` / `validateMigrationLedgerSync`.
  Un ledger heredado sin columna `name` se adopta solo (`adoptLegacyLedger`).
- Lee `src/packages/store/__tests__/` para ver cómo se prueba el contrato.

Tu ítem es el que dice `Item:` al final. Haz SÓLO ese.

## Item `mitm-state-migrations` (TASK-THYROX-0531, A1)

`src/packages/mitm/src/state/schema.ts` crea el esquema con un `CREATE TABLE IF NOT EXISTS`
sin tabla de migraciones. Pásalo a `runMigrationsSync` con una tabla de control propia
(`agent_bridge_migrations`), versión 1 = el esquema de hoy **idéntico** (mismo DDL, mismas
tablas e índices), con `alreadyApplied` que detecta una base existente. La API pública de
`schema.ts` sigue siendo síncrona y con la misma firma: sus llamadores no cambian. Pruebas en
`src/packages/mitm/__tests__/state/`: base nueva, base existente con filas (adopción sin
pérdida), re-ejecución idempotente, y rechazo de una base más nueva que el código. Corre la
suite `src/packages/mitm/__tests__/state/` entera antes de terminar.

## Item `provider-connections-migrations` (TASK-THYROX-0533, A3)

`src/packages/provider/src/accounts/connectionSchema.ts` (`ensureProviderConnectionsSchema`)
crea el esquema sin ledger. Pásalo a `runMigrationsSync` con tabla de control
`provider_connections_migrations`, versión 1 = el esquema de hoy, `alreadyApplied` para la
base existente. Requisito duro: las filas cifradas de una base existente quedan **byte a byte
idénticas** tras migrar (compara los BLOB/TEXT cifrados antes y después, no los descifrados).
Misma firma pública. Pruebas en `src/packages/provider/__tests__/accounts/`; corre también
`connectionStore.test.ts` y `storageKeyRotation.test.ts` antes de terminar.

## Item `error-store-shared-runner` (TASK-THYROX-0535, A5)

`src/packages/local-observability/src/errorStore/migrations.ts` tiene su propio bucle de
migraciones con `error_store_migrations`. Sustitúyelo por `runMigrations` de `@thyrox/store`
**conservando** la tabla `error_store_migrations` y sus filas (el contrato adopta el ledger
heredado sin columna `name`: dale nombre a cada versión). Borra el bucle privado. Pruebas:
una base creada con el código de hoy (bucle privado) se abre con el nuevo y conserva errores y
ledger; corre `errorStore.sqlite.test.ts`, `errorRecordingWiring.test.ts` y
`errorStore.postgres.test.ts` (este último sólo corre si `THYROX_TEST_POSTGRES_URL` está
definida; si no lo está, dilo en el informe — no inventes el resultado).
