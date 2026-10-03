# Search Existing — desalojo de residencias ociosas antes de admitir (H-THYROX-448)

| capacidad | autoridad | comportamiento medido | consumidores | pruebas | decisión |
|---|---|---|---|---|---|
| plan de admisión | `model-scheduling/hostCoordinator.ts` `ModelSchedulingCoordinator.admit` → `planOf` | resuelve, coloca y admite; el plan **no** lleva `memoryProfile` aunque el resolver lo calcula | coordinatorServer, localProxy, qualify | `scheduler.test.ts`, `hostCoordinator*` | EXTEND (llevar la memoria al plan) |
| reserva por residencia | `model-scheduling/residencyController.ts` `admit` | lease → reserva **sólo VRAM** (`ResidencyVramLedger`; capacidad `{}` en CPU) → grant → materializa | hostCoordinator | `residencyController.test.ts` | EXTEND (RAM además de VRAM) |
| desalojo | `residencyController.ts` `evict` (`EVICTABLE_STATES = resident, draining`; drena si hay activas) | existe y libera la unidad; nadie lo invoca al admitir | `model_coordinator stop` (todas) | `residencyController.test.ts` | REUSE |
| reserva de RAM | `src/session/resource_admission.py` `admit-ram` / `ResourceAdmissionCli.admitMemory` (`local-models/resourceAdmission.ts`) | comprobar-y-apartar bajo lock; dueño = **pid** con liveness; `--container` mide el uso en su cgroup | laboratorio de cuantización, import, artefactos externos | `test_resource_admission*` | REUSE con condición: una reserva por residencia necesita una identidad de dueño distinta del pid del coordinador, o el coordinador lleva la suma |
| estimación de memoria | `model-artifacts/memoryEstimate.ts` (`estimateServingMemoryFromShape`) | pesos + KV + buffers; **no** cuenta la caché de prompts (ahora desactivada: `LLAMA_ARG_CACHE_RAM=0`) | resolver | `memoryEstimate.test.ts` | REUSE |
| límite de la unidad | `local-models/hostCoordinatorComposition.ts` `UNIT_LIMITS.memoryMib=8192` | fijo para toda residencia | materializador | composición | sin cambio en esta tarea |

## Decisión pendiente antes de implementar

La reserva de RAM se indexa por pid vivo. Opciones medibles:

1. **El coordinador como único dueño** y la admisión compara `RAM libre medida − suma de residencias vivas` con el
   `memoryProfile` del plan; si no cabe, desaloja residencias con `activeRequests == 0` (las más antiguas
   primero) por `evict`, vuelve a medir y reserva. Mínimo cambio; la verdad sigue en `resource_admission`.
2. Una reserva por residencia en `resource_admission` con un dueño no-pid: EXTEND de esa autoridad (más amplio).

Recomendación: 1, por alcance; política inicial resultante en este anfitrión: un modelo generativo grande residente.
