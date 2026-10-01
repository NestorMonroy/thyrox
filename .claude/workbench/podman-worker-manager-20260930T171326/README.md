# podman-worker-manager

## El encargo

«vamos a empezar con PodmanWorkerManager sigue pendiente (TASK-THYROX-0557)», y
después: «porque no lo ejecutas via Pool lifecycle y recuerdas que tenemos que
usar bash».

## La premisa, si se corrigio al primer comando

La tarea pedía el manager «bajo el daemon». Medido antes de escribir:
perfiles (`workerResourceProfile`, `repositoryJobProfile`,
`specializedWorkerProfile`), ciclo de vida del contenedor
(`workerContainerLifecycle`) y admisión de VRAM (`gpuAdmission`) ya existían.
Faltaban el manager que los compone, un ejecutor real de `podman` y el cableado
al daemon. El ítem `p7` del banco `packages-20260930T052338` nunca corrió
(aquel pool se detuvo con 3 ítems), así que no había trabajo previo que
recuperar.

## Las piezas

| archivo | que hace |
|---|---|
| `src/packages/daemon/src/podman/podmanWorkerManager.ts` | el manager, el ejecutor real, el veredicto de hardware y el puerto de VRAM |
| `src/packages/daemon/src/__tests__/podmanWorkerManager.test.ts` | 19 casos con Podman y VRAM falsos |
| `src/packages/config/package.json` | exporta `@thyrox/config/gpuAdmission` |
| `probes/null_controls.sh` | anula tres guardas, una por vez |
| `probes/verify_manager.sh` | suites derivadas y typecheck, cada una con su exit |

## Los resultados

- Rojo antes del manager: `red.txt` (el módulo no existía).
- Verde: 100 casos en las cinco suites de `podman/` y 4 de `gpuAdmission`;
  typecheck 0 propios en `daemon` y `config` (`probes/verify_manager.out`).
- Anulaciones (`probes/null_controls.out`): vida por PID, liberar VRAM al
  fallar y un solo worker CUDA por dueño; cada una cae exactamente su caso, 18
  de 19 en pie.

Dos límites declarados en el módulo: sin `gpuDeviceArgv` medido la ruta CUDA
rehúsa con exit 2 (la bandera CDI no se inventa, TASK-THYROX-0617); y como
`gpu_monitor` suelta por dueño, un solo worker CUDA por daemon.

Pendiente, vía pool: la prueba contra Podman real y el cableado al daemon.

*Metrica:* casos en verde, casos que cae cada anulación y errores propios.
*Ciega a:* Podman real, GPU real y Podman rootless.
