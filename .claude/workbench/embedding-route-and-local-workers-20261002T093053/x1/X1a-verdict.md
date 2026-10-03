# X1a — esquema y API del registro de ejecución: aceptado

- `@thyrox/execution-records`: tabla `execution_records` por las migraciones de `@thyrox/store`
  (versión 1, ledger `execution_records_migrations`), PostgreSQL y SQLite.
- SQLite en memoria: 6/6 (`executionRecordStore.test.ts`).
- PostgreSQL real (`thyrox_test`, cluster del anfitrión arrancado con `pg_ctlcluster 16 main start`):
  1/1 (`executionRecordStore.postgres.test.ts`), con la URL declarada pasada por
  `run_postgres_suite.ts` sólo al entorno del hijo. La primera corrida falló por el timeout de 5 s
  del caso mientras el cluster arrancaba; la segunda pasó.
- Anulación: sin `COALESCE` en el upsert cae exactamente «a second write completes the row
  without erasing measured fields» (1 de 6).
- `tsc --noEmit -p tsconfig.test.json`: 0 errores. `bun install` sólo añadió el workspace al lock.
- Decisión registrada en el store: DEC-THYROX-007-1-17-0 (proyección docs diferida).
