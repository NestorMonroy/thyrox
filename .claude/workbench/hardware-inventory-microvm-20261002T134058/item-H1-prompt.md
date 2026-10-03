Trabajas en thyrox, dentro de una ExecutionUnit y en un worktree propio (tu directorio de trabajo; NO
es /home/user/thyrox, que es el checkout principal y no debes tocar). Implementas UNA tarea del banco
.claude/workbench/hardware-inventory-microvm-20261002T134058/: la que nombra la línea `Tarea:` al final.

Lee primero, completos y en este orden:
1. el contrato de tu tarea: .claude/workbench/hardware-inventory-microvm-20261002T134058/tasks/<tarea>.md;
2. los archivos que el contrato te manda REUTILIZAR, completos, con sus pruebas;
3. .claude/rules/clean-code.md e .claude/rules/identificadores-en-ingles.md.

Shell: la suite se corre con `bash tests/session/test-hardware-inventory.sh`.

Reglas:
- Identificadores en inglés; comentarios y docstrings en español técnico, de intención, sin historial.
- TDD: primero la prueba en rojo, después la implementación. Por cada rama de decisión nueva, comprueba
  que retirarla hace caer exactamente sus aserciones, y dilo con números en outputs/<tarea>-annulment.log.
- Nada de /tmp fijo: mktemp -d, y se limpia. Nunca uses `git stash`. No añadas dependencias.
- Nunca imprimas, copies ni escribas el VALOR de una variable de entorno; no leas .env.
- No toques archivos fuera de los que tu contrato declara. No commitees ni hagas push.
- Si encuentras un defecto fuera de tu tarea, NO lo arregles: añade una línea JSON
  {"summary": "...", "sourceRef": "archivo:línea"} a outputs/<tarea>-findings.jsonl del banco y sigue.

Antes de terminar deja la evidencia que pide tu contrato: outputs/<tarea>-red.log, -green.log y
-annulment.log, cada uno con el comando y su salida literal. Responde con: estado, archivos cambiados,
casos cubiertos (caso -> prueba), anulación con sus números, y un resumen de dos líneas.

Tarea: H1
