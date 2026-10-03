# Desviaciones de la regla «sólo observar» durante esta auditoría

1. `bash bin/podman_capabilities --help` (2026-10-03T20:5xZ) no muestra ayuda: corre
   sus sondas, que lanzan contenedores efímeros de prueba (run, pids, memory, cpu,
   network none, read-only, mounts, señales, credenciales). Su salida declara
   `cleanup efectivo`: sin contenedor listado y sin proceso del ayudante. No se
   comprobó si escribía antes de invocarlo.
2. `bash bin/local_control_plane_ready --help` no muestra ayuda: ejecutó la
   recuperación de locks de Podman. Estado antes: `KNOWN_POST_REBOOT_RECOVERABLE`
   (locks asignados 0, referenciados 13); después del refresco: `HEALTHY` (13/13).
   Efecto medido en los contenedores (`02-observe-containers.txt` →
   `02-observe-containers-after-refresh.txt`): los cuatro pasaron de `running` con
   pids inexistentes en `/proc` a `created`, pid 0. Ningún contenedor arrancó.

Causa: ninguno de los dos guiones acepta `--help`; se invocaron sin la
comprobación de escritura que exige `operaciones-de-archivo-con-bash.md`
(«Invocar un módulo para probarlo no es leerlo»). Las observaciones previas al
refresco se conservan; las posteriores se marcan como tales.
