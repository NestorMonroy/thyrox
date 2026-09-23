# tsc_schedule: el planificador del lazo tsc cero

`src/verify/tsc_schedule.py` (`bin/tsc_schedule`). Suite:
`tests/verify/test_tsc_schedule.py` (15 casos).

Posterior Beta(aceptadas + ε·α₀, rechazadas + ε·(1 − α₀)) por proponente, con
ε validado en [0, 1). Su media es la α̂ suavizada del plan. Para elegir,
Thompson sampling: se muestrea α̃ con semilla registrada y se ordena por
α̃ × objetivos; el lote es voraz y sin archivos compartidos. `ambiguous`,
`no-targets` e `infrastructure` no cuentan en el registro.

Lee el mismo JSONL de propuestas que `bin/batch_verification --proposals`
(`proposal_id`, `proposer`, `targets`, `files`) y emite el lote en ese formato.

| Pieza anulada | Cae |
|---|---|
| `epsilon-validation` | «ε = 1 rehúsa», «ε negativo rehúsa» |
| `ignored-outcomes` — ambiguous/no-targets/infraestructura cuentan en contra | «p: 1 aceptada, 2 rechazadas» |
| `thompson-to-mean` — elegir por la media, sin exploración | «el proponente sin historia sale elegido alguna vez» |
| `interference` — sin control de archivos compartidos | «de las que chocan entra una sola» |

Métrica: casos de la suite por pieza anulada; blobs en `annulment.jsonl`.
Ciega a: si Thompson mejora el rendimiento del lazo frente a la media — eso
sólo lo mide el registro de lotes reales.

## Registro de veredictos (`batch_verification --verdicts-out`)

Una fila JSONL por propuesta, AÑADIDA al registro: es la entrada `--ledger` de
`tsc_schedule`. Anulación `ledger-append` (abrir con `w`): cae «el registro se
AÑADE, no se reescribe». `STALE-PYC-ledger-append`: la primera corrida de esa
anulación, que no se ejecutó por el bytecode en caché (ver el banco
`annulment-control-*`).
