# P1 — ModelSchedulingCoordinator y el grant en la admisión

Tarea: TASK-THYROX-0734 (tarjeta 96). Archivos tuyos: `src/packages/model-scheduling/hostCoordinator.ts` y
`src/packages/model-scheduling/residencyController.ts`. Orden: primero el controlador, luego el coordinador.

Lee completos: `hostCoordinator.ts` (contrato y docstring), `residencyController.ts`, `residency.ts`,
`executionPrimitive.ts`, `testing/schedulerFakes.ts`, `@thyrox/model-artifacts/modelResolver.ts`
(`resolveModel`, sus errores) y `kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`,
sección «Un coordinador de model scheduling por anfitrión (enmienda 1.14.0)».

Controlador (`__tests__/residencyController.test.ts`, todas): `Admission` ahora lleva `grant`, el de la residencia;
una admisión que reutiliza devuelve el mismo grant. Guárdalo con la residencia al emitirlo y suéltalo al desalojar.

Coordinador (`__tests__/hostCoordinator.test.ts`):
- `residencyKeyOf(artifact, placement)`: `residency/<modelId>@<artifactId>/<cpu | gpu:<dispositivos ordenados, por coma>>`;
  determinista; cambia con cualquier campo de identidad que el nombre no fija (el artifactId) y con la colocación.
- `admit`: resuelve con `resolveModel({ model, contextLength, requiredCapabilities }, await catalogEntries())`; un error
  del resolver es `refused` en `resolve` sin tocar nada más. `place(resolved)` `undefined` es `refused` en `placement`.
  Si no, arma el `ExecutionPlan` (requestId, owner, residencyKey, `resolved.artifact`, runtime, placement, VRAM,
  `resolved.contextLength`, `resolved.kvCacheType`) y llama a `controller.admit`; `admitted` produce un ticket con
  `newAdmissionId()`, `grant` y `unit` de la admisión; `refused`/`failed` se devuelven con su etapa y causa.
- `finish(admissionId)`: `controller.finish` de esa admisión y la retira; desconocida o ya soltada, `absent`.
- `evict(residencyKey)`: delega en el controlador. `admissions()`: los tickets vigentes en orden de admisión.
