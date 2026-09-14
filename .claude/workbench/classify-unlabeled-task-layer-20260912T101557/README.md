# classify-unlabeled-task-layer

## El encargo

> «de TODAS las TASK que estan en thyrox/agent-results/agent_store.sqlite3
> cuales ya estan cerradas? y porque no se ejecuta un script que cuando las
> terminamos de implementar se cierren?»

Este banco cubre la mitad de **clasificación**: qué capa lleva cada fila, que
es lo que decide el universo de cualquier censo posterior.

## La premisa que este banco corrige, y era mía

El sucesor que registré decía **«636 filas cuya capa de cita no coincide con su
submodule»**. Esa cifra mezcla dos poblaciones, y sólo una es defecto —
sub-patrón A de `metrica-decide-la-conclusion.md`:

| Forma | n | Veredicto |
|---|---|---|
| `submodule` == prefijo de la cita | 1000 | coherente |
| `submodule` **NULL**, cita `TASK-GEN-` | **404** | **defecto** — nunca se clasificó |
| `submodule` específico, cita `TASK-GEN-` | 228 | **el diseño funcionando** |
| `submodule` `gen`, cita específica | 2 | ídem, con su razón registrada |
| (total) | 1636 | |

Las 230 de las dos filas centrales no son deriva: `correct_layer` lo declara en
su propio docstring — *«Lo que se corrige es la COLUMNA. El id es identidad, no
clasificación: renumerarlo rompería toda cita ya escrita»*. Una fila acuñada
`GEN` y luego clasificada `docs` es exactamente lo que el mecanismo existe para
producir. Las dos con la forma inversa llevan su razón medida:

```
TASK-API-0395   submodule=gen   corregida …: commits medidos en TRES repos:
                                thyrox 2, docs 5, api 2 — cruza repos
TASK-DOCS-0534  submodule=gen   corregida …: el mecanismo vive en thyrox y el
                                baseline en docs: cruza repos
```

## El intento de clasificar las 404, y su resultado negativo

El criterio que las dos correcciones a mano ya ejercían —**en qué repos
aterrizaron los commits que nombran la cita**— se mecanizó en
`probes/classify_unlabeled_task_layer.py`. No escala:

```
filas sin submodule: 404
  indecidible    402
  docs             2
```

**402 de 404 no aparecen en ningún mensaje de commit de las seis raíces.** Y el
dato que lo vuelve informativo en vez de un callejón: de esas 402, **188 están
`completed`**. Son el espejo exacto de las 57 del censo de docs — allá el commit
nombra la cita y el store no se entera; aquí el store sabe que cerró y el commit
nunca nombró la cita.

## La causa, que sí es mecánica y está en un solo sitio

Ninguna columna de esas 404 trae señal de capa: `submodule_source` está en NULL
en las 404, y `owner` en 0. No es que nadie decidiera mal — es que **el
escritor no escribe esa columna**:

```
src/agents/agent_store.py:1644
  INSERT INTO tasks (task_id, subject, description, status, active_form, owner,
                     blocks_json, blocked_by_json, session_id, source,
                     metadata_json, created_at, updated_at,
                     opened_at, opened_at_source)
```

Quince columnas, y `submodule` no está entre ellas. Sólo `ingerir-board` la
escribe (`task_ids.py:625`, con su respaldo `capa = layer or
data.get("submodule") or UNKNOWN_LAYER`). Los `source` de las 404 lo confirman:
`transcripcion-tablero` 306, `hook-stop` 53, `refresh-board` 17,
`tablero-vivo` 16, `hook-post-tool` 11, `reasignacion-dirigida` 1 — ninguno es
`ingerir-board`.

## Por qué NO se barren las 404

`gen` y NULL no significan lo mismo: `gen` declara «cruza repos» y NULL declara
«nadie decidió». Rellenarlas con `gen` en bloque colapsaría esa distinción y
publicaría como medición lo que sería un respaldo — el mismo defecto que la
columna `usage_source` cierra un nivel más abajo.

El arreglo es **cerrar el grifo**: que el camino de inserción compartido escriba
la columna con su `submodule_source` diciendo que es el respaldo. La deuda
heredada se paga al tocar cada fila, que es el criterio prospectivo que este
árbol ya aplica a los baselines de idioma y al grifo de los guiones.

## Las piezas

| archivo | qué hace |
|---|---|
| `probes/classify_unlabeled_task_layer.py` | clasifica por evidencia de commit las filas sin `submodule` |
| `outputs/classify_unlabeled_task_layer.out` | su salida |
| `outputs/classify_unlabeled_task_layer.json` | las 404 con su veredicto, estado y repos |

*Métrica:* repos distintos cuyo mensaje de commit nombra el `citation_id`.
*Ciega a:* un commit que cierre la tarea sin nombrar su cita —cae en
indecidible, y son 402—; al trabajo fuera de las seis raíces; y a la diferencia
entre «el commit la cerró» y «el commit la menciona».
