# TASK-THYROX-0562 — SemanticSearchStore sobre PostgreSQL + pgvector

## La tarea (store, fila 319 de la sesión efec8688; cita durable TASK-THYROX-0562)

> «Implementar el store de dominio vectorial que ADR-008 fija: superficie
> (upsertEmbedding, searchNearest, searchBinaryCandidates, getEmbedding,
> migrateVectorSchema) sobre la infraestructura PostgreSQL de @thyrox/store;
> rehúsa sin PostgreSQL + pgvector; reranking matemático en el store. Depende
> de D5 (modelo/dimensiones) y D2b (versión pgvector).»

Cómo se resuelven aquí sus dos dependencias:

- **D5 (modelo/dimensiones) no está decidido**: el store NO fija ninguna
  dimensión ni representación. Ambas son configuración del esquema, decidida
  al crear o migrar el índice.
- **D2b (versión de pgvector)**: el store declara una versión MÍNIMA como
  constante con nombre, justificada por las capacidades que usa
  (`binary_quantize`, `bit_hamming_ops`, `halfvec`), y la comprueba. Se mide
  aquí 0.8.6; la mínima no se iguala a lo instalado sin razón.

Léelo junto con: `README.md` de este banco (decisión y correcciones del
ejecutor) y ADR-THYROX-008 en kaupamex-docs,
`source/thyrox/adr/adr-008-semantic-search-store-sobre-postgresql-y-pgvector.rst`
(reglas 1-4, superficie y flujo de búsqueda).

## Reglas

- **PostgreSQL es externo y persistente.** El único contrato de conexión es
  una URL: `THYROX_SEMANTIC_SEARCH_DATABASE_URL` en uso real (declarada en
  `.env.example` y probada) y `THYROX_TEST_POSTGRES_URL` en las pruebas.
  Ninguna ruta, socket, puerto, nombre de clúster ni supuesto de «mismo
  contenedor» en código ni en pruebas: la suite tiene que poder apuntar a
  otro PostgreSQL sin cambiar una línea.
- **El store no administra la extensión.** `migrateVectorSchema` NO ejecuta
  `CREATE EXTENSION`. Hace, en orden: (1) comprobar si `vector` está
  disponible en el servidor (`pg_available_extensions`); (2) si está
  habilitada en la base (`pg_extension`); (3) su versión efectiva contra la
  mínima; (4) sólo entonces migra lo suyo. Tres errores distintos, cada uno
  con su clase o código y la condición detectada, sin prescribir un único
  remedio (en un servicio gestionado la habilitación puede ser otra):
  - no disponible en el servidor → error de infraestructura;
  - disponible pero no habilitada en la base → error de provisioning;
  - habilitada con versión menor que la mínima → error de versión, con las
    dos versiones.
- **La representación es del store.** La configuración del esquema declara
  dimensión y representación (`vector(N)`, `halfvec(N)`) y el índice binario
  (`binary_quantize(...)::bit(N)` con HNSW `bit_hamming_ops`); el worker no
  ve ninguna. Un vector de otra dimensión se rechaza nombrando las dos.
- **Nunca degrada**: sin URL, con URL `sqlite:`/`file:` o sin la extensión,
  rehúsa; no cae a SQLite ni a búsqueda lineal (ADR-008, regla 3).
- **Sin ciclo de vida de servidor ni de worker**: abre, migra, lee, escribe.
- `@thyrox/store` aporta conexión y migraciones comunes (`openByUrl`,
  `runMigrations`, `withDisposableSchema`); el SQL vectorial vive sólo en el
  paquete nuevo.

## Qué se pide (TDD)

Paquete nuevo `src/packages/semantic-search` (`@thyrox/semantic-search`),
declarado como los demás del workspace (replica uno pequeño, p. ej.
`src/packages/shared-state`: `package.json`, tsconfigs, enlace), con
`openSemanticSearchStore({ url, schema })` y la superficie de ADR-008:
`migrateVectorSchema`, `upsertEmbedding(id, embedding, metadata)`,
`getEmbedding(id)`, `searchBinaryCandidates(query, limit)` y
`searchNearest(query, k, { candidates })` (candidatos binarios + reranking
matemático por coseno exacto; el reranking por modelo NO es del store).

## Controles (del ejecutor), cada uno una prueba

| Caso | Esperado |
|---|---|
| pgvector ausente (servidor o base) | rechazo claro, el estado correcto de los tres |
| pgvector habilitado con versión insuficiente | rechazo claro con las dos versiones (con un doble de la consulta de versión: no se degrada el servidor real) |
| pgvector compatible | migraciones correctas: tablas, columna, índices |
| segunda ejecución de las migraciones | idempotente |
| cambio de host/URL | el mismo `SemanticSearchStore` sobre otra URL, sin cambiar código (dos URLs distintas hacia la base de pruebas, p. ej. `127.0.0.1` y `localhost`, o otro esquema) |
| worker eliminado y recreado | los datos siguen: cerrar el store, abrir uno nuevo con la misma URL y leer lo escrito |
| búsqueda | `searchNearest` ordena por coseno exacto en un conjunto conocido; `searchBinaryCandidates` usa el índice (`EXPLAIN`) |

Integración contra `THYROX_TEST_POSTGRES_URL` con `withDisposableSchema`; la
extensión ya está habilitada en la base de pruebas. Sin la URL, las de
integración se omiten diciendo por qué.

Anulación, con números: sin el reranking exacto cae exactamente el caso de
orden por coseno; sin la comprobación de versión cae exactamente su rechazo.
