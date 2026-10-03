Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo A-ro, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-initial-callers.txt
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts (ExecutionAuthorization, EXECUTION_KINDS,
   la unión reference, runExecution, materializeExecution) y src/packages/podman-execution/containerRun.ts.

6. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-diff.txt y .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-findings.jsonl.*.recorded (el hallazgo de este tramo).

Tramo A-ro — sólo esto. El tramo A migró src/packages/artifact-registry/podmanJobVerifier.ts a
ExecutionAuthorization y midió una regresión: la autorización canónica no expresa un sistema de
archivos raíz de sólo lectura (resourceArgv() fija readOnlyRootfs:false), así que el verificador ya
no corre con --read-only. Los tramos B y C migran tres callers más que lo piden.
a) Haz que ExecutionAuthorization pueda declarar el raíz de sólo lectura (un campo opcional, por
   defecto el comportamiento de hoy) y que su materialización lo traduzca a --read-only.
b) Que el verificador lo declare otra vez, como hacía antes de la migración.
TDD: RED (una prueba de la primitiva y una del verificador que exigen --read-only en el argv de
podman create), GREEN, y anulación (retira la traducción: caen exactamente esas aserciones; restaura).

Archivos que te pertenecen: src/packages/podman-execution/executionAuthorization.ts y lo que
materializa el perfil de recursos dentro de src/packages/podman-execution/, sus pruebas,
src/packages/artifact-registry/podmanJobVerifier.ts y su prueba, y outputs/p2a-ro-*.
No hagas commit ni push: el plano de control verifica y commitea. Si encuentras un defecto fuera de
tu tramo, NO lo arregles: añade una línea JSON {"summary": "...", "sourceRef": "archivo:línea"} a
.claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2a-ro-findings.jsonl y sigue.
Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (dentro de .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/):
p2a-ro-red.log, p2a-ro-green.log, p2a-ro-annulment.log, p2a-ro-typecheck.txt (errores antes y después),
p2a-ro-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.

Al terminar responde con: la clasificación en una tabla breve, qué falló en RED, qué cambió, el
resultado de GREEN y de la anulación, y cualquier cosa que no pudiste hacer y por qué.

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta outputs/p2a-ro-red
  FALLA falta outputs/p2a-ro-green
  FALLA falta outputs/p2a-ro-annulment
  exit=0  grep -q readOnlyRootfs src/packages/podman-execution/executionAuthorization.ts
  exit=0  cd src/packages/podman-execution && bun test 2>&1 | grep -qE "^ *0 fail$"
  exit=0  cd src/packages/artifact-registry && bun test 2>&1 | grep -qE "^ *0 fail$"
  exit=1  grep -q -- --read-only src/packages/artifact-registry/__tests__/podmanJobVerifier.test.ts
  execution thyrox-worker-maintenance-muq3an0n-9619 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA falta outputs/p2a-ro-red
  FALLA falta outputs/p2a-ro-green
  FALLA falta outputs/p2a-ro-annulment
  exit=0  grep -q readOnlyRootfs src/packages/podman-execution/executionAuthorization.ts
  exit=0  cd src/packages/podman-execution && bun test 2>&1 | grep -qE "^ *0 fail$"
  exit=0  cd src/packages/artifact-registry && bun test 2>&1 | grep -qE "^ *0 fail$"
  exit=1  grep -q -- --read-only src/packages/artifact-registry/__tests__/podmanJobVerifier.test.ts
  execution thyrox-worker-maintenance-muq3j5tz-11042 kind=maintenance task=TASK-THYROX-0743 exit=1
  __BG_EXIT__=1
  ```
