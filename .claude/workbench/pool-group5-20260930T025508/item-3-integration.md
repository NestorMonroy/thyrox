# Ítem 3 — TASK-THYROX-0616, integrado a mano

Veredicto del pool: `rechazado`, pero por la infraestructura, no por el ítem:
`3.verify.log` dice `probes/verify-item.sh: No such file or directory`. El
checkout disperso excluía `.claude/workbench` entero, incluido el banco del
propio pool (corregido en TASK-THYROX-0633).

`3.patch` (`src/packages/daemon/src/podman/workerContainerLifecycle.ts` y su
prueba) se verificó en el árbol principal
(`.claude/jobs/g5-item3-verify-20260930T031339/`):

- `workerContainerLifecycle.test.ts`: 33/33, 48 expects;
- `check_package_typecheck --strict daemon`: 0 errores propios.

Controles de anulación declarados por el ítem (`3.json`): cada uno tumba
exactamente una de las 33 pruebas; entre ellos, retirar
`checkProcessAlive(inspection.pid)` de `isWorkerContainerProcessAlive`, que es
la regla de vivacidad por PID de la tarea.
