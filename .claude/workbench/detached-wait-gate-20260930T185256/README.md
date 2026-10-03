# detached-wait-gate

## El encargo

«Corrijo un error mío: lancé la espera del pool con & y disown, lo que la
dejaría en silencio sin avisar al terminar; debes de corregir para que ya
nunca vuelva a pasar».

## La premisa, si se corrigio al primer comando

El detector avisó sobre ese comando que la espera bloqueaba el turno, que es
lo contrario: no distingue una espera en primer plano de una desprendida.
TASK-THYROX-0668 añade esa rama.

## Las piezas

| archivo | que hace |
|---|---|
| `source.md` | la fuente de verdad del ítem |
| `items.txt` | el ítem y sus archivos |
| `launch.sh` | el pool, en `inherit` por el proxy local |

## Los resultados

Se escriben al integrar.

*Metrica:* casos de la suite y anulaciones.
*Ciega a:* esperas desprendidas por vías indirectas.
