# Fuente de verdad — ítem I2: fetcher de una capa OCI por la primitiva

Tarea: TASK-THYROX-0729. Contrato ya commiteado: `ArtifactFetcher` y `FetchOutcome` en
`src/packages/local-models/modelArtifactCache.ts`; `PinnedModelArtifact` en
`src/packages/model-artifacts/modelArtifactResolver.ts`. No los cambies.

## Qué existe y se extiende

- `src/packages/artifact-registry/`: `ociArtifactRegistry.ts` (push, resolve, inspect —verifica el manifest
  contra su digest—, pull de TODAS las capas), `ociDistribution.ts` (`getBlob`), `jobEgress.ts`
  (salida declarada por `.env`), `podmanJobVerifier.ts` (el molde del trabajo), `publishCommand.ts`
  (`registryBaseUrl`), `dockerHubArtifactRegistry.ts` (`dockerHubRepository`).

## Lo que construye este ítem

1. `ArtifactRegistry.pullLayer(pinned, layerDigest, destination)` en el puerto y en el adapter OCI: inspecciona
   el manifest fijado (verificado por su digest), exige que `layerDigest` sea una de sus capas, baja SÓLO esa
   capa a `destination` y verifica su sha256. Un artefacto de modelo trae también logs: no se bajan.
2. `src/packages/artifact-registry/bin/fetchLayer.ts`: entrada del trabajo (sin shebang). Argumentos
   `--registry --repository --manifest-digest --layer-digest --destination --report`; lectura anónima; escribe
   el resultado del puerto en `--report`.
3. `src/packages/local-models/podmanArtifactFetcher.ts`: implementa `ArtifactFetcher` corriendo `fetchLayer.ts`
   como trabajo de la primitiva: imagen resuelta, `bun` ro, repo ro, el DIRECTORIO de `destination` montado rw
   (el trabajo escribe el parcial; publicar y verificar es de `materializeArtifact`), salida de red de
   `resolveJobEgress` (`host` + proxy si lo hay), ningún secreto. El ejecutor se inyecta. Un límite del provider
   se devuelve como `failed` con su causa, nunca como contenido.
   `local-models/package.json` declara `@thyrox/artifact-registry`.

## Pruebas obligatorias

- `pullLayer` con el registry falso (`artifact-registry/testing/fakeOciRegistry.ts`): baja sólo la capa pedida
  (cuenta los GET de blobs), rehúsa una capa ajena al manifest, `integrity_error` con un blob corrupto y sin
  dejar el destino;
- `PodmanArtifactFetcher` con ejecutor inyectado: argv sin secretos, red/entorno según la salida declarada, y
  `failed` si el trabajo no deja reporte;
- un caso contra Podman real con el registry falso en el loopback (como `podmanJobVerifier.test.ts`), que se
  salta diciéndolo si falta la imagen.
