# Base de errores sobre Bun.SQL: SQLite y PostgreSQL

La base de errores deja `bun:sqlite` y pasa a un contrato asíncrono sobre
`Bun.SQL`, con una sola implementación para `sqlite://` y `postgres://`. El
análisis de referencias que decide la forma está en
`../error-store-backends-20260928T174834/analisis.md`.

## Qué se midió (`checks.sh`, en segundo plano)

| Salida | Resultado |
|---|---|
| `package-suite.txt` | local-observability: 256 pass, 1 skip, 0 fail |
| `postgres-contract.txt` | contrato en PostgreSQL 16: 7 pass (antes de la prueba de JSONB) |
| `postgres-verde.txt` | con la prueba de JSONB: 8 pass, 0 fail |
| `repl-boundary.txt` | el límite de componentes del REPL registra `render`: 1 pass |
| `shutdown.txt` | el apagado vacía los registros pendientes: 40 pass |
| `typecheck.txt` | local-observability, repl y app-host (build y test): sin errores tras corregir TS2742 e initCommand |
| `env-contract.txt`, `env-prefix.txt` | 0 claves sin declarar; 0 variables THYROX_* nuevas sin prueba |

## Anulaciones de `dialect.ts`

Cada rama de PostgreSQL se anuló y se corrió el contrato en los dos motores:

| Anulación | Cae |
|---|---|
| `readTimestamp` sin `Date → ISO` | 1 caso de postgres |
| `readId` sin `Number()` | 1 caso de postgres |
| `jsonParam` siempre `JSON.stringify` | **0** con el contrato de ida y vuelta; 1 con la prueba de `jsonb_typeof` |

La tercera fila es H-THYROX-237: la ida y vuelta no discriminaba. `readJson`
deshace la doble codificación al leer, así que el defecto sólo se ve desde
SQL. La prueba añadida consulta `jsonb_typeof(context)` y
`context->>'status'`.

*Métrica:* casos de `bun test` que fallan por anulación, en cada motor.
*Ciega a:* MySQL (fuera de alcance por ahora) y PostgreSQL con otra versión
mayor que la 16.
