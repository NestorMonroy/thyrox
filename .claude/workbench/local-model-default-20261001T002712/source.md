# Fuente de verdad — modelos locales por defecto, Claude como respaldo declarado

Directiva del ejecutor 2026-10-01: thyrox coordina, así que por defecto usa
los modelos locales que gestiona, no `claude -p`. Decisión tomada en el mismo
intercambio: **local por defecto; si ningún modelo local cumple la clase de
tarea, se cae a `claude-cli` declarándolo en la salida** («Local y caer a
Claude»).

## Estado medido (2026-10-01)

- El proxy local tiene como upstream por defecto `claude -p`
  (`src/packages/provider/bin/localProxy.ts:9`, `UPSTREAM_NAME = 'claude-cli'`)
  y rehúsa sin el ejecutable `claude` aunque se declare el upstream
  openai-compat (`:79`).
- El upstream openai-compat (`proxy/openaiCompat/declaration.ts`,
  `THYROX_OPENAI_COMPAT_BASE_URL`/`_MODEL`/`_API_KEY`) sirve un modelo y sólo
  si se declara.
- El recomendador (`src/packages/agent/bin/recommend.ts` →
  `@thyrox/provider/cost/policy` `recommend`) sólo evalúa el catálogo del
  proveedor; `headless-pool.sh:246-249` rehúsa todo modelo que no empiece por
  `claude-`.
- `thyrox -p` sin credencial propia lanza ese proxy
  (`src/packages/cli/src/entry/printDelegation.ts`).

## Contratos ya escritos (no se modifican)

- `src/packages/model-artifacts/modelQualification.ts`: un modelo local cumple
  una clase sólo con una medición aprobada vigente de esa clase y con contexto
  medido ≥ el exigido (`qualifiedModels`). `parseQualifications` /
  `serializeQualifications`, `validateQualification`, `LOCAL_TASK_CLASSES`.
- `src/packages/model-artifacts/localModelHome.ts`: `localModelHome(env,
  thyroxRoot)` → rutas del catálogo y de las cualificaciones
  (`THYROX_MODEL_CATALOG`, `THYROX_MODEL_QUALIFICATIONS`, por defecto
  `.thyrox/models/`).
- `src/packages/model-artifacts/modelCatalog.ts`: `loadModelCatalog`,
  `saveModelCatalog`, `catalogEntryFromGguf`, `ModelCatalog`.
- **Salida JSON del recomendador** (la consume el pool):
  `{ "runtime": "ollama" | "claude-cli", "model": "<id>", "taskClass":
  "<clase>", "fallbackReason"?: "<texto>", ... }`. `model` es un nombre
  contractual `thyrox-…` cuando `runtime` es `ollama`, y un id `claude-…`
  cuando es `claude-cli`. `fallbackReason` existe sólo en el respaldo y dice por
  qué ningún modelo local cumplió (catálogo vacío, sin cualificación de la
  clase, contexto medido insuficiente).

## recommender — TASK-THYROX-0705

Archivos: `src/packages/provider/src/cost/policy.ts` y sus pruebas en
`src/packages/provider/src/cost/__tests__/` (o donde vivan hoy las de
`recommend`), `src/packages/agent/bin/recommend.ts` y su prueba.

1. `recommendExecution(kind, profile, local)` en `policy.ts`, donde `local`
   es `{ entries, qualifications }`: si `qualifiedModels(entries,
   qualifications, kind, profile.contextTokens)` da algo, devuelve
   `runtime: 'ollama'` con el primero (el más rápido) y su cualificación; si
   no, llama a `recommend` de siempre y devuelve `runtime: 'claude-cli'` con
   `fallbackReason` que nombra la causa concreta. `recommend` no cambia.
2. `bin/recommend.ts`: lee catálogo y cualificaciones de `localModelHome(process.env,
   <raíz de thyrox>)`. Archivo ausente → lista vacía (y el respaldo lo dice);
   archivo ilegible o inválido → exit 2 con la ruta, nunca una lista vacía en
   silencio. La salida humana muestra el runtime y, si cae, el motivo; la
   `--json` lleva los campos del contrato. Flag `--runtime claude-cli` fuerza el
   proveedor (declaración explícita, queda en la salida).

## runtime-routing — TASK-THYROX-0706

Archivos: `src/session/headless-pool.sh` (sólo la derivación del modelo y el
entorno de los ítems), `src/packages/provider/bin/localProxy.ts`,
`src/packages/cli/src/entry/printDelegation.ts` y sus pruebas
(`tests/session/test-headless-pool*.sh`, las de `provider` y `cli` que cubren
esos archivos).

1. **Pool**: acepta `runtime` del JSON. Con `ollama` asegura el servicio
   (`bash bin/infrastructure_ensure thyrox-ollama`; si sale distinto de 0 el
   pool cae a `claude-cli` declarándolo, por la decisión del ejecutor) y
   exporta a cada ítem `THYROX_OPENAI_COMPAT_BASE_URL=http://127.0.0.1:${THYROX_INFRA_OLLAMA_PORT:-51434}/v1`
   y `THYROX_OPENAI_COMPAT_MODEL=<model>`. La línea `modelo:` dice el runtime y,
   en el respaldo, el motivo. Un `model` que no es `thyrox-…` con `ollama`, o
   no es `claude-…` con `claude-cli`, rehúsa como hoy. `HEADLESS_POOL_RECOMMEND`
   sigue siendo el punto de inyección de las pruebas.
2. **Proxy**: con openai-compat declarado y sin `claude` en el PATH, arranca
   sirviendo sólo el modelo declarado; una petición a otro modelo responde un
   error que nombra el modelo y que no hay upstream `claude-cli`. Con los dos,
   como hoy.
3. **`thyrox -p --model thyrox-…`** fuera del pool: si el modelo pedido es un
   nombre contractual y no hay `THYROX_OPENAI_COMPAT_*` declarado, la
   delegación lo declara hacia el Ollama gestionado (mismo puerto) antes de
   lanzar el proxy.

## local-models-tooling — TASK-THYROX-0707

Paquete nuevo `src/packages/local-models/` (`@thyrox/local-models`, andamiaje
como `model-artifacts`) con dos entradas y sus envoltorios en `bin/` (vía
`bash bin/generate_bin`, sin editar `bin/` a mano):

1. `model-catalog declare <nombre-ollama>`: lee del Ollama gestionado
   (`/api/show`, `/api/tags`) el digest y el blob GGUF del modelo instalado,
   lo localiza en el volumen (`podman volume inspect` de
   `THYROX_INFRA_OLLAMA_VOLUME`), calcula sha256 y bytes, construye la entrada
   con `catalogEntryFromGguf`, registra el nombre contractual en Ollama
   (`/api/copy`) y la guarda en el catálogo. `model-catalog list`.
2. `model-qualify <nombre-contractual> <clase>`: corre la suite
   `tool-calling@1` (los seis casos de
   `.claude/workbench/ollama-cpu-benchmark-20260930T191740/probes/benchmark.py`,
   `tool_calling_cases`: exactos, con su caso sin herramienta y el de
   continuación) contra la API nativa de Ollama (`/api/chat` con `tools` y
   `options.num_ctx`), mide tokens/s (`eval_count`/`eval_duration`) y escribe
   la cualificación (aprobada si acierta los seis). Los casos viven en un
   archivo de datos del paquete, para que el RL use la misma recompensa.
3. Pruebas con un servidor HTTP falso y un `podman` falso; nada de red ni
   Ollama reales en las pruebas.

## print-routing — TASK-THYROX-0711

Lo que el ítem runtime-routing (0706) dejó sin hacer al perder la herramienta
de shell (su reporte, `outputs/pool-retry/2.json`):

1. **`thyrox -p --model thyrox-…`** (punto 3 de runtime-routing): en
   `src/packages/cli/src/entry/printDelegation.ts`, sólo en la ruta que lanza
   el proxy, si el modelo pedido es un nombre contractual
   (`parseThyroxModelName` de `@thyrox/model-artifacts/modelName.ts`) y no hay
   `THYROX_OPENAI_COMPAT_BASE_URL`/`_MODEL` declarados, el entorno del proxy
   recibe `THYROX_OPENAI_COMPAT_BASE_URL=http://127.0.0.1:${THYROX_INFRA_OLLAMA_PORT:-51434}/v1`
   y `THYROX_OPENAI_COMPAT_MODEL=<modelo>`. Lo declarado gana. Un modelo
   `claude-…` no cambia de camino.
2. **Controles de anulación** de lo que 0706 integró (`thyrox@<integración>`):
   la derivación del runtime en `src/session/headless-pool.sh` (aceptar
   `ollama`, exportar el upstream a los ítems, la línea `modelo:` con el
   motivo del respaldo, rehusar un id que no casa con su runtime) y el modo
   sólo-openai de `src/packages/provider/bin/localProxy.ts`. Por cada rama:
   retirarla y contar qué aserciones caen, en
   `tests/session/test-headless-pool-runtime.sh` y
   `src/packages/provider/src/proxy/__tests__/openaiCompatLocalProxy.test.ts`.
   Si una rama se retira y no cae nada, se escribe la prueba que la discrimina.
