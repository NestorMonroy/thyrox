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
