# snapshot-superseded-generation

## El encargo

> I4 — un snapshot de la generación N nunca sobrescribe ni publica la N+1.
> (spec del ciclo de vida del pool, `pool-runtime-lifecycle-design-20260929T184606`)

## La premisa, si se corrigio al primer comando

Las refs de foto son por generación, así que la N no puede pisar la ref N+1.
Lo que sí podía pisar era el registro vivo `<n>.snapshot.json`: el pool
desplazado veía rehusada su transición a SNAPSHOTTING, pero tomaba la foto
igual, creaba la ref de su generación y reescribía el registro del nuevo
dueño. `red-pool.txt` lo muestra.

## Las piezas

| archivo | que hace |
|---|---|
| `regress.sh` | corre las suites de `probes/suites.txt` y publica su última línea |
| `nullify.py` | control: la suite de Python con `refuse_superseded=False` |
| `outputs/red-python.txt` | la suite nueva antes del cambio |
| `outputs/green-python.txt` | 45/45 con el cambio |
| `outputs/nullified-python.txt` | caen exactamente las 3 aserciones del rechazo; la traza posterior es del 14c, que ya no puede crear la ref existente |
| `outputs/red-pool.txt` | caso 5 con el pool anterior: 27/30, caen las 3 del caso |
| `outputs/green-pool.txt` | 30/30 |
| `outputs/regress.txt` | regresión del subconjunto derivado |

## Los resultados

Dos fronteras, una por capa:

- `snapshot_store.take_snapshot` rehúsa con `SnapshotSupersededError` (exit 5
  por CLI) si el ítem ya tiene la foto de una generación posterior;
- `headless-pool` sólo toma la foto si la transición a SNAPSHOTTING con su
  generación se acepta, y escribe el registro por temporal y `mv`.

*Metrica:* aserciones de los casos 14 y 5; refs bajo
`refs/thyrox/snapshots/<run>/<item>/`; contenido de `<n>.snapshot.json`.
*Ciega a:* la foto de la generación posterior creada entre la consulta de refs
y `update-ref`; esa ventana la cierra la generación del estado del ítem, que
el pool comprueba antes.
