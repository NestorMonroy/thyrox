# P2 — registro de residencias y ResidencyController

Tarea: TASK-THYROX-0699 (tarjeta 61). Archivos tuyos: `src/packages/model-scheduling/residency.ts`
(`ResidencyRegistry.plan` y `transition`) y `src/packages/model-scheduling/residencyController.ts`.
Orden: el registro primero (`__tests__/residency.test.ts`), luego el controlador
(`__tests__/residencyController.test.ts`). Debe seguir verde `__tests__/scheduler.test.ts`.

Lee completos: `executionPrimitive.ts` (puerto), `scheduler.ts` (cómo se apilan y deshacen las
compensaciones: `CompensationStack`, `markOnThrow`; reutilízalos exportándolos si hace falta, sin
cambiar su comportamiento ni duplicarlos), `testing/schedulerFakes.ts` (los dobles: su diario es lo que
las pruebas afirman) y `kaupamex-docs: source/thyrox/arquitectura/operacion-residencia-de-modelo.rst`.

Registro: `plan` abre `planned` con la generación dada y reemplaza sólo una residencia `absent` (o
inexistente); con una viva lanza. `transition` exige la generación vigente (si no, `StaleGenerationError`)
y una arista de `RESIDENCY_TRANSITIONS` (si no, `InvalidResidencyTransitionError`), y aplica `changes`.

Controlador — establecer (`admit` sin residencia `resident`):
lease (`acquireResidency`) → `registry.plan` → `ledger.reserve` con `residencyVramMib` (sólo la
residencia) → `issuer.issue` → `materializing` → `primitive.materialize` → la generación del lease sigue
vigente (`coordination.currentGeneration`; si no: etapa `generation`, destruir la unidad, no tocar el
runtime) → `loading` con `unitId` → `probeHealth` hasta `health.attempts` veces con `sleep(intervalMs)`
entre intentos (no tras el último) → `prepareRuntimeArtifact` → `verifyArtifactIdentity` (`mismatch` o
`failed`: etapa `verify`, sin cargar) → `loadResidency` (`stale_generation` o `failed`: etapa `load`) →
`observeResidency` (distinto de `resident`: etapa `observe`) → `resident` → `allocateRequest` con
`requestVramMib` → `activeRequests` + 1. Cada fallo deshace en orden inverso (destroy, reserva, grant,
lease) y deja la residencia `absent` si nada quedó marcado, `error` si sí.
Reutilizar (`admit` con residencia `resident`): sólo `allocateRequest`, `reused: true`, sin materializar.
Con la residencia en `draining`/`evicting`: `refused`.
`finish`: `releaseRequest` y `activeRequests` − 1.
`evict`: sin residencia o no `resident`/`draining`: `refused`. `resident` → `draining`; con activas > 0
devuelve `draining`. Con 0: `evicting` → `unloadResidency` (su fallo no detiene nada) →
`primitive.destroy` (`failed` → marca `unit`, residencia `error`, VRAM retenida) → `primitive.units()`
confirma que la unidad ya no está (si sigue: `failed`, VRAM retenida) → `ledger.release` →
`issuer.revoke` → `coordination.release` → `absent`. El diario esperado está en la prueba.
