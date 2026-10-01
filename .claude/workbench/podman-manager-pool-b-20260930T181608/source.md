# Segundo pool de PodmanWorkerManager — TASK-THYROX-0557 y TASK-THYROX-0659

Contexto: el primer pool (`.claude/workbench/podman-manager-pool-20260930T171944`, salida `outputs-2`) integró los ítems 3 y
4 (`f51f7a7c5`). Estos tres ítems no comparten archivos.

## Ítem A — TASK-THYROX-0557: la prueba contra Podman real y el contrato de hardware-inventory

El ítem 1 del primer pool escribió `tests/daemon/test-podman-worker-manager-real.sh`
y `tests/daemon/podman_worker_manager_probe.ts`; su parche está en
`/home/user/thyrox/.claude/workbench/podman-manager-pool-b-20260930T181608/item1-real-podman.patch` y se aplica con `git apply` como punto de
partida. Contra el Podman real dio 17 de 18 casos. Falló el caso 6 (CUDA
rehúsa con exit 2): `readHardwareVerdict` en
`src/packages/daemon/src/podman/podmanWorkerManager.ts` trata como error
cualquier salida distinta de 0 de `bin/hardware-inventory`, y su contrato
(`src/session/hardware-inventory.sh:19-22`) es otro: `nvidia-usable` sale
0, `none` sale 1, `partial` sale 3 y 2 es «no pude medir». Medido en este
anfitrión: sale 1 con `verdict none`.

Corrige `readHardwareVerdict` para que 0, 1 y 3 sean veredictos medidos,
comprobando que la línea `verdict` coincide con el código de salida, y que 2
o cualquier otro código lance un error con su stderr: no poder medir no es
`none`. Pruébalo en la suite unitaria con un `bin/hardware-inventory`
falso bajo un `THYROX_ROOT` temporal (los cinco casos: 0, 1, 3, 2 y una
línea que contradice su código), y deja la suite real en 18 de 18. Te
pertenecen `src/packages/daemon/src/podman/podmanWorkerManager.ts`,
`src/packages/daemon/src/__tests__/podmanWorkerManager.test.ts` y
`tests/daemon/**`.

## Ítem B — TASK-THYROX-0557: el ciclo de vida del manager dentro del daemon

El mismo encargo que el ítem 2 del primer pool, que murió con un 400 del
proxy local antes de trabajar (`/home/user/thyrox/.claude/workbench/podman-manager-pool-20260930T171944/source.md`, sección «Ítem 2»):
`bgDaemonMain` posee un `PodmanWorkerManager` inyectado; al arrancar
llama a `reconcileOrphans` y al apagarse (op `shutdown`, SIGTERM, SIGINT)
a `retireAll` antes de salir. Sin Podman en el anfitrión el daemon arranca
igual y lo declara en su log de supervisor con la causa. Declarar workers
especializados en `daemon.json` no entra: es de TASK-THYROX-0558. Te
pertenecen `src/packages/daemon/src/bgDaemon.ts`, los archivos nuevos que el
cableado exija bajo `src/packages/daemon/src/` (no `podman/`) y sus
pruebas en `src/packages/daemon/src/__tests__/` (no
`podmanWorkerManager.test.ts`).

## Ítem C — TASK-THYROX-0659: el 400 del proxy local nombra lo que esperaba

`src/packages/provider/src/proxy/claudeCli/forwarder.ts:256` responde 400
«ninguna llamada suspendida espera el tool_use X» nombrando sólo el id
inesperado. El ítem 2 del primer pool murió así (`/home/user/thyrox/.claude/workbench/podman-manager-pool-20260930T171944/outputs-2/2.err`), con
el stream vacío y sin log del proxy: la causa no se puede reconstruir. El 400
debe nombrar también los `tool_use` que el turno vivo sí espera (o decir que
no espera ninguno), para que la próxima vez traiga su evidencia. Prueba en
`src/packages/provider/src/proxy/__tests__/claudeCliUpstream.test.ts`, con
el control de anulación. Te pertenecen `forwarder.ts`, lo que su cambio
exija en `src/packages/provider/src/proxy/claudeCli/` y esa prueba.
