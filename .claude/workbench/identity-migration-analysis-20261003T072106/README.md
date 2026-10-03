# Identidad kaupamex-ai — análisis antes de cualquier rename (TASK-THYROX-0917)

Rama `feature/change-identity`, creada desde `HEAD` de `feature/complete-orm-root`
sin merge, rebase ni cherry-pick. **Commit base: `2f1b2e62127917c0434d217c38663fbb314300bf`**
(`inputs/base-commit.txt`).

Nada se renombró, publicó, reetiquetó ni reconstruyó. Las sondas de `probes/` son
EXPERIMENTAL (cabecera declarada).

Dos encargos, en este orden de prioridad del ejecutor:

1. **OCI/Podman + modelos locales + imágenes nunca publicadas** (acotado, decide ya).
2. Censo y Search Existing de identidad global (base para las fases).

---

## 1. OCI/Podman y modelos locales

Matrices: `outputs/oci-A-inventory.tsv`, `outputs/oci-B-search-existing.tsv`,
`outputs/oci-C-first-publication-plan.tsv`. Observación por
`podman-execution-execute observe images|containers|volumes`
(`outputs/runtime-podman-*.txt`). Las 33 sin etiqueta se reutilizan del censo
`untagged-image-census-20261003T024453` (no se re-midieron).

*Métrica:* ids, etiquetas, etiquetas OCI y montajes que devuelve `observe`, más
`.thyrox/models/{catalog,artifact-locations}.json` en sólo lectura.
*Ciega a:* el estado actual del registro remoto (no se consultó Docker Hub hoy:
«publicado» sale de la evidencia versionada y de `artifact-locations.json`), las
capas por dentro, y el texto de los ADR de `kaupamex-docs` (no clonado aquí).

### La frontera runtime / modelo — ya existe, no se crea

Thyrox **ya separa** las dos cosas, con dos autoridades hermanas:

| Carril | Autoridad | Qué transporta |
|---|---|---|
| A — runtime | `@thyrox/image-registry` (`declaredImages`, `promotion`, `ImageRegistry`) → `PodmanExecutionPrimitive` | imágenes ejecutables |
| B — modelo | `@thyrox/artifact-registry` (`ArtifactRegistry`, «datos que Podman no ejecuta») → `model-artifacts` (manifiesto, catálogo, resolver) → `local-models` (fetch como trabajo de la primitiva, instalación en Ollama) | GGUF como artefacto OCI, **no** envuelto en imagen |

Medido: ninguna imagen local contiene pesos. Los pesos viven en volúmenes
(`thyrox-ollama-bench-models` montado en `thyrox-ollama`, `thyrox-ollama-models`) y
en `th3rox/thyrox-quantization-lab-artifacts` como artefactos OCI. **Modelo ≠ imagen
Podman**, y no hay que inventar esa frontera: está en
`artifactRegistry.ts:1-9`.

### Respuestas

1. **Imágenes necesarias para trabajar con modelos locales:** el runtime de modelo
   `docker.io/ollama/ollama:0.35.0` (upstream); el runtime de trabajos
   `localhost/thyrox-task-runner:dev` (`DEFAULT_EXECUTION_IMAGE`,
   `executionCommand.ts:25`); el verificador `docker.io/library/ubuntu:24.04`
   (`DEFAULT_VERIFIER_IMAGE`); el cuantizador `thyrox-model-quantizer`; y la
   infraestructura `pgvector` y `redis`.
2. **Runtime vs. modelo:** todas las imágenes son runtime. Los modelos son los 5 GGUF
   del catálogo: 4 publicados como artefacto OCI y 1 (`qwen2.5-coder-7b`)
   referenciado por su revisión upstream.
3. **Listas para publicarse sin reconstrucción:** sólo `245ae25cd5be`
   (`thyrox-model-quantizer:candidate-81e5a993a7be`). Es la única con ciclo de vida
   `permanent` y con la definición declarada y fijada por commit, que es lo único que
   `promoteCandidate` acepta. Falta el gate (más abajo).
4. **No se publican:** `b3014db2b8f6` y `26af4d189984` (ciclo `cache`; la segunda
   además tiene asignaciones de proxy en 3 capas intermedias); las 33 sin etiqueta
   (caché de construcción); las upstream (ollama, pgvector, redis, ubuntu).
5. **Quién genera la identidad OCI:** `declaredImages.ts` (id lógico, repositorio
   local, etiqueta `candidate-<commit12>`, etiquetas `io.thyrox.image.definition*`).
   El destino remoto **no** lo genera nadie en producto: es un parámetro
   (`ImageReference`), con el host en `THYROX_REGISTRY_PUBLISHER_REGISTRY`.
   `th3rox` aparece sólo en pruebas y evidencia.
6. **Quién publica:** imágenes, `promotion.ts` (`promoteCandidate` →
   `publishPromotedImage` → `ImageRegistry.push`); artefactos,
   `artifact-registry/publishArtifact.ts`.
7. **Quién verifica el digest remoto:** artefactos, `artifactVerifier.ts` (HEAD
   anónimo y sha256 blob a blob): REUSE. Imágenes: `push` devuelve el digest que
   asignó el registro, pero la comprobación anónima posterior no está — es la tarea
   pendiente «Resolve an image tag to the registry's digest, not the local store's».
   EXTEND.
8. **Qué conserva `thyrox` como procedencia:**
   - las etiquetas ya horneadas en la imagen (`io.thyrox.image.definition`,
     `definition-commit`, `lifecycle`, `thyrox.task`), que **son parte del digest**:
     no se pueden cambiar sin reconstruir, y no hace falta;
   - el id de definición `thyrox-model-quantizer`;
   - las citas `TASK-THYROX-*`;
   - los nombres de modelo `thyrox-<org>--<repo>:…` del catálogo y de las
     cualificaciones;
   - el repositorio de artefactos ya publicado `th3rox/thyrox-quantization-lab-artifacts`.
9. **Qué puede nacer bajo `kaupamex-ai`:** el nombre remoto de la primera
   publicación del cuantizador (`kaupamex-ai-model-quantizer`); toda imagen
   declarada nueva (el próximo runtime de trabajos incluido); los nuevos
   repositorios de artefactos; y los registros de procedencia nuevos
   (`PromotionEvidence.provenance`: `canonical_project`, `built_under_project=thyrox`,
   `source_image_id`, `source_task`, `source_commit`).
10. **¿Se puede cambiar el registro después sin cambiar la identidad lógica?** Sí,
    en los dos carriles:
    - imágenes: el id lógico (`DECLARED_IMAGES.id`) y el destino son independientes;
    - modelos: `artifact-locations.json` guarda `registry` + `repository` por sha256
      del contenido, separado del nombre del modelo, y admite más de una ubicación.

    El registro es ubicación, no identidad.

### Primera publicación sin reconstruir

`ImageRegistry.push(localImage, destination)` empuja el mismo image ID a un
destino arbitrario. El nombre local `localhost/thyrox-model-quantizer:*` puede
seguir apuntando al mismo ID mientras `declaredImages.repository` lo nombre.
**Verificado en código:** el digest no cambia por la etiqueta. **No verificado
contra el registro:** que el digest de manifiesto remoto coincida con el local tras
la conversión de formato; eso es justo la verificación de imagen que falta (resp. 7).

La procedencia nueva **no** va en etiquetas (cambiaría el digest). Va en
`PromotionEvidence.provenance`, que ya es un registro libre fuera de la imagen.

### Gate de publicación — qué falta para el cuantizador

| Evidencia | Estado para `245ae25cd5be` | Autoridad |
|---|---|---|
| clasificación conocida | QUANTIZER, `permanent` | `imageLifecycle` |
| dueño conocido | definición declarada `thyrox-model-quantizer` | `declaredImages` |
| sin secretos | lo comprueba `assertImageFreeOf` al promover (historial y `Config.Env`) | `promotion` |
| procedencia | etiquetas de definición + TASK-THYROX-0912 | horneada |
| digest local | `sha256:6bb46d96…` | `observe` |
| repositorio canónico declarado | **falta**: no hay namespace kaupamex declarado ni credencial de publicador para él | MISSING (estrecho) |
| papel runtime/artefacto | runtime | `declaredImages` |
| consumidores | ninguno usa la candidata; el destino local legacy lo usa `buildImage` | — |
| verificación remota | **falta** para imágenes | EXTEND (tarea pendiente) |

`UNKNOWN` ya es rechazo en la autoridad: `promoteCandidate` rehúsa ciclo
`ephemeral`, `cache`, `infrastructure` o sin clase (`promotion.test.ts:43`). No hay
que construir otro gate, sino completar estas dos filas.

### Conflictos de identidad que el rename tiene que respetar

- **Claves de etiqueta OCI.** Renombrar `io.thyrox.image.lifecycle` sin leer
  también la clave vieja deja todas las imágenes existentes sin clase, y una sin
  clase puede leerse como recogible. Regla: se leen las dos claves y se escribe una.
- **Prefijo de nombre de modelo.** `THYROX_MODEL_PREFIX='thyrox-'` está dentro de la
  identidad del modelo (catálogo, nombre en Ollama, claves de cualificación). Un
  prefijo nuevo crea nombres nuevos; los existentes se quedan como nombres legacy,
  no se reescriben.
- **Namespace del registro.** `th3rox` es la cuenta de Docker Hub. Para que una
  primera publicación nazca bajo Kaupamex hace falta un namespace kaupamex
  declarado y su credencial de publicador con rol acotado. Es decisión del
  ejecutor; no se infiere.

---

## 2. Identidad global (base, sin decisiones de rename)

`outputs/search-existing-matrix.tsv` (27 capacidades). Censo:
`outputs/census-*.tsv` (sonda `probes/identity_census.sh`, `git grep` sobre el
índice).

| Forma | Producto (src, bin, tests, .githooks) | Otros vigentes | Histórico (workbench, jobs, logs, cache, _archived, _references) |
|---|---:|---:|---:|
| palabra `thyrox` (líneas) | 31 669 | 1 987 | 569 956 |
| `THYROX_*` | 9 892 | 697 | 11 842 |
| `@thyrox/*` | 14 837 | 515 | 179 706 |
| `thyrox-*` recursos | 862 | 58 | 51 325 |
| `.thyrox/` | 223 | 133 | 94 574 |
| `TASK-THYROX-*` | 685 | 30 | 7 030 |
| `H-THYROX-*` | 317 | 22 | 2 341 |

El 94,5 % de las apariciones es evidencia histórica, inmutable por regla.
Distintos vigentes: 741 nombres `THYROX_*`, 80 paquetes `@thyrox/*`, 254 nombres
`thyrox-*`. Hay 3 441 rutas versionadas con `thyrox` en el nombre: 2 561 en bancos
y 796 en `_archived`.

**Precedente que se reutiliza, no se recrea:** el rename `Claude → thyrox`
(2026-09-27) dejó:

- una constante (`PRODUCT_NAME`);
- un trinquete por archivo (`check_product_word` + baseline);
- un rename por AST limitado a literales, con marca `thyrox-rename: keep`;
- gate y renombrado de prefijo de entorno (`checkEnvPrefix`, `renameEnvPrefix`,
  `renameEnvNames`).

Además, `reach.py` ya lee un nombre de entorno legacy por variable
(`AGENT_STORE_COMPAT_VAR`). Es exactamente el patrón «canónico + alias» que pide
esta migración. Lo único MISSING es una declaración: `canonical = kaupamex-ai`,
`legacy = [thyrox]`, `ecosystem = kaupamex`, que lean esos mecanismos.

**Choques medidos:**

- `task_ids.ID_RE = TASK-[A-Z]+-\d{4}` no admite guion: `kaupamex-ai` no puede ser
  capa. La capa natural es `ai` (`TASK-AI-*`, `H-AI-*`), paralela a `api`, `db`,
  `docs`, `server`, `ui`; prefijos medidos en el store: `AI` no se usa.
- `checkEnvPrefix` hoy hace de `THYROX_*` el prefijo propio, así que una
  `KAUPAMEX_AI_*` saldría como ajena.
- Semantic Search ya separa identidad de dominio (`domain`, `scope`, `domain_id`) y
  procedencia (`source_ref`, `source_revision`, `legacy_source_identity`), y tiene un
  resolver de identidad legacy. Le faltan campos de proyecto y un alias en la
  consulta: hoy nada garantiza que «thyrox» y «kaupamex-ai» recuperen la misma
  evidencia (MISSING).

Pendiente de este encargo y no hecho todavía: la matriz fila a fila del censo con
tipo, estrategia, consumidores y pruebas por superficie; la propuesta de fases; y
qué migra antes del dataset. Se retoman cuando el ejecutor cierre la decisión OCI.

---

## 3. Censo v2 — con las herramientas de thyrox (pedido del ejecutor)

El censo de la sección 2 contaba texto con una sonda propia. Éste reutiliza las
piezas de los gates que ya miden identidad en thyrox, importadas, sin escribir
baselines (`probes/census_v2_python.py`, `probes/census_v2_ts.ts`, EXPERIMENTAL),
y las herramientas de censo del store. Salidas en `outputs/census-v2/`.

| Herramienta de thyrox | Qué midió | Archivo |
|---|---|---|
| `check_product_word.measure` (palabra cambiada a `thyrox`, mismo recorrido y extensiones) | 26 371 apariciones en 3 797 archivos de código | `product-word-thyrox-by-{file,area}.tsv` |
| `checkEnvPrefix.ts` (`extractEnvReads`, `classifyName`, `isProductionPath`, `isTestPath`) | 660 nombres de entorno **leídos** en producción: 366 propios `THYROX_*` (123 sin prueba que los nombre), 255 sin prefijo, 27 de proveedor, 12 ajenos `CLAUDE_*` | `env-reads.tsv` |
| `imageLifecycle.lifecycleOf` / `ownerOf` sobre la observación | 2 `permanent`, 2 `cache`, 37 sin clase (33 sin etiqueta + 4 upstream); 0 con dueño legible | `image-lifecycle.tsv` |
| `bin/task_ids census` | 2 423 citas: thyrox 577, docs 566, api 430, **gen 835**, db 6, server 5, ui 4 | `task-ids-census.txt` |
| `bin/agent_store censo-tablas` | filas, escrituras de hoy y última escritura por tabla | `store-tables-census.txt` |
| `bin/agent_store buscar-hallazgos` / `buscar-tareas` | precedentes de renombre | `../store-findings-search.txt`, `../store-tasks-search.txt` |

### Qué aporta que el censo de texto no tenía

1. **El trinquete de producto es ciego a lo que no es código.**
   `MEASURED_EXTENSIONS` = `.ts .tsx .js .mjs .py .sh`. Quedan fuera
   `.claude/rules/*.md`, skills, `CLAUDE.md`, `README.md`, `.env.example` (681 líneas
   con `thyrox`), `package.json` y `pyproject.toml`. Un rename vigilado por ese gate
   no vería esas superficies: es EXTEND del gate (extensiones o raíces declaradas),
   no un gate nuevo.
2. **Contrato de entorno real ≠ nombres mencionados.** Se **leen** 366 `THYROX_*`;
   el censo de texto contaba 741 nombres distintos (lecturas, documentación, pruebas,
   ejemplos). La familia `THYROX_CODE_*` (211) es la configuración heredada del
   cliente, renombrada desde `CLAUDE_CODE_*` el 2026-09-27; `THYROX_TOOLCHAIN_*` (42)
   es la segunda. Ésos son los candidatos a `KAUPAMEX_AI_*` con alias, no los 741.
   123 de los 366 no tienen prueba que los nombre: renombrarlos sin alias no lo
   detectaría ninguna suite.
3. **Siguen leyéndose 12 `CLAUDE_*`** (`CLAUDE_PROJECT_DIR`, `CLAUDE_CONFIG_DIR`,
   `CLAUDE_CODE_SESSION_ID`…). Son del cliente anfitrión, no de thyrox, y no entran en
   este rename.
4. **Ninguna imagen local tiene dueño legible** (`OWNER_KIND_LABEL` / `OWNER_ID_LABEL`
   ausentes en las 41), y 37 no tienen clase. Para la autoridad de ciclo de vida,
   sólo 2 son publicables por clase (`permanent`): `245ae25cd5be` y `2bb9f235830e`.
   Esto confirma la matriz C.
5. **La capa `gen` tiene 835 citas.** Una tarea sin capa conocida cae ahí (le pasó a
   las dos de esta sesión antes de `fix-layer`). Añadir la capa `ai` a `LAYERS` no
   arregla ese desvío: hay que declararla al acuñar.
6. **Precedentes de renombre que deben gobernar la ejecución:**
   - H-API-884/886: el reescritor renombra por nombre, no por ligadura;
   - H-API-607: ciego dentro de f-strings;
   - H-DOCS-1100: el verde falso de un renombre;
   - H-DOCS-1039: un cambio masivo sin banco no deja instrumento;
   - H-THYROX-252: renombrar una tarjeta acuña una segunda cita.

### El pase con modelos locales — bloqueado, no corrido

Preparado: `inputs/local-model-classify/` contiene la plantilla y 34 superficies, cada
una con su conteo y una línea real de evidencia. El selector asigna
`thyrox-library--qwen3-4b:q4_k_m-ollama-359d7dd4bcda` (`batch-worker-mecanica@1` 4/4)
con `--context-tokens 16000`, y el pool se lanzó como entrada declarada del plano de
control.

Cómo se bloqueó:

- **Primer intento:** como trabajo de unidad, falló porque la unidad no tiene `podman`.
- **Segundo intento:** en el anfitrión, `infrastructure_ensure` sale 3: locks de Podman
  desfasados, asignados 0 frente a 21 referenciados, ningún contenedor vivo. Son las
  precondiciones de H-THYROX-308.
- **Plan de reparación** (`podman-lock-recovery-plan.txt`): retirar
  `/run/libpod/alive` para que Podman reasigne los locks.
- **Ejecución rechazada:** `--confirm` lo rechazó el clasificador de permisos de la
  sesión («Modify Shared Resources»). No se intentó por otra vía.

Para correrlo hace falta que el ejecutor autorice o ejecute esa reparación. Después
basta relanzar el mismo comando; la plantilla y los ítems ya están en el banco.

### La reparación de Podman — cómo está implementada y qué se midió hoy

- **Autoridad:** `src/session/podman_lock_recovery.sh` (`bin/podman_lock_recovery`).
  Está declarada en `control_plane_entries.tsv` como «recuperación explícita del
  motor, pedida por un operador». `infrastructure_ensure` detecta el desfase y
  rehúsa; **no repara**.
- **Qué hace:** retira `/run/libpod/alive` y llama a `podman ps -a`. Podman refresca
  su estado y vuelve a asignar en memoria el lock que la base guarda por objeto (lo
  mismo que tras reiniciar). Luego mide otra vez: sale 0 si cuadra y 3 si no.
- **Guardas** (sin cualquiera de ellas rehúsa con 2 y no toca nada):
  - Podman 4.9.x;
  - backend `sqlite`;
  - uid 0;
  - marcador presente;
  - **ningún contenedor vivo**: `thyrox_podman_live_containers` exige estado
    `running` **y** `kill -0` del PID.
- **Pruebas:** `tests/session/test-podman-lock-recovery.sh`, 6 casos y 23
  aserciones con un `podman` falso. Hoy: **23 ok, 0 fallos** (trabajo gestionado,
  `census-v2/test-podman-lock-recovery.txt`).
- **Usos previos con `--confirm`:**
  - `postgres-durability-through-primitive-20261002T014441`: 7 de 7 tras el
    reinicio de la VM. Después hubo un `runc … already exists` que la primitiva ya
    resuelve (`stale-runtime-state`).
  - `embedding-route-and-local-workers-20261002T093053/W1`: **no** se ejecutó.
    `podman ps` decía `Up` y el ensure «vivos: ninguno», y ese desacuerdo quedó sin
    resolver (tarea «Measure Podman lock recovery before deciding whether to
    automate it»).
- **Medido hoy, y resuelve ese desacuerdo para este estado:** la base reporta
  `thyrox-ollama` y `thyrox-postgres` como `running`, con PID 3413 y 21341. **Ninguno
  de los dos existe en `/proc`.** Es estado persistido sin proceso detrás
  (H-THYROX-302), no contenedores vivos. La guarda de liveness lo ve bien.
  Refrescar no toca volúmenes (`thyrox-postgres-data`, `thyrox-ollama-*`); deja como
  detenidos unos contenedores que ya están muertos.
- **Por qué no corrió:** el clasificador de permisos de esta sesión rechazó
  `--confirm` como «Modify Shared Resources». Es la frontera que la propia pieza
  declara («pedida por un operador»): la sesión no se autoriza a sí misma a mutar el
  motor de Podman del anfitrión.
