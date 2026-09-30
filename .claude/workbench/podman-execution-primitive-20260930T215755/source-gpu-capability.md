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
   el backend; da `measured` / `absent` / `unavailable` / `error`. Nunca `0`
   sin medida. **El inventario da evidencia física; la telemetría la decide el
   backend**: `unavailable` = evidencia suficiente de GPU **y** ningún backend
   soportado da memoria. Un `partial` del inventario no se traduce a
   `unavailable` sin consultar el backend.
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

## Contratos cerrados por el ejecutor (ADR-007 1.6.1, commit `a918649ab`)

Estos gobiernan sobre cualquier lectura anterior de esta spec:

1. `hardware-inventory` → ¿hay evidencia de GPU?; `GpuMemoryBackend` → ¿puedo
   observar la memoria? Dos observaciones distintas.
2. La ausencia de backend **no es una implementación medible**: ninguna
   operación puede devolver una cantidad sin backend; devuelve el estado.
   `measured(0)`, `absent`, `unavailable` y `error` son disjuntos. Si existe
   un `NoGpuBackend`, sus operaciones de medida devuelven `absent`, nunca un
   número; mejor aún, que el tipo no lo permita.
3. `none` / `optional` / `required` es propiedad **declarada del trabajo**. El
   planificador no convierte `required` en `optional` ni decide ir a CPU.
   `none`: la VRAM no entra como dimensión de admisión. `required` sin backend
   válido: exit 2, no se ejecuta el trabajo, no se publica cifra.
4. `optional` se decide **antes** de ejecutar: backend y admisión posibles →
   ruta GPU; si no → ruta CPU declarada por el trabajo. Nunca «intentar GPU,
   fallar y repetir en CPU» salvo que el trabajo declare ese reintento.
5. `effective_available_ram()`: con límite efectivo de cgroup, `límite − uso`;
   sin límite, la del anfitrión. «Sin límite» es un estado, no `0` ni un
   número enorme. Se prueban las versiones de cgroups medidas (aquí v1); v2
   con un doble si no hay host v2.
6. Admisión (¿puede entrar?) y medida (¿cuánto consumió?) son APIs distintas.
   El pico del cgroup es la autoridad de la medida; GNU Time es secundaria.
7. Tras este ítem, `rg -n "nvidia-smi" src/session/*.py` sólo aparece en el
   backend NVIDIA y en la sonda de hardware (el nombre de la variable de
   configuración aparte). El resto trabaja con estado, memoria libre y uso por
   proceso, y se prueba con backends falsos sin simular el binario.
8. Reserva en el ledger sólo en la ruta GPU con backend válido: `none` → no;
   `optional` con ruta CPU → no; `optional`/`required` + backend + ruta GPU →
   sí. El ledger es uno por anfitrión.
9. La VRAM de un contenedor se atribuye por los PIDs de su cgroup vistos
   desde el anfitrión: prueba explícita a nivel de backend (un backend falso
   que reporta PIDs del anfitrión y un conjunto de PIDs del espacio del
   contenedor que no coinciden: la atribución usa los del anfitrión).
10. El historial conserva la ausencia de dimensión: `absent`, `unavailable` y
    `error` nunca se guardan como `0` ni entran en las estadísticas.
11. Nada de esto se cablea en `headless-pool.sh` (ítem B): el shell sólo
    orquestará APIs con contrato y prueba propios, sin ramas sobre
    `nvidia-smi` ni rutas de cgroup.

Pruebas añadidas por estos contratos: `partial` con backend NVIDIA usable da
`measured`; `partial` sin backend da `unavailable`; `optional` sin backend
elige la ruta CPU antes de ejecutar y no toca el ledger; «sin límite» de
cgroup no es `0`; el `rg` del punto 7 como prueba.
