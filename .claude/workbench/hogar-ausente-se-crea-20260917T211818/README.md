# Un hogar declarado y ausente se crea de forma idempotente

Banco de **TASK-THYROX-0107**. Directiva del ejecutor, verbatim:
*«si esta ausente, tienes que crearlo de manera idempotente»*.

## La mitad roja, persistida

`outputs/mitad-roja-antes-de-ensure-home.txt` — **5 de 13** aserciones en
verde. Las 8 que caen son exactamente las de existencia; las 5 que sobreviven
son las de idempotencia (que ya se cumplian: no crear nada dos veces tampoco
falla) y la guarda de rehuse.

## El control de anulacion

`outputs/anulacion-creates_home.txt` — retirado `@creates_home` de
`cache_dir`, caen **exactamente** sus dos aserciones de existencia
(11 de 13), y ninguna mas. La guarda de rehuse sigue verde: el decorador no
la toca, que es lo que prueba que la frontera de DEC-04 no se movio.

## El subconjunto derivado

`outputs/subconjunto-derivado.txt` — los directorios de test que consumen los
cuatro resolutores, derivados con grep, no elegidos de memoria. Todos exit 0.

## Reproducir

    python3 tests/paths/test_ensure_home.py
