<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## Resource ceiling: physical vs configured (medido 2026-10-03)

### RAM (`resources/ram.txt`)

| capa | valor | clase |
|---|---|---|
| RAM física | 16 480 972 kB (≈15.7 GiB), sin swap | FÍSICO |
| cgroup de la sesión (`process_api/…/claude-code-bash`) | límite 14 345 035 776 B (≈13.4 GiB) | CONFIGURACIÓN del anfitrión |
| cgroup de las unidades (`libpod_parent`) | sin límite; 5.75 GB con qwen2.5-7b residente | — |
| piso de admisión | 2 GiB (`DEFAULT_RAM_FLOOR_MB`) | CONFIGURACIÓN |
| límite de memoria por unidad | 8192 MiB (`UNIT_LIMITS`) | CONFIGURACIÓN |
| holgura que mide la admisión | la del cgroup **de la sesión**, contando la caché de páginas como usada | MEDICIÓN |

**Corrección:** las unidades de modelo se cargan a `libpod_parent`, fuera del
cgroup de la sesión; la admisión mide el de la sesión y cuenta su caché de
páginas (que mis propios `sha256sum` de GGUF de 4.7 GB inflaron). El rechazo del
laboratorio de 8 GiB salió de esa medición, no de la máquina (H-THYROX-471). Un
modelo de ~9 GB de pesos + KV a 8K **no** está excluido por la RAM física; sí por
`UNIT_LIMITS` (8192 MiB) y por la medición actual.

### Disco (`resources/disk.txt`)

| capa | valor | clase |
|---|---|---|
| dispositivo | 251.97 GiB | FÍSICO |
| reservado por el montaje (`resv_strict`) | 213.66 GiB | CONFIGURACIÓN del anfitrión (asignación de la sesión) |
| disponible al inicio de la sesión | ≈ 8.7 GB; hoy 4.5 GB con lo de abajo | — |
| piso de admisión de disco | 2 GiB | CONFIGURACIÓN |
| artefacto canónico | remoto (HF por revisión, o `docker.io/th3rox/…@sha256`): **0 bytes locales obligatorios** | — |
| caché de artefactos | 4.68 GB (qwen2.5-7b) | CACHE |
| materialización en la unidad | copia por `pushBlob` en la capa escribible de la unidad (≈4.7 GB) o en `thyrox-ollama-models` (2.4 GB, qwen3-4b) | RUNTIME_MATERIALIZATION |
| shards de descarga | transitorios: hasta 2× el modelo durante el ensamblado | BUILD_INTERMEDIATE |

**Mínimos reales:** bytes canónicos locales = 0; bytes de runtime = 1 copia del
modelo si la unidad leyera la caché montada en lugar de copiarla (hoy son 2: caché
+ copia de `pushBlob`); más el piso. Con una sola copia, la asignación actual de la
sesión admite un GGUF de ≈ 12 GB; con la doble materialización actual, ≈ 6 GB.
«Dos copias» es consecuencia de la materialización, no un requisito físico
(H-THYROX-471).
