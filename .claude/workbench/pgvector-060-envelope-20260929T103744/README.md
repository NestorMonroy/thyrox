# Límites de pgvector 0.6.0 por dimensionalidad — entrada de D2b independiente de D5

`bash bin/parallel_map "bash probe.sh {}" ::: 384 768 1024 1536 2000 2001 3072 4096 16000 16001`,
contra la base de pruebas (`THYROX_TEST_POSTGRES_URL`), un esquema desechable por ítem
(retirados: 0 esquemas `env060_*` quedan). Extensión medida: `vector` 0.6.0,
`maintenance_work_mem` = 64MB. Salida en `results.tsv`. APT y toolchain intactos.

| dims | bytes por vector | HNSW (coseno) | IVFFlat (coseno, lists=10) |
|---|---|---|---|
| 384 | 1 544 | acepta | acepta |
| 768 | 3 076 | acepta | acepta |
| 1024 | 4 100 | acepta | acepta |
| 1536 | 6 148 | acepta | acepta |
| 2000 | 8 004 | acepta | rehúsa: `memory required is 77 MB, maintenance_work_mem is 64 MB` |
| 2001–16000 | 8 008 (2001) | rehúsa: `cannot have more than 2000 dimensions for hnsw index` | rehúsa: ídem para ivfflat |
| 16001 | — | el tipo mismo rehúsa: `dimensions for type vector cannot exceed 16000` | — |

Lo que esto fija para D5, sin decidirlo:

- **0.6.0 indexa hasta 2000 dimensiones**, y por encima se almacena pero sólo admite
  búsqueda exacta (barrido secuencial). Un modelo de embeddings de más de 2000
  dimensiones es el punto donde 0.6.0 deja de bastar con índice.
- Los tres fallos son **ruidosos** (error de SQL), no silenciosos.
- El fallo de IVFFlat a 2000 no es un límite de versión sino de configuración
  (`maintenance_work_mem`); se mueve con el parámetro, no con la versión.
- Almacenamiento: el fuente declara `4 * dimensions + 8` bytes por vector
  (`README.md:579` y `VECTOR_SIZE` en `src/vector.h:6` de `v0.6.0`). `pg_column_size`
  midió exactamente eso a 384 dimensiones y 4 bytes menos de 768 en adelante; que la
  diferencia venga de cómo se guarda un valor de más de ~2 KB es inferencia, no medida.
  Sin `halfvec` (0.7+) no hay forma de bajarlo a la mitad dentro de pgvector.

Métrica: aceptación o rechazo de la sentencia y `pg_column_size` de una fila.
Ciega a: recall, latencia y tamaño de índice con volumen real (200 filas aleatorias
no miden nada de eso), y a la memoria de construcción de HNSW a escala; esos
siguen esperando el corpus y el modelo que fije D5.

## Contra el fuente: 0.6.0 frente a 0.8.6

Clon de `https://github.com/pgvector/pgvector.git` en el scratchpad (no se versiona ni
se compila), leído por etiqueta con `git grep <tag>`: `v0.6.0` = `281d4fcf60`,
`v0.8.6` = `8ee86c96f0`.

| Límite | 0.6.0 | 0.8.6 |
|---|---|---|
| `VECTOR_MAX_DIM` (tipo) | 16 000 | 16 000 |
| `HNSW_MAX_DIM` / `IVFFLAT_MAX_DIM` | 2 000 | 2 000 |
| índice sobre `halfvec` | — (no existe el tipo) | `HNSW_MAX_DIM * 2` = 4 000 (`src/hnswutils.c:1399`) |
| índice sobre `bit` (cuantización binaria) | — | `HNSW_MAX_DIM * 32` = 64 000 (`src/hnswutils.c:1412`) |
| `sparsevec` | — | hasta 16 000 no nulos; HNSW hasta 1 000 (`HNSW_MAX_NNZ`) |
| búsqueda iterativa con filtros (`iterative_scan`) | — | sí (`src/hnsw.c`, `src/hnsw.h`) |

Lo que confirma y lo que añade:

- El techo de 2000 dimensiones medido es el de la constante del fuente, y **no sube en
  0.8.6 para `vector`**: lo que sube es la vía de indexar más dimensiones con `halfvec`
  (4000) o cuantización binaria (64 000). Pasar a 0.8.x sólo compra índice por encima de
  2000 si D5 acepta media precisión o cuantización.
- `iterative_scan` importa si D5 prevé búsquedas vectoriales con filtro (por capa, por
  iniciativa): en 0.6.0 un filtro restrictivo puede devolver menos de `top_k` filas.
  Esa última frase es la conducta que documenta upstream, no medida aquí.

## Decisión del ejecutor (2026-09-29): 0.8.6

Vía, por la regla acordada: compilar la etiqueta `v0.8.6` contra el PostgreSQL de
Ubuntu, no migrar a PGDG. Medido para esa vía, sin instalar nada (`apt-get -s`):

- El servidor se compiló `--with-llvm` con `CLANG=/usr/bin/clang-17`; aquí sólo hay
  `clang` 18. `postgresql-server-dev-16` trae `clang-17` y `llvm-17-dev`.
- El candidato de ese paquete es `16.15-0ubuntu0.24.04.1` y exige el mismo servidor:
  la simulación instala 23 paquetes y mueve `postgresql-16`, `postgresql-client-16` y
  `libpq5` de 16.13 a 16.15. Es una actualización menor de Ubuntu (misma fuente,
  `noble-updates`/`noble-security`), no PGDG, y reinicia el clúster al instalarse.
- 16.13 ya no está en los índices: sólo 16.2 y 16.15. No hay forma de compilar contra
  Ubuntu sin la actualización menor.

El instalador lo lleva el ítem `.claude/workbench/pgvector-086-installer-*`; la
instalación real queda para después de integrarlo.
