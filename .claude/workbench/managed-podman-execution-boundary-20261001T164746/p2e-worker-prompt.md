Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo E, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-caller-classification.md (la clasificación del tramo A)
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts y src/packages/podman-execution/containerRun.ts
6. el diff ya aceptado del tramo A: .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-diff.txt (la forma a imitar).

Tramo E — sólo los pasos 5 y 6 de la sección «Secuencia» de p2, y la prueba de arquitectura:
5) Retira bin/podman-execution-execute como entrada pública: src/packages/podman-execution/bin/execute.ts
   sale de bin/ (a src/packages/podman-execution/executionEntry.ts, sin shebang), lo invoca sólo
   src/lib/managed_execution.sh, y `python3 src/session/generate_bin.py --check` queda limpio.
   La verificación de orphans del plano de control (`reconcile-orphans`, que hoy invoca
   src/session/task_continuation.py) se conserva por la nueva ruta: actualiza ese llamador.
6) Gate: amplía src/verify/check_podman_materialization (o su prueba) para que falle si reaparece
   una entrada pública en bin/ o un caller de dominio por spec; prueba de arquitectura que falla si un
   módulo fuera de la lista declarada (src/session/control_plane_entries.tsv) invoca
   managed_execution.sh o la entrada, o si un archivo productivo fija THYROX_MANAGED_EXECUTION_RUNNER.
   Anulación: los tres casos a/b/c de la sección «Control de anulación» de p2.

Archivos que te pertenecen: src/packages/podman-execution/bin/execute.ts (lo mueves),
src/packages/podman-execution/executionEntry.ts, src/lib/managed_execution.sh, bin/ (sólo lo que
genera generate_bin.py), src/session/task_continuation.py (sólo la ruta de reconcile-orphans),
src/session/control_plane_entries.tsv, src/verify/check_podman_materialization.py y tests/verify/test_check_podman_materialization.py, y outputs/p2e-*.

No hagas commit ni push: el plano de control verifica y commitea. No toques archivos fuera de los
tuyos. Si encuentras un defecto fuera de tu tramo, NO lo arregles: añade una línea JSON
{"summary": "...", "sourceRef": "archivo:línea"} a .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2e-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/): p2e-red.log, p2e-green.log, p2e-annulment.log, p2e-typecheck.txt (errores
antes y después), p2e-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.
