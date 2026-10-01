Trabajas en thyrox (/home/user/thyrox) en el ítem P2, tramo A, de la tarea TASK-THYROX-0743. Corres
dentro de una ExecutionUnit: todo lo que ejecutes ya está dentro de la frontera gestionada.

Lee primero, completos y en este orden:
1. .claude/workbench/managed-podman-execution-boundary-20261001T164746/template.md
2. .claude/workbench/managed-podman-execution-boundary-20261001T164746/p2-managed-execution-boundary.md
3. .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/p2-initial-callers.txt
4. .claude/rules/clean-code.md y .claude/rules/identificadores-en-ingles.md
5. src/packages/podman-execution/executionAuthorization.ts (ExecutionAuthorization, EXECUTION_KINDS,
   la unión reference, runExecution, materializeExecution) y src/packages/podman-execution/containerRun.ts.

Tramo A — sólo esto:
a) Clasifica cada uno de los cinco callers de dominio de outputs/p2-initial-callers.txt: qué
   materializa, qué clase de ejecución es (EXECUTION_KINDS), qué referencia la autoriza (tarea, grant
   o infraestructura) y si es caller de dominio que salta la autorización o implementación interna.
   Escríbelo en outputs/p2-caller-classification.md (una sección por caller, con file:line).
b) Migra el primero, src/packages/artifact-registry/podmanJobVerifier.ts, para que componga una
   ExecutionAuthorization y llame a runExecution, sin importar runJobWithOutput ni WorkerContainerSpec.
   TDD: primero la prueba que falla (RED), en su suite existente bajo src/packages/artifact-registry;
   luego el cambio mínimo (GREEN); luego un control de anulación: vuelve a la llamada por spec y
   comprueba que caen exactamente las aserciones nuevas; restaura.

Archivos que te pertenecen en este tramo: outputs/p2-caller-classification.md, outputs/p2a-*,
src/packages/artifact-registry/podmanJobVerifier.ts y sus pruebas. No toques ningún otro archivo.
No hagas commit ni push: el plano de control verifica y commitea.

Reglas: identificadores en inglés, comentarios en español técnico; operaciones de archivo con Bash
(cat, sed, gawk, bin/replace_literal); pruebas TypeScript con `bun test <archivo>` desde
src/packages/<paquete>; typecheck con `bun ../../../node_modules/typescript/lib/tsc.js --noEmit -p
tsconfig.test.json` desde el paquete. Antes de cambiar, mide; ninguna afirmación sin la salida del
comando que la produce.

Evidencia (dentro de .claude/workbench/managed-podman-execution-boundary-20261001T164746/outputs/):
p2a-red.log, p2a-green.log, p2a-annulment.log, p2a-typecheck.txt (errores antes y después),
p2a-diff.txt (git diff de tus archivos). Cada log con el comando y su salida literal.

Al terminar responde con: la clasificación en una tabla breve, qué falló en RED, qué cambió, el
resultado de GREEN y de la anulación, y cualquier cosa que no pudiste hacer y por qué.

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  Traceback (most recent call last):
    File "<string>", line 11, in <module>
    File "/home/user/thyrox/src/session/job_runs.py", line 197, in scaffold_run
      run_dir = pathlib.Path(base_dir) / run_id_for(slug, now)
                                         ^^^^^^^^^^^^^^^^^^^^^
    File "/home/user/thyrox/src/workbench/manifest.py", line 247, in run_id_for
      raise RunIdError(f"el slug '{slug}' ya trae sufijo ISO: acunaria dos")
  workbench.manifest.RunIdError: el slug 'cont-p2a-1-verify-20261001T191834' ya trae sufijo ISO: acunaria dos
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  Traceback (most recent call last):
    File "<string>", line 11, in <module>
    File "/home/user/thyrox/src/session/job_runs.py", line 197, in scaffold_run
      run_dir = pathlib.Path(base_dir) / run_id_for(slug, now)
                                         ^^^^^^^^^^^^^^^^^^^^^
    File "/home/user/thyrox/src/workbench/manifest.py", line 247, in run_id_for
      raise RunIdError(f"el slug '{slug}' ya trae sufijo ISO: acunaria dos")
  workbench.manifest.RunIdError: el slug 'cont-p2a-2-verify-20261001T191834' ya trae sufijo ISO: acunaria dos
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  Traceback (most recent call last):
    File "<string>", line 11, in <module>
    File "/home/user/thyrox/src/session/job_runs.py", line 197, in scaffold_run
      run_dir = pathlib.Path(base_dir) / run_id_for(slug, now)
                                         ^^^^^^^^^^^^^^^^^^^^^
    File "/home/user/thyrox/src/workbench/manifest.py", line 247, in run_id_for
      raise RunIdError(f"el slug '{slug}' ya trae sufijo ISO: acunaria dos")
  workbench.manifest.RunIdError: el slug 'cont-p2a-3-verify-20261001T191834' ya trae sufijo ISO: acunaria dos
  ```
