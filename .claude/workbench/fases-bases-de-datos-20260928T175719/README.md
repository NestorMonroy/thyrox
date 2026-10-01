# Capa de datos multi-motor: censo y referencias para el plan por fases

Banco en curso. Reúne lo medido para partir en fases el paso de los stores de
thyrox a un contrato común sobre `Bun.SQL` (SQLite y PostgreSQL+pgvector;
MySQL después).

| Archivo | Qué mide |
|---|---|
| `censo-stores.txt` | archivos de producción que abren `bun:sqlite`, `Bun.SQL` o `sqlite3` de Python |
| `inventario-esquemas.txt` | tablas declaradas por cada store |
| `bin-relacionados.txt` | envoltorios de `bin/` que tocan stores |
| `binary-info.txt`, `binary-literal-*.txt` | el ejecutable 2.1.283 con `bin/binary`: 0 de 2138 chunks nombran `bun:sqlite`, `postgres://`, `sqlite://`, `better-sqlite3`, `CREATE TABLE` o `pgvector` |
| `binary-symbol-*.txt`, `binary-references-*.txt` | quién crea `cc-socks/<pid>.sock` (`W1o`) |
| `censo-tencentdb*.txt`, `cuenta-patron.sh` | TencentDB-Agent-Memory `29bb8df`: archivos por motor, con GNU Parallel |
| `pgvector-readme-secciones.txt` | secciones del README de pgvector `7db2345` |
| `litellm-prisma.txt` | vacío: la copia de litellm sólo trae `proxy_server.py` |

Los análisis con juicio (`analisis-*.md`) se añaden al terminar cada lectura.

*Métrica:* archivos versionados que nombran cada patrón (`git grep -liE`).
*Ciega a:* un store que abra la base por otro nombre (un envoltorio propio).
