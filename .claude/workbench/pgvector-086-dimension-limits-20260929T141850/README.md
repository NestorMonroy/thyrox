# Límites de dimensión de pgvector 0.8.6, medidos en este servidor

pgvector 0.8.6 compilado contra PostgreSQL 16.15 de Ubuntu (`extversion|0.8.6`). `run.sh` crea
una base desechable, corre `probe.sql` y la retira al salir (comprobado: 0 bases
`thyrox_pgvector_limits_*` después). Cada caso crea un índice sobre una columna vacía y registra
`ok` o el mensaje de error del servidor. Salida literal en `results.tsv`.

| Tipo indexado | Índice | Límite medido | Uno por encima |
|---|---|---:|---|
| `vector` (float32) | HNSW | 2000 | `cannot have more than 2000 dimensions for hnsw index` |
| `halfvec` (float16) | HNSW | 4000 | `cannot have more than 4000 dimensions for hnsw index` |
| `bit` | HNSW | 64 000 | `cannot have more than 64000 dimensions for hnsw index` |
| `bit` | IVFFlat | 64 000 | `cannot have more than 64000 dimensions for ivfflat index` |

**La consecuencia para `semantic_search` (ADR-THYROX-008):** un embedding de 3072 dimensiones
almacenado como `vector(3072)` no admite un índice HNSW directo (`cannot have more than 2000
dimensions`). Sí admite dos índices de expresión sobre la misma columna:

- `hnsw ((binary_quantize(e)::bit(3072)) bit_hamming_ops)` — primer filtro barato por Hamming;
  los candidatos se reordenan después con la distancia exacta sobre el `vector` original;
- `hnsw ((e::halfvec(3072)) halfvec_l2_ops)` — la mitad de memoria por componente, sin pasar a bits.

`bit` no implica cuantización: una columna `bit(N)` guarda un vector binario de origen, y
`binary_quantize()` produce ese tipo a partir de un `vector` o `halfvec`. Los límites de la tabla
no son novedad de 0.8.6: este banco mide la versión instalada, no en qué versión apareció cada uno.

*Métrica:* aceptación o rechazo de `CREATE INDEX` por el servidor, sobre columnas vacías.
*Ciega a:* memoria, tiempo de construcción y recall de cada índice con datos reales (exige el
corpus de D5); `sparsevec` y su límite de elementos no nulos, no medidos; y el reordenamiento en
sí, cuya consulta no se ejecutó aquí.
