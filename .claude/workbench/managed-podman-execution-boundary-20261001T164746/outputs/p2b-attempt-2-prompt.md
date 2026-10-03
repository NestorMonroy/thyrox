Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo B, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-caller-classification.md (la clasificación del tramo A)
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts y src/packages/podman-execution/containerRun.ts
6. el diff ya aceptado del tramo A: .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-diff.txt (la forma a imitar).

Tramo B — sólo esto. Migra, uno tras otro, src/packages/local-models/ollamaModelInstaller.ts y src/packages/local-models/podmanArtifactFetcher.ts, para que cada uno componga una ExecutionAuthorization
(la clase y la referencia que la clasificación le asigna) y llame a runExecution o
materializeExecution, sin importar runJobWithOutput, materializeContainer ni WorkerContainerSpec.
Por cada uno, TDD: primero la prueba que falla (RED) en su suite existente; luego el cambio mínimo
(GREEN); luego el control de anulación: vuelve a la llamada por spec y comprueba que caen exactamente
las aserciones nuevas; restaura.

Archivos que te pertenecen: src/packages/local-models/ollamaModelInstaller.ts, src/packages/local-models/podmanArtifactFetcher.ts y sus pruebas, y outputs/p2b-*.

No hagas commit ni push: el plano de control verifica y commitea. No toques archivos fuera de los
tuyos. Si encuentras un defecto fuera de tu tramo, NO lo arregles: añade una línea JSON
{"summary": "...", "sourceRef": "archivo:línea"} a .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2b-findings.jsonl y sigue.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (en .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/): p2b-red.log, p2b-green.log, p2b-annulment.log, p2b-typecheck.txt (errores
antes y después), p2b-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA src/packages/local-models/ollamaModelInstaller.ts aún usa una función por spec
  FALLA src/packages/local-models/ollamaModelInstaller.ts no compone ExecutionAuthorization
  26:import { ContainerRunError, runJobWithOutput } from '@thyrox/podman-execution/containerRun.ts'
  28:import type { ContainerOwner, WorkerContainerSpec } from '@thyrox/podman-execution/workerContainerLifecycle.ts'
  66:export function fetchJobSpec(options: PodmanArtifactFetcherOptions, pinned: PinnedModelArtifact, destination: string, scratchDir: string): WorkerContainerSpec {
  119:    const job = await runJobWithOutput(options.podman, fetchJobSpec(options, pinned, destination, scratchDir))
  FALLA src/packages/local-models/podmanArtifactFetcher.ts aún usa una función por spec
  FALLA src/packages/local-models/podmanArtifactFetcher.ts no compone ExecutionAuthorization
  FALLA falta outputs/p2b-red
  FALLA falta outputs/p2b-green
  FALLA falta outputs/p2b-annulment
  FALLA falta outputs/p2b-typecheck
  suite local-models: 5 fallas (admitidas 5)
  execution thyrox-worker-maintenance-muq5o0pc-30418 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
