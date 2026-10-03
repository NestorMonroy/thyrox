# runtime-distribution-classification

## El encargo

Corrección del ejecutor (2026-10-03): una imagen necesaria para ejecutar Thyrox
puede formar parte de su distribución aunque sus bytes sean upstream.
**ownership ≠ distribution.** Objetivo: que una instalación nueva materialice
por adelantado todo el runtime requerido, reutilizando la caché local por
identidad (digest) y sin reconstruir. No se publica ni se borra nada hasta
cerrar esta clasificación. Las categorías de abajo son de **análisis**, no
enums.

## Fuentes (MEDIDO; ninguna consulta nueva a Podman)

- Imágenes locales y digests: censo `container-image-distribution-20261002T234933/outputs/census/census.json`.
- Igualdad local = Hub: mismo banco, `report.md` §2 (ollama y pgvector iguales; redis = digest de plataforma del tag).
- Bytes comprimidos declarados: `src/lib/infrastructure.sh` (`_INFRASTRUCTURE_*_COMPRESSED_BYTES`).
- Candidata del cuantizador de hoy: `publish-quantizer-image-20261003T005015/outputs/build-result.json`.

## Matriz 1 — recurso

| Recurso | Fuente | Identidad local | Ownership | Distribución (análisis) | Ciclo de vida | Lo requiere | Caché local hoy | Registro hoy | Decisión |
|---|---|---|---|---|---|---|---|---|---|
| Ollama runtime | `docker.io/ollama/ollama:0.35.0` | `c178b43788bb`, repoDigest `sha256:2a6e883b917f…` (= Hub) | upstream | UPSTREAM_DIRECT → candidata UPSTREAM_MIRRORED | infraestructura | `infrastructure.sh:125`, `hostCoordinatorComposition.ts:47` | `image exists <tag>`: reutiliza por **tag** | pull del upstream por tag | cache-first REUSE; fijar digest EXTEND (TASK-THYROX-0756); espejo EXTEND ImageRegistry |
| Redis | `docker.io/library/redis:7.4` | `64035c2c9726`, `sha256:95acc00495dd…` (digest de plataforma) | upstream | igual que Ollama | infraestructura | `infrastructure.sh:124` | por tag | por tag | igual; el espejo debe fijar el **índice** o declarar la plataforma |
| PostgreSQL + pgvector | `docker.io/pgvector/pgvector:0.8.0-pg16` | `56a5b20c7a15`, `sha256:a132765ec351…` (= Hub) | upstream | igual que Ollama | infraestructura | `infrastructure.sh:123` | por tag | por tag | igual |
| Ubuntu base | `docker.io/library/ubuntu:24.04` | `6232b3879100`, `sha256:008173c23f95…` | upstream | entrada de build, no runtime | — | `FROM` del cuantizador y del task-runner | por tag | por tag | fijar digest en los Containerfile; no espejo propio salvo instalación sin red |
| thyrox-task-runner | build de Thyrox | publicada `sha256:1cced65c16b4…`; `:dev` `26af4d189984` | Thyrox | THYROX_NATIVE (publicada) | permanent / `:dev` cache | `DEFAULT_EXECUTION_IMAGE` (`executionCommand.ts:25`) = `:dev` | `:dev` local, no obtenible de la distribución | `th3rox/thyrox-task-runner` por digest | REUSE publicación; apuntar el default al digest EXTEND (H-THYROX-424) |
| thyrox-model-quantizer | build de Thyrox (catálogo declarado, TASK-THYROX-0912) | candidata `245ae25cd5be` (permanent, def. `81e5a993a`); `:dev` `b3014db2b8f6` (cache) | Thyrox | THYROX_NATIVE (sin publicar) | permanent | `DEFAULT_LAB_IMAGE` (`labCommandOptions.ts:4`), validación del import | `:dev` local | ninguno | publicar por ImageRegistry: falta ruta declarada (no bloquea) |
| thyrox-transformers-runtime | build de Thyrox | **ausente** | Thyrox | THYROX_NATIVE | — | `hostCoordinatorComposition.ts:49` | — | ninguno | SEARCH_INCOMPLETE: sin construir ni catálogo declarado |
| capas intermedias (31) | builds locales | `uniqueBytes = 0` | Thyrox | 2 BUILD_CACHE_CANDIDATE (`b78504eefd22`, `efc2db794f6d`), resto no distribuible | — | ninguno | — | — | no se publican; ninguna se promueve sin identidad reproducible |

## Matriz 2 — cierre por componente (nombres de perfil NO inventados)

| Componente | Imágenes | Artefactos de modelo | Descarga en frío (comprimido) | En caliente | Mecanismo que falta |
|---|---|---|---|---|---|
| ejecución gestionada | task-runner | — | 143 374 705 | 0 sólo si el default apunta al digest publicado | default por digest |
| infraestructura gestionada | pgvector, redis, ollama | — | 156 322 638 + 43 594 077 + 3 750 477 083 = 3 950 393 798 | 0 por tag (no por digest) | identidad por digest; espejo |
| búsqueda semántica local | pgvector, ollama | nomic-embed-text-v1.5 (274 290 560) | 3 906 799 721 + 274 290 560 | 0 (todo presente) | ruta de embeddings (TASK-THYROX-0904) |
| IA local (generalista) | ollama | qwen3-4b Q4_K_M (2 497 280 480) | 3 750 477 083 + 2 497 280 480 | 0 | prepare sin copia triple (H-THYROX-432) |
| construcción de modelos | quantizer (+ ubuntu en build) | — | sin publicar: hoy se reconstruye | `:dev` local | publicación y ruta declarada |

## Search Existing (cierre de instalación)

| Pieza | Autoridad | Decisión |
|---|---|---|
| ensure cache-first de infraestructura | `infrastructure_ensure.sh:112-129` (`image exists` + `disk-admit` antes del pull) | REUSE; EXTEND a digest |
| ensure de imágenes permanentes por digest | `image-registry/imageResolver.ts` (presente con su digest → reutiliza; si no, pull por digest) | REUSE; **sin consumidor productivo** (TASK-THYROX-0726) |
| ensure de artefactos de modelo | `bin/local-models-ensure`, `.thyrox/models/artifact-locations.json` | REUSE (dominio separado: los pesos no van dentro de la imagen) |
| espejo upstream con bytes idénticos | ImageRegistry: la promoción exige `permanent` y añadir la etiqueta cambia el digest | EXTEND ImageRegistry (decidido; sin `MirrorRegistry`) |
| manifiesto de release / cierre por perfil | ADR-010 (modo external|managed); `packaging-reachability` cubre **código** por entrypoint, no imágenes ni modelos; `install.sh` no toca imágenes (0 coincidencias) | **MISSING** como dato; dueño: Empaquetado P12 (TASK-THYROX-0676) → EXTEND |
| precarga completa | — | MISSING (consecuencia del manifiesto) |
| bundle sin red (OCI layout) | — | MISSING; DEFERRED |

## Estado

Clasificación cerrada salvo transformers-runtime (SEARCH_INCOMPLETE). Ningún
push ni borrado. Lo que sigue es del dueño P12: el manifiesto de imágenes +
artefactos por componente, con `ensure` por digest.

*Métrica:* censo del 2026-10-02 y constantes declaradas en código.
*Ciega a:* el tamaño comprimido real del cuantizador y del task-runner `:dev`
(no publicados), y cualquier cambio del almacén de Podman desde el censo.

## Caché explícita en el registro configurado (aclaración del ejecutor, 2026-10-03)

Dos cachés distintas, con ciclo de vida y semántica distintos:

| Familia | Qué contiene | Nombre lógico (bajo la distribución configurada) | Procedencia |
|---|---|---|---|
| runtime/distribución | espejos byte a byte de upstream | `cache-ollama`, `cache-redis`, `cache-pgvector`, `cache-ubuntu` | upstream (`sourceDigest == mirrorDigest`) |
| imágenes propias | builds de Thyrox | `thyrox-task-runner`, `thyrox-model-quantizer`, `thyrox-transformers-runtime` | thyrox |
| caché de build | etapas reutilizables de build | `build-cache-task-runner`, `build-cache-model-quantizer` (sólo si los builds lo justifican) | thyrox, no runtime final |

Reglas:

- Un repositorio por imagen lógica (permisos, retención y procedencia
  independientes), no un único `thyrox-cache` con tags mezclados.
- Etiqueta de espejo = versión upstream + digest corto (`24.04-<digest12>`);
  el manifiesto guarda el digest completo. Nunca una etiqueta mutable como
  autoridad (`ubuntu:24.04` remoto ya difería del local según el registro del
  2026-10-02, no re-medido aquí).
- Metadato por espejo: `sourceReference`, `sourceDigest`, `mirrorReference`,
  `mirrorDigest`, procedencia. Si los bytes cambian deja de ser espejo y pasa a
  derivada.
- El código no conoce `docker.io/th3rox`: compone `distribución configurada +
  nombre lógico` por ImageRegistry (hoy Docker Hub; mañana otro OCI).
- Política de fuente, declarada: preferida = espejo; respaldo = upstream sólo si
  la política lo permite; modo estricto = espejo obligatorio sin respaldo (el
  mismo patrón de `fallback.enabled` de la política de ejecución).
- Un repositorio de Docker Hub **no** es un pull-through cache: crear
  `cache-*` no hace que un pull de `ollama/ollama` lo llene solo. El espejo es
  explícito (resolver digest → verificar → copiar → registrar). Un registro
  proxy real (Docker Distribution en modo mirror) queda DEFERRED.

### Cómo cambia la Search Existing

| Pieza | Decisión |
|---|---|
| espejo explícito upstream → `cache-*` con bytes idénticos | EXTEND ImageRegistry (sin `MirrorRegistry`); la promoción actual no sirve porque añade la etiqueta `permanent` y cambia el digest |
| nombres `cache-*` / `thyrox-*` / `build-cache-*` | dato del manifiesto (dueño P12), no constantes en código |
| política de fuente espejo → upstream | EXTEND del `ensure` por digest (`imageResolver`), reutilizando la forma de la política de ejecución |
| creación de repositorios en el namespace | `DockerHubRegistry` ya tiene administración opcional (`createRepository`, `setVisibility`; `dockerHubRegistry.test.ts:56-57`) → REUSE, tras cerrar la clasificación |
