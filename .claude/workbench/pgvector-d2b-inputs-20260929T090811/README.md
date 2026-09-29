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

## PGDG, medido después (índice `noble-pgdg/main/binary-amd64/Packages.gz`)

- `postgresql-16-pgvector`: `0.8.5-1.pgdg24.04+1`, `0.8.6-1.pgdg24.04+1`, `0.8.6-1.pgdg24.04+2`.
- `0.8.6-1.pgdg24.04+2` declara `Depends: postgresql-16, libc6 (>= 2.38)`, sin versión
  mínima del servidor; aquí corre `postgresql-16 16.13-0ubuntu0.24.04.1`.
- Por tanto hay una ≥0.8 empaquetada sin compilar. Ciego a: si añadir el repositorio
  PGDG arrastra además un `postgresql-16` más nuevo en la próxima actualización (depende
  de la prioridad de apt, no del índice), y a la conducta de la extensión instalada.

## Orden acordado con el ejecutor (2026-09-29)

D2b sigue abierto hasta que D5 fije: entidades, volumen inicial y crecimiento, modelo,
dimensionalidad, denso frente a disperso, necesidad de `halfvec`, patrón de escritura,
`top_k`, objetivo de recall y latencia, y presupuesto de memoria y almacenamiento.
Después se mide exacto frente a HNSW frente a IVFFlat con un corpus representativo.
Preferencia: paquete (PGDG) sobre compilación; compilar sólo si D5 exige algo que no
esté empaquetado. 0.6.0 basta para un primer corte con embeddings densos.
