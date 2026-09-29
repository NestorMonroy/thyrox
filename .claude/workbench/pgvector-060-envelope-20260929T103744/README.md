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
| 2001–16000 | 4·d + 4 | rehúsa: `cannot have more than 2000 dimensions for hnsw index` | rehúsa: ídem para ivfflat |
| 16001 | — | el tipo mismo rehúsa: `dimensions for type vector cannot exceed 16000` | — |

Lo que esto fija para D5, sin decidirlo:

- **0.6.0 indexa hasta 2000 dimensiones**, y por encima se almacena pero sólo admite
  búsqueda exacta (barrido secuencial). Un modelo de embeddings de más de 2000
  dimensiones es el punto donde 0.6.0 deja de bastar con índice.
- Los tres fallos son **ruidosos** (error de SQL), no silenciosos.
- El fallo de IVFFlat a 2000 no es un límite de versión sino de configuración
  (`maintenance_work_mem`); se mueve con el parámetro, no con la versión.
- Almacenamiento: `4·d + 4` bytes por vector en `float4`; sin `halfvec` (0.7+) no hay
  forma de bajarlo a la mitad dentro de pgvector.

Métrica: aceptación o rechazo de la sentencia y `pg_column_size` de una fila.
Ciega a: recall, latencia y tamaño de índice con volumen real (200 filas aleatorias
no miden nada de eso), y a la memoria de construcción de HNSW a escala; esos
siguen esperando el corpus y el modelo que fije D5.
