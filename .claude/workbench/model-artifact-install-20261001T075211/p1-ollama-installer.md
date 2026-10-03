# Fuente de verdad — ítem I1: adapter instalador de Ollama

Tarea: TASK-THYROX-0729. Gobierna: ADR-THYROX-007 1.7.x (el adapter traduce, no
decide) y H-THYROX-304. Contrato ya commiteado: `src/packages/local-models/modelInstaller.ts`
(`ModelInstaller`, `InstalledModelState`, `ModelInstallRequest`, `InstallOutcome`). No lo cambies.

## Qué existe y se extiende (no se duplica)

- `src/packages/local-models/ollamaApi.ts` — `OllamaApi` (`/api/tags`, `/api/show`, `/api/copy`, `/api/chat`).
- `src/packages/local-models/volumeBlobs.ts` — `modelBlobOfModelfile(modelfile)` saca el blob del `FROM` del Modelfile.
- Medido (sonda `model-quantization-pipeline-20260930T224613/probes/llama_cpp_kquant_pipeline.sh:48`): un GGUF
  entra a Ollama con `POST /api/blobs/sha256:<hex>` (cuerpo: el archivo) y
  `POST /api/create {"model": <nombre>, "files": {"model.gguf": "sha256:<hex>"}, "stream": false}`.

## Lo que construye este ítem

1. `OllamaApi` gana, sin romper lo existente: `hasBlob(sha256)` (`HEAD /api/blobs/sha256:<hex>`: 200 → sí, 404 → no),
   `pushBlob(sha256, path)` (cuerpo `Bun.file(path)`, nunca un stream: un PUT/POST en flujo se medió colgado,
   H-THYROX-303), `createModel(name, sha256)`. Y `modelDetails` sobre un nombre ausente debe distinguirse:
   un 404 de `/api/show` es «no instalado», cualquier otro error es error.
2. `installModelIntoOllama(api, request)`: sube el blob sólo si `hasBlob` es falso, crea el modelo con el nombre
   contractual. Es la lógica que corre DENTRO del trabajo.
3. `src/packages/local-models/bin/installModel.ts`: entrada del trabajo (sin shebang: no es un comando del anfitrión).
   Argumentos `--ollama-url --name --artifact --sha256 --report`; escribe `{status, reason?}` en `--report`.
4. `src/packages/local-models/ollamaModelInstaller.ts`: `OllamaModelInstaller` implementa `ModelInstaller`.
   - `inspect(name)`: `/api/show` → blob del `FROM` → `{ name, contentSha256 }`; ausente → `undefined`.
   - `install(request)`: corre `installModel.ts` como trabajo de la primitiva (molde: `artifact-registry/podmanJobVerifier.ts`):
     imagen resuelta, `bun` ro, repo ro en `/w`, el GGUF montado ro, montaje de trabajo rw para el reporte,
     red `host` (Ollama escucha en el loopback del anfitrión), ningún secreto. El ejecutor del trabajo se inyecta.
   - **Después de instalar, vuelve a `inspect` y sólo devuelve `installed` si el contenido es el pedido.** Que
     `/api/create` responda 200 no es éxito.
   - La URL de Ollama sale de `managedOllama.ts` (el entorno declarado), nunca de un literal.

## Pruebas obligatorias

- fake de Ollama (`Bun.serve`) para `hasBlob`/`pushBlob`/`createModel`/`modelDetails` 404 vs 500;
- `installModelIntoOllama` no resube un blob presente (cuenta los POST a `/api/blobs`);
- `OllamaModelInstaller.install` con el ejecutor inyectado en proceso: devuelve `failed` si tras instalar el
  runtime resuelve otro contenido, `installed` sólo si coincide; un trabajo sin reporte es `failed`;
- un caso contra Podman real que se salta (diciéndolo) si falta la imagen `THYROX_ARTIFACT_VERIFIER_IMAGE`
  (o `docker.io/library/ubuntu:24.04`).
