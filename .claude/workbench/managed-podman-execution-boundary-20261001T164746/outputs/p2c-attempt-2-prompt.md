Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo C, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-caller-classification.md (la clasificación del tramo A)
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts y src/packages/podman-execution/containerRun.ts
6. el diff ya aceptado del tramo A: .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-diff.txt (la forma a imitar).

Tramo C — sólo esto. Migra, uno tras otro, src/packages/local-models/quantizationLab.ts y src/packages/daemon/src/podman/podmanWorkerManager.ts (este último con owner.kind = daemon; su ciclo de vida de worker sigue siendo del daemon), para que cada uno componga una ExecutionAuthorization
(la clase y la referencia que la clasificación le asigna) y llame a runExecution o
materializeExecution, sin importar runJobWithOutput, materializeContainer ni WorkerContainerSpec.
Por cada uno, TDD: primero la prueba que falla (RED) en su suite existente; luego el cambio mínimo
(GREEN); luego el control de anulación: vuelve a la llamada por spec y comprueba que caen exactamente
las aserciones nuevas; restaura.

Archivos que te pertenecen: src/packages/local-models/quantizationLab.ts, src/packages/daemon/src/podman/podmanWorkerManager.ts y sus pruebas, y outputs/p2c-*.

No hagas commit ni push: el plano de control verifica y commitea. No toques archivos fuera de los
tuyos. Si encuentras un defecto fuera de tu tramo, NO lo arregles: añade una línea JSON
{"summary": "...", "sourceRef": "archivo:línea"} a .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2c-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/): p2c-red.log, p2c-green.log, p2c-annulment.log, p2c-typecheck.txt (errores
antes y después), p2c-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- deepseek-v4.1-flash: task_failure (exit 1, verificación 1)
  ```
  11:import { runJobWithOutput, type JobOutput } from '@thyrox/podman-execution/containerRun.ts'
  13:import { workerContainerName, type WorkerContainerSpec } from '@thyrox/podman-execution/workerContainerLifecycle.ts'
  51: * (`runJobWithOutput`): crear, arrancar, esperar, leer salidas y retirar,
  71:      const output = await runJobWithOutput(this.podman, this.specOf(step))
  78:  private specOf(step: LabStep): WorkerContainerSpec {
  FALLA src/packages/local-models/quantizationLab.ts aún usa una función por spec
  FALLA src/packages/local-models/quantizationLab.ts no compone ExecutionAuthorization
  FALLA falta outputs/p2c-red
  FALLA falta outputs/p2c-green
  FALLA falta outputs/p2c-annulment
  FALLA falta outputs/p2c-typecheck
  suite local-models: 5 fallas (admitidas 5)
  execution thyrox-worker-maintenance-muq7ad9n-10840 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
