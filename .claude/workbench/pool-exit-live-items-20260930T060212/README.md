# pool-exit-live-items — TASK-THYROX-0639 (H-THYROX-283)

Banco de la corrección de la salida del pool con ítems vivos. Contiene las
sondas de reproducción de las dos causas candidatas del hallazgo —TERM al pool
con un ítem vivo, y disco lleno— y el registro de cuál deja el rastro medido
(joblog sólo con cabecera, worktrees retirados, ítems escribiendo).

- `probes/`: las sondas, una por causa.
- La suite que cierra la tarea: `tests/session/test-headless-pool-exit-live-items.sh`.

## Sonda 1 — TERM al grupo del pool con un ítem vivo (2026-09-30T06:10:58, código de HEAD 98aa4b78e, pre-corrección)

`probes/sigterm-pool.trace.log`: el pool sale con 143 y **no barre**: worktree
del ítem 1, runtime conservado 1, joblog sólo en el runtime (no publicado),
items cerrados 0 — y los runners siguen vivos (2 procesos: `timeout` y el
runner). Deja el defecto (1) de H-THYROX-283 —el ítem sobrevive al pool— pero
NO su rastro completo: los worktrees sobreviven porque el bash principal muere
con la señal antes de llegar al barrido. La causa de los grupos 7 y 8 no fue
un TERM al pool entero.

## Sonda 2 — disco lleno con el ítem vivo (2026-09-30T06:12:11, código de HEAD 98aa4b78e, pre-corrección)

`probes/disk-full.trace.log`: tmpfs de 24 MB al 100 % durante 15 s con el
ítem escribiendo su stream. El pool y GNU Parallel siguen vivos, el worktree
sigue, el joblog no se publica. Al soltar el ítem, el pool termina normal:
ítem cerrado (1), joblog publicado (2 líneas), worktree barrido después de
cerrar. El disco lleno **no** mata a Parallel ni adelanta el barrido.

## Veredicto sobre la causa

Ninguna de las dos causas candidatas deja el rastro de H-THYROX-283. El único
modo que lo reproduce es el caso B de la suite: **GNU Parallel muere solo**
(SIGKILL en la suite) mientras el ítem vive — el bash del pool sigue, el joblog
queda sólo con cabecera, el barrido corre debajo del ítem y el runner sobrevive.
Qué mató a Parallel el 2026-09-30T03:58:34 sigue sin medir: el contenedor no
expone `memory.events` del cgroup (medido: no existe en /sys/fs/cgroup) y los
jobs de los grupos 7 y 8 no publicaron su log. La corrección cierra los dos
defectos medidos para cualquier muerte de Parallel, sin depender de la causa.
