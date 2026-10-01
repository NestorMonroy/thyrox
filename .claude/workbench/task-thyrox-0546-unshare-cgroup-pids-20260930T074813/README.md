# TASK-THYROX-0546 — `unshare` + cgroup `pids` como frontera del ítem, medido

Fecha: 2026-09-30. Anfitrión: kernel 6.18.44-fc-v50, uid 0, `CapEff`
completa, `Seccomp: 0`, cgroups **v1** (`/sys/fs/cgroup/pids` montado `rw`,
el proceso vive en `pids:/`), util-linux 2.39.3, Podman 4.9.3, 4 CPUs,
16 480 972 kB de RAM.

La tarjeta pedía elegir el mecanismo de contención de procesos del ítem «con
ambas medidas»: Podman (`23a756809`, ya medido) y `unshare` + cgroup `pids`
(sin medir hasta hoy: `git grep -l unshare -- .claude` daba 0 archivos y
`buscar-hallazgos --query unshare|setsid` daba Total: 0). El mecanismo vigente
es la sesión (`setsid` + `process_ownership drain`, `269b96040`).

## Cómo lo resuelve la referencia (claude-code 2.1.283, sólo lectura)

Corpus: `_references/claude-code-bin/2.1.283/bunfs-root/`. Conteo de literales
(`rg -c --fixed-strings`, sumado sobre los `.js`):

| Literal | Hits | Literal | Hits |
|---|---|---|---|
| `setsid` | 6 | `process.kill(` | 45 |
| `kill(-` | 13 | `SIGKILL` | 55 |
| `killProcessTree` | 1 | `cgroup` | 16 |
| `pgid` | 7 | `cgroup.procs` | 3 |
| `unshare` | 10 | `unshare-pid` | 1 |
| `pids.max` | **0** | `memory.max` / `memory.limit_in_bytes` | 1 / 1 |

Lo consultado, chunk y línea, qué hace, y qué se decidió:

| Símbolo / literal | Dónde | Qué hace | Decisión |
|---|---|---|---|
| `signalGroup`, `reapDescendants`, `treeSnapshot` (SessionRunner) | `chunk-3ts0v7st.js:22` | `process.kill(-pid, SIGTERM)` al grupo; tras la gracia `SIGKILL` al grupo **y** a cada descendiente de una foto de `ps -A -o pid,ppid,pgid,stat,lstart` tomada ANTES de matar (`lstart` como testigo de reciclaje de pid). Declara su ceguera en texto: «detached tool trees may survive». | Ya portado en espíritu por `process_ownership.drain_session` (gracia → TERM → KILL), con una frontera mejor: la **sesión** en vez del grupo, porque `timeout` hace `setpgid` (H-THYROX-255). Divergencia: no se toma foto previa; `/proc` se relee en cada latido. |
| `killProcessTree` → `mb`/`S`/`sUr` | `chunk-41vsymfs.js:11-13` | Mata `-pid` y luego cada descendiente por `ps -A -o pid,ppid[,sid]`; con `sameSession` filtra por `sid=` (`sess=` en macOS). | Es la misma frontera que el pool usa: la sesión. Confirma la elección de `269b96040`. |
| tool cgroup (`Nr`, `Ms`, `ks`, `ahn`) | `chunk-n043szf8.js:24-25` | Cgroup de **memoria** por clase de herramienta (`claude-code-bash`), detecta v1/v2 leyendo `/proc/self/cgroup`, escribe `memory.max` o `memory.limit_in_bytes`, `rmdir` si falla, y el hijo se inscribe solo: `/bin/sh -c '{ echo 0 > "$0"/cgroup.procs; } 2>/dev/null; exec "$@"'`. Lee `cgroup.procs` para saber quién está dentro. | **Portado** la forma de inscripción y la detección v1/v2 en `src/lib/unshare_capabilities.sh` (`_unshare_cap_run_item`, `_unshare_cap_pids_cgroup_parent`). Divergencia: la referencia acota memoria, nunca `pids.max` (0 hits); aquí se mide el controlador `pids`, que es el que lista y acota procesos. |
| sandbox Linux (bwrap) | `chunk-gpsyc3w1.js:74` | `bwrap --new-session --die-with-parent … --unshare-pid --unshare-user …`: el sandbox del Bash tool corre en un espacio de nombres de PID nuevo. | Es el precedente directo de `unshare --pid --fork`. Se mide la forma sin bwrap (util-linux, siempre presente). Divergencia declarada: sin `--unshare-user`/`--cap-drop`, porque aquí se mide contención de procesos, no privilegio. |
| `setsid` en las listas de envoltorios | `chunk-1bcrtmym.js:11`, `chunk-c4r4tcxr.js:12`, `chunk-4we0bhtv.js:29`, `chunk-csayct82.js:2265-2272` | Sólo como prefijo de comando que el analizador de permisos atraviesa (`setsid`, `unshare`, `nsenter`). No se usa como frontera. | Sin porte: no es contención. |

*Métrica:* hits de `rg` por literal fijo sobre `.js`, y lectura de una ventana
de 300-900 caracteres alrededor de cada hit citado.
*Ciega a:* código minificado cuyo nombre original no aparece como literal, y a
chunks `.zst` no descomprimidos.

## Medidas

### Sonda nueva: `src/lib/unshare_capabilities.sh` (`probes/unshare_capabilities.tsv`)

| Capacidad | Veredicto | Detalle |
|---|---|---|
| run | efectivo | `unshare --pid --fork` corrió el ayudante y salió 0 |
| pids_limit | efectivo | logró 15/64 procesos con `pids.max=16` |
| escape_containment | efectivo | el hijo con `setsid()` no sobrevivió a la salida del principal |
| cleanup | efectivo | `cgroup.procs` vacío tras salir el principal y `rmdir` salió 0 |

Reloj de pared 1.47 s, RSS máximo 8172 KiB, exit 0.

### Sonda de Podman: `src/lib/podman_capabilities.sh` (`probes/podman_capabilities.tsv`)

Doce capacidades, once `efectivo` y `credential_injection` `no-efectivo` (como
el 2026-09-29). Las comparables: `run` efectivo, `pids_limit` efectivo (15/64
con `--pids-limit 16`), `cleanup` efectivo. Reloj de pared 34.57 s, RSS
máximo 43 784 KiB, exit 0.

*Métrica:* GNU Time sobre cada sonda entera, una ejecución cada una.
*Ciega a:* la comparación de pared no es de igual a igual —la de Podman
compila un ayudante estático e importa una imagen y mide doce capacidades; la
de `unshare` mide cuatro—; sólo dice que el mecanismo sin runtime es
utilizable en segundos, no cuánto cuesta cada capacidad.

### Control: el mecanismo vigente ante un escapado (`probes/setsid-escape-control.txt`)

Un principal lanzado con `setsid` deja un hijo que llama a `setsid()` y sale:

- el escapado sobrevive, con `pgrp` y `sid` iguales a su propio pid;
- `bin/process_ownership members <sid del principal>` → **0** miembros: el
  drenaje por sesión no lo ve (es la ceguera que el docstring ya declaraba,
  ahora medida);
- el mismo principal inscrito en un cgroup `pids`: `cgroup.procs` **sí** lista
  al escapado.

*Métrica:* `pgrep -f` con clase de corchetes, campos 5 y 6 de
`/proc/<pid>/stat`, `cgroup.procs`.
*Ciega a:* un escapado que además cambie de cgroup (exige escribir en
`cgroup.procs` de otro cgroup) o de espacio de nombres.

## Controles de anulación (`tests/lib/test-unshare-capabilities.sh`, 25 aserciones)

Se hacen sobre una copia de la sonda (`mktemp -d`), nunca sobre el árbol:

| Control | Qué se retira | Caen exactamente | Siguen en verde |
|---|---|---|---|
| 4a | la escritura de `pids.max` (sustituida por `true`) | 2: `pids_limit` → no-efectivo, y crea 64/64 | 3: `run`, `escape_containment`, `cleanup` |
| 4b | `--pid` de `_UNSHARE_CAP_NAMESPACE_FLAGS` | 2: `escape_containment` (el escapado sobrevive) y `cleanup` (`cgroup.procs` lo lista) | 2: `run`, `pids_limit`; y el trap retira al escapado y el cgroup |

Primer intento del 4a: borrar toda línea con `pids.max` rompió la sintaxis de
la copia (también borraba las lecturas). Por eso la escritura vive en su propia
función (`_unshare_cap_apply_pids_limit`) y el control la sustituye por un
no-op. Primer intento del 4b: `grep -c -- '--pid'` contaba los comentarios;
se cuenta sólo la línea de las banderas.

## Decisión

**Se conserva la sesión como frontera del pool** (`setsid` + drenaje,
`269b96040`), y queda registrado por qué, con las dos alternativas medidas:

1. Las dos alternativas contienen al escapado con `setsid()`; la sesión no.
   Pero ese escapado es un proceso que se fuga **a propósito**; los dos
   episodios reales (H-THYROX-255: `timeout` cambia de grupo; H-THYROX-257: un
   hijo en segundo plano escribe tras el veredicto) la sesión los cubre, y la
   suite `test-headless-pool-item-drain.sh` lo prueba (17/17).
2. La sesión no exige nada del anfitrión. `unshare --pid` exige
   `CAP_SYS_ADMIN` (o un userns), y el cgroup `pids` exige una jerarquía
   escribible; aquí hay ambas, en otro anfitrión del consumidor no está
   garantizado. Podman exige el runtime entero y cuesta decenas de segundos
   por sonda.
3. La condición de cambio queda declarada en el docstring de
   `src/session/process_ownership.py`: un ítem real que llame a `setsid` y
   sobreviva al drenaje. Ese día el mecanismo ya está medido y con sonda
   propia: `unshare` + cgroup `pids`, que además da la lista de miembros
   (`cgroup.procs`) que un drenaje por cgroup usaría en lugar de la sesión.

## Lo que este ítem NO hizo, y por qué

- **No registró el hallazgo en el store.** El pool prohíbe escribir en
  `agent-results/agent_store.sqlite3` desde un ítem. El número libre lo
  propuso `bin/hallazgo_ids propose-id THYROX` → `H-THYROX-287` (no
  reservado; se re-propone al integrar). Comando listo para el integrador:

  ```bash
  bash bin/agent_store agregar-hallazgo --finding-id H-THYROX-287 \
    --submodule thyrox --initiative actualizar-agentic-ai-thyrox \
    --finding-type decision --severity MEDIA \
    --summary 'Frontera del item del pool: sesion (setsid + drenaje), con Podman y unshare+cgroup pids medidos como alternativas' \
    --content 'Medido 2026-09-30: unshare --pid --fork + cgroup pids da run, pids_limit (15/64 con pids.max=16), escape_containment y cleanup efectivos en 1.47 s; Podman 4.9.3 da run/pids_limit/cleanup efectivos en 34.57 s. Las dos contienen al hijo que llama a setsid(); la sesion no (process_ownership members -> 0 con el escapado vivo). Se conserva la sesion: cubre H-THYROX-255/257 sin exigir CAP_SYS_ADMIN ni cgroup escribible. Condicion de cambio: un item real que llame a setsid y sobreviva al drenaje.' \
    --source-ref '.claude/workbench/task-thyrox-0546-unshare-cgroup-pids-20260930T074813/README.md'
  ```

- **No movió la tarjeta del board** a `done`: el board no es accesible desde
  el ítem. Al integrar, se cierra citando `269b96040` (drenaje por sesión) y
  este banco (alternativas medidas).
- **No tocó `src/lib/podman_capabilities.sh`** aunque estaba en la lista: la
  sonda de `unshare` es un archivo nuevo y disjunto, no una rama de la de
  Podman —una sonda con selector de mecanismo haría dos cosas—.
