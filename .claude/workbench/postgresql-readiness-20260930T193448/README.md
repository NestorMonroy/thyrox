# Qué hace falta para usar PostgreSQL en thyrox

Medido sobre `feature/thyrox-l6` tras integrar `feature/complete-orm-root`
hasta `70e2891c` (merge `858ccdf0`).

## Lo que ya existe

| Pieza | Estado | Dónde |
|---|---|---|
| Capa común `@thyrox/store` sobre `Bun.SQL` | abre `sqlite:`/`file:` y `postgres:`/`postgresql:`; `mysql:` rehusado | `src/packages/store/sql.ts`, `db.ts` |
| Migraciones async multi-motor (contrato v2) | hechas | `migrations.ts`, `migrationLedger.ts` |
| Pruebas contra PostgreSQL real | `THYROX_TEST_POSTGRES_URL` | TASK D2a |
| Servidor del anfitrión | cluster 16/main instalado, **parado** | `pg_lsclusters` |
| pgvector | `vector.control` presente | `/usr/share/postgresql/16/extension/` |
| Infraestructura gestionada por Podman | declarada; `bin/infrastructure_ensure` **rehúsa sin `THYROX_INFRA_POSTGRES_PASSWORD`**; 0 contenedores, 0 imágenes | `src/lib/infrastructure.sh` |

## Quién puede usar PostgreSQL hoy

Sólo un consumidor: la base de errores (`THYROX_OBSERVABILITY_DATABASE_URL`,
`local-observability/src/errorStore/errorStoreHome.ts:32`). Los demás abren con
`openLocal` (SQLite, síncrono): estado del MITM, conexiones de proveedores y
observabilidad. `agent_store.sqlite3` es SQLite en Python.

## Lo que falta

1. **Un servidor corriendo**: arrancar el cluster del anfitrión, o
   `infrastructure_ensure` con la credencial declarada. La imagen tiene que
   poder descargarse.
2. **La autoridad compartida (D4-B, TASK-THYROX-0627)**: la decisión del
   ejecutor exige un PostgreSQL común a todas las sesiones, fuera del ciclo de
   vida de una sesión, sin fallback silencioso. Un PostgreSQL por contenedor
   no cumple. Ni el anfitrión ni el Podman local lo son.
3. **Puerto/adaptador para `agent_sessions` y `tasks`** (los primeros en
   migrar según D4-B): no existe.
4. **Stores síncronos (D3, tarjeta [201], opción A; su cita durable no resolvió con `task_ids lookup`)**: el runner síncrono
   es SQLite; llevarlos a PostgreSQL no está planeado.
5. **Búsqueda semántica**: D5 (qué vectorizar y modelo, tarjeta [203], sin cita resuelta),
   `SemanticSearchStore` (TASK-THYROX-0562), consumidores [204] y worker [315]: pendientes.
