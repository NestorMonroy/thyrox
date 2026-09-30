# ejecutor-ts-aislado-por-archivo

## El encargo

> sigues sin usar parallel de gnu linux porque? — y la caída de Bun que el pase de exportaciones destapaba en la suite de un solo proceso.

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|
| `src/verify/run_ts_isolated.sh` | un `bun test` por archivo con GNU parallel; `-- ROJO <archivo>` y una línea `pass=… fail=… errores=… caidas=…` |
| `tests/verify/test-run-ts-isolated.sh` | fixture con `mock.module` que contamina: control en un proceso, aislado, fallo real, aborto, lista vacía |
| `probes/fixture/` | el fixture mínimo con que se comprobó que `mock.module` se filtra entre archivos |
| `outputs/rojo.txt` | 2 de 10: el ejecutor no existía |
| `outputs/verde.txt` | 10 de 10 |
| `outputs/anulado-aislamiento.txt` | con `parallel -X` (un solo proceso): caen exactamente las 3 que dependen del aislamiento |
| `outputs/anulado-caida.txt` | sin la comprobación de señal y de `Bun has crashed`: NO cae ninguna — la rama era código muerto y se retiró |

## Los resultados

`tests/run.sh --ts-only` con el ejecutor, sin el pase de exportaciones (`.claude/jobs/ts-ejecutor-aislado-20260924T022450/`): **14 161 pass, 218 fail, 26 errores, 0 caídas, 74 archivos en rojo**; en un solo proceso eran 14 119 / 260 / 26.

*Metrica:* aserciones de la suite; líneas de resumen de cada `bun test`.
*Ciega a:* un test que sólo pasaba gracias al `mock.module` de otro archivo: aislado cae, y se lee como rojo nuevo.
