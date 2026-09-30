# Pool de PodmanWorkerManager — TASK-THYROX-0557

Fuente de verdad de los dos ítems. Contexto obligatorio antes de escribir:

- `src/packages/daemon/src/podman/podmanWorkerManager.ts` (commit ea0a48eec):
  el manager ya existe, con 19 casos sobre un Podman falso. NO se modifica en
  este pool; si un ítem mide que hace falta cambiarlo, lo dice en su respuesta
  con la causa medida.
- `src/packages/daemon/src/podman/workerContainerLifecycle.ts`: create, start,
  inspect, stop, rm y huérfanos, con vida por PID (TASK-THYROX-0605).
- `src/lib/podman_capabilities.sh`: cómo se construye aquí una imagen local
  SIN red —un ayudante estático en C, `podman import` de un tar propio— y cómo
  se limpia contenedor e imagen con un `trap`. Es la técnica a reutilizar.
- Contrato del ejecutor (TASK-THYROX-0556): el Daemon decide, el manager
  materializa, Podman aísla, el worker no conoce Podman. InfrastructureBootstrap
  (PostgreSQL, Redis) es otra rama y no se toca.

Hechos del anfitrión, medidos el 2026-09-30: Podman 4.9.3, cgroups v1, runc,
sin systemd; `bin/hardware-inventory` da `verdict none` (sin GPU).

## Ítem 1 — la prueba contra Podman real

Una suite `tests/daemon/test-podman-worker-manager-real.sh` que ejercita el
manager contra el Podman del anfitrión, con un guion `bun` junto a ella
(`tests/daemon/podman_worker_manager_probe.ts`) que llama al manager y
publica su resultado. Casos, cada uno con su aserción:

1. un worker CPU se lanza: su contenedor existe y su PID está vivo;
2. `retire` no deja ni contenedor ni proceso;
3. una imagen inexistente falla en la etapa `create` y no deja contenedor;
4. un comando que sale al instante falla en `liveness` y no deja contenedor;
5. un contenedor con la etiqueta de un daemon muerto lo retira `reconcileOrphans`;
6. un worker CUDA en este anfitrión rehúsa con exit 2 y no crea nada.

Rehúsa con exit 2 y sin conteo si falta Podman o gcc, igual que
`podman_capabilities.sh`. Los nombres de imagen y de worker llevan un
identificador de ejecución, y un `trap` retira todo lo creado aunque un caso
falle. Te pertenecen sólo `tests/daemon/**`.

## Ítem 2 — el ciclo de vida del manager dentro del daemon

El daemon de segundo plano (`bgDaemon.ts`, `bgDaemonMain`) posee un
`PodmanWorkerManager`: al arrancar llama a `reconcileOrphans` y al apagarse
(op `shutdown` y SIGTERM/SIGINT) a `retireAll`, antes de salir. Sin Podman en
el anfitrión el daemon arranca igual y lo declara en su log de supervisor con
la causa: no hay workers especializados que gestionar, y el daemon no se cae
por eso. El manager se inyecta (el daemon ya inyecta sus dependencias en
`bgDaemonMain`) para que la prueba use el Podman falso.

Declarar workers especializados en `daemon.json` NO entra: su primer
consumidor es `semantic_search_worker` (TASK-THYROX-0558) y la forma de esa
entrada la fija esa tarea. Te pertenecen `src/packages/daemon/src/bgDaemon.ts`,
los archivos que el cableado exija crear bajo `src/packages/daemon/src/` (no
`podman/podmanWorkerManager.ts`) y sus pruebas en
`src/packages/daemon/src/__tests__/`.

## Ítem 3 — TASK-THYROX-0657: el rechazo del proxy nombra la vía del store

Contexto medido en `.claude/workbench/credential-store-import-20260930T172522/`.
`thyrox providers add anthropic --credential-env <VAR>` ya guarda una clave
cifrada en el store de conexiones, y `resolveCredential` la lee
(`src/packages/cli/__tests__/providersAnthropicCredential.test.ts`). Pero
`src/packages/provider/bin/credentialProxy.ts`, al rehusar sin credencial,
sólo nombra las cuatro variables de entorno. El rechazo debe nombrar también
la vía del store: `bash bin/cli providers add anthropic --credential-env
<VAR>`, o sin `--credential-env` para el prompt oculto. El mensaje no cambia
de forma: sigue saliendo con 2, sin escuchar. Y el `README.md` de la raíz, en
su checklist de un clon nuevo, nombra esa vía como la forma de dar al pool
una credencial propia. Te pertenecen `src/packages/provider/bin/credentialProxy.ts`,
`src/packages/provider/__tests__/credentialProxyProcess.test.ts` y
`README.md`.

## Ítem 4 — TASK-THYROX-0658: `providers add --dry-run` no escribe

Medido: con `THYROX_PROVIDERS_DATA_DIR` apuntando a un directorio vacío,
`bin/cli providers add anthropic --credential-env X --dry-run` sale 0 con
`dry-run: would add claude/claude` y deja creado `connections.sqlite3`. El
store se abre con `openConnectionStore()` (`providers-commands.ts:69`), que lo
crea. Un ensayo no escribe: con `--dry-run` el verbo no debe crear el
archivo, y la prueba lo comprueba sobre un directorio vacío. Te pertenecen
`src/packages/cli/src/commands/providers-commands.ts`,
`src/packages/cli/src/commands/providers/writeVerbs.ts` y
`src/packages/cli/__tests__/providersWriteVerbs.test.ts`.
