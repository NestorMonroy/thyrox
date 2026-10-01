# p2 — Clasificación de los cinco callers de dominio

**Tramo A de TASK-THYROX-0743.** Fuente del censo: `outputs/p2-initial-callers.txt`
(medido a HEAD `d95bca492`); citas de línea releídas contra el árbol de este turno.

## Método

Por cada caller: **qué materializa** (job efímero, worker de vida larga, paso de
laboratorio) con `file:line`; la **clase** dentro de `EXECUTION_KINDS`
(`executionAuthorization.ts`); la **referencia** que lo autoriza —`tarea`,
`grant` o `infraestructura`— con la cita o el recurso concreto y de dónde sale;
y su **condición**: *caller de dominio que salta la autorización* (compone por
spec e importa `runJobWithOutput` / `materializeContainer` / `WorkerContainerSpec`)
o *implementación interna* (vive en `src/packages/podman-execution/`, permitida).

La referencia no se elige libre: `expectedReferenceKind()`
(`executionAuthorization.ts`) la fija —`model-runtime` exige `grant`,
`infrastructure` exige `infrastructure`, y **todo lo demás exige `task`**—. Por
eso, para cada caller, qué referencia *tiene a mano* acota la clase y no al
revés.

## 1. `src/packages/artifact-registry/podmanJobVerifier.ts` — `registry-operation` · tarea

- **Materializa**: un job efímero (crear, arrancar, esperar, leer salidas y
  retirar) que verifica un artefacto publicado: baja los blobs desde el
  registry por la API de distribución y deja `verification.json`
  (`VERIFICATION_REPORT_NAME`) en el directorio de trabajo (`:93`).
- **Clase**: `registry-operation` — es una operación sobre la salida del
  registry (el artefacto publicado); ninguna otra clase lo nombra.
- **Referencia**: `{ kind: 'task', citation }` — la tarea del flujo que
  verifica. El caller la declara con `taskCitation`; por defecto, la cita de la
  tarea dueña del paquete, `TASK-THYROX-0728` (`:3`), porque es esa tarea la
  que define la operación de registry. Un llamador que verifique bajo otra
  tarea la sobreescribe.
- **Condición**: **caller de dominio que hoy salta la autorización** —
  importa `runJobWithOutput` (`:17`) y compone un `WorkerContainerSpec` (`:19`,
  `:48`). **Migra en el tramo A** (este cambio; evidencia en
  `outputs/p2a-diff.txt`).

## 2. `src/packages/local-models/ollamaModelInstaller.ts` — `maintenance` · tarea

- **Materializa**: un job efímero que corre `bin/installModel.ts` con el GGUF
  montado de sólo lectura y habla con el runtime Ollama del anfitrión para
  instalar el modelo; confirma por inspección (`:107`).
- **Clase**: `maintenance` — instala/actualiza el estado del runtime gestionado
  (su almacén de modelos). `model-runtime` queda excluida por su propia
  restricción: exigiría `grant` y la petición del instalador
  (`ModelInstallRequest`) no trae ninguno; no es `registry-operation` porque el
  job no habla con el registry (el GGUF ya está en disco).
- **Referencia**: `{ kind: 'task', citation }` — la tarea del flujo que deja el
  modelo disponible; por defecto la de la tarea dueña del paquete,
  `TASK-THYROX-0729` (`:2`), declarable por el llamador.
- **Condición**: **caller de dominio que salta la autorización** — importa
  `runJobWithOutput` (`:18`) y compone `WorkerContainerSpec` (`:20`, `:53`).
  **Migra en el tramo B.**

## 3. `src/packages/local-models/podmanArtifactFetcher.ts` — `registry-operation` · tarea

- **Materializa**: un job efímero que baja la capa fijada desde el registry por
  la API de distribución anónima y la escribe en el destino (`:119`).
- **Clase**: `registry-operation` — literalmente opera contra el registry.
- **Referencia**: `{ kind: 'task', citation }` — la del flujo que trae el
  artefacto; por defecto la tarea dueña, `TASK-THYROX-0729` (`:2`), declarable.
- **Condición**: **caller de dominio que salta la autorización** — importa
  `runJobWithOutput` (`:26`) y compone `WorkerContainerSpec` (`:28`, `:66`).
  **Migra en el tramo B.**

## 4. `src/packages/local-models/quantizationLab.ts` — `quantization` · tarea

- **Materializa**: los pasos efímeros del laboratorio de cuantización (convert,
  quantize): corren un comando y devuelven salida y medida de memoria del
  cgroup (`:71`).
- **Clase**: `quantization` — los pasos del laboratorio; ninguna otra clase lo
  nombra y `model-runtime` exigiría un `grant` que el laboratorio no recibe.
- **Referencia**: `{ kind: 'task', citation }` — la tarea del trabajo de
  cuantización; por defecto la dueña del módulo, `TASK-THYROX-0718` (`:4`),
  declarable por el llamador.
- **Condición**: **caller de dominio que salta la autorización** — importa
  `runJobWithOutput` (`:11`), `WorkerContainerSpec` (`:13`) y compone el spec en
  `specOf` (`:78`). **Migra en el tramo C.**

## 5. `src/packages/daemon/src/podman/podmanWorkerManager.ts` — `infrastructure` · infraestructura

- **Materializa**: workers de vida larga del daemon —el daemon decide, este
  módulo materializa— con `materializeContainer` (`:44`, `:249`), dueño
  `daemonContainerOwner` (`:50`, `:215`). Un worker especializado es un
  servicio del anfitrión (`specializedWorkerProfile.ts`).
- **Clase**: `infrastructure` — es capacidad de servicio del anfitrión, no
  trabajo efímero de una tarea. `model-runtime` queda excluida (la petición no
  trae `grant`); una cita de tarea exigiría inventarla (la petición del daemon
  no trae tarea) y una referencia fabricada es justo lo que la autorización
  existe para impedir.
- **Referencia**: `{ kind: 'infrastructure', resource: 'daemon' }` — lo que
  autoriza es la infraestructura del daemon del anfitrión, que es su dueño y su
  autoridad. El label queda `thyrox.execution-reference=infrastructure:daemon`.
- **Condición**: **caller de dominio que salta la autorización** — importa
  `materializeContainer` (`:44`) y `WorkerContainerSpec` (`:61`). **Migra en el
  tramo C** (con `owner.kind = daemon` sin cambios).

## Sexta línea del censo: `infrastructureBootstrap.ts` (no es una de los cinco)

`src/packages/infrastructure/infrastructureBootstrap.ts:160` llama
`ensureResource` — la entrada canónica de recursos de la primitiva
(`kind: 'infrastructure'`, `:129`, dueño `infrastructure`) —, no una función
por spec: **no salta la autorización** y no entra en la lista de migración.

## Frontera medida: la autorización no expresa `readOnlyRootfs`

Los callers 1-3 piden `readOnlyRootfs: true` (`:54`, `:58`, `:73`) y la
autorización canónica no tiene ese campo: `resourceArgv()`
(`executionAuthorization.ts`) fija `readOnlyRootfs: false` para todo
contenedor. Al migrar, esos tres pierden `--read-only` en el rootfs (los
montajes siguen en `:ro`). No se corrige aquí —`podman-execution` no es de
este tramo—; queda registrado en `outputs/p2a-findings.jsonl` para quien
gobierne ese paquete.

## Las tres piezas internas (permitidas)

`podman-execution/{containerRun,executionAuthorization,executionCommand}.ts`
pueden seguir nombrando las funciones por spec: son la implementación interna
de la primitiva, no callers de dominio.
