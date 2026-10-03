# untagged-image-census

## El encargo

> «Quiero un census durable de las 31 imágenes con: imageId, localDigest,
> size, createdAt, labels, image history, parent/base image, related tagged
> image, related TASK, related commit/workbench, containers referencing it,
> likely role, unique content, reproducibility, semantic value.» —
> «Clasifica provisionalmente cada una como: RUNTIME_IMAGE, BUILD_CACHE,
> EVIDENCE_IMAGE, SUPERSEDED_IMAGE, DISPOSABLE_IMAGE, UNKNOWN» — «No hagas
> pushes públicos antes de inspeccionar» — «Hasta entonces no borres
> ninguna de las 31».

Nada se borró ni se publicó. Las clases son de análisis, no enums de
producto.

## La premisa, si se corrigio al primer comando

**31 → 33.** La observación del dueño (`podman-execution-execute observe
images`, `outputs/observe-images.json`) da 41 imágenes, 33 sin etiqueta.
Las dos nuevas son llama.cpp b11277 (2.96 GB aparentes cada una):

- `9ace0117e8ff` — la etapa `ghcr.io/ggml-org/llama.cpp@sha256:88ef2d9c…`
  fijada por digest en `quantizer-image/Containerfile:10`. Ya estaba en
  T005 como recurso por digest (sin etiqueta: se descargó por digest), no
  en el censo de distribución.
- `a3327b102032` — creada 2026-10-03T01:20:23Z, dos segundos antes de la
  candidata `245ae25cd5be` de TASK-THYROX-0912: es la imagen de la etapa
  `llama` que la construcción declarada dejó comprometida.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/build_census.py` | une observación + censo/procedencia de `container-image-distribution-20261002T234933` + T005; no observa Podman ni decide borrar |
| `outputs/observe-images.json`, `observe-containers.json`, `observe-snapshot.json`, `observe-storage.json` | observación por el dueño, 2026-10-03 |
| `outputs/census.json` | una fila por imagen sin etiqueta, todos los campos pedidos |
| `outputs/census-table.txt` | vista tabular |

## Los resultados

*Métrica:* campos unidos por id completo de imagen entre las fuentes.
*Ciega a:* bytes únicos que ninguna fuente midió y contenido de capas
(no se leyeron capas).

| Final etiquetada | Intermedias | Tarea | Copia remota de la final | Asignaciones de proxy en historia |
|---|---|---|---|---|
| `b3014db2b8f6` quantizer `:dev`/`:clean-candidate` | 15 | TASK-THYROX-0747 | no | 0 |
| `2bb9f235830e` task-runner publicada | 8 | TASK-THYROX-0724 | sí, `docker.io/th3rox/thyrox-task-runner@sha256:1cced65c…` (match) | 0 |
| `26af4d189984` task-runner `:dev` | 8 | TASK-THYROX-0742 | no; publicación bloqueada | 3 intermedias: `0d469d62f999` (3), `4f65c7dfee65` (2), `61b9d21cee35` (1) |
| etapa upstream | `9ace0117e8ff`, `a3327b102032` | 0747 / 0912 | upstream por digest (sin verificar hoy) | — |

**Clase provisional: las 33 son BUILD_CACHE.** Ninguna es RUNTIME_IMAGE
(0 contenedores las referencian), EVIDENCE_IMAGE (ninguna es la evidencia
citada por una tarea; las finales sí), SUPERSEDED_IMAGE ni
DISPOSABLE_IMAGE (ninguna cumple las seis condiciones).

- Las 31 intermedias tienen `uniqueBytes = 0` y capas prefijo de su final:
  sus bytes se conservan si y sólo si se conserva la final. Las 8 de
  `2bb9f235830e` ya tienen sus bytes en remoto a través de la final.
- `9ace0117e8ff`: T005 midió 2 958 000 000 bytes únicos **antes** de que
  existiera `a3327b102032`, que probablemente comparte sus capas. Esa cifra
  está caduca: bytes únicos de las dos = no medido hoy.

Campos que faltan: historia y padre de las 2 nuevas (no hay `inspect` en
`observe`), bytes únicos de `a3327b102032`, valor semántico de las 2
nuevas.

## Search Existing — preservación

| Pregunta | Autoridad | Decisión |
|---|---|---|
| ¿Puede un GC tocarlas? | `image-registry/imageCollector.ts` lista sólo por `io.thyrox.image.lifecycle`; las 33 no llevan esa etiqueta | REUSE — ningún GC de thyrox las alcanza; sólo un `podman image prune` crudo, prohibido |
| ¿Puede ImageRegistry publicarlas en un repo de caché (`thyrox-build-cache`)? | `promotion.ts`: sólo una candidata `permanent` se promueve; `promotion.test.ts:43` rehúsa `ephemeral`, `cache`, `infrastructure` y sin clase | **MISSING en la autoridad** — no representable hoy; según el encargo, no se empuja. Abrirlo es EXTEND de `promotion.ts` (publicación de ciclo `cache` a un repo `build-cache-*`), decisión del ejecutor |
| ¿Inspección de secretos antes de publicar? | `promotion.ts` `BUILD_ENVIRONMENT_KEYS` + `ImageLeakError` | REUSE — `26af4d189984` y sus 3 intermedias la fallarían (TASK #86: valores de construcción fuera de la historia) |
| ¿Representación semántica? | `semantic-search-ingest` acepta `finding|error` | EXTEND pendiente (tipo de documento de procedencia de imagen); mientras tanto el hallazgo H-THYROX-434 la indexa en el store |
| ¿Contenido único que extraer? | `uniqueBytes = 0` en 31; modelos/corpus/código no viven en capas intermedias | nada que extraer en las 31; las 2 nuevas, no medido |

## Plan de preservación (orden)

1. Preservar las **finales** sin copia remota (`b3014db2b8f6`, `26af4d189984`)
   — eso preserva los bytes de 23 intermedias. `26af` exige antes
   reconstruir sin asignaciones de proxy en la historia (TASK #86).
2. Persistir la identidad de cada intermedia (este censo: id, padre,
   final, tarea, commit, banco) — hecho aquí, versionado en git.
3. `9ace0117e8ff`: verificar que el digest upstream sigue disponible; es
   el candidato más fuerte a DISPOSABLE (reproducible por digest), pero su
   consumidor (la construcción declarada) existe.
4. Publicación de caché (`build-cache-*`) sólo tras EXTEND de `promotion.ts`.
5. Ninguna se borra mientras no cumpla: copia remota durable, procedencia,
   representación semántica, sin consumidor, sin contenido único y
   reemplazo reproducible.
