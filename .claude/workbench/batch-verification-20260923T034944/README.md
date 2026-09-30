# batch-verification

## El encargo

> lo anterior lo tienes que adaptar para la construccion de nuestro thyrox, si
> te ayuda a resolver que queremos tener 0 errores en tsc, aplicalo

Dicho sobre el brief de perplexity y speculative decoding.

## La premisa, si se corrigio al primer comando

La adaptacion directa es speculative decoding: el `tsc --noEmit` completo es el
objetivo caro (2 GB, minutos) y cada arreglo de proveedor es una propuesta
barata. Hasta hoy cada bloque verificaba UNA propuesta por pasada. La
perplexity aporta la otra mitad: dos totales solo se comparan sobre el mismo
universo (5 023 contra 4 919 fue el mismo commit con dos linkers), y aun asi un
total que baja puede esconder propuestas que no rindieron y errores nuevos.

## Las piezas

| archivo | que hace |
|---|---|
| `src/verify/batch_verification.py` | veredicto por propuesta (`accepted`/`partial`/`rejected`/`no-edges`), `alpha` y diagnosticos nuevos |
| `tests/verify/test_batch_verification.py` | 11 aserciones sobre logs sinteticos con el formato real |
| `outputs/annul-new-diagnostics.txt` | sin reportar nuevos cae SOLO ese caso |
| `outputs/annul-no-edges.txt` | contar lo que no tenia aristas como aceptado: caen su veredicto y `alpha` |
| `outputs/real-l3-batch.txt` | el lote REAL de `feature/thyrox-l3`, 4 919 -> 4 797 |

## Los resultados

Sobre el lote real, que nadie habia medido por propuesta: `alpha` 0.57 (4 de 7
aceptadas) y **25 diagnosticos nuevos** en archivos que el lote no toco
(`git diff 93f81fb1 origin/feature/thyrox-l3` vacio sobre ellos): son errores
que `tsc` alcanza cuando los exports resuelven, no desplazamientos de linea. El
total bajo 122 y los escondia.

*Metrica:* aristas `TS2305` por especificador de proveedor y diagnosticos por
`archivo(linea,columna): codigo`.
*Ciega a:* los especificadores RELATIVOS (`../index.js`, `./index.js`) no
identifican un proveedor: agregan consumidores distintos, y su veredicto
`partial` mezcla varios. Y un arreglo que desplace lineas en un archivo con
otros errores los hace parecer nuevos (falso positivo conservador).
