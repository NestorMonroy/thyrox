# daemon-wave2

## El encargo

> cuando termine las task vas a continuar con las siguientes de Daemon-* con el mismo mecanismo

Ola 2 del daemon contra 2.1.283: D6, D7, D11, D13, D14 y D16, cada una en su
worktree y disjuntas por archivo; ninguna toca `main.ts` ni `bgDaemon.ts`.

## La premisa, si se corrigio al primer comando

D6 volvió `rechazado` con 18/18 en verde: la prueba fijaba `process.exitCode`
y lo "restauraba" a `undefined`, que Bun ignora, así que el proceso salía 2.
Se corrigió en la prueba (`?? 0`) y se integró el parche corregido
(`outputs/1.corrected.patch`).

## Las piezas

| archivo | que hace |
|---|---|
| `items.txt` | una pieza por línea, con sus archivos y los símbolos de la referencia |
| `template.md` | la plantilla común (la de la ola 1, con la regla de cli) |
| `launch.sh` | headless-pool con aislamiento por worktree y verify por pruebas cambiadas |
| `regress.sh` | pruebas de daemon y cli un proceso por archivo, y typecheck de ambos |
| `outputs/` | salida por ítem del pool; `<n>.json` trae el resumen del agente |
| `regress-result.txt` | 951/951, typecheck 0 y 0 |

## Los resultados

Integrados con `pool_integrate`: 5 verificados y D6 corregido. Tras integrar se
movió la prueba de `ptyAdopter` al directorio de pruebas de cli y se subió a
nivel de módulo un `await import('node:net')` que la ola dejó en una prueba.

*Metrica:* veredicto por ítem, pruebas de `src/packages/daemon` y `src/packages/cli`, typecheck.
*Ciega a:* el cableado en `main.ts` y `bgDaemon.ts`, declarado `// pendiente:` y
que llevan D9 y D18.
