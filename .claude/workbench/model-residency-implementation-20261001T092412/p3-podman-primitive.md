# P3 — PodmanModelExecutionPrimitive

Tarea: TASK-THYROX-0702 (tarjeta 64). Archivo tuyo: `src/packages/model-scheduling/podmanModelExecutionPrimitive.ts`.
Pruebas: `__tests__/podmanModelExecutionPrimitive.test.ts`.

Lee: `executionPrimitive.ts`, el docstring del archivo, y en `src/packages/podman-execution/`
`podmanExecutor.ts` y `containerRun.ts` (cómo se compone argv y se interpreta una salida; reutiliza lo que
sirva sin modificar ese paquete).

`materialize`: sin tocar Podman, rechaza `expired_grant` (`now() >= expiresAt`) y `stale_generation`
(generación distinta de la vigente, o coordinación `unavailable`); sin perfil para el runtime: `failed`,
`partial: false`. Luego: `allocatePort`; `podman create` con `--name thyrox-model-<unitId>`,
`--network host`, `--env` del perfil, `--label` de cada clave de `MODEL_UNIT_LABELS`, y por cada
dispositivo de una colocación GPU `--device nvidia.com/gpu=<uuid>`, terminando en la imagen del perfil;
`podman start`; `podman inspect --format json` para `Pid` y `CgroupPath`. Un fallo de `create` es
`partial: false`; uno posterior, `partial: true` con `unitId`. `unitId` es `unit-<grantId>`.
`destroy`: `podman rm --force thyrox-model-<unitId>`; 0 → `destroyed`; stderr con «no such container» →
`absent`; otro → `failed`. `units`: `podman ps --all --filter label=<MODEL_UNIT_LABELS.unit> --format json`,
reconstruye cada unidad de sus etiquetas e ignora las que no las tengan. Nunca `rmi` ni `volume rm`.
