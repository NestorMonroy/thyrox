# Entradas medidas de D2b (pgvector) — sin decisión

Sondas de solo lectura, `bash bin/parallel_map "bash probe.sh {} ..." ::: <5 sondas>`,
salida en `results.tsv`. La decisión 0.6.0 frente a ≥0.7/0.8.x sigue esperando a D5.

- Disponible por apt: sólo `0.6.0-1` (archive.ubuntu.com).
- Instalado en `thyrox_test`: el tipo `vector`; índices `hnsw` e `ivfflat` con
  `vector_l2_ops`, `vector_ip_ops` y `vector_cosine_ops`. Sin `halfvec` ni `sparsevec`.
  El tipo `bit` que aparece es el nativo de PostgreSQL, no de pgvector.
- Compilar ≥0.7 aquí: gcc, make, pg_config y pgxs presentes; faltan las cabeceras
  del servidor (`postgres.h`), o sea `postgresql-server-dev-16`.
- Última etiqueta upstream: `v0.8.6` (`git ls-remote`).
- El repositorio PGDG responde (HTTP 200): otra fuente empaquetada posible; qué
  versión ofrece para PostgreSQL 16 no está medido.

Ciego a: rendimiento, recall y memoria de cada índice; eso exige el volumen y la
dimensionalidad de D5. Las variables `hnsw.*`/`ivfflat.*` no salen porque la
biblioteca no estaba cargada en la sesión de la sonda.
