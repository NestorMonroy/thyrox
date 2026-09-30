Implementas en thyrox (bash), en TDD, la contención de procesos de cada ítem de `headless-pool`
(#303). El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con
`sed`, `gawk` o `bash bin/replace_literal`; no reescribas archivos enteros.

El defecto, medido dos veces (H-THYROX-257): un ítem dejó una suite en segundo plano (lanzada con
`thyrox-bg`, que se desprende con `setsid`) y esa suite escribió en los outputs del ítem 4-5 s
DESPUÉS de que el pool publicara `<n>.verdict`. Y H-THYROX-255: el `timeout` que envuelve al runner
(`src/session/headless-pool.sh:421`) crea su propio grupo de procesos, así que un kill por grupo no
lo alcanza. Veredicto y estado final de los outputs no coinciden.

Mecanismo, medido en este anfitrión (2026-09-29): como uid 0 se puede crear un cgroup v1 bajo
`/sys/fs/cgroup/pids/`, mover un pid a su `cgroup.procs`, leer ahí los procesos (incluido uno lanzado
con `setsid`) y vaciarlo matándolos. Un cgroup se hereda en cada fork: `setsid` no lo escapa.
Podman no se usa aquí: el ítem necesita el repo, la red y la credencial del anfitrión.

Lo que se pide:
1. `src/session/item_containment.sh` (ejecutable, cabecera `# @description` en español) con
   subcomandos:
   - `create <nombre>`: crea el cgroup del ítem bajo `THYROX_POOL_CGROUP_ROOT` (default
     `/sys/fs/cgroup/pids/thyrox-pool`); imprime el mecanismo elegido: `cgroup` si pudo, `tree` si no;
   - `enter <nombre> <pid>`: mete el pid en el cgroup (en `tree`, no hace nada);
   - `drain <nombre> <pid-raíz> [gracia_s]`: termina TODO lo que quede — en `cgroup`, cada pid de
     `cgroup.procs` con TERM, tras la gracia KILL, y repite hasta que `cgroup.procs` quede vacío; en
     `tree`, el árbol de `pid-raíz` por `pgrep -P` recursivo más su grupo de proceso. Sale 0 si al
     final no queda nada vivo, 3 si algo sobrevive (y lo nombra por stderr);
   - `remove <nombre>`: retira el directorio del cgroup.
   El modo `tree` es el respaldo declarado y su ceguera también: no alcanza a un proceso que se
   desprende con `setsid` y queda huérfano de init. Dilo en la cabecera.
2. En `src/session/headless-pool.sh`: al empezar cada ítem, la subshell del ítem se mete en su
   cgroup ANTES de lanzar `time`/`timeout`/runner (usa `$BASHPID`); tras `wait "$pid"`, `drain` del
   ítem ANTES de `finalize`; el pool imprime una línea `contención: cgroup|tree` al arrancar; un
   `trap` en TERM/INT del pool drena todos sus ítems antes de salir; al final se retiran los cgroups.
3. En `src/session/item_worktree.sh` `finalize`: el `--verify` corre dentro de un cgroup propio y se
   drena ANTES de escribir `<n>.verdict`.
4. `THYROX_POOL_CGROUP_ROOT` va a `.env.example` junto a las `HEADLESS_POOL_*`/`THYROX_*` del pool,
   vacía, con el formato de sus vecinas, y tiene prueba.
5. Mitad roja primero, en `tests/session/test-item-containment.sh`, con un runner falso
   (`HEADLESS_POOL_RUNNER`, como las suites vecinas) que lanza con `setsid` un escritor que añade una
   línea a un archivo cada 0,2 s y sale 0 enseguida:
   a. tras volver el pool no queda vivo ningún proceso del escritor;
   b. el archivo del escritor no cambia en 1 s después de que exista `<n>.verdict`;
   c. lo mismo cuando el escritor lo lanza el `--verify` en vez del runner;
   d. `kill -TERM` al pool a media ejecución no deja vivo al escritor;
   e. con `THYROX_POOL_CGROUP_ROOT` apuntando a un sitio no escribible el pool declara
      `contención: tree` y sigue funcionando (con un escritor SIN setsid, que el árbol sí alcanza);
   f. el subcomando `drain` sale 3 y nombra el pid cuando algo sobrevive (dóblalo con un proceso que
      ignore TERM y un KILL impedido por un `THYROX_POOL_CGROUP_ROOT` de prueba, o el medio que
      juzgues honesto; di cuál usaste).
   Las suites existentes del pool siguen verdes.
6. Control de anulación: haz que `drain` no mate nada y confirma que caen exactamente a, b, c y d;
   publica los conteos. Restaura.
7. Comentarios en español sin coloquialismos; identificadores en inglés.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano ni termines esperando una notificación:
  este ítem existe precisamente porque dos ítems anteriores lo hicieron.
- Tu mensaje final incluye la roja inicial, el verde final de cada suite y el control de anulación
  con sus conteos.

Criterio de cierre: `bash tests/session/test-item-containment.sh`,
`bash tests/session/test-headless-pool.sh`, `bash tests/session/test-headless-pool-worktree.sh` y
`bash tests/session/test-headless-pool-thyrox-p.sh` en verde.
