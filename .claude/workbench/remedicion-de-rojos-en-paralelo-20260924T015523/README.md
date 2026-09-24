# remedicion-de-rojos-en-paralelo

## El encargo

> sigues sin usar parallel de gnu linux porque?

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|
| `probes/rojos.txt` | las 18 suites de Python y shell en rojo de la suite completa `suite-capa-v3` |
| `probes/medir.sh` | las corre con GNU parallel (`-j4`), entorno de `tests/run.sh`, joblog y salida por suite |
| `outputs/veredicto.txt` | VERDE/ROJO por suite, del joblog |

## Los resultados

17 de 18 siguen en rojo; `test_rejection_sampling_brief.py` pasa a verde al instalar el grupo `verify` (numpy). `test-node-resolution.sh` y `test-cross-model-read.sh` salen en rojo porque la medición arrancó (01:55:23) antes de la corrección del gate (`a6b4f061`); en serie, después, dan 14/14 y 6/6.

*Metrica:* exit code de cada suite en el joblog de GNU parallel.
*Ciega a:* interferencia entre suites que compartan estado al correr cuatro a la vez; un rojo aquí se re-verifica en serie antes de atribuirlo.
