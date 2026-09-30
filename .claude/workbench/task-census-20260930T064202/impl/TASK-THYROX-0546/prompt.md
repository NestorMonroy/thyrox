# TASK-THYROX-0546

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p1-pool-lifecycle.md`

## La tarea

## [303] TASK-THYROX-0546 — Pool: ningún proceso de un ítem sobrevive al ítem (contención de procesos)

Status on board: in_progress

Separado de #302 (aislamiento de rutas del verify). Hallazgos: H-THYROX-255 (el runner sobrevive a wait-jobs kill por el grupo de proceso de timeout) y H-THYROX-257 (dos ítems medidos cuyos trabajos en segundo plano escribieron 4-5 s después del veredicto, pese a que la plantilla lo prohibía). Contrato: al publicar el veredicto (1) no queda ningún proceso descendiente del ítem; (2) ningún output del ítem sigue cambiando; (3) lo que quede en segundo plano se recoge o se termina antes del veredicto, sin depender del agente; (4) un ítem no cierra con trabajo pendiente de una notificación futura. Prueba obligatoria: ítem falso que deja un proceso escribiendo tras el comando principal; el pool lo recoge o lo termina y el output queda congelado al veredicto; control de anulación. Insumo medido (#309, 23a75680): en este anfitrión Podman 4.9.3 sobre cgroups v1 hace efectivos run, --pids-limit, --memory y la limpieza tras rm -f. La alternativa unshare + cgroup pids sigue sin medir; el mecanismo se elige con ambas medidas, vía pool.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- Contrato (1) ningún descendiente vivo al veredicto: src/session/headless-pool.sh:514 (`exec setsid` hace del ítem líder de sesión) y :543-565 bloque `# >>> item-drain` que llama `process_ownership drain` y marca rc=6 si hubo que terminar — `grep -nE 'ITEM_DRAIN|drain|setsid' src/session/headless-pool.sh`; commit 269b96040 «Drain each pool item by session and prove no writer», cuerpo `Refs: TASK-THYROX-0546` — `git log -1 --format=%b 269b96040`
- Contrato (2) ningún output sigue cambiando: src/session/headless-pool.sh:557-563 corre `writer_inspector` sobre `$HP_LIVE/$n.*` y falla el ítem si hay escritor vivo; src/session/writer_inspector.py:7 cita H-THYROX-257 — `grep -nE 'H-THYROX-25[57]' src/session/writer_inspector.py`
- Contrato (3)/(4) lo pendiente se recoge o termina sin depender del agente: src/session/process_ownership.py:106 `drain_session` (gracia → SIGTERM → SIGKILL, exit 3 si forzado); un hijo que espera una notificación que no llega se retira al vencer la gracia y el ítem queda fallido (caso 2 de la suite) — `git log --oneline -- src/session/process_ownership.py` → 269b96040
- Grupo de procesos de timeout (H-THYROX-255): src/session/process_ownership.py:5-10 explica que `timeout` hace setpgid y por eso la frontera es la sesión, no el grupo — `sed -n 1,25p src/session/process_ownership.py`
- Prueba obligatoria con ítem falso que sigue escribiendo tras el principal, output congelado y control de anulación (caso 3 retira el bloque item-drain con gawk): tests/session/test-headless-pool-item-drain.sh (116 líneas, 3 commits: 269b96040, bfd372978, ea4097bf5) — `bash tests/session/test-headless-pool-item-drain.sh` → «result: 17 of 17 assertions green», exit 0
- Suites unitarias del mecanismo: `python3 tests/session/test_process_ownership.py` → 12 de 12 en verde; `python3 tests/session/test_writer_inspector.py` → 16 de 16 en verde; tests/run.sh las descubre por glob (`find tests -name 'test*.sh'`, :83)
- Gracia configurable documentada: .env.example:255 `HEADLESS_POOL_ITEM_DRAIN_SECONDS=` — `grep -n HEADLESS_POOL_ITEM_DRAIN_SECONDS .env.example`
- Insumo Podman (#309) presente: commit 23a756809 «Probe Podman's execution capabilities on this host», src/lib/podman_capabilities.sh:420 `--pids-limit 16` — `git show --stat 23a75680`
- Alternativa `unshare + cgroup pids` NO medida: `git grep -l unshare -- .claude` → 0 archivos; `git grep -nE 'unshare' -- src tests` → 0; `bin/agent_store buscar-hallazgos --repo /home/user/thyrox --query unshare` → Total: 0; `--query setsid` → Total: 0

## Lo que falta — tu alcance

- Medir la alternativa `unshare` + cgroup `pids` vía pool (mismo protocolo que src/lib/podman_capabilities.sh: N procesos contra un límite, limpieza tras salir) y dejar el banco en .claude/workbench/
- Registrar con `bin/agent_store agregar-hallazgo` la elección del mecanismo (sesión con setsid + drenaje frente a Podman/unshare) con las dos medidas citadas; hoy la decisión vive sólo en el docstring de process_ownership.py y en el cuerpo del commit 269b96040
- Mover la tarjeta del board de in_progress a done citando 269b96040

## Archivos que te pertenecen

- src/lib/podman_capabilities.sh
- .claude/workbench/<banco-unshare-cgroup-pids>/
- src/session/process_ownership.py

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/session/test-headless-pool-item-drain.sh: 17/17 verde
- tests/session/test_process_ownership.py: 12/12 verde
- tests/session/test_writer_inspector.py: 16/16 verde
- por escribir: tests/lib/test-unshare-capabilities.sh (o caso nuevo en tests/lib/test-podman-capabilities.sh) que mida pids-limit vía unshare con control de anulación

## Dependencias

- TASK-THYROX-0639 no es prerrequisito: el bloque exit-drain (headless-pool.sh:682-735) reutiliza este drenaje al salir el pool
