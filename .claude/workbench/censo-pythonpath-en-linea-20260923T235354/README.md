# El censo de PYTHONPATH ve la asignación en línea

`tests/lib/test-reach-pythonpath.sh` cuenta los guiones de producción que
invocan un módulo de `src/` sin declarar su raíz de importación. Aceptaba dos
formas —`export PYTHONPATH` y `source reach.sh`— y leía línea física por
línea. `.githooks/commit-msg` usa la tercera, igual de válida en ejecución:
`PYTHONPATH=... \` y, en la línea siguiente, `python3 .../commit_identity.py`.
El censo lo publicaba como «no podrá importar» (rojo de la suite en l5 y l6).

| Archivo | Qué es |
|---|---|
| `verde.txt` | uniendo continuaciones y aceptando `PYTHONPATH=` en la línea lógica: 6/6 |
| `anulado.txt` | sin aceptar la forma en línea: reaparece exactamente el hook, 5/1 |

El rojo previo es el del triaje de l6 (`triaje-rojos-l6-*/triaje.txt`, fila 4).
