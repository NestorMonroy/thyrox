# TASK-THYROX-0562 — SemanticSearchStore sobre PostgreSQL + pgvector

Decisión y mediciones: `README.md` de este banco (léelo completo). Contrato:
ADR-THYROX-008 en kaupamex-docs,
`source/thyrox/adr/adr-008-semantic-search-store-sobre-postgresql-y-pgvector.rst`
(léelo completo: reglas 1-4, superficie y flujo de búsqueda).

## Reglas que no se negocian

- PostgreSQL es un servicio **externo y persistente**. El store recibe una URL
  (`THYROX_SEMANTIC_SEARCH_DATABASE_URL`, declarada en `.env.example` y
  probada) y no sabe si detrás hay este contenedor, una máquina persistente o
  un servicio gestionado. Ninguna ruta, socket, puerto ni nombre de este
  contenedor en el código.
- El store **no crea** la extensión `vector`: no es confiable (medido:
  `trusted = f`) y la habilita la infraestructura. `migrateVectorSchema`
  comprueba que exista en la versión mínima declarada (constante con nombre;
  0.8.x cubre `binary_quantize` y `bit_hamming_ops`) y, si falta o es menor,
  rehúsa con un error que nombra la extensión, la versión encontrada y el paso
  del administrador (`CREATE EXTENSION vector`). Sí migra sus propias tablas e
  índices con el rol de aplicación, con `runMigrations` de `@thyrox/store`.
- Sin URL, con una URL `sqlite:`/`file:`, o con un servidor sin la extensión:
  rehúsa nombrando lo que falta. Nunca degrada a SQLite ni a búsqueda lineal
  (ADR-008, regla 3).
- La dimensión del embedding es un parámetro del esquema (el modelo lo decide
  D5, no está tomado): el store la recibe al migrar y rechaza un vector de otra
  dimensión con un error que nombra las dos.
- Nada de ciclo de vida de contenedor ni de worker: el store abre, migra,
  lee y escribe; no arranca ni detiene servidores.

## Qué se pide (TDD)

Un paquete nuevo `src/packages/semantic-search` (`@thyrox/semantic-search`),
declarado como los demás del workspace (lee uno pequeño, p. ej.
`src/packages/shared-state`, y replica su `package.json`, tsconfigs y
enlace), con:

1. `SemanticSearchStore` y su fábrica `openSemanticSearchStore({ url,
   dimensions })`, sobre `openByUrl` de `@thyrox/store`.
2. La superficie de ADR-008: `migrateVectorSchema`, `upsertEmbedding(id,
   embedding, metadata)`, `getEmbedding(id)`, `searchBinaryCandidates(query,
   limit)` (distancia de Hamming sobre `binary_quantize`, con índice HNSW
   `bit_hamming_ops`) y `searchNearest(query, k, { candidates })`: candidatos
   binarios y reranking matemático por distancia coseno exacta sobre el
   embedding original (el reranking por modelo NO es del store).
3. Pruebas unitarias de la validación (dimensión, URL, versión) sin base.
4. Pruebas de integración contra `THYROX_TEST_POSTGRES_URL` con
   `withDisposableSchema` de `@thyrox/store/testing`: la extensión ya está
   habilitada por el administrador en la base de pruebas (vive en `public`);
   el esquema desechable de cada prueba debe resolver el tipo `vector`. Sin
   la URL, las de integración se omiten diciendo por qué (no dan verde en
   silencio).

## Controles

- Integración: upsert y get devuelven el mismo vector; `searchNearest` ordena
  por coseno exacto y devuelve los K más cercanos de un conjunto conocido;
  `searchBinaryCandidates` usa el índice (se comprueba con `EXPLAIN`).
- Rechazos: sin extensión (un esquema/base donde no existe, o un doble que la
  niegue) → error que nombra `CREATE EXTENSION vector`; dimensión distinta →
  error con las dos dimensiones; URL `sqlite:` → rehúsa.
- Anulación, con números: retirar el reranking exacto hace caer exactamente
  el caso de orden por coseno; retirar la comprobación de la extensión hace
  caer exactamente su rechazo.
