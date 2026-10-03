Trabajas en thyrox (/home/user/thyrox) en el ítem P5, tramo p5b, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p5-end-to-end-proof.md (tu contrato: objetivo, invariantes, RED, implementación mínima, GREEN, anulación)
3. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
4. src/lib/managed_execution.sh y src/session/bg.sh (la entrada canónica que dejó p2)

Tramo p5b — sólo esto:
Todo el resto del contrato p5: la suite e2e desde manifest scaffold en una unidad hasta push a un remoto desechable (git init --bare), cada paso por las entradas canónicas, con la tabla paso -> contenedor -> PIDs -> cgroups en outputs/p5-process-table.tsv, la exclusión contada de PF_EXITING, RED (un paso en el host la hace caer), GREEN y anulación.

Archivos que te pertenecen: src/packages/podman-execution/__tests__/managedExecution.real.test.ts o una suite e2e nueva en ese paquete, y .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p5b-*. No toques ningún otro.
No hagas commit ni push: el plano de control verifica y commitea. Si encuentras un defecto fuera de
tu tramo, NO lo arregles: añade una línea JSON {"summary": "...", "sourceRef": "archivo:línea"} a
.claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p5b-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal). Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce. TDD: RED (falla por la razón esperada), implementación mínima, GREEN, y el
control de anulación de tu contrato (retira la causa: caen exactamente sus aserciones; restaura).

Evidencia en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/: p5b-red.log, p5b-green.log, p5b-annulment.log, p5b-diff.txt, más lo que tu
contrato pida para este tramo. Cada log con el comando y su salida literal y su código de salida.
