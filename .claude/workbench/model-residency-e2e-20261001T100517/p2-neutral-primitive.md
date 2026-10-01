# P2 — la unidad de modelo sobre la primitiva neutral de Podman

Tarea: TASK-THYROX-0702 (tarjeta 64). Archivos tuyos:
`src/packages/podman-execution/workerResourceProfile.ts`, `src/packages/podman-execution/workerContainerLifecycle.ts`
y `src/packages/model-scheduling/podmanModelExecutionPrimitive.ts`. Orden: los dos neutrales, luego la de modelos.

Pruebas: `podman-execution/__tests__/workerResourceProfile.test.ts`, `__tests__/workerContainerLifecycle.test.ts`
y `model-scheduling/__tests__/podmanModelExecutionPrimitive.test.ts`. Deben seguir verdes las demás de ambos paquetes.
Tras cambiar `podman-execution`, reconstruye sus tipos (`cd src/packages/podman-execution && bunx tsc -p tsconfig.build.json`):
`model-scheduling` los lee de `dist/`.

Primitiva neutral:
- `publishedPorts`: sólo `127.0.0.1` (si no, `publishedPorts.<i>.hostAddress`), puertos 1–65535
  (`publishedPorts.<i>.hostPort` / `.containerPort`), y sólo con red `bridge` (si no, `publishedPorts`). Se emiten
  como `-p 127.0.0.1:<host>:<contenedor>` tras el entorno.
- `devices`: forma CDI `<vendor>/<clase>=<nombre>` (si no, `devices.<i>`); se emiten como `--device <cdi>`.
- `ContainerOwnerKind` incluye `model-coordinator` (también en `OWNER_KINDS` y al inspeccionar).
- `labels` del spec: `--label k=v` ordenadas por clave, después de las de dueño y worker y antes de los límites
  e imagen; una clave vacía, con espacios o que sea `thyrox.owner-*`/`thyrox.worker-id` se rehúsa con campo `labels.<clave>`.

Primitiva de modelos: compone el `create` con `createWorkerContainerArgv({ workerId: unitId, image, owner, labels,
resourceArgv: workerResourceLimitArgv({ ...limits, network: 'bridge', readOnlyRootfs: false, mounts: [],
environment: profile.environment, publishedPorts: [{ hostAddress: '127.0.0.1', hostPort: port, containerPort:
profile.containerPort }], devices: <CDI de cada dispositivo del grant> }) })`; nunca red `host`. `destroy` usa
`removeWorkerContainerArgv(workerContainerName(unitId))` y distingue destruido, ausente y fallido como hoy. Los
nombres de contenedor son los de `workerContainerName`.
