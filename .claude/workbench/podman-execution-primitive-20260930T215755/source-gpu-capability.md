# Fuente de verdad — TASK-THYROX-0691: la GPU como capacidad opcional

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`
v1.6.0 (commit `685304ef5`), sección «La GPU es una capacidad opcional del
anfitrión». Parte de lo que entregue la corrección de medida de H-THYROX-294
(integrada antes de lanzar este ítem: léela en el árbol).

## Qué existe (P0 medido 2026-09-30)

- Trabajo CPU sin `nvidia-smi`: ya funciona. `headless-pool.sh:334-338`
  declara `gpu: sin nvidia-smi`, deja `HP_VRAM_NEED` vacío (sin admit ni
  ledger) y `pool_history.py:302` quita el tope de VRAM cuando la libre es
  `None`. **Se reutiliza; no se reescribe.**
- `gpu_monitor.py` ya distingue medida / `absent` / `error` (`GpuReading`),
  pero tiene 38 referencias directas a `nvidia-smi` y no conoce el estado
  `unavailable`.
- `bin/hardware-inventory` ya combina ocho señales y da `nvidia-usable` /
  `partial` / `none` (aquí: `none`). Es la sonda de capacidad: se reutiliza,
  no se escribe otra.
- `resource_admission.available_ram_kb` y `parallel_map_history.py:61-62`
  leen `/proc/meminfo`, que dentro de un contenedor con `--memory 512m` da la
  del anfitrión (6.8 GB, medido en
  `outputs/inside-container-measurement.txt`).
- Consumidores por CLI de `gpu_monitor`: `src/packages/config/gpuAdmission.ts`
  y `src/packages/daemon/src/podman/podmanWorkerManager.ts`: **su contrato de
  CLI no cambia de forma incompatible**.

## El contrato

1. **`GpuMemoryBackend`** (puerto): `available()`, `free_memory_mib()`,
   `usage_by_pid()` (para un conjunto de PIDs del anfitrión), `identity()`.
   Implementaciones: `NvidiaSmiBackend` (lo que hoy hace `gpu_monitor` con
   `nvidia-smi`) y `NoGpuBackend`. Ninguna otra parte del módulo nombra
   `nvidia-smi`.
2. **Sonda de capacidad**: elige el backend desde `bin/hardware-inventory` y
   la respuesta de `nvidia-smi`; da `measured` / `absent` / `unavailable`
   (`partial`: hay señales de GPU pero no telemetría) / `error`. Nunca `0`
   sin medida.
3. **Requisito por trabajo**: `none` | `optional` | `required`.
   `gpu_monitor admit` con requisito `required` y backend no válido sale 2 sin
   cifra; con `none` no toca el ledger; con `optional` sin backend sale con un
   código propio que el trabajo interpreta (el fallback lo decide el
   trabajo). Sin backend no se escribe ninguna reserva.
4. **RAM desde el cgroup**: `available_ram_kb` usa límite − uso del cgroup
   cuando el proceso corre bajo un límite de memoria (cgroups v1 y v2,
   medidos, no supuestos); `/proc/meminfo` sólo sin límite. El paralelismo
   anidado (`parallel_map_history`) hereda esa lectura.
5. Identificadores en inglés; comentarios en español técnico sin
   coloquialismos; clean-code (el backend se inyecta; nada de argumentos
   selectores `is_gpu`).

## Invariantes que la suite prueba

| # | Invariante |
|---|---|
| 1 | sin `nvidia-smi`, un trabajo CPU corre y su anchura no se reduce |
| 2 | la ausencia de `nvidia-smi` nunca produce `VRAM = 0` |
| 3 | un trabajo `required` sin backend válido rehúsa (exit 2) sin cifra |
| 4 | un trabajo `none` nunca queda bloqueado por el ledger |
| 5 | `absent`, `unavailable`, `error` y `measured(0)` no se confunden |
| 6 | con backend, dos pools no reservan la misma VRAM (suite existente) |
| 7 | la muerte del dueño libera su reserva (suite existente) |
| 8 | la VRAM se atribuye por PIDs del anfitrión, no por los del espacio del contenedor |
| 9 | la RAM libre bajo un límite de cgroup sale del cgroup, no de `/proc/meminfo` |
| 10 | un paralelismo anidado respeta el límite de su cgroup |
| 11 | sin hardware o telemetría hay un estado explícito, nunca una cifra |

Controles de anulación, con números: `NoGpuBackend` devolviendo 0 en vez de
`absent` hace caer 2 y 5; ignorar el requisito `required` hace caer 3; leer
`/proc/meminfo` con límite hace caer 9 y 10. Las suites existentes
(`test_gpu_monitor.py`, `test_gpu_scenarios.py`, `test-gpu-admission-cli.sh`,
`test-gpu-hardware-refusal.sh`, `test_resource_admission.py`,
`test_pool_history.py`, `test_parallel_map_history.py` y
`src/packages/config/__tests__/gpuAdmission.test.ts`) siguen verdes.
