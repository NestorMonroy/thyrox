# pool-memfree-admission

## El encargo

> se puede meter en un while? para que no se agoten, analiza, documenta e
> implementa, en TDD

Dicho sobre la respuesta de que 40 trabajos en paralelo agotarian la memoria:
un `tsc` completo ocupa 2.0 GB a los 18 s, en una maquina de 15 GB y 4 nucleos.

## La premisa, si se corrigio al primer comando

Un `while` que solo compruebe la memoria ANTES de lanzar no basta. Mide la
memoria al admitir y es ciego al crecimiento posterior: varios `tsc`
admitidos con memoria de sobra crecen juntos y la agotan igual. La referencia,
`--memfree` de GNU Parallel 20231122, tiene por eso dos mitades: la admision
(`/usr/bin/parallel:4113-4118`) y la aplicacion, que mata al trabajo mas joven
y lo reencola por debajo de la mitad de la cota (`:6972-7005`).

## Las piezas

| archivo | que hace |
|---|---|
| `src/session/run-task-pool.sh` | `--memfree SIZE`: admision, aplicacion con reencolado, sonda `MemAvailable` con el awk declarado |
| `tests/session/test-run-task-pool-memfree.sh` | 12 aserciones; la memoria se conduce con un `/proc/meminfo` sintetico |
| `probes/pool-with-fix.sh` | el pool con el arreglo, fuente de la restauracion tras cada anulacion |
| `outputs/red-head-pool.txt` | la suite contra el pool de HEAD: 5 de 10 fallan |
| `outputs/annul-admission.txt` | admision anulada: cae SOLO «corre uno a la vez» |
| `outputs/annul-enforcement.txt` | aplicacion anulada: caen SOLO las dos de reencolado |
| `outputs/green.txt` | 10 de 10 (antes de las dos aserciones del awk declarado) |

## Los resultados

Cada mitad carga su peso: al anular la admision cae exactamente una
asercion, al anular la aplicacion caen exactamente dos, y ninguna mas.
Las dos aserciones del awk declarado (proceso y `.env`) se vieron rojas
antes de su arreglo. El subconjunto derivado de suites que ejercen el pool
(11, derivado con `grep -rlE run-task-pool tests/`) sale EXIT=0 en las 11:
`.claude/build-logs/derived-20260922T230337/`.

*Metrica:* concurrencia maxima observada a partir de marcas de inicio y fin
de cada trabajo; conteo de intentos y terminaciones por trabajo.
*Ciega a:* memoria real: la suite conduce `MemAvailable` con un archivo, asi
que no mide un OOM de verdad ni el tiempo que el kernel tarda en reclamar
memoria tras matar un grupo; `--memsuspend` no se porta en este pase.
