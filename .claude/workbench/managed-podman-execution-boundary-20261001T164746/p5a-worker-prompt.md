Trabajas en thyrox (/home/user/thyrox) en el ítem P5, tramo p5a, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p5-end-to-end-proof.md (tu contrato: objetivo, invariantes, RED, implementación mínima, GREEN, anulación)
3. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
4. src/lib/managed_execution.sh y src/session/bg.sh (la entrada canónica que dejó p2)

Tramo p5a — sólo esto:
Añade strace y redis-server a task-runner-image/Containerfile y reconstruye la imagen por la primitiva (podman-execution build-image con --task); prueba que ambos binarios existen en una unidad de la imagen nueva (outputs/p5a-image.log).

Archivos que te pertenecen: src/packages/podman-execution/task-runner-image/Containerfile (o la ruta real de ese Containerfile), y .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p5a-*. No toques ningún otro.
No hagas commit ni push: el plano de control verifica y commitea. Si encuentras un defecto fuera de
tu tramo, NO lo arregles: añade una línea JSON {"summary": "...", "sourceRef": "archivo:línea"} a
.claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p5a-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal). Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce. TDD: RED (falla por la razón esperada), implementación mínima, GREEN, y el
control de anulación de tu contrato (retira la causa: caen exactamente sus aserciones; restaura).

Evidencia en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/: p5a-red.log, p5a-green.log, p5a-annulment.log, p5a-diff.txt, más lo que tu
contrato pida para este tramo. Cada log con el comando y su salida literal y su código de salida.
