# pgvector 0.8.6 instalado contra el PostgreSQL de Ubuntu

Decisión del ejecutor (2026-09-29): «vamos a usar 0.8.6»; instalación aprobada con el
reinicio del clúster. `install.sh` corrió como trabajo registrado (`pgvector-install`),
log en `.claude/jobs/pgvector-install-*/outputs/salida.log`, `__BG_EXIT__=0`.

| Paso | Antes | Después |
|---|---|---|
| `vector.control` `default_version` | `0.6.0` | `0.8.6` |
| binarios de PostgreSQL (`pg_config`) | 16.13 Ubuntu | 16.15 Ubuntu |
| servidor en ejecución | 16.13 | 16.15, tras `pg_ctlcluster 16 main restart` |
| `extversion` en la base de pruebas | `0.6.0` | `0.8.6`, tras `ALTER EXTENSION vector UPDATE` |

El reinicio no lo hizo el paquete: aquí no hay systemd y el clúster siguió sirviendo
16.13 con los binarios de 16.15 en disco hasta el `restart` explícito. Quien instale con
el toolchain tiene que reiniciar a mano (o saberlo).

Comprobación (`verify.sh`, `bash bin/parallel_map` sobre tipo × dimensiones, esquemas
desechables retirados; salida en `verify.tsv`):

| tipo | 2000 | 2001 | 4000 | 4001 |
|---|---|---|---|---|
| `vector` HNSW | acepta | rehúsa (máx. 2000) | rehúsa | rehúsa |
| `halfvec` HNSW | acepta | acepta | acepta | rehúsa (máx. 4000) |

`halfvec` ocupa la mitad: 4 004 bytes a 2000 dimensiones contra 8 004 de `vector`.
`hnsw.iterative_scan` existe (`off` por defecto); sólo se ve una vez cargada la
biblioteca en la sesión, y `LOAD 'vector'` le está vedado al rol de pruebas.

Métrica: aceptación de la sentencia, `pg_column_size`, `SHOW`. Ciega a: recall y
latencia a volumen real, que siguen esperando el corpus y el modelo de D5.
