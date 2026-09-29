Implementas en thyrox (Bun, TypeScript), en TDD, una pieza de `@thyrox/store`. El `Item:` de abajo
nombra los archivos que te pertenecen; no toques ningún otro.

Contexto (decisión del ejecutor, 2026-09-29): `@thyrox/store` comparte contratos y garantías, no un
único driver. Hay dos runners de migraciones con el MISMO contrato observable:
`runMigrations` (async, `Bun.SQL`, ya existe en `src/packages/store/migrations.ts`) y
`runMigrationsSync` (sync, `bun:sqlite`, el que añades). Los stores de nivel B (mitm, task, provider,
observability) seguirán en `bun:sqlite` con API síncrona; ellos no se tocan en este ítem.

Condiciones del ejecutor, todas obligatorias:
1. `runMigrationsSync` comparte exactamente el contrato observable del runner async:
   versiones estrictamente ascendentes; sin duplicados; migración + fila de control en la misma
   transacción; re-ejecución idempotente; rechazo de una base más nueva que el código; mismo esquema
   de metadata (`version INTEGER PRIMARY KEY`, `applied_at TEXT NOT NULL`) y mismos mensajes de error.
   La validación de la lista (orden, duplicados, versión entera positiva, nombre de tabla) es UNA
   función compartida por los dos runners, no dos copias.
2. La suite contractual es UNA: las mismas invariantes aplicadas a las dos implementaciones (por
   ejemplo, un módulo de casos parametrizado por un adaptador de runner y ejecutado para `sync`,
   `async-sqlite` y, si `THYROX_TEST_POSTGRES_URL` está definida, `async-postgres` con
   `withDisposableSchema` de `src/packages/store/testing/postgresTestSchema.ts`). No dos suites
   parecidas. Las pruebas actuales de `runMigrations` se trasladan a esa suite sin perder ninguna
   aserción.
3. Control de anulación por garantía: retirar cada guarda (orden, duplicado, transacción,
   idempotencia, base más nueva) hace caer sus casos en los DOS runners. Dilo en tu respuesta con el
   conteo de casos caídos por guarda.

Reglas:
- Identificadores, nombres de archivo y firmas en inglés; comentarios en español técnico, sin
  coloquialismos, términos técnicos en inglés. La palabra «Claude» con mayúscula no va en `src`.
  Sin imports dinámicos ni `require` dentro de funciones.
- Nada de `/tmp` fijo; restaura `process.env`. No leas stdin. No añadas dependencias ni variables
  de entorno. No toques `bun.lock` ni `.env.example`. No lances trabajos en segundo plano ni
  `tests/run.sh`: sólo las pruebas de `src/packages/store`. No commitees.
- Al terminar, `bun test` en `src/packages/store` y `bash bin/check_package_typecheck --strict store`
  en verde. Responde con los archivos cambiados, la forma de la suite común, los controles de
  anulación y un resumen de dos líneas.
