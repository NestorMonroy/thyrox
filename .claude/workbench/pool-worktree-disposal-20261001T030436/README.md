# Worktrees del pool: contenido preservado antes de descartarlos (2026-10-01)

Ocho worktrees bajo `.thyrox/pool-worktrees/` ocupan ~1,5 GB. Son de
ejecuciones del pool del 2026-09-30 que se cortaron y se relanzaron con otra
carpeta de salida: sus directorios de salida quedaron vacíos (sin veredicto
ni parche), así que el banco no guardaba su contenido.

| Worktree | Ejecución (banco) | Estado |
|---|---|---|
| `683a1e95cfc3/1` | `task-census-20260930T064202/impl-pool-a` | vacío: sólo `.git`, sin checkout |
| `683a1e95cfc3/3` | ídem | sin cambios |
| `0441fd032e06/1` | `podman-execution-primitive-20260930T215755/outputs/pool` | 20 archivos ya iguales a HEAD, 7 distintos |
| `3fea51d3d513/1` | `daemon-parity-closure-20260930T214805/outputs/pool` | 5 iguales, 1 distinto |
| `3fea51d3d513/2` | ídem | 9 iguales, 1 distinto |
| `3fea51d3d513/3` | ídem | 1 igual, 3 distintos |
| `94feedb1722c/1` | `podman-execution-primitive-…/outputs/pool-gpu` | 2 distintos |
| `cb9db2cfe55f/1` | `podman-execution-primitive-…/outputs/pool-measure` | 2 iguales, 6 distintos |

Los «distintos» son, con toda probabilidad, versiones anteriores de lo que se
integró después; no se afirma, se preserva. `snapshots/` guarda por worktree
su commit base, el diff de lo versionado (`git diff HEAD --binary`) y un tar
de lo no versionado: 304 KB en total.

**Verificación por reconstrucción.** Para cada uno se aplicó el parche sobre
su base en un índice temporal y se comparó el blob de cada archivo con el del
worktree; los no versionados, contra el contenido del tar: 26 versionados y
31 no versionados, **0 discrepancias**. El control discrimina: el snapshot de
`3fea51d3d513/1` cruzado con el worktree `3fea51d3d513/2` da 5 de 5
discrepancias.

Con esto, descartar los ocho worktrees no pierde contenido. El borrado es
decisión del ejecutor.

*Métrica:* `git hash-object` de cada archivo del worktree contra el blob que
deja `git apply --cached` del snapshot sobre su base; `cmp` contra el tar.
*Ciega a:* archivos ignorados por `.gitignore` dentro del worktree (no son
contenido de la tarea: `node_modules`, `dist`, cachés).
