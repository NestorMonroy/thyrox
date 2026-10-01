# Fuente de verdad — TASK-THYROX-0667, ítem A: la primitiva neutral de ejecución Podman

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`
v1.5.0, sección «Mecanismo compartido, dueños distintos» (commit `2247d2c01`).
Léela completa. La regla: **implementación compartida ≠ dueño compartido**.

## Qué existe (P0 medido)

- `src/packages/daemon/src/podman/workerContainerLifecycle.ts`: create /
  inspect / stop / remove / retire y barrido de huérfanos. Es el mecanismo
  correcto con la propiedad del daemon incrustada: `WorkerContainerSpec.daemonPid`
  obligatorio, etiqueta `thyrox.daemon-pid`, «huérfano» = «daemon muerto»,
  importa `isProcessAlive` de `../daemonLock.js`, prefijo `thyrox-worker-`.
- `repositoryJobProfile.ts` (repo `:O` en `/w`) y `workerResourceProfile.ts`:
  perfiles sin dueño (EXISTS_AND_REUSE). `specializedWorkerProfile.ts` es del
  daemon y se queda.
- Consumidores: `podmanWorkerManager.ts` y `podmanWorkerSupervision.ts`, y sus
  pruebas. `bgDaemon.ts` usa `createDaemonPodmanWorkers` de
  `podmanWorkerSupervision.ts`: **no lo toques** (es de otro ítem en vuelo).
- Capacidades medidas hoy con `bin/podman_capabilities`: run, pids/memory/cpu
  limit, cleanup, network none, read-only rootfs, readonly y overlay mount,
  propagación de exit code y de SIGTERM: efectivas. Inyectar un secreto sin
  exponerlo en `inspect`: no efectiva (no se usa: el ítem no recibe credencial).

## El contrato

1. **Paquete nuevo** `src/packages/podman-execution/` (`@thyrox/podman-execution`,
   miembro del workspace; en `bun.lock` sólo sus líneas). Posee sólo: crear y
   correr el contenedor, aplicar el perfil de recursos, montar, configurar la
   red, enviar señales, recoger el código de salida, exportar artefactos y
   limpiar. No posee máquina de estados, generaciones, snapshots,
   recuperación, publicación ni admisión.
2. **Dueño neutral**: la etiqueta pasa a `thyrox.owner-kind` (`daemon` |
   `pool`), `thyrox.owner-id` y `thyrox.owner-pid`. Qué es un huérfano lo
   decide **el dueño**: la primitiva recibe el predicado. El daemon conserva
   exactamente su política (daemon muerto ⇒ huérfano) a través de él; un
   contenedor del pool nunca lo retira el daemon, y viceversa.
3. **Correr hasta terminar**: `runToCompletion(spec)` crea, arranca, espera y
   devuelve el código de salida; `signal(name, sig)` propaga SIGTERM.
4. **Exportar antes de limpiar**: `exportArtifacts(name, containerPaths,
   hostDir)` copia (`podman cp`) lo pedido al host mientras el contenedor
   existe; la limpieza nunca va antes que la exportación.
5. **Mover, no copiar**: `workerContainerLifecycle.ts`, `repositoryJobProfile.ts`
   y `workerResourceProfile.ts` pasan al paquete nuevo; los archivos del daemon
   quedan como adaptadores finos o sus importadores apuntan al paquete. Sin
   dos implementaciones.
6. **Pruebas** (Podman real en este contenedor, más dobles donde haga falta):
   - un contenedor corre y su código de salida (p. ej. 42) llega al llamador;
   - SIGTERM llega y el código es el del proceso;
   - una escritura en `/w` (overlay) no aparece en el host;
   - un artefacto se exporta antes de la limpieza y sigue ahí tras ella;
   - tras limpiar no queda contenedor listado;
   - un contenedor de dueño `pool` no lo retira el barrido del daemon, y uno
     de un daemon muerto sí (la política del daemon intacta);
   - sin el daemon en marcha, la primitiva funciona;
   - las suites existentes del daemon (`podmanWorkerManager`,
     `podmanWorkerSupervision`, `workerContainerLifecycle`,
     `bgDaemonWorkerSupervision`) siguen verdes.
   Controles de anulación, con números: sin el predicado del dueño el
   contenedor del pool cae en el barrido del daemon; exportando después de
   limpiar, la prueba de exportación cae; sin el montaje `:O`, la de no-fuga cae.
