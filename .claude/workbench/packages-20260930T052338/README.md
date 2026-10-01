# Paquetes de tareas — primer intento, SUPERADO

Este banco agrupó las tareas abiertas en 11 paquetes y los lanzó con
`headless-pool` (`launch.sh`, `launch-b.sh`), un ítem por paquete.

**No se relanza.** El ejecutor lo detuvo el 2026-09-30 a las 05:38 porque
cada ítem llevaba de 4 a 8 tareas con sólo la descripción del store como
fuente, sin archivos medidos, comandos de medición ni informe por tarea. Se
sustituye por un `prompt.md` por tarea, con la forma de
`zero-errors-py-sh-20260926T223633/bucket-*/prompt.md`.

Qué queda aquí y para qué sirve:

- `p*.md`: la descripción de cada tarea, copiada del store. Es insumo, no
  prompt.
- `outputs/` y `outputs-b/`: los cuatro ítems que corrían, detenidos con
  SIGHUP a Parallel y TERM a cada `thyrox -p`. Cerraron con `<n>.closed` y
  foto en `refs/thyrox/snapshots/`. `outputs/3.patch` es el porte de la
  ruta `ue` para [359]; es punto de partida de esa tarea, no está integrado.
- `launch-c.sh` / `items-c.txt` (paquete 8 y [315]) nunca se lanzaron.
