# Fuente de verdad — ítem I3: el reconciliador `ensureModel` y sus hogares

Tarea: TASK-THYROX-0729. Contratos ya commiteados: `ModelArtifactResolver`, `ArtifactLocationIndex`
(`model-artifacts/modelArtifactResolver.ts`), `materializeArtifact`/`ArtifactFetcher`
(`local-models/modelArtifactCache.ts`), `ModelInstaller` (`local-models/modelInstaller.ts`). No los cambies.
Los adapters concretos los construyen otros ítems a la vez: aquí todo se prueba con fakes del puerto.

## Lo que construye este ítem

1. `src/packages/local-models/ensureModel.ts`: `ensureModel(name, deps)` — un reconciliador idempotente, no
   `download()+install()`. Pregunta que responde: ¿puedo dejar disponible este modelo concreto en este
   runtime? No decide GPU, instancia, residencia ni endpoint (eso es de TASK-THYROX-0703).
   Transiciones:
   - nombre fuera del catálogo → `not_declared`;
   - el resolver no encuentra distribución → `not_materializable`;
   - `materializeArtifact` (caché correcta → sin descarga; ausente o con otro contenido → descarga y verifica);
   - `installer.inspect(name)`: ausente → instalar; otro contenido → reinstalar; contenido correcto → no-op;
   - tras instalar, vuelve a inspeccionar.
   **READY** sólo si `catálogo.sha256 == sha256 del GGUF materializado == contenido que el runtime resuelve
   para el nombre`. Devuelve la evidencia (los tres digests) y si hubo descarga e instalación (booleanos
   medidos, no inferidos). Fallo de descarga o instalación → `failed` con su etapa, nunca READY.
2. Hogares: `model-artifacts/localModelHome.ts` gana `artifactCache` (`THYROX_MODEL_ARTIFACT_CACHE_DIR`,
   por defecto `.thyrox/models/artifacts`) y `artifactLocations` (`THYROX_MODEL_ARTIFACT_LOCATIONS`, por defecto
   `.thyrox/models/artifact-locations.json`). La clave `_DIR` es un hogar: se registra en
   `src/paths/declarations.py` (`HOMES`) y ambas se declaran en `.env.example` junto a `THYROX_MODEL_CATALOG`.
   Corre `python3 tests/paths/test_ensure_homes.py` (el registro decide cada clave del contrato).
3. `local-models-catalog locate --publication <publication.json>`: lee el registro que escribe
   `bin/artifact-registry-publish-artifact` (sólo si `status == verified`) y añade al índice de ubicaciones una
   entrada por cada archivo `.gguf` (contenido = su sha256, manifest = el digest de `reference`). En
   `catalogCommand.ts`, con su prueba en `__tests__/commands.test.ts` o una suite propia.

## Pruebas obligatorias de `ensureModel` (las diez)

1. sin distribución → `not_materializable`; 2. caché vacía → una descarga, verifica, instala, READY;
3. caché correcta → 0 descargas; 4. caché con otro contenido → no se usa, se reconstruye;
5. runtime vacío → instala; 6. runtime correcto → 0 instalaciones; 7. mismo nombre con otro contenido → no READY
sin reinstalar, reinstala; 8. fallo de descarga → sin caché parcial válida, `failed`; 9. fallo de instalación
→ `failed`, nunca READY; 10. segunda llamada → 0 descargas, 0 instalaciones, READY con la misma evidencia.
Más: un instalador que dice `installed` pero sirve otro contenido → no READY.
