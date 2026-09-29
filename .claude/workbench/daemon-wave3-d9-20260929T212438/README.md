# daemon-wave3-d9

## El encargo

> cuando termine las task vas a continuar con las siguientes de Daemon-* con el mismo mecanismo

D9 corre sola porque es dueña de `main.ts`, `workerRegistry.ts` y `bgDaemon.ts`.

## Las piezas

| archivo | que hace |
|---|---|
| `items.txt` | el ítem D9 con sus archivos y los símbolos de la referencia |
| `launch.sh` | headless-pool con aislamiento por worktree, un ítem |
| `regress.sh` | pruebas de daemon y cli un proceso por archivo, y typecheck de ambos |
| `outputs/` | salida sellada del pool (`1.closed`, `run.closed`) |
| `regress-result.txt` | 1003/1003 en 87 archivos, typecheck 0 y 0 |

## Los resultados

Verificado en su worktree e integrado con `pool_integrate` sin conflictos.

*Metrica:* veredicto del ítem, pruebas de daemon y cli, typecheck.
*Ciega a:* el cableado de `supervisorLog` y `daemonConfig` en `main.ts`, que
lleva la ola de D18.
