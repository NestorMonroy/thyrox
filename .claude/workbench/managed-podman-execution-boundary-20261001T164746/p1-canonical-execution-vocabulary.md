# P1 — Vocabulario canónico de ejecución

Tarea: TASK-THYROX-0743. Paso 1 del orden de `template.md`.

## Objetivo

Una autorización canónica → una primitiva canónica → una unidad materializada. El grant de modelos
compone (especializa) esa autorización y esa unidad; no queda un segundo concepto equivalente.

## Estado inicial medido

`outputs/p1-initial-map.txt` (sonda `probes/p1_initial_map.sh`, dentro de una unidad, HEAD
`9429f0984`). Lo que decide este ítem:

| Concepto | Hoy | Problema |
|---|---|---|
| autorización | `ExecutionAuthorization` (podman-execution) | ninguno: es la única; el grant ya compone en ella (`modelUnitAuthorization`) |
| primitiva | `materializeExecution` / `runExecution` (podman-execution) **y** `ModelExecutionPrimitive` / `PodmanModelExecutionPrimitive` (model-scheduling) | dos conceptos llamados «primitiva»; el de model-scheduling no materializa nada propio: compone el grant y llama a la primitiva |
| unidad | `ExecutionUnit` sólo en model-scheduling; `MaterializedContainer` en podman-execution | dos identidades de lo materializado; la de modelo repite contenedor, cgroup y PIDs, y hace su propio `podman inspect` |

## Archivos que puede modificar

- `src/packages/podman-execution/{containerRun,executionAuthorization,workerContainerLifecycle}.ts` y sus pruebas.
- `src/packages/model-scheduling/executionPrimitive.ts` → `modelUnitMaterializer.ts`;
  `podmanModelExecutionPrimitive.ts` → `podmanModelUnitMaterializer.ts` (con su prueba); y los
  importadores del concepto en model-scheduling, local-models y `provider/src/proxy/openaiCompat/admittedUpstream.ts`,
  sólo para el renombre.

## Mecanismos que reutiliza

`ExecutionAuthorization` y `executionContainerSpec`; `materializeContainer` (la única que emite
`create`/`start`); `ContainerRunError` con su etapa; las claves `OWNER_*_LABEL_KEY` que
`ownerLabelArgv` ya escribe; `requireValidOwner`.

## Invariantes

1. `materializeExecution(autorización)` es la única forma de obtener una `ExecutionUnit`.
2. La `ExecutionUnit` lleva clase, referencia, dueño, nombre, id, cgroup, PIDs y creación; un fallo
   de inspección es la etapa `inspect` y nunca una unidad sin identidad.
3. `ModelExecutionUnit extends ExecutionUnit`: clase `model-runtime`, referencia `grant`; añade grant,
   artefacto, residencia, generación, runtime, endpoint y dispositivos.
4. El dueño de una unidad reconstruida desde Podman se lee de las etiquetas que la primitiva
   escribió; sin ellas no hay unidad.
5. En model-scheduling no queda ningún nombre «primitiva».

## Prueba RED

`outputs/p1-red.log`: las pruebas de `materializeExecution` exigen la `ExecutionUnit` canónica
(verbos `create, start, inspect`), etapa `inspect` ante fallo o salida ilegible; la reconstrucción de
`units()` exige dueño, clase, referencia y nombre, y descarta un contenedor sin etiqueta de dueño.

## Implementación mínima

Las pruebas primero (de `outputs/p1-recovered-wip.diff`); luego `inspectContainerState` en
`containerRun.ts`, `ExecutionUnit` y el nuevo `materializeExecution`, `ownerFromLabels`, el renombre
a `ModelUnitMaterializer`, y `createUnit` usando la unidad de la primitiva en lugar de su propio
`inspect`.

## Prueba GREEN

`outputs/p1-green.log`: suites de podman-execution, model-scheduling, local-models, daemon y provider,
cada una con su código de salida, contra la línea base en HEAD (`outputs/p1-baseline.log`).

## Control de anulación

`outputs/p1-annulment.log`:
- a) `materializeExecution` sin inspección: caen exactamente los casos de identidad (cgroup/PIDs y etapa `inspect`);
- b) `ownerFromLabels` aceptando la ausencia: cae exactamente el caso del contenedor sin dueño.

## Evidencia que guarda

`outputs/p1-initial-map.txt`, `p1-baseline.log`, `p1-red.log`, `p1-green.log`, `p1-annulment.log`,
`p1-typecheck.txt` (errores TS ahora contra HEAD) y `p1-diff.txt`.

## Criterio de cierre

GREEN sin fallos nuevos frente a la línea base; anulación con la caída exacta; typecheck sin errores
nuevos; `git grep -w 'ModelExecutionPrimitive\|PodmanModelExecutionPrimitive\|MaterializedContainer'`
fuera de la primitiva sin resultados en código vigente; commit por pathspec hecho dentro de una unidad.

## Qué NO pertenece a p1

- Que todo módulo materialice a través de una autorización. `outputs/p1-initial-map.txt` mide cinco
  importadores de las funciones por spec que no pasan por `ExecutionAuthorization` (artifact-registry,
  tres de local-models y el daemon). Va a **p2**.
- Retirar `bin/podman-execution-execute` — **p2**.
- headless-pool, thyrox-bg y run-task-pool — **p3/p4**. Política de modelos — después de p5.

## Resultado (cierre)

- Baseline: `outputs/p1-baseline.log`. RED: `outputs/p1-red.log` — 4 casos de identidad en
  podman-execution y el módulo renombrado ausente en model-scheduling/local-models.
- GREEN: `outputs/p1-green.log` — mismos códigos y conteos que la baseline en los cinco paquetes,
  salvo podman-execution 167 → 170 (los casos nuevos). Las fallas que quedan son de la baseline:
  model-scheduling 1 (`redis-server` ausente en la imagen), local-models 5 (`local-models-qualify`),
  provider exit 1 con 0 fallas.
- Typecheck: `outputs/p1-typecheck.txt` — idéntico a la baseline.
- Anulación: `outputs/p1-annulment.log` — (a) sin inspección caen exactamente los 3 casos de
  identidad y el de identidad del materializador; sobrevive «sin PIDs ni cgroup», que no depende de
  leer la inspección; (b) un dueño inventado hace caer exactamente el caso del contenedor sin dueño.
- Diff: `outputs/p1-diff.txt`. Nombres retirados en código vigente fuera de la primitiva:
  ninguno.
- La implementación aplicada es `outputs/p1-recovered-wip.diff` (evidencia recuperada), en dos
  pasos: pruebas (RED) y código (GREEN).
