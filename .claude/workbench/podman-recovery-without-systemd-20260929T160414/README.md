# Recuperación de Podman sin systemd (TASK-THYROX-0605, H-THYROX-276)

Máquina: PID 1 `process_api` (Firecracker), systemd `offline`, cgroup v1, Podman 4.9.3. La unidad
`podman-restart.service` existe en disco y nada la ejecuta. Imagen local sin red: un ayudante
estático (`helper.c`) importado con `podman import`. `launch.sh` corre los casos de uno en uno.

## Resultados (`results*.tsv`)

| Caso | Resultado |
|---|---|
| `--restart=no` + kill del proceso | queda caído (control) |
| `--restart=on-failure` / `always` + kill | se recupera: 1 reinicio, PID nuevo |
| healthcheck cada 2 s, 10 s de espera | **0** ejecuciones automáticas; manual `podman healthcheck run` pasa |
| `--health-on-failure=restart` con check en falla | 0 reinicios solos; 1 tras `podman healthcheck run` |
| muere todo el árbol (conmon + proceso) | Podman sigue diciendo `running`, también con `ps --sync`; `podman start` sale 0 **sin arrancar nada** |
| recuperación tras morir el árbol | `stop` sale 0, `start` sale **125**; sólo `rm -f` + recrear devuelve un proceso vivo; el volumen conserva sus datos |

## Qué fija para el diseño

- Escenario A (el proceso cae, la VM sigue): `--restart` basta; no hace falta systemd.
- El healthcheck **no corre solo**: quien quiera `health-on-failure` tiene que disparar
  `podman healthcheck run` (el bootstrap o un temporizador propio).
- Escenario B: el estado de Podman **no es evidencia de vida**. El bootstrap verifica el PID
  (`kill -0`) y, si está muerto, recrea el contenedor desde su declaración (`rm -f` + `run`); los
  datos viven en el volumen.

## Ciega a

Un reinicio real de la microVM también vacía `/run` (el estado de ejecución de Podman), y Podman
lo detecta al primer comando. La simulación mata procesos sin vaciar `/run`, así que no mide ese
camino; el bootstrap tiene que tolerar los dos.
