Trabajas en thyrox (/home/user/thyrox) en el ítem P3, tramo p3, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p3-headless-pool-managed-execution.md (tu contrato: objetivo, invariantes, RED, implementación mínima, GREEN, anulación)
3. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
4. src/lib/managed_execution.sh y src/session/bg.sh (la entrada canónica que dejó p2)

Tramo p3 — sólo esto:
Todo el contrato p3: mide outputs/p3-initial.txt; envuelve la invocación del ítem de headless-pool con managed_execution.sh, dueño pool con id <run>-<ítem> separado (si hace falta, añade --owner-kind/--owner-id a la orden run de src/packages/podman-execution/executionCommand.ts); M8 declarativo (sin perfil: red none y sólo el árbol del ítem); RED/GREEN/anulación; y la ejecución real de dos ítems con el doble de thyrox -p dentro de unidades, con PID y cgroup de cada ítem y de sus hijos, en outputs/p3-real-units.txt.

Archivos que te pertenecen: src/session/headless-pool.sh, tests/session/test-headless-pool*.sh, src/packages/podman-execution/executionCommand.ts y su prueba, y .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p3-*. No toques ningún otro.
No hagas commit ni push: el plano de control verifica y commitea. Si encuentras un defecto fuera de
tu tramo, NO lo arregles: añade una línea JSON {"summary": "...", "sourceRef": "archivo:línea"} a
.claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p3-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal). Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce. TDD: RED (falla por la razón esperada), implementación mínima, GREEN, y el
control de anulación de tu contrato (retira la causa: caen exactamente sus aserciones; restaura).

Evidencia en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/: p3-red.log, p3-green.log, p3-annulment.log, p3-diff.txt, más lo que tu
contrato pida para este tramo. Cada log con el comando y su salida literal y su código de salida.
