# model-fallback-chain-reference

## El encargo

> «la política no permite respaldo , cambiala si queremos respaldo» ·
> «analiza bien» · «no queremos ser tan rigidos, porque una politica muy
> rigida hace que falle todo» · «es como lo hemos estado en
> thyrox/_references/claude-code-bin/**» · «revisa como lo hace la referencia
> con thyrox/bin binary» · «estas seguro? si tienes dudas de la
> implementacion, consultas con thyrox/bin los binarios … los analisis los
> registras en /home/user/thyrox/.claude/workbench/ , si consideras que hacen
> falta tareas … creas las tareas y las realizas»

## La premisa, si se corrigio al primer comando

Se afirmó en sesión, antes de medir con `bin/binary`, que en la referencia
`model_blocked` «no salta». Falso: salta cuando hay `fallbackModel`
(`outputs/reference-analysis.md` §2). También faltaban dos piezas que la
lectura con `symbol` destapó: el reintento en el sitio cuando la cadena se
agota por `overloaded`/`server_error` (`$a`) y la cadena automática de
bedrock/vertex (`rre` + `yb`).

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/reference-analysis.md` | el análisis de la referencia, con la cita de cada afirmación |
| `outputs/symbols-fallback-core.txt`, `symbol-*.txt`, `references-Tx.txt`, `sdk-*.txt`, `literal-*.txt` | salidas crudas de `bin/binary` |
| `outputs/red-0920.txt` | la mitad roja de TASK-THYROX-0920 (9 fallas) |
| `probes/annul_0920.sh`, `outputs/annul-0920.txt` | anulación por mitad de juicio |
| `outputs/green-0920.txt`, `green-pool-0920.txt`, `typecheck-0920.txt` | el subconjunto derivado en verde |

## Los resultados

TASK-THYROX-0920 — la política pasa de booleano a la forma de la referencia:

- `fallback.enabled` = interruptor (`G6`); `fallback.chain` = orden (`rre`);
  cada eslabón local dentro de `allowed` (`Hr`), rehusado si no;
- sin `chain` rige `[claude-cli]`: ninguna política existente cambia;
- `recommendExecution` da motivos tipados (`FallbackTrigger`), la posición del
  salto (`fallback.chainIndex`), `no_usable_fallback` con la cadena agotada, y
  al modelo local elegido sus respaldos locales en orden (`fallbackModels`,
  consumo de TASK-THYROX-0921);
- `agent-recommend --runtime claude-cli` y la frontera de `headless-pool`
  (Ollama caído, proveedor devuelto) exigen `claude-cli` en la cadena, no sólo
  el interruptor.

Anulaciones (`outputs/annul-0920.txt`): cada mitad tumba exactamente su caso —
allowed-check 1, default-chain 3 (los tres dependen de la cadena por defecto),
exhausted-chain 1, local-fallbacks 1, typed-trigger 1, CLI 1, pool 4.

*Metrica:* aserciones de `recommendExecution.test.ts`,
`test_recommend_cli.py`, `test-headless-pool-model-policy.sh`.
*Ciega a:* un salto real en ejecución (eso es TASK-THYROX-0921) y a la
política versionada del repositorio, que esta tarea no cambia.

## TASK-THYROX-0922 — los `tsconfig.json` que apuntaban a `@ant/ink`

Cinco `tsconfig.json` (agent, tools, permission, provider, swarm) listaban
`../@ant/ink/src/types/*.d.ts`. Ese directorio nunca estuvo versionado: el
commit `597bec85c` versionó el paquete como `src/packages/ink` junto con esos
`tsconfig`, generados el 2026-09-26 en `all-tsconfigs-20260926T174919` cuando
`@ant/ink` existía sólo en disco. `tsc -p` moría con TS6053.

`bin/check_package_typecheck` no lo veía, y no por defecto suyo:
sintetiza su proyecto y no lee el `tsconfig.json` del paquete
(`src/typescript/emit_declarations.py:34`). Control: con la ruta rota de nuevo
en swarm publicó 0 (`outputs/annul-0922.txt`). Lo que ahora lo ve es
`tests/verify/test_tsconfig_file_paths.py` (144 `tsconfig` versionados):
rojo 10 rutas, verde 0, anulación en swarm 2.
