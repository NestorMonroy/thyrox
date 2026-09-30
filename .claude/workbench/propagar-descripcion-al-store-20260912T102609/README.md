# propagar-descripcion-al-store

## La pregunta

¿`sync_card` lleva al store la descripción corregida de la tarjeta, o sólo su
sujeto y su estado?

## El episodio que la origina, medido

La tarea **TASK-THYROX-0021** nació con una premisa falsa —«636 filas cuya capa
de cita no coincide con su `submodule`»— que suma dos poblaciones y sólo una es
defecto (sub-patrón A). Se corrigió la tarjeta del board #364 con `TaskUpdate`
y se sincronizó al store con `board_sync.py sincronizar-board`.

El sujeto viajó; la descripción no. Leído del store tras sincronizar:

```
TASK-THYROX-0021
  subject    : Escribir submodule en el camino de inserción compartido del store
  desc[:120] : Medido 2026-09-12 sobre agent_store.sqlite3: 636 filas tienen …
```

La fila quedaba diciendo dos cosas que se contradicen, **y la falsa es la que
lleva el detalle** que alguien leería para trabajar. La causa era una línea:

```python
SYNCED_FIELDS = ("subject", "status")
```

## El arreglo, y por qué su semántica es la misma para los tres campos

`description` entra a `SYNCED_FIELDS`. Los tres comparten semántica a propósito:
la tarjeta es la fuente, así que una descripción vacía **vacía** la fila igual
que un sujeto vacío lo haría. Un caso especial para un solo campo sería la
asimetría que luego se lee como defecto.

Medido sobre el board vivo al decidirlo: **363 de 363** tarjetas traen texto, o
sea que la población del caso vacío es **0** — se declara, no se supone.

## El control de anulación

`outputs/rojo-antes-del-arreglo.out` **es** la anulación: es la suite nueva
corrida contra el módulo sin el cambio. De 60 aserciones caen **exactamente 4**
—5d, 5e, 5f, 5h— y las otras 56 pasan, incluidas las 55 preexistentes.

`5g` pasa en rojo y en verde, y eso es correcto: es el control **negativo** —
re-sincronizar la misma tarjeta no declara `description` cambiada. No
discrimina este cambio; discrimina una implementación que siempre la declare
cambiada, que es el modo de fallo contrario.

## Piezas

| archivo | qué es |
|---|---|
| `outputs/rojo-antes-del-arreglo.out` | la mitad roja, persistida al producirse |
| `outputs/verde-tras-el-arreglo.out` | la suite entera en verde con el arreglo |
| `outputs/store-antes-y-despues.out` | la fila real del store, leída antes y después |
