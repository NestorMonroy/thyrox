# Turnos sin tope en thyrox -p y en headless-pool

El ítem 2 del pool de modo rápido terminó en `error_max_turns` a los 61
turnos. El sin-tope ya existía (`AgentLoop` con `Infinity` y
`maxTurnsEnv.ts`, sin consumidores), pero había tres topes fijos encima:
`streamLoop` (`?? 20`), `thyrox -p` y el bucle de la CLI (20), y el pool
(`MAX_TURNS=12`, siempre pasado).

Ahora el tope es la bandera `--max-turns`, luego `THYROX_CODE_MAX_TURNS`, y
si no hay ninguna, ninguno. Un ítem del pool lo acota su `--timeout`.

## Medición

| Salida | Resultado |
|---|---|
| `agent-tests.txt` | 154/154 |
| `cli-tests.txt` | 79/79 |
| `cli-arguments.txt` | 16/16 |
| `pool-thyrox-p-tests.txt` | 12/12 |
| `pool-trace.txt` | 125/125 |
| `tsc-cli.txt` | vacío |
| `tsc-agent.txt` | 2 TS6053: `tsconfig.json` apunta a `@ant/ink/src/types/ink-jsx.d.ts`, que no existe en disco; anterior a este cambio |

La primera salida de la suite del pool (`pool-tests.txt`) se cortó en 115
líneas con exit 0 y sin resumen; no se cuenta como verde. La repetición con
traza (`pool-trace.txt`) llegó a su resumen.

## Anulación

`headless-pool.pre-annulment.sh` es el pool antes de volver a poner
`MAX_TURNS=12`. Con esa mutación caen exactamente las dos aserciones de «sin
tope» y ninguna más (`annulment.txt`: 123 de 125). El archivo se restauró
y `cmp` lo confirma.

*Métrica:* aserciones de las suites derivadas de los símbolos tocados.
*Ciega a:* un ítem real que agote su `--timeout`; eso lo mide el pool real.
