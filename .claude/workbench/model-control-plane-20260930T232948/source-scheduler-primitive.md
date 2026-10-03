# Fuente de verdad — ModelScheduler + ExecutionGrant (0699) y la primitiva que materializa el grant (0702)

Gobierna ADR-007 1.7.0 y 1.7.1
(`kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`,
sección «Thyrox es la autoridad del model scheduling»), con sus invariantes
M1–M7 y «estado observado ⊆ estado autorizado por los grants activos».

El contrato compartido ya está escrito y **ningún ítem lo modifica**:
`src/packages/model-artifacts/executionGrant.ts` (`ExecutionGrant`,
`ExecutionPlacement`, `ResidencyAssignment`, `ModelRuntime`). Se reusan
`resolveModel`/`ResolvedModel` (`model-artifacts/modelResolver.ts`) y el
ledger de VRAM por dispositivo y por tipo que dejó TASK-THYROX-0691
(`src/session/gpu_monitor.py`: `VramLedger`, `WorkerReservation`,
`ResidencyReservation`, `RequestReservation`, `choose_device`,
`release_residency`, `ResidencyBusy`; su cara TS es
`src/packages/config/gpuAdmission.ts`, que lanza `bin/gpu_monitor`). **El
ledger no se reimplementa en TS**: una sola implementación, la de Python.

## scheduler — TASK-THYROX-0699 (board: «Schedule model execution and issue ExecutionGrants»)

Responde CPU o GPU, qué dispositivo, reutilizar o crear residencia y la
concurrencia permitida. No mide memoria ni materializa la ejecución.

1. **CLI del ledger** (`src/session/gpu_monitor.py`, sólo la superficie de
   línea de comandos y lo que necesite): `admit` acepta `--kind
   residency --instance <id> --generation <n> [--device <uuid>]` y `--kind
   request --request-id <id> --residency <instance:generation>`; nuevos
   `release-residency --instance --generation` (sale con un código propio si
   `ResidencyBusy`) y `snapshot --ledger` que imprime las reservas vivas en
   JSON (tipo, dispositivo, MiB, dueño). El `admit` sin `--kind` sigue siendo
   `worker` y su conducta no cambia. Pruebas en `tests/session/test_gpu_monitor.py`
   y `tests/session/test-gpu-admission-cli.sh`.
2. **Cara TS** (`src/packages/config/gpuAdmission.ts`): `admitResidency`,
   `admitRequest`, `releaseResidency`, `releaseRequest`, `vramSnapshot`,
   por la misma vía (`bin/gpu_monitor`), con sus códigos de salida traducidos
   y nunca un número inventado si no pudo medir. Pruebas en
   `src/packages/config/__tests__/gpuAdmission.test.ts` con el `nvidia-smi`
   falso que esa suite ya usa.
3. **Paquete nuevo `src/packages/model-scheduler/`** (`@thyrox/model-scheduler`,
   mismo andamiaje que `model-artifacts`: `package.json`, `tsconfig.build.json`,
   `tsconfig.test.json`, `bunfig.toml`):
   - `ResourcePlanner` (puro): dado un `ResolvedModel`, el requisito de GPU
     (`none|optional|required`) y un inventario observado (dispositivos con su
     margen en MiB, RAM disponible), propone un placement candidato. No
     reserva.
   - `ResidencyController` (puro en su decisión): dado el snapshot de
     residencias vivas, decide `reuse` (misma revisión, cuantización, contexto
     y caché KV ya residente con concurrencia libre) o `create` (generación
     nueva). Una residencia existente nunca se reserva otra vez (M7).
   - `ModelScheduler.schedule(request)` — resuelve con `resolveModel`, planea,
     reserva por el puerto del ledger (`residency` si crea, siempre `request`)
     y sólo entonces emite el `ExecutionGrant` con caducidad. Si la reserva
     falla no hay grant (M1). Con `optional` sin sitio en GPU cae a CPU de
     forma declarada; con `required` rehúsa. Nunca cambia la cuantización ni
     la revisión que el resolver dio (M5).
   - `releaseGrant(grant)` suelta la `request` y, si el controlador retira la
     residencia, la `residency`.
   - El ledger entra por un puerto (interfaz) inyectado; las pruebas usan un
     doble en memoria **y** al menos una prueba de integración contra
     `bin/gpu_monitor` real con el `nvidia-smi` falso.

Casos mínimos: CPU con `none`; GPU con el dispositivo de más margen; dos
dispositivos de 4 y 10 GiB y un modelo de 8 → el de 10; 12 → rehúsa con
`required`, CPU con `optional`; segunda petición sobre la misma variante →
`reuse` sin segunda `residency`; variante distinta → `create`; reserva
rehusada → sin grant; grant caducado; `releaseGrant` con y sin retiro.

## primitive — TASK-THYROX-0702 (board: «Extend the Podman primitive to materialize a granted model execution unit»)

Responde cómo se materializa una ejecución concedida. No decide modelo,
cuantización, CPU/GPU, dispositivo ni residencia.

Hoy la primitiva (`src/packages/podman-execution/`) materializa *trabajos*
(crear, correr hasta terminar, exportar, retirar, huérfanos). Le falta una
**unidad de servicio de larga vida** creada desde un grant:

1. `modelExecutionUnit.ts` (nuevo): `modelUnitArgv(grant, runtime)` —
   el argv de `podman create` para una unidad de larga vida: nombre derivado
   de la residencia (`instance` + `generation`), etiquetas
   `io.thyrox.role=model-runtime`, `io.thyrox.grant=<grantId>`,
   `io.thyrox.residency=<instance>:<generation>`, los dispositivos **del
   grant y sólo ésos** (CDI `nvidia.com/gpu=<uuid>` por dispositivo; ninguno
   en CPU), el volumen de modelos y el puerto de la API del runtime en
   loopback. La imagen y el volumen son parámetros del consumidor (DEC-04).
2. `materializeGrant(podman, grant, runtime, now)` — rehúsa un grant caducado
   (M1) o con `placement.kind: 'gpu'` sin dispositivos (M6), crea y arranca la
   unidad y devuelve su descripción observada: contenedor, cgroup y PIDs vistos
   desde el anfitrión (`podman inspect`). Con `residency.mode: 'reuse'` no
   crea nada: localiza la unidad viva por su etiqueta de residencia y la
   devuelve, o rehúsa si no existe.
3. `retireUnit(podman, residency)` y `unitsWithoutGrant(podman, activeGrants)`
   — la lista de unidades con etiqueta `model-runtime` cuya residencia no
   está en ningún grant activo: la entrada de la reconciliación («estado
   observado ⊆ autorizado»). Selecciona por etiqueta, nunca por prefijo de
   nombre.
4. Pruebas en `src/packages/podman-execution/__tests__/` con el
   `PodmanExecutor` falso del paquete: argv exacto en CPU y en GPU, dispositivo
   ajeno al grant ausente del argv, grant caducado, GPU sin dispositivos,
   `reuse` sin crear, `reuse` sin unidad viva, huérfano sin grant.

La topología (A: contenedor por residencia, o B: un runtime con varias) la
decide el ejecutor; este ítem implementa **A** como la forma por defecto sin
impedir B: una residencia ↔ una unidad.

## Para los dos

Pruebas en la forma del árbol (`bun test` desde el paquete; Python con
`python3 <archivo>`). Controles de anulación con números por cada rama nueva.
`bash bin/check_package_typecheck --strict <paquetes>` y `bash
bin/check_lint_zero <.py/.sh>` en cero.
