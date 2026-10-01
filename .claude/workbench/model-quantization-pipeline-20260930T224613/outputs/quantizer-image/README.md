# TASK-THYROX-0719 — runtime del laboratorio de cuantización, medido

Definición: `src/packages/model-artifacts/quantizer-image/` (`Containerfile`,
`build.sh`). Construida el 2026-10-01 con `build.sh` en este directorio.

| Medida | Valor | Fuente |
|---|---|---|
| Imagen final | `localhost/thyrox-model-quantizer:dev`, id `83688c33358a…`, digest `sha256:739a74f99079373cbbf5fc7e69241a6b7002b21e650e48beb126697460ac6045` | `image.json` |
| Tamaño final | 1 279 483 171 bytes | `image.json` |
| Contra `llama.cpp:full` | 2 957 557 436 bytes (43 %) | `../llama-cpp-image-contents.txt` |
| Capa de dependencias Python (torch 2.11 CPU, transformers 4.57.6…) | 1 111,4 MB | `image.json` |
| Capa apt (python3, venv, libgomp1, libssl3t64) | 51,9 MB | `image.json` |
| Binarios y bibliotecas copiadas | 21,1 + 12,2 MB | `image.json` |
| Base `ubuntu:24.04` | 80,7 MB | `image.json` |
| Libre antes del pull de la etapa de compilación | 10 872 025 088 bytes | `disk.txt` |
| Libre mínimo durante pull + build | 3 169 574 912 bytes | `free-disk.tsv` (208 muestras, 1 s) |
| Pico transitorio de disco | ~7,70 GB | diferencia de las dos filas anteriores |
| Libre tras retirar la etapa de compilación | 9 610 051 584 bytes | `df` |
| RSS de `podman build` (GNU Time) | 164 744 kB, 1 min 52 s | `build.time` |

La etapa de compilación es `ghcr.io/ggml-org/llama.cpp@sha256:88ef2d9c…`
(llama.cpp build 11277, commit `eae11d221`); se retira después de construir.
Comprobado dentro de la imagen: `llama-quantize --help`,
`llama-perplexity --version` y `convert_hf_to_gguf.py --help` responden.

*Métrica:* `df` cada segundo sobre `/`, `podman image inspect` y
`podman history`, GNU Time del proceso `podman build`.
*Ciega a:* la memoria de cada `RUN` (corre en su propio cgroup, no como hijo
esperado de `podman build`), y a la caché de capas que podman conserve fuera
de `podman images`.

## Segunda construcción: `llama-simple` para la inferencia de validación

La validación de un artefacto genera texto dentro del laboratorio; registrarlo
en un runtime de inferencia y llamarlo por nombre es la ruta que ADR-007 1.7.0
prohíbe sin `ExecutionGrant`. `llama-simple` sólo depende de `libllama`,
`libggml` y `libggml-base`, ya presentes, y va como última capa: las anteriores
salen de caché.

| Medida | Valor | Fuente |
|---|---|---|
| Imagen vigente | id `ddf16d444d8b…`, digest `sha256:7bbe1b609ecf553fffa28443c41c1ba27ec02a8b45f856dc231166da0eac40ad` | `../quantizer-image-rebuild/image.json` |
| Tamaño | 1 279 513 437 bytes (+30 266 bytes) | ídem |
| Duración de la construcción | 1,92 s (capas en caché) | `../quantizer-image-rebuild/build.time` |
| Libre tras retirar la etapa de compilación | 9 484 931 072 bytes | `df` |

Herramientas en la imagen: `gguf-dump`, `llama-quantize`,
`llama-perplexity`, `llama-simple`, `convert_hf_to_gguf.py`.
