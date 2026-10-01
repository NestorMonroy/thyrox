# Fuente de verdad — ModelCatalog y ModelResolver (ADR-007 1.7.0)

Gobierna `kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`,
sección «Thyrox es la autoridad del model scheduling (enmiendas 1.7.0 y 1.7.1)».
Las dos piezas viven en `src/packages/model-artifacts/` (lógica pura, sin
Podman ni red; la frontera la mide `__tests__/packageBoundary.test.ts`).

El contrato compartido ya está escrito y **no se modifica en ninguno de los dos
ítems**: `src/packages/model-artifacts/catalogEntry.ts` (`ModelCatalogEntry`,
`CatalogArtifact`, `AttentionShape`, `ModelCapability`, `ArtifactFormat`).
Se reusan `thyroxModelName`/`parseThyroxModelName` (`modelName.ts`),
`normalizeQuantizationLevel` (`quantizationLevel.ts`), `readGgufMetadata`
(`ggufMetadata.ts`), `estimateServingMemory`, `estimateServingMemoryFromShape`,
`attentionShapeOf` y `KV_CACHE_BYTES_PER_ELEMENT` (`memoryEstimate.ts`, que
tampoco se modifica). No se crea otro mecanismo de nombre ni de estimación.

## catalog — TASK-THYROX-0697 (board: «Build the model catalog of declared models, variants and revisions»)

Responde qué modelos, variantes, revisiones y cuantizaciones están
declarados. No responde si alguno está residente.

Archivos: `modelCatalog.ts` (nuevo) y `__tests__/modelCatalog.test.ts`.

1. `validateCatalogEntry(value: unknown): ModelCatalogEntry` — valida cada
   campo y rehúsa con un error tipado que nombra la ruta del campo
   (`InvalidCatalogEntryError`, mismo estilo que `InvalidArtifactManifestError`).
   Reglas: `name` es exactamente `thyroxModelName({repository, quantization,
   source, revision})` (un nombre que no se deriva de sus partes se rehúsa);
   `sha256` 64 hex; `bytes`, `maxContextLength` y los tres campos de
   `attention` enteros positivos; `capabilities` sin repetidos y no vacía;
   `declaredAt` ISO 8601 UTC; `defaultKvCacheType` clave de
   `KV_CACHE_BYTES_PER_ELEMENT`.
2. `catalogEntryFromGguf(input)` — construye la entrada desde un GGUF en disco:
   lee la metadata con `readGgufMetadata`, toma `general.architecture`,
   la forma de la atención con `attentionShapeOf` (ya exportada de
   `memoryEstimate.ts`; no se reimplementa) y `<arch>.context_length`. Una
   clave ausente se rehúsa con su nombre.
3. `ModelCatalog` — colección inmutable: `entries()`, `byName(name)`,
   `variantsOf(repository)` (ordenadas por `declaredAt` y después por nombre,
   determinista), `with(entry)` que devuelve un catálogo nuevo y rehúsa un
   nombre repetido con otro contenido (idempotente si es idéntico).
4. Persistencia durable: `loadModelCatalog(path)` y `saveModelCatalog(path,
   catalog)`. JSON canónico (claves ordenadas, como el manifiesto), escritura
   atómica (archivo temporal hermano + `rename`), sólo `node:fs/promises`.
   Archivo ausente → catálogo vacío; archivo ilegible o inválido → error con
   la ruta, nunca un catálogo vacío en silencio. La ruta es parámetro del
   consumidor (DEC-04): el paquete no fija ningún hogar.

Casos mínimos: entrada válida; cada campo inválido; nombre que no se deriva;
dos variantes del mismo repositorio conviven con nombres distintos; `with`
idempotente y conflicto; ida y vuelta por disco byte a byte; archivo ausente;
archivo corrupto; GGUF sintético (`testing/syntheticGguf.ts`) → entrada.

## resolver — TASK-THYROX-0698 (board: «Resolve a model request to an exact artifact and memory profile»)

Responde qué artefacto exacto satisface una petición: revisión, formato,
cuantización y perfil de memoria. No responde dónde se ejecuta.

Archivos: `modelResolver.ts` (nuevo) y `__tests__/modelResolver.test.ts`.
El perfil de memoria sale de `estimateServingMemoryFromShape` (ya exportada
de `memoryEstimate.ts`, con la forma que guarda la entrada); no se
reimplementa.

1. `ModelExecutionRequest`: `model` (un nombre contractual exacto, o
   `{ repository, quantization?, revision? }`), `contextLength?`,
   `kvCacheType?`, `requiredCapabilities?`.
2. `resolveModel(request, entries: readonly ModelCatalogEntry[]):
   ResolvedModel` — pura, sin E/S. Devuelve la entrada elegida, su
   `CatalogArtifact`, el `contextLength` efectivo (el pedido, o
   `maxContextLength` si no se pidió), el `kvCacheType` efectivo y el perfil
   de memoria (`weightsBytes`, `kvCacheBytes`, `bufferBytes`, `totalBytes`).
3. Selección determinista: nombre exacto → esa entrada o
   `ModelNotDeclaredError`. Por repositorio: filtra por cuantización y por
   prefijo de revisión si se dan; filtra por capacidades; si quedan varias,
   **rehúsa** con `AmbiguousModelRequestError` que lista los nombres
   candidatos — el resolver no elige por preferencia propia (M5: ninguna capa
   cambia la cuantización en silencio).
4. Rechazos tipados: capacidad ausente (`MissingCapabilityError` con la
   capacidad), `contextLength` mayor que `maxContextLength`
   (`ContextLengthExceededError` con los dos números), revisión o
   cuantización sin coincidencia (`ModelNotDeclaredError` con lo pedido).

Casos mínimos: nombre exacto; repositorio con una variante; ambiguo con dos;
filtro por cuantización y por prefijo de revisión; capacidad ausente;
contexto excedido; contexto por defecto; el perfil coincide con
`estimateServingMemory` sobre la metadata equivalente (misma cifra).

## Para los dos

Pruebas `bun test` desde `src/packages/model-artifacts`. Controles de
anulación por cada rama nueva, con números. `bash bin/check_package_typecheck
--strict model-artifacts` en cero.
