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

## Implementado (opción 1)

| eslabón | prueba | RED | GREEN | anulación |
|---|---|---|---|---|
| `resource_admission headroom-ram` (sólo lectura) | caso 26 de `test_resource_admission.py` | 1 falla | 83/83 | sin descontar reservas: caen exactamente las 2 del descuento |
| `ExecutionPlan.memoryBytes` ← `memoryProfile.totalBytes` (`planOf`) | `hostCoordinator.test.ts` | 1 falla | 10/10 | cae exactamente esa |
| `ResidencyController` mide y desaloja ociosas antes de `establish` (`makeRoom`, puerto `RamHeadroom`) | 3 pruebas en `residencyController.test.ts` | 3 fallas | 19/19 | sin `makeRoom`: caen las 3; sin el `evict`: cae sólo la del desalojo |
| `ResourceAdmissionCli.availableBytes` (adaptador de la autoridad) | `local-models/__tests__/resourceAdmission.test.ts` | 2 fallas | 2/2 | — (adaptador nuevo) |
| composición: `ramHeadroom` por defecto = `bin/resource_admission` | `hostCoordinatorComposition.test.ts` 7/7 | — | — | se verifica en real |

Suites: model-scheduling 136/136; model-artifacts 218/218; local-models 259 pass / 5 fail, **los mismos 5 en HEAD**
(257/5, `local-models-qualify` sólo falla en la corrida completa del paquete; por separado 8/8 en los dos árboles).
*Ciega a*: la carrera con otros admisores entre medir y cargar; la memoria real del proceso frente a la estimada.
Pendiente: el control real (un coordinador vivo que desaloje la residencia ociosa al pedir otro contexto).

## Control real 1 (`probes/real_eviction.run1.out`)

Coordinador reiniciado con el código nuevo; tres admisiones soltadas al momento:
`ctx16384` (holgura 9 969 724 kB) → `ctx24576` (9 981 488 kB) → antes de `ctx32768` 3 777 724 kB: desalojó la ociosa
más antigua (`ctx16384`) y cargó la nueva. Final: unidades `ctx24576,ctx32768`, **holgura 1 406 732 kB**.
El desalojo funciona; pero «cabe justo» deja 1.4 GB para el resto del anfitrión. Cargar `ctx16384` apenas movió
la holgura (pesos mapeados de archivo, recuperables: hipótesis, no medida).

## Piso de RAM (EXTEND de `resource_admission`, simétrico al de disco)

`THYROX_RAM_ADMISSION_FLOOR_MB` (2048 por defecto) descontado en `ram_headroom`, la fuente única de `admit-ram` y
`headroom-ram`. Caso 27: RED 2 fallas → GREEN 86/86; anulación: caen exactamente sus 2. Consumidores:
infrastructure-ensure 54/54, container_measure 21/21; headless-pool 145/146 y parallel-map (2 fallas), **las mismas en HEAD**.

## Control real 2 y línea temporal: la causa era la estimación, no el desalojo

`probes/headroom_timeline.run3.out` (muestra cada segundo): tras desalojar `ctx16384` la holgura sube a 6.87 GB; la
memoria de `ctx32768` llega durante su carga (≈8–14 s tras aparecer la unidad) y baja la holgura ≈7.5 GB, a −0.7 GB.
`makeRoom` no desalojó `ctx24576` porque el plan declaraba **5 518 MiB** (`probes/plan_memory.ts`): `attentionShapeOf`
derivaba `headDimension = embedding_length / head_count = 2560/32 = 80` e ignoraba `qwen3.attention.key_length = 128`
del GGUF real; la caché KV salía al 62.5 %.

- EXTEND `memoryEstimate.ts` (`headDimensionOf`): el `key_length` declarado manda. RED → GREEN 18/18; anulación exacta.
- La entrada instalada guardaba la forma vieja y el catálogo es inmutable por entrada. EXTEND estrecho:
  `ModelCatalog.withRederived` sustituye sólo si todo salvo `attention` es idéntico (otra diferencia: conflicto;
  entrada ausente: `CatalogEntryMissingError`). RED → GREEN 59/59; sin la guarda de identidad cae exactamente su prueba.
- Aplicado con `probes/rederive_catalog_attention.ts` (la misma `catalogEntryFromGguf`): `headDimension 80 → 128`, ningún
  otro campo cambia (diff del catálogo sin `attention`: vacío). Plan de `ctx32768`: 7 246 MiB.
Suites: model-artifacts 222/222, model-scheduling 136/136, local-models 259/5 (los 5 de HEAD).
