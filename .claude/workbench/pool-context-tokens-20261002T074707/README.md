# pool-context-tokens

## El encargo

<!-- verbatim, sin parafrasear -->

> adelante con la cualificación de Qwen en TDD

## La premisa, si se corrigio al primer comando

Cualificar a Qwen no bastaba: `headless-pool` llama al recomendador sin
`--context`, y el recomendador exige entonces `SUBAGENT_FLOOR_TOKENS` =
126 029 tokens (`agent/bin/recommend.ts`). Qwen 2.5 7B sirve 32 768: aun
cualificado, quedaría bloqueado por «contexto medido insuficiente». Medido en
400 ítems de olas de traducción anteriores
(`ai-course-notes:.claude/workbench/translation/*/translate/*/N.json`): contexto
medio por turno p50 8 906, p90 13 406, máximo 20 984.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/cases.sh` | casos 7–9 de `test-headless-pool-model-policy.sh` |
| `probes/impl.py` | `--context-tokens N` validado y reenviado como `--context N` |
| `probes/red.sh`, `probes/green.sh`, `probes/annul.py`, `probes/baseline.sh` | rojo, verde, anulaciones y línea base en HEAD |

## Los resultados

| Paso | Resultado | Evidencia |
|---|---|---|
| rojo | caso 7 falla; el 9 pasaba por el motivo equivocado (opción desconocida) y se endureció exigiendo el mensaje | `outputs/red.txt` |
| verde | política 18/18, local-model-e2e 8/8, execution-unit 14/14 | `outputs/green-*.txt` |
| `test-headless-pool.sh` | 147/148, con la misma falla en HEAD sin el cambio, dos corridas (H-THYROX-318) | `outputs/baseline-head-*.txt` |

| Anulación | Cae |
|---|---|
| no reenviar `--context` | sólo «caso 7: el recomendador recibe --context 32768» |
| no validar | sólo las tres del caso 9 |

*Metrica:* aserciones de las suites del pool en rojo, verde y bajo cada anulación.
*Ciega a:* si 32 768 basta para el pico de un ítem real: lo medido es la media por turno.
