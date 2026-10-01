Trabajas en thyrox (/home/user/thyrox) en el ítem P4, tramo p4b, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p4-managed-orchestrators.md (tu contrato: objetivo, invariantes, RED, implementación mínima, GREEN, anulación)
3. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
4. src/lib/managed_execution.sh y src/session/bg.sh (la entrada canónica que dejó p2)

Tramo p4b — sólo esto:
parallel_map: el comando por ítem corre en una unidad por managed_execution.sh, con --task y --kind; sin tarea rehúsa con exit 2 salvo payload de observación.

Archivos que te pertenecen: src/session/parallel_map.sh y su suite en tests/session/, y .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p4b-*. No toques ningún otro.
No hagas commit ni push: el plano de control verifica y commitea. Si encuentras un defecto fuera de
tu tramo, NO lo arregles: añade una línea JSON {"summary": "...", "sourceRef": "archivo:línea"} a
.claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p4b-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal). Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce. TDD: RED (falla por la razón esperada), implementación mínima, GREEN, y el
control de anulación de tu contrato (retira la causa: caen exactamente sus aserciones; restaura).

Evidencia en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/: p4b-red.log, p4b-green.log, p4b-annulment.log, p4b-diff.txt, más lo que tu
contrato pida para este tramo. Cada log con el comando y su salida literal y su código de salida.
