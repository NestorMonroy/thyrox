<!-- extraído textual de report-20261003T232604Z-pre-structured-audit.md (sha256 75a113337c2d367ba09bb18022ecb211cd7d616f25b22b12376a97bb7ac77d0a); no editar: la fuente es el snapshot -->

## Authority duplication (actual)

- **Selección**: `recommendExecution` y `choose_candidate` activos; `providerSelection.ts` sin consumidores.
- **Imagen por defecto vs catálogo**: `DEFAULT_LAB_IMAGE`/`DEFAULT_EXECUTION_IMAGE` fijan tags `:dev` fuera de `declaredImages` (que etiqueta `candidate-<commit>`).
- **Esquema de etiquetas**: cuatro módulos, dos prefijos (H-THYROX-462).
- **Holgura de RAM**: la admisión del anfitrión (cgroup de sesión) y la realidad de las unidades (`libpod_parent`) no miden el mismo recurso (H-THYROX-471).
- **Respaldo de modelo**: `withRetry`/`--fallback-model` del bucle portado frente a `admittedUpstream` de la ruta local.

## Disconnected implementations (actual)

`providerSelection.ts` · `semantic-search` (store completo, 0 consumidores) ·
`admittedEmbed` fuera de la cualificación · `TransformersRuntimeAdapter` (imagen
inexistente) · `admittedSeq2seq` · `specializedWorkerProfile` ·
`learned_classifier_from_environment` sin orden declarada · `apiModelCatalog` ·
`cutover_bootstrap.sh` / `delegate.sh` (bancos).

## Final dependency graph (DAG) — tras la fotografía completa

```
A. Medición correcta de recursos (H-THYROX-471)
   A1 admisión de RAM sobre el cgroup donde corren las unidades, sin caché
      de páginas como usada
   A2 una sola copia por modelo (la unidad lee la caché, sin pushBlob)
        └→ habilita experimentos de contexto/presupuesto y candidatos mayores
B. Experimentos de aceptación (no requisitos) sobre repo-code-change@1
   B1 mismas identidades con contexto/presupuesto mayores (RUNTIME_PROFILE)
   B2 ergonomía de herramientas: Edit literal, rechazo de NUL (TOOL_PROTOCOL)
   B3 flujo del worker: correr pruebas antes de terminar, no tocar tests,
      no terminar en prosa (WORKFLOW; F9/F10)
   B4 candidato mayor = experimento, tras A1+A2
        └→ C. aceptación nueva (F11) → managed-only
D. Search Existing (F9) — depende de C o de una excepción declarada del
   controlador
E. Identidad kaupamex-ai: E1 decisiones (#24) → E2 pertenencia por identidad
   (#25: H-461/462/463) → E3 fases del DAG de identidad — antes de publicar
   nuevos artefactos permanentes (los 7B importados quedan sin publicar)
F. Datos: F1 corpus re-ingerido (fuentes en kaupamex-docs) → F2 embeddings
   (#27/0904: modelo, suite, productor, espacio activo, imagen transformers
   declarada) → F3 retrieval → F4 RAG
G. Redis: prefijo por componente (H-463) → decisión de producción (#21)
H. Observación por la primitiva (#20) y cierre de las 5 excepciones de Podman
I. Imágenes: declarar runner y transformers en el catálogo; quitar `:dev`
   como identidad (H-469)
J. Selección: unificar autoridades (#12)
```

### Clasificación de H-THYROX-470 respecto del resto

**MIXED.** La evidencia de las cuatro corridas contiene MODEL_CAPABILITY
(alcance, ruta, abandono), TOOL_PROTOCOL (escape de argumentos, llamadas como
texto, `Edit` no literal), WORKFLOW (no corre pruebas, edita tests, termina en
prosa) y un RUNTIME_PROFILE no explorado (8K y presupuesto 2048 elegidos por una
admisión que medía el recurso equivocado, H-471). **PHYSICAL_RESOURCE_BLOCK no
está demostrado**: la RAM física (15.7 GiB) y una materialización de una copia
dejan espacio para experimentos que hoy la configuración impide. La rama B del
DAG es la que puede convertirla en MODEL_CAPABILITY_LIMIT o en aceptación.
