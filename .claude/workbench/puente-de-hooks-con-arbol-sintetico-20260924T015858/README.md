# puente-de-hooks-con-arbol-sintetico

## El encargo

> No detengas el ciclo, queremos 0 errores — `tests/hooks/test-bridge-hooks.sh` en rojo.

## La premisa, si se corrigio al primer comando

No es un defecto del puente: su caso 3 medía contra los clones del HOST y exigía dos con `save-agent-result.mjs`; en este contenedor sólo está `kaupamex-docs`.

## Las piezas

| archivo | que hace |
|---|---|
| caso 3 de `tests/hooks/test-bridge-hooks.sh` | construye su árbol (`kaupamex-api`, `kaupamex-docs`, `thyrox`) y apunta el puente con `THYROX_REACH_ROOT` |
| `outputs/rojo.txt` | la suite antes, de la remedición en paralelo: 10 de 11, `esperado=[2] obtenido=[1]` |
| `outputs/verde.txt` | 11 de 11 |
| `outputs/anulado-dedup.txt` | con el puente deduplicando por nombre de archivo: cae exactamente el caso 3 |

## Los resultados

*Metrica:* aserciones de la suite.
*Ciega a:* los casos 1, 2, 4 y 5 siguen midiendo contra los clones del host.
