Trabajas en thyrox, dentro de una ExecutionUnit y en un worktree propio (tu directorio de trabajo; NO
es /home/user/thyrox, que es el checkout principal y no debes tocar). Implementas UNA tarea del banco
.claude/workbench/local-models-publication-20261002T114251/: la que nombra la línea `Tarea:` al final.

Lee primero, completos y en este orden:
1. el contrato de tu tarea: .claude/workbench/local-models-publication-20261002T114251/tasks/<tarea>.md;
2. los archivos que el contrato te manda REUTILIZAR, completos, con sus pruebas;
3. .claude/rules/clean-code.md e .claude/rules/identificadores-en-ingles.md.

TypeScript con bun: las pruebas se corren con `cd src/packages/provider && bun test <archivo>`.

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

Tarea: L0

## Intentos previos de este mismo tramo (evidencia, no objetivo nuevo)

- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA typecheck del proveedor
  FALLA no usa getDefaultMaxRetries
  FALLA no usa getRetryDelay
  FALLA falta outputs/L0-red.log
  FALLA falta outputs/L0-green.log
  FALLA falta outputs/L0-annulment.log
  scope: L0-0908 dentro de su alcance (alcance medido: 0 ruta(s) cambiada(s))
  FALLA L0 no añadió ninguna prueba
  execution thyrox-worker-maintenance-muqze9s7-13386 kind=maintenance task=TASK-THYROX-0908 exit=1
  __BG_EXIT__=1
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA typecheck del proveedor
  FALLA no usa getDefaultMaxRetries
  FALLA no usa getRetryDelay
  FALLA falta outputs/L0-red.log
  FALLA falta outputs/L0-green.log
  FALLA falta outputs/L0-annulment.log
  scope: L0-0908 dentro de su alcance (alcance medido: 0 ruta(s) cambiada(s))
  FALLA L0 no añadió ninguna prueba
  execution thyrox-worker-maintenance-mur007y8-17923 kind=maintenance task=TASK-THYROX-0908 exit=1
  __BG_EXIT__=1
  ```
- qwen3.8-flash: provider_transient (exit 1, verificación 1)
  ```
  FALLA typecheck del proveedor
  FALLA no usa getDefaultMaxRetries
  FALLA no usa getRetryDelay
  FALLA falta outputs/L0-red.log
  FALLA falta outputs/L0-green.log
  FALLA falta outputs/L0-annulment.log
  scope: L0-0908 dentro de su alcance (alcance medido: 0 ruta(s) cambiada(s))
  FALLA L0 no añadió ninguna prueba
  execution thyrox-worker-maintenance-mur0950z-19923 kind=maintenance task=TASK-THYROX-0908 exit=1
  __BG_EXIT__=1
  ```
