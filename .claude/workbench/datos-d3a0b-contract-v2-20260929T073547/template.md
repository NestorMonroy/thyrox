Implementas en thyrox (Bun, TypeScript), en TDD, una ampliación del contrato de migraciones de
`@thyrox/store`. El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro.

Estado actual (commit 40abf5a9): dos runners con un contrato común —`runMigrations` (async,
`Bun.SQL`, `src/packages/store/migrations.ts`) y `runMigrationsSync` (sync, `bun:sqlite`,
`src/packages/store/migrationsSync.ts`)—, la validación compartida en
`src/packages/store/migrationContract.ts` y UNA suite contractual
(`src/packages/store/__tests__/migrationRunnerContract.ts`, aplicada en `migrations.test.ts` a sync,
async-sqlite y async-postgres si `THYROX_TEST_POSTGRES_URL` está definida).

Decisión del ejecutor (tras comparar con OmniRoute `src/lib/db/migrationRunner.ts`): el contrato v2
añade, en los DOS runners y en la MISMA suite:
1. Ledger `version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL`. `Migration`
   gana `name: string` (obligatorio, identificador estable en snake_case); la validación de la lista
   rechaza nombres vacíos o duplicados.
2. Provenance: si el ledger registra una versión con un nombre distinto del que declara el código, se
   rechaza antes de aplicar nada, con un error que nombra versión, nombre registrado y nombre del código.
3. Adopción: una migración puede declarar un chequeo «ya aplicada físicamente» (sync para el runner
   sync, async para el async). Si da verdadero, la versión se registra sin ejecutar sus sentencias, en
   una transacción con su fila. Si da falso, se ejecuta como hoy.
4. Sin writer lock cuando no hay nada pendiente: leer el ledger y, si todo está aplicado y la
   provenance cuadra, volver sin abrir transacción de escritura (pruébalo: otra conexión con una
   transacción de escritura abierta no bloquea ni hace fallar la llamada no-op).
5. Ledger heredado sin columna `name` (caso del error store: `error_store_migrations` con
   `version, applied_at`): se adopta añadiendo la columna y fijando el nombre desde el código para las
   versiones conocidas; una versión registrada que el código no declara sigue siendo «base más nueva».
6. `validateMigrationLedger` (sync y async), de solo lectura, para quien consume una base sin
   ejecutar migraciones: ledger ausente → error explícito «store requires initialization or
   migration»; versión desconocida o nombre distinto → rechazo; faltan versiones que el consumidor
   exige → rechazo; nunca escribe.
Se conservan: orden estricto, sin duplicados, migración y fila atómicas, idempotencia, rechazo de base
más nueva, mismos mensajes para lo que ya existía. El snapshot previo y la política de «demasiadas
pendientes» NO van en el runner común.

Control de anulación por garantía nueva: retirar cada guarda (provenance, adopción, no-op sin lock,
ledger heredado, validador) hace caer sus casos en los runners donde aplica; dilo con el conteo.

Reglas:
- Identificadores, archivos y firmas en inglés; comentarios en español técnico, sin coloquialismos,
  términos técnicos en inglés. La palabra «Claude» con mayúscula no va en `src`. Sin imports
  dinámicos ni `require` dentro de funciones.
- Nada de `/tmp` fijo; restaura `process.env`. No leas stdin. Sin dependencias ni variables nuevas.
  No toques `bun.lock` ni `.env.example`. Sin trabajos en segundo plano ni `tests/run.sh`. No commitees.
- Los consumidores actuales de `Migration` fuera de `src/packages/store` (busca con `git grep`) NO se
  tocan en este ítem: si alguno deja de compilar por `name` obligatorio, dilo en tu respuesta con la
  lista, no lo arregles.
- Al terminar, `bun test` en `src/packages/store` y `bash bin/check_package_typecheck --strict store`
  en verde. Responde con archivos cambiados, las garantías nuevas y su prueba, los controles de
  anulación, los consumidores afectados y un resumen de dos líneas.
