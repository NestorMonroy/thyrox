Implementas en thyrox UNA extensión pequeña (TASK-THYROX-0667), en TDD, dentro de tu worktree.

Contexto medido: `src/session/headless-pool.sh` rehúsa `--execution unit` junto con
`--isolation worktree` («--execution unit no va todavía con --isolation worktree», línea ~261).
El bloque que lanza un ítem en su unidad (líneas ~830-852) ya monta `$workdir` y `$HP_LIVE`
y pasa `--workdir "$workdir"` a la primitiva; con aislamiento, `$workdir` es el worktree del ítem.
Hace falta que un trabajador local gestionado (unidad) modifique el repositorio en su propio
worktree y que el pool siga dejando `<n>.patch`, `<n>.files` y `<n>.verdict`, y corriendo `--verify`.

Lo que entregas:
1. RED primero: en `tests/session/test-headless-pool-execution-unit.sh` (dobles existentes) un caso
   que lance el pool con `--execution unit --isolation worktree --verify <orden>` y compruebe:
   el ítem corre por el runner de la primitiva (no en el anfitrión), con `--workdir` = su worktree
   montado rw, y al cerrar existen `<n>.patch`/`<n>.files`/`<n>.verdict` como en
   `tests/session/test-headless-pool-worktree.sh`. Debe fallar antes del cambio.
2. GREEN: el cambio mínimo en `headless-pool.sh` (retirar el rechazo y lo que haga falta para que la
   finalización del worktree funcione con la unidad). No cambies otra cosa.
3. Anulación: restaura el rechazo en una copia (`mktemp`) y di cuántas aserciones caen; deben ser
   exactamente las del caso nuevo.
4. Corre en verde: `bash tests/session/test-headless-pool-execution-unit.sh` y
   `bash tests/session/test-headless-pool-worktree.sh`, y `bash bin/check_lint_zero` sobre los .sh tocados.

Reglas: identificadores en inglés; comentarios en español técnico, de intención; nada en /tmp fijo;
no leas stdin; no uses `git stash`; no commitees; no toques archivos fuera de los dos nombrados más
el bench de esta tarea. Responde con: archivos cambiados, casos nuevos, números de la anulación y
salida final de las dos suites.
