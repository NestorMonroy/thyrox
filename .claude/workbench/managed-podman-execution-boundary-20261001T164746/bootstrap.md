# Excepción de bootstrap: P2d, P2e y P3 corren sobre el mecanismo que P3 sustituye

Declarada el 2026-10-02T04:49:05 por decisión del ejecutor. No es precedente: es una excepción con nombre,
alcance cerrado y fecha de caducidad medible.

## El problema

P3 es el ítem que hace que `headless-pool` despache el payload de cada ítem por
`ExecutionAuthorization -> PodmanExecutionPrimitive -> ExecutionUnit`, conservando worktree,
lifecycle, generaciones, snapshots/recovery, `run.lock`, `<n>.closed` y `pool_integrate`.
Mientras P3 no esté aceptado, no existe un pool que ejecute ítems de forma gestionada; por tanto
P2d, P2e y el propio P3 no pueden correr sobre él.

## Qué autoriza la migración (mecanismo M0)

El controlador de continuación ya aceptado (`src/session/task_continuation.py`, commits
`f56a646c1` y `c9cdb5591`) despachando por `thyrox-bg start --task` (`9429f0984`):

- cada intento, cada verificación y cada commit corren en una `ExecutionUnit` materializada por
  la primitiva, con `.env` enmascarado y la clave del proveedor como secreto montado;
- `ManagedExecutionContainmentGate` (`contained()`) rehúsa aceptar un paso que no corrió en su
  unidad;
- el gate de herencia de secretos corre antes de despachar;
- los modelos son sólo `qwen3.8-flash` y `deepseek-v4.1-flash`; sin candidato, el ítem se
  bloquea; nunca hay respaldo a Claude.

## Qué sigue corriendo bajo M0 y no bajo el contrato final

- el checkout compartido: sin worktree por ítem, sin `<n>.closed`, sin generaciones, sin
  snapshots, sin `process_ownership drain`, sin `writer_inspector` antes de publicar; los tres
  ítems corren en serie (`run-one`), nunca en paralelo;
- el dueño de las unidades es `kind=task`, no `kind=pool`;
- el perfil de recursos sólo admite `cpus`, `memoryMib` y `pids`: `gpu: none` y la red no
  se pueden declarar en el plan; la red es `host` porque el trabajador habla con el proveedor;
- el banco y estos verificadores los escribe el operador en el anfitrión (plano de control).

## Lo que M0 sí tiene que cumplir aquí, añadido para esta excepción

- `verify/scope.sh`: el ítem falla si cambió cualquier ruta fuera de las declaradas, aunque no
  fuese a entrar en el commit;
- `verify/red_against_base.sh` con `verify/changed_tests.sh`: las pruebas que el ítem añadió o
  cambió se corren contra el commit base (tienen que fallar) y contra el cambio (tienen que pasar),
  medido por el verificador; la anulación de rama fina sigue siendo evidencia del ítem;
- P3 se acepta en dos fases: la aceptación del controlador (implementación) y la prueba de plano
  de control de `p3-headless-pool-managed-execution.md` («Invariantes que verifica el plano de
  control»). Sin la segunda, P3 NO está aceptado aunque el controlador haya commiteado.

## Alcance y caducidad

- Vale SÓLO para las filas `p2d`, `p2e` y `p3` de `plan.jsonl` de este banco.
- Caduca cuando la prueba de plano de control de P3 pase. Desde ese momento, todo ítem que mute
  el árbol corre por `headless-pool --isolation worktree` + `pool_integrate` (paso 5 del orden
  del ejecutor), incluidos P4, P5 y la repetición de S1.
- Ningún banco nuevo puede citar esta excepción.

## Medido al preparar la excepción: una unidad no alcanza Podman

`outputs/unit-podman-reachability.log`: dentro de una unidad no hay `podman` en el PATH ni socket
(`/run/podman/podman.sock`, `/run/user/0/podman/podman.sock`). Ni el trabajador ni la verificación
del controlador pueden materializar unidades. Por eso las demostraciones con unidades reales de p2d
(`probes/p2d_control_plane.sh`) y de p3 (invariantes del contrato) son fases de plano de control: el
anfitrión lanza por la entrada canónica y observa, el payload corre en unidades. Un ítem cuya
segunda fase no ha pasado no está aceptado, aunque el controlador lo haya commiteado.

## Filas aplazadas

`p4a`, `p4b`, `p4c`, `p5a` y `p5b` salieron de `plan.jsonl` a `plan-after-p3.jsonl`: bajo esta
excepción no pueden correr, y en un plan secuencial el controlador las despacharía en cuanto p3
fuese aceptado. Vuelven al plan cuando la prueba de plano de control de p3 pase, para correr por el
pool (paso 5 del orden del ejecutor).
