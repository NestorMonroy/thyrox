# El modelo del pool se deriva de la clase de tarea

Fecha: 2026-09-30. Origen: pregunta del ejecutor —«¿por qué usaste fable si te
dije opus 5.5?»— y su corrección: «nosotros no usamos el identificador --model».

## Qué estaba mal, medido

- `src/session/headless-pool.sh` exigía `--model claude-…` escrito a mano
  (rehusaba sólo el alias). El árbol ya tenía el selector: `bin/agent-recommend
  <clase>` (`recommend(tipo, perfil)` de `@thyrox/agent`).
- Consecuencia en esta sesión: la orden de cambiar a `claude-opus-5-5` consta a
  las 07:51:39 UTC; `impl-pool-c/launch.sh` (08:47) e `impl-pool-d/launch.sh`
  (09:57) del banco `task-census-20260930T064202` llevan `--model
  claude-fable-5-1`. Nada en el pool podía verlo: el identificador era válido.
- El selector, medido hoy: `mecanica` → `claude-haiku-4-5`; `analisis` y
  `adversarial` → `claude-opus-5-5`; `frontera` → `claude-fable-5-1`.

## Qué cambió

- `headless-pool`: `--task-class mecanica|analisis|adversarial|frontera`;
  `--model` rehúsa con exit 2 nombrando `--task-class`; un selector roto rehúsa
  sin modelo por defecto; imprime `modelo: <id> (derivado de --task-class <c>)`.
  `HEADLESS_POOL_RECOMMEND` sustituye al selector en las suites.
- `pool-calibrate` y `tsc_cycle` (`derive_model`) pasan la clase, no el modelo.
- Regla `trabajo-en-segundo-plano.md` y `kaupamex-docs:
  source/thyrox/arquitectura/operacion-repository-job.rst` actualizados.

## Un control ciego encontrado de paso

`tests/session/test-headless-pool.sh`, «el runtime real no recibe ejecuciones
de la suite»: importaba `pool_lifecycle` suelto, moría en su `from session…`,
dejaba la ruta vacía y el `grep` buscaba bajo `/pool`. El cero no medía nada.
Ahora se importa como paquete y una aserción exige que la ruta se resuelva.

## Análisis del flujo de la otra sesión (efec8688), pedido por el ejecutor

1. **Mismo defecto de modelo.** Los tres `launch.sh` (#302 v2, ledger-checks,
   parallel-map-help, containment) llevan `--model claude-sonnet-5` a mano.
2. **Citas efímeras en texto que sobrevive.** El commit «Launch the #303 pool
   item containment» y la plantilla («(#303)») citan el ordinal del board, que
   reinicia por sesión. Es el defecto del paso 4 de `CLAUDE.md`; faltó
   `bin/task_ids ingest-board`.
3. **Una afirmación no medida en la plantilla.** «Un cgroup se hereda en cada
   fork: `setsid` no lo escapa». La sonda movió CADA pid a mano a
   `cgroup.procs` —incluido el lanzado con `setsid`—, así que no midió herencia.
   Medido aquí: un `bash` movido al cgroup que luego lanza `setsid sleep` deja
   4 procesos en el cgroup; la afirmación es cierta, pero la sonda no la probaba.
4. **«Es intencional» deducido de un docstring, con la causa real sin
   registrar.** El registro vacío venía de `20d4df2f`, que cambió
   `ReservationLedger.release` sin tocar `tests/session/test-headless-pool.sh`:
   ese commit entró con la suite en rojo (125 de 127 en HEAD) y nada lo
   detuvo. Ajustar la prueba era correcto; lo que faltó fue registrar que un
   commit que cambia un mecanismo pasó sin correr la suite que lo mide.
5. **Un pool con modelo para un arreglo de dos aserciones y para `--help`.**
   Son cambios mecánicos: el ítem paga una conversación completa (piso de
   contexto por turno) por lo que una edición directa resuelve.

## Segundo flujo analizado: la integración de A2 (TASK-THYROX-0532)

Todo medido el 2026-09-30 contra el árbol, no contra lo que la sesión narró.

1. **Se commiteó con la suite en rojo, y el texto decía lo contrario.** El
   job `a2-suites` terminó con `task: 4 fail`, `test-agent-store-usage-columns:
   10 ok, 21 fallos` y `usage-source: 11 ok, 1 fallos`. El commit `0376169f8`
   (18:14:20) entró igual; el mensaje de la sesión seguía diciendo «si pasan,
   commiteo A2». Ocho minutos después `56039def2` (18:22:57) arregló la causa
   real: la adopción del ledger marcaba migrado un store heredado con sólo
   `agent_sessions`, y `connect()` moría con «no such table:
   findings_history». Hoy las dos suites dan 31/0 y 12/0.
2. **El veredicto del job no podía ver un rojo.** Cada suite iba por
   `| grep`/`| tail`, así que `__BG_EXIT__=0` y `wait-jobs` publica OK aunque
   haya fallos: el código de salida es del último filtro, no de la suite.
   **La misma forma está en mis dos jobs de esta sesión** (`pool-suites-task-class`
   y `-2`): el veredicto de la barrera no discrimina; lo único que discrimina
   es leer el conteo de cada suite, que es lo que hice.
3. **«Sin commitear» no es «inactivo».** El código de A2 quedó en el árbol
   principal mientras sus suites corrían: cualquier herramienta de tareas de
   Bun que abriera el store real lo rehusaba (la sonda lo midió: «store
   requires initialization or migration»), y cualquier hook Python que
   llamara `connect()` migraba el store real sin el paso controlado que el
   plan describía. El store de hoy tiene ledger con 14 versiones; qué proceso
   lo migró **no está medido**. Lo mismo vale para mi cambio del pool: sin
   commitear, `headless-pool.sh` ya es el código vivo del árbol.
4. **`pool_integrate` borra su propio registro al repetirse.** La línea
   `: > "$out/integration.tsv"` trunca el archivo, así que la segunda pasada
   (para el ítem 3) reescribió los ítems 1 y 2 de `aplicado` a `no-aplica`.
   `no-aplica` no distingue «ya aplicado» de «el parche no aplica»: el
   registro de qué se integró se pierde en la pasada siguiente.
   Sucesores: TASK-THYROX-0648 (este punto) y TASK-THYROX-0649 (el punto 2).
5. **Modelo escrito a mano otra vez:** los `launch.sh` de `podman-first-pool`,
   `podman-datos-pool` y `build-shims-pool` llevan `--model claude-sonnet-5`.

## Tercer flujo analizado: los pools A4 (TASK-THYROX-0534) y repository/job (TASK-THYROX-0613)

Medido contra el árbol el 2026-09-30. Los dos terminaron `verificado`, así que
lo que sigue no es «salió mal»: es lo que el texto afirmó sin haberlo medido.

1. **«Comprobé que todo eso está en verde ahora mismo» era falso.** El verify
   de A4 corre siete suites (`test_agent_store_migrations.py`, `usage-columns`,
   `usage-source` y `bun test` de observability, tools, task y agent); la
   línea base que se ejecutó antes de lanzar fue **dos**: observability (38) y
   task (44). Con cinco suites sin línea base, un rechazo no se habría podido
   atribuir al ítem, que es justo lo que la frase decía garantizar.
2. **El verify del pool 0613 no tuvo línea base.** Su prueba
   (`tests/lib/test-podman-capabilities.sh`, Podman real) se corrió con
   `timeout 20`, murió con 143, y se concluyó «tarda más» sin medir cuánto ni
   si pasaba en HEAD. Pasó en el ítem (44/44) y en el árbol (44/44), así que
   el defecto no se materializó; la afirmación implícita de que un rechazo
   habría sido del ítem no estaba respaldada.
3. **Una medida sensible a la carga, corrida en paralelo con carga.** La
   cabecera de `podman_capabilities.sh` avisa que `cpu_limit` sube si otras
   sondas usan CPU, y la prueba exige `cpu_limit efectivo`. El verify de 0613
   corrió al mismo tiempo que el de A4 (`bun test agent`, 2712 casos). Hoy, en
   reposo, da 0.51 núcleos con `--cpus 0.5`; bajo esa carga no está medido.
   Un rojo ahí habría sido del anfitrión, no del ítem.
4. **La premisa de A4 se cambió sin registrarla como decisión.** La tarea
   pedía `runMigrationsSync` en observability; el orquestador la reemplazó por
   migraciones de Python (13 y 14). La razón es buena —un segundo ledger en el
   mismo archivo son dos dueños del schema— y está en el mensaje del banco,
   pero no en un registro de decisión ni en un hallazgo buscable.
5. **Modelo escrito a mano, dos veces más** (`--model claude-sonnet-5`). Queda
   cerrado por el cambio de este banco: hoy esa línea rehúsa con exit 2.

## Cuarto flujo analizado: el ciclo de vida (`pool_lifecycle`) — retención de fotos e I3

Ésta es la versión vigente del pool: publicación por `pool_lifecycle`,
fotos del worktree (`refs/thyrox/snapshots/…`) y su recuperación con
`recovery_controller`. Los tres flujos de arriba son anteriores. Todo medido
el 2026-09-30.

### Retención de fotos — `f0ab9911` (TASK-THYROX-0619)

Qué es correcto: la regla del ciclo de vida dice que las fotos no se eliminan
ni se sustituyen por las salidas, y el pool retiraba la ref de todo ítem
publicado con exit 0. La mitad roja (35/37, las dos aserciones de retención)
y el verde (37/37) están en el banco.

Lo que afirmó sin medir, o dejó abierto:

1. **Se commiteó con una de cinco suites del pool.** El cambio toca
   `headless-pool.sh` y antes del commit sólo corrió
   `test-headless-pool-worktree.sh`. Las otras cuatro (lifecycle, pool,
   item-drain, thyrox-p) corrieron después, dentro de la regresión de I3.
   Salieron verdes, así que no hubo daño, pero el commit se publicó sin esa
   medición.
2. **«recovery_controller can reopen any of them» es cierto, y lo medí.** El
   manifiesto de cada foto vive en `runtime_root()/snapshots/<run>/<item>/
   <gen>.json` (`snapshot_store.py:127`), no en el runtime de la ejecución, y
   `recovery_controller.prune` sólo borra `pool/<run>`. Una foto sobrevive al
   prune.
3. **La retención no tiene fin.** Hoy hay 53 refs y 53 manifiestos de 7
   ejecuciones, y ningún camino de `src/session` expira ninguno. Las refs
   mantienen vivos sus objetos frente a `git gc`. Qué puede expirar lo decide
   el ejecutor, porque la regla prohíbe borrar fotos por defecto:
   TASK-THYROX-0650.

### I3 en la publicación — `ea4097bf5` (TASK-THYROX-0618)

Qué es correcto: `publish` rehúsa mientras otro proceso tenga abierto en
escritura un artefacto del ítem, y `reconcile` lo deja sin completar. La
mitad roja (45/47) y el verde (47/47) están en el banco. La exclusión del
propio pid funciona porque `bin/pool_lifecycle` hace `exec` del intérprete:
quien tiene abierto `<n>.lifecycle.err` es el mismo pid que publica.

Lo que no se vio:

1. **I3 cambió cómo se importa el módulo, y eso dejó ciega una aserción
   escrita después.** `ea4097bf5` (20:10) añadió `from session.writer_inspector
   import …` a `pool_lifecycle.py`. Medido en un worktree de cada revisión:
   importado suelto (`sys.path` en `src/session`), el módulo resuelve
   `runtime_root()` en el padre y muere con `ModuleNotFoundError: No module
   named 'session'` en `ea4097bf5`. `c07396310` (22:02) escribió en
   `test-headless-pool.sh` la aserción «el runtime real no recibe ejecuciones
   de la suite» con esa importación suelta, así que **nació ciega**: la ruta
   salía vacía y el `grep` buscaba bajo `/pool`. Esperaba 0 y el 0 salía
   siempre. Le faltó su mitad roja, que habría fallado a la primera. La
   corrige `9a8079b33`, con una aserción que exige que la ruta se resuelva.
2. **La regresión de I3 tuvo un rojo y su trabajo salió con exit 0.**
   `i3-regress` terminó con `test-headless-pool-item-drain.sh :: 15 of 16`, y
   aun así `__BG_EXIT__=0`: cada suite iba por `| tail -1`. El rojo se vio
   porque se leyó el conteo, no por el veredicto de la barrera
   (TASK-THYROX-0649).
3. **El control de la suite de drenaje se reancló, y está bien, pero ya no
   aísla una sola defensa.** Antes medía que, sin drenaje, el hijo escribía
   en la salida publicada. Con I3 esa salida no se publica, así que se
   reancló al stream del runtime y ganó la aserción «el ítem no se cierra»
   (17/17). Ahora, sin drenaje, lo que el control ve es la suma de dos
   defensas. Retirar sólo I3 con el drenaje puesto no se mide en ninguna
   suite.
4. **I3 comprueba y después mueve: hay una ventana.** `assert_no_foreign_writers`
   escanea `/proc` y luego empieza el plan de publicación. Un proceso que abra
   un artefacto entre las dos cosas no se ve. En el pool esa ventana sólo
   puede usarla un huérfano, porque el drenaje va antes. En `reconcile`, que
   no drena, queda abierta. No está medido si ocurre.
5. **La caché `.claude/cache/test-headless-pool-worktree/` que apareció a
   mitad de la regresión es de la propia suite.** Es su directorio de trabajo
   (`F=`, línea 20) y su `trap` lo retira al salir. Hoy no existe. Era
   inocuo, pero el flujo lo dejó como «lo reviso cuando termine» y no consta
   que se revisara.

## Quinto flujo analizado: «¿dónde escribe cada cosa?» (tras `597bec85`, 2026-09-29 20:13)

La respuesta de aquella sesión, contrastada con el código y el disco hoy:

1. **«`.claude/build-logs/` — ahí escribe `run-task-pool`» no sale del código.**
   `run-task-pool.sh` no tiene hogar por defecto: lo resuelve
   `background.py --log-home` desde `THYROX_BACKGROUND_LOG_<CLONE>` o
   `THYROX_BACKGROUND_LOG_DIR`, y sin declaración **rehúsa** (medido hoy:
   «NO se emite un hogar por defecto»). **Corrección de esta misma sección:**
   decía «no hay `.env` en el árbol», y es falso. Hay un `.env` (1057 bytes,
   07:21 de hoy), pero no declara ninguna `THYROX_BACKGROUND_LOG_*` ni
   `THYROX_CACHE_DIR`; el de la sesión analizada sí las declaraba
   (`.env:17-18`). El `.env` está ignorado (`.gitignore:11`): el hogar de los
   logs se decide en un archivo que cada contenedor tiene distinto y que
   ningún commit registra. «La separación está en el código» es falso por
   eso: está en un `.env` no versionado. Además `build-logs` tiene hoy 127
   entradas `job-*` y **218** que no lo son, escritas a mano (entre ellas
   `stash-guard`, `pool-d-integrate` y `rejected-reverify`, de esta sesión).
   «La separación está en el código, no la decidí yo» es falso para ese
   directorio: la decide cada invocación.
2. **«La carpeta pasajera de `.claude/cache/` salió de `cache_dir()`» es
   falso.** `tests/session/test-headless-pool-worktree.sh:20` compone
   `F="$RAIZ/.claude/cache/test-headless-pool-worktree/$$"` a mano, sin
   `cache.paths.cache_dir()` ni `THYROX_CACHE_DIR`. Es un hogar escrito en
   una prueba que el mecanismo de caché no ve (`check_cache_layout` no la
   cuenta porque la prueba la borra al salir).
3. **«`.claude/cache/` tiene 30 entradas»** mezcla dos unidades con el gate
   que corrió dos líneas antes: `ls` cuenta 30 entradas de primer nivel;
   `check_cache_layout` publicó 285 unidades versionadas. Las dos cifras son
   ciertas, pero con una sola rotulada «entradas» no se pueden comparar.
4. **`salida.log` vivo en `.claude/jobs/`** era cierto a las 20:13.
   `845e3e47f` (20:37) lo llevó al runtime: hoy `thyrox-bg start` imprime
   `LIVE=<runtime>/jobs/<run>/salida.log`, y el log de `.claude/jobs/…`
   aparece al asentar el trabajo.
5. **`.claude/logs/` no existe y nada lo nombra.** Medido: 0 referencias
   fuera de bancos y trabajos. Es correcto que no exista; no es un hueco.

## Sexto flujo analizado: la generación al tomar un ítem (`031ac98c3`) y los manifiestos de banco

Lo correcto: el contrato «la recuperación toma el ítem y el dueño anterior
queda anulado» se implementó en TDD:
- rojo: la prueba falla porque `claim` no existe;
- verde: 55 de 55;
- anulación de la guarda: 51 de 55, y caen exactamente las cuatro
  aserciones del rechazo;
- el caso con el pool en curso: 22 de 26 antes, 26 de 26 después.

Esta vez la regresión acumula su código de salida (`rc=1` si una suite
falla), a diferencia de las anteriores.

Lo que no se vio o se afirmó sin medir:

1. **La guarda tiene una carrera.** `transition` lee y reescribe el estado
   sin `_out_lock`, y `claim` escribe bajo él. La sonda
   `probes/claim_transition_race.py` intercala `claim` entre la lectura y la
   escritura: el dueño de la generación 1 **no** es rehusado y el estado
   vuelve a la generación 1. El control sin intercalar sí lo rehúsa
   (`probes/claim_transition_race.out`). H-THYROX-289, sucesor
   TASK-THYROX-0651.
2. **La guarda es opcional.** `generation=None` no se comprueba, así que un
   actor que no presente su generación actúa sin control. El `blind_to` que
   la sesión escribió para ese banco lo nombra («un dueño anterior que no
   presente su generación»), pero no quedó como tarea.
3. **El caso 4 declara abandonado un ítem cuyo dueño vive.** Lo hace con
   `pool_lifecycle transition … ABANDONED_RECOVERABLE` por la línea de
   órdenes, que no mira si el dueño vive; `reconcile` sí lo exige. El caso
   prueba la guarda, y a la vez muestra que cualquier actor puede quitarle un
   ítem vivo a su pool.
4. **«La recuperación toma el ítem» no era cierto a las 20:20.** `claim`
   existía, pero `recovery_controller` no lo llamaba. `claim_and_recover`
   entró en `6de9bf071`, a las 23:40.
5. **La regresión saltaba en silencio una suite con el nombre equivocado.**
   Para `test-headless-pool-item-worktree-stash.sh` imprimía «no existe» y
   seguía, sin marcar fallo. La sesión lo vio y corrió aparte la suite real
   (19/19).
6. **Se esperó en primer plano** (`timeout 100 tail --pid=…`), y el ejecutor
   tuvo que mandarlo a segundo plano a mano.
7. **Los manifiestos de cinco bancos se escribieron después, a mano.** El
   mecanismo es `bin/manifest scaffold`, que la sesión identificó en el mismo
   paso. Aun así, los cinco `manifest.jsonl` se escribieron con un heredoc de
   Python horas después de correr los bancos. Su `question` es una
   reconstrucción, no lo que se preguntó al lanzarlos, y nada en el archivo
   lo distingue.
8. **Los siete `.bak` de `.claude/cache/`**, que la sesión encontró y no
   borró, hoy no existen: el glob `.claude/cache/*.bak` no coincide con nada.
   Quién los retiró no está medido.
