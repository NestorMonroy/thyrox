# gate-de-resolucion-de-cita

## El encargo

<!-- verbatim, sin parafrasear -->

> Vamos a solucionar solo la TASK Gate de resolución para la cita durable: 13
> citadas no existen en el store

Sujeto: **TASK-THYROX-0100** (board #450).

## La premisa, si se corrigio al primer comando

La premisa se sostuvo, y el episodio que la origina es **propio**: en el commit
`4acece94` de esta misma sesion escribi `Refs: TASK-THYROX-0445`. La cita real
era `TASK-THYROX-0095`. `0445` es el **ordinal del board relleno a cuatro
digitos** — forma durable impecable, referente inexistente.

Lo que se corrigio al medirlo fue la **cifra**, dos veces:

1. El titulo de la tarea dice «13 citadas no existen». Medido sobre 400
   commits: 13 de 114 citas distintas, todas con esa misma forma. Se sostiene.
2. La prosa que yo escribi en el hook decia «46 citan y 7 (15 %) no
   resuelven». Re-medido al cablearlo: **8 sin resolver de 35 distintas** en
   los ultimos 50 commits. Era una cifra de otro HEAD y otro denominador
   (commits contra citas distintas). Corregida en los dos sitios.

## Las piezas

| archivo | que hace |
|---|---|
| `src/verify/citation_resolution.py` | el gate. Cruza cada `TASK-<CAPA>-NNNN` del mensaje contra `citation_id` del store. `--history N` mide el historial; exit 0/1/2 = resuelve / deuda / rehusa |
| `src/verify/commit_message.py` | cede `significant_lines()`, extraido para que los dos consumidores descuenten las lineas `#` con una sola regla |
| `tests/verify/test_citation_resolution.py` | 8 bloques / 15 aserciones. Control positivo **real**: el mensaje de `4acece94` leido con `git show`, y su gemelo con la cita correcta |
| `.githooks/commit-msg` | el cableado. Segundo gate tras el de ancho de linea |
| `probes/anulacion.sh` | las tres anulaciones, con `trap` que restaura los dos fuentes y limpia `__pycache__` |
| `outputs/rojo-antes-del-gate.txt` | la mitad ROJA persistida: 5 de 15 antes de escribir el gate |
| `outputs/anulacion.txt` | los tres veredictos de anulacion |

## Los resultados

**El gate discrimina — cada guarda tumba exactamente sus dependientes:**

| anulacion | verde | caen |
|---|---|---|
| linea base | 15/15 | — |
| resolucion contra el store (`unresolved = []`) | 13/15 | 2 |
| descuento de lineas de comentario | 14/15 | 1 |
| refusal sin store (mapa vacio) | 13/15 | 2 |

**El hook, por conducta:** cita que resuelve → exit 0 con el sujeto impreso ·
`TASK-THYROX-0445` → WARN nombrandola, exit 0 · gate ausente → REHUSADO exit 2.

**La deuda es de hoy, no heredada.** Los siete commits que llevan las 8 citas
rotas son todos `2026-09-17` — la sesion que descubrio el defecto. El grifo
queda cerrado desde este commit.

**Graduacion declarada:** cuando `--history 50` sostenga 0 sin resolver, el
`|| true` del hook se retira. Es un cambio de una linea.

*Metrica:* cada `TASK-<CAPA>-NNNN` del mensaje —descontadas las lineas `#` que
git borra— cruzado contra la columna `citation_id` de `tasks` del store.

*Ciega a:* (a) el eje del **sujeto equivocado** — una cita que EXISTE y nombra
otra tarea resuelve y pasa; distinguirlo exige comparar el asunto, no la
existencia, y por eso el gate lo **imprime** (surfacing, no verificacion).
(b) Las citas en `.rst` y en bancos, que no pasan por `commit-msg`; medirlas es
**TASK-DOCS-0434** (board #257), que ya estaba abierta.
(c) El historial publicado, que no se enmienda: el gate mide el commit que se
esta escribiendo.
(d) La **mencion** contra la **identidad**. Medido corriendo el gate sobre este
mismo README: marca `TASK-THYROX-0445`, que aqui se cita como el **ejemplo
roto**, no como identidad de nada. Un patron lexico no separa «hablo de esta
cita» de «me apoyo en esta cita», y por eso el gate **avisa y no bloquea** —
bloquear con un instrumento que no discrimina seria el sub-patron D con el
propio gate como sujeto.
