Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo D, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-caller-classification.md (la clasificación del tramo A)
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts y src/packages/podman-execution/containerRun.ts
6. el diff ya aceptado del tramo A: .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-diff.txt (la forma a imitar).

Tramo D — sólo los pasos 1 a 4 de la sección «Secuencia» de p2:
1-2) La entrada canónica es `bash bin/thyrox-bg start <nombre> --task TASK-THYROX-0743 --kind <tipo> -- argv`
   (src/session/bg.sh -> src/lib/managed_execution.sh). Añade a .claude/workbench/managed-podman-execution-boundary-20261001T164746/probes/unit_identity.sh el campo
   "entry" en cada línea de manifest.jsonl, tomado de la variable THYROX_EXECUTION_ENTRY que
   src/lib/managed_execution.sh exporta a la unidad (añádela ahí: valor "thyrox-bg"); sin variable,
   "entry":"bootstrap-cli". Prueba RED/GREEN en tests/session/test-bg-managed-execution.sh y en
   .claude/workbench/managed-podman-execution-boundary-20261001T164746/tests/test_manifest_identity.py.
3-4) NO lances unidades: dentro de tu unidad no hay `podman` ni su socket (medido:
   outputs/unit-podman-reachability.log). La demostración —una unidad de cada clase que usarán
   p3, p4 y p5 por la entrada canónica, con "entry":"thyrox-bg" y contenedores distintos— la
   ejecuta el plano de control con probes/p2d_control_plane.sh después de tu aceptación
   (bootstrap.md). Tu entrega son los pasos 1-2 con sus pruebas.

Archivos que te pertenecen: src/lib/managed_execution.sh, src/session/bg.sh,
tests/session/test-bg-managed-execution.sh, .claude/workbench/managed-podman-execution-boundary-20261001T164746/probes/unit_identity.sh,
.claude/workbench/managed-podman-execution-boundary-20261001T164746/tests/test_manifest_identity.py, .env.example si declaras una clave, y outputs/p2d-*.

No hagas commit ni push: el plano de control verifica y commitea. No toques archivos fuera de los
tuyos. Si encuentras un defecto fuera de tu tramo, NO lo arregles: añade una línea JSON
{"summary": "...", "sourceRef": "archivo:línea"} a .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2d-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/): p2d-red.log, p2d-green.log, p2d-annulment.log, p2d-typecheck.txt (errores
antes y después), p2d-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta p2d-red
  FALLA falta p2d-green
  FALLA falta p2d-annulment
  scope: p2d dentro de su alcance (alcance medido: 34 ruta(s) cambiada(s))
  FALLA p2d no añadió ni cambió ninguna prueba
  execution thyrox-worker-maintenance-muqhpa3y-8889 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta p2d-red
  FALLA falta p2d-green
  FALLA falta p2d-annulment
  scope: p2d dentro de su alcance (alcance medido: 51 ruta(s) cambiada(s))
  FALLA p2d no añadió ni cambió ninguna prueba
  execution thyrox-worker-maintenance-muqhyig6-10926 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta p2d-red
  FALLA falta p2d-green
  FALLA falta p2d-annulment
  scope: p2d dentro de su alcance (alcance medido: 67 ruta(s) cambiada(s))
  FALLA p2d no añadió ni cambió ninguna prueba
  execution thyrox-worker-maintenance-muqi7rlf-12965 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
- deepseek-v4.1-flash: stalled (exit 124, verificación 1)
  ```
  FALLA falta p2d-red
  FALLA falta p2d-green
  FALLA falta p2d-annulment
  scope: p2d cambió 7 ruta(s) fuera de su alcance:
    bin/check_durable_path_ownership
    bin/check_execution_authorization
    bin/check_infrastructure_runtime_idle
    bin/check_podman_access_ownership
    bin/managed_execution_containment
    bin/unit_attest
    bin/worker_secret_inheritance
  execution thyrox-worker-maintenance-muqjun8j-8763 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta p2d-red
  FALLA falta p2d-green
  FALLA falta p2d-annulment
  scope: p2d dentro de su alcance (alcance medido: 129 ruta(s) cambiada(s))
  execution thyrox-worker-maintenance-muqk828a-13361 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
