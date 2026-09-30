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

## Cuatro correcciones del ejecutor (cierran el contrato previo a 0691)

Gobiernan sobre las secciones anteriores donde difieran.

1. **El backend no decide el estado final.** La ausencia de backend sólo
   significa «no hay telemetría»; nunca produce una cantidad. La capa de
   capacidad combina las dos observaciones:

   | evidencia de hardware | backend | estado |
   |---|---|---|
   | ninguna | ninguno | `absent` |
   | presente o `partial` | ninguno usable | `unavailable` |
   | presente o `partial` | usable | telemetría `available` |

   y sólo con telemetría `available` una medida concreta da `measured(...)` o
   `error`. `measured(0)`, `absent`, `unavailable` y `error` son disjuntos. Si
   existe un `NoGpuBackend`, representa «no hay backend», no `absent`.
2. **Capacidad y medida son dos etapas.** La prueba `partial` + backend usable
   verifica primero que la telemetría queda `available` y después, con un
   backend falso que da una lectura válida, que la medida es `measured`; y con
   uno que falla, `error`. Tres aserciones con nombre propio, no una.
3. **La invariante de `nvidia-smi` es de superficie, con lista de archivos
   permitidos.** Una prueba recorre todo el código de producción relevante
   (`src/session`, `src/lib`, `src/packages/*/src` y `bin` generado, Python,
   shell y TypeScript, sin pruebas ni `dist`) y exige que cada archivo con
   `nvidia-smi` esté en una lista explícita: el backend NVIDIA, la sonda de
   hardware y la configuración expresamente permitida. Compara archivos, no un
   conteo: una referencia nueva en cualquier sitio rompe la prueba.
4. **`effective_available_ram()`**:

   ```
   effective_limit = el límite aplicable más restrictivo del cgroup y sus
                     ancestros, normalizado
   si effective_limit está acotado: max(0, effective_limit − uso actual)
   si no:                           RAM disponible del anfitrión
   ```

   El valor «sin límite» de cgroup v1 (el número enorme de
   `memory.limit_in_bytes`) y `max` de v2 se normalizan a `unlimited` antes de
   restar: nunca se leen como RAM disponible. Archivos por versión:

   | | v1 | v2 |
   |---|---|---|
   | límite | `memory.limit_in_bytes` | `memory.max` |
   | uso | `memory.usage_in_bytes` | `memory.current` |
   | pico | `memory.max_usage_in_bytes` | `memory.peak`, si existe |

   Pruebas: límite en un ancestro más restrictivo que el propio; el sentinela
   de v1 da `unlimited`; uso por encima del límite da `0`, no negativo.

## Enmienda ADR-007 1.7.0 — lo que cambia para este ítem (`kaupamex-docs@fd4860384`)

Thyrox es la autoridad del model scheduling; los runtimes de modelos son
adapters. Este ítem NO construye el plano de control de modelos (catálogo,
resolver, scheduler, grant: otras tareas), pero **no puede cerrar el ledger
con la unidad `trabajo → reserva → PID`**, porque esas tareas lo extienden:

1. **Cada reserva nombra su dispositivo** (UUID de la GPU que da el backend).
   La admisión compara contra la memoria libre DE ESE dispositivo, nunca
   contra la suma del anfitrión: 4 GiB libres en una GPU y 10 en otra no
   admiten 12 GiB. Prueba: dos dispositivos falsos con 4 y 10 GiB, un pedido
   de 12 → rehusado; de 8 → admitido en el de 10.
2. **Cada reserva declara su tipo**: `worker` (lo de hoy), `residency` y
   `request` (reservados para el scheduler de modelos). El dueño de una
   `residency` no es un PID efímero sino una identidad de instancia con
   generación; una `request` apunta a su `residency`. Este ítem implementa el
   esquema y las operaciones con los tres tipos y prueba que liberar una
   `residency` con `request` vivas se rehúsa; el uso real de `residency`/`request`
   llega con el scheduler.
3. **La atribución por PIDs del cgroup sigue valiendo para workers**; para un
   runtime compartido la atribución sale del grant (otra tarea). No se
   generaliza aquí la regla de PIDs a modelos.
