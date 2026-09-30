# Divergencias entre el ciclo de vida del pool y su especificación aprobada

Cotejo de `pool-runtime-lifecycle-design-20260929T184606/spec.md` contra lo
integrado en `feature/thyrox-l6`. Tres puntos que la especificación exige y
el código no cumplía, cada uno con su mitad roja, su verde y su control de
anulación, en `outputs/`.

| # | Divergencia | Rojo | Verde | Anulación |
|---|---|---|---|---|
| 1 | `check_bench_untracked` no exigía `<n>.closed` | `gap1-red.txt`: la función no existía | `gap1-green.txt` 23/23 | `gap1-nullified.txt`: sin la exigencia caen 2 de 23 |
| 2 | la recuperación no restauraba el índice | `gap2-red.txt`: la función no existía | `gap2-green.txt` 38/38 | `gap2-nullified.txt`: sin `read-tree` caen 2 de 38 |
| 3 | I5 inyectaba el fallo en un solo punto | `gap3-red.txt`: 3 de 8 puntos | `gap3-green.txt` 43/43 | `gap3-nullified.txt`: sin retirar el cierre anterior, k=5,6,7 dejan un cierre aceptado e incoherente |

El recuento de la divergencia 3 es de ocho operaciones y no de once: en el
mismo sistema de archivos la colocación es un `rename` y no deja fuente que
retirar. La primera versión de la prueba esperaba once; la medición la
corrigió.

Regresión conjunta en el árbol principal: `.claude/jobs/gaps-regress-*`.
