Trabajas en thyrox, dentro de una ExecutionUnit y en un worktree propio (tu directorio de trabajo; NO
es /home/user/thyrox, que es el checkout principal y no debes tocar). Implementas UNA tarea del banco
.claude/workbench/mechanism-registry-20261002T061646/: la que nombra la línea `Tarea:` al final.

Lee primero, completos y en este orden:
1. el contrato de tu tarea: .claude/workbench/mechanism-registry-20261002T061646/tasks/<tarea>.md;
2. los archivos que el contrato te manda REUTILIZAR, completos, con sus pruebas;
3. .claude/rules/clean-code.md e .claude/rules/identificadores-en-ingles.md.

Python, siempre con uv, nunca con el python3 del sistema. Antes de nada corre:
    bash .claude/workbench/mechanism-registry-20261002T061646/verify/uv_env.sh "$PWD" /home/user/thyrox
y después usa `uv run --frozen --no-sync python <archivo>` o los envoltorios de bin/ (que usan el .venv de uv).

Reglas:
- Identificadores en inglés; comentarios y docstrings en español técnico, de intención, sin historial.
- Pruebas de Python: guion con main() ejecutable con `uv run --frozen --no-sync python <archivo>`; sin pytest.
- TDD: primero la prueba en rojo, después la implementación. Por cada rama de decisión nueva, comprueba
  que retirarla hace caer exactamente sus aserciones, y dilo con números en outputs/<tarea>-annulment.log.
- Nada de /tmp fijo: mktemp -d o tempfile, y se limpian. Nunca uses `git stash`. No añadas dependencias.
- bin/ sólo se genera: `bash bin/generate_bin`; comprueba con `bash bin/generate_bin --check`.
- Nunca imprimas, copies ni escribas el VALOR de una variable de entorno; no leas .env.
- No toques archivos fuera de los que tu contrato declara. No commitees ni hagas push.
- Si encuentras un defecto fuera de tu tarea, NO lo arregles: añade una línea JSON
  {"summary": "...", "sourceRef": "archivo:línea"} a outputs/<tarea>-findings.jsonl del banco y sigue.

Antes de terminar corre `bash bin/check_lint_zero <tus .py y .sh>` (cero hallazgos propios) y deja la
evidencia que pide tu contrato: outputs/<tarea>-red.log, -green.log, -annulment.log y -diff.txt, cada uno
con el comando y su salida literal. Responde con: estado, archivos cambiados, casos cubiertos (caso ->
prueba), anulación con sus números, y un resumen de dos líneas.

Tarea: T001

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  execution thyrox-worker-maintenance-muqlbqp0-30982 kind=maintenance task=TASK-THYROX-0769 exit=1
  __BG_EXIT__=1
  ```
- deepseek-v4.1-flash: provider_transient (exit 1, verificación 1)
  ```
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  execution thyrox-worker-maintenance-muqlkyg9-1505 kind=maintenance task=TASK-THYROX-0769 exit=1
  __BG_EXIT__=1
  ```
- deepseek-v4.1-flash: secret_exposure_detected (exit 1, verificación 1)
  ```
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  gawk: fatal: cannot open file `src/verify/mechanisms.tsv' for reading: No such file or directory
  execution thyrox-worker-maintenance-muqm6bnt-13123 kind=maintenance task=TASK-THYROX-0769 exit=1
  __BG_EXIT__=1
  ```
