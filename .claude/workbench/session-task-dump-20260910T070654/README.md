# session-task-dump — el tablero de esta sesión, volcado y medido

Directiva del ejecutor 2026-09-10: *«En thyrox vas a crear un
thyrox/.claude/workbench en donde realices el volcado de todas las tareas que
tenemos en esta sesion, se hizo algo igual en /home/user/kaupamex-docs/.claude/
eventos, revisa como se hizo y ahora hazlo en thyrox/.claude/workbench/\*\*»*

## El encargo, y por qué no es sólo copiar

El tablero del cliente vive **fuera del árbol**: un archivo por tarea bajo
`/root/.claude/tasks/<sesión>/NNN.json`. Eso lo hace tan durable como el
contenedor — el **nivel 4** de `niveles-de-retencion.md`, completitud percibida
sin persistencia. 296 tarjetas de trabajo de esta sesión eran invisibles a git.

La forma se adapta de
`kaupamex-docs: .claude/eventos/tareas-pendientes-y-dependencias-20260907T210900`,
que hizo el mismo volcado hace tres días **para el consumidor**. Aquí vive en el
**proveedor** y bajo la forma de `workbench`: manifiesto de cinco claves en
inglés, `outputs/`, `README.md` — no la forma de `eventos` (`manifiesto.json` en
español), que es del consumidor.

## Las piezas

| archivo | qué hace |
|---|---|
| `dump_session_board.py` | copia el tablero a `outputs/board/` y lo cruza contra el store |
| `outputs/board/NNN.json` | 296 tarjetas, una por archivo, con su descripción entera |
| `outputs/summary.json` | el corte, para que nadie tenga que recontar a mano |
| `manifest.json` | las cinco claves: qué se preguntó, con qué, qué mide y qué NO ve |

## Lo que hay, medido

| Eje | Medido |
|---|---|
| Tarjetas en el tablero de esta sesión | **296** |
| `completed` | **200** |
| `pending` | **88** |
| `in_progress` | **8** |
| **Abiertas** (`pending` + `in_progress`) | **96** |
| Abiertas **presentes** en `agent_store.sqlite3` | **85** |
| Abiertas **AUSENTES** del store | **11** |
| Abiertas con **cita durable** (`citation_id`) | **85** |
| Declaran dependencia en el **campo** (`blockedBy`/`blocks`) | **17** |
| La declaran **sólo en prosa** (`#NNN` en sujeto o descripción) | **29** |
| **Sin dependencia declarada de ninguna forma** | **50** de 96 |

## El eje que sí se movió: #159 funcionó

Comparado con el volcado del consumidor del 2026-09-07, con **el mismo
instrumento conceptual** sobre la misma sesión tres días después:

| Eje | 2026-09-07 | hoy | |
|---|---|---|---|
| Abiertas | 86 | 96 | +10 |
| Ausentes del store | **38** (44 %) | **11** (11 %) | **−27** |
| Con cita durable | no se medía | 85 de 96 | — |

Ese −27 no es azar: **#159** acuñó a mano 258 de 258 tarjetas contra el store
(`thyrox@c83b1467`). Las 11 que faltan son **todas posteriores** a ese pase, que
es exactamente la mitad que #159 dejó abierta — el acuñado ocurre en un barrido,
no al crear. Mientras no haya un `PostToolUse` con matcher `TaskCreate`, cada
tarea nueva nace fuera del store y la brecha vuelve a abrirse sola.

Las once, todas `pending` salvo #234:

```
#81  #234 #239 #255 #261 #267 #274 #275 #289 #290 #291
```

## El eje que NO se movió: la dependencia sigue en la prosa

**29 en prosa contra 17 en campo**, y **50 sin declarar nada**. Un `blockedBy`
vacío con «#172» escrito en la descripción se lee como *«no depende de nada»*
por cualquier instrumento — que es el defecto que el volcado del 2026-09-07 ya
nombró (39 contra 14) y que sigue vivo. El grafo de abajo se derivó
**greppeando el texto**: es cota inferior por construcción.

```
#84   bloquea a 3  -> #50, #52, #83    prefijo de política y gate de capa triple
#113  bloquea a 2  -> #124, #257       878 ordinales con cita de un sujeto muerto
#108  bloquea a 2  -> #159, #166       quién corre bridge_hooks.py
#245  bloquea a 1  -> #81              declarar quién corre cada gate
#81   bloquea a 1  -> #92              reasignar src/gates
#90   bloquea a 1  -> #91              gates de estilo al harness (TS)
#17   bloquea a 1  -> #18              @kaupamex/binary
#52   bloquea a 1  -> #50              plantillas de temp-holding
```

`#84` es hoy el nodo que más bloquea, y es una **decisión**, no una
implementación: nada avanza en esos tres hasta que alguien fije el prefijo.

## Reproducir

```bash
cd .claude/workbench/session-task-dump-20260910T070654
python3 dump_session_board.py            # o THYROX_BOARD_DIR=<otro> python3 …
```

El instrumento **rehúsa con exit 2 y sin cifra** si no puede decidir qué sesión
medir o si el tablero está vacío: un 0 ahí sería un verde falso, que es el
sub-patrón D de `metrica-decide-la-conclusion.md` con el propio volcado como
sujeto.

## Los controles

`tests/test_dump_session_board.py` — su conteo lo publica el propio corredor al
ejecutarlo, no esta prosa:

```
python3 tests/test_dump_session_board.py
```

Dos de sus casos son controles con **anulación persistida**, y cada uno midió
una cosa distinta:

| Control | Qué se retira | Qué cae |
|---|---|---|
| caso 3 — los dos ejes de dependencia | colapsar campo y prosa en uno | `outputs/anulacion-<ISO>.txt`: exactamente el caso 3 |
| caso 4 — el guard del tablero vacío | el `if not cards: return 2` de `main()` | `outputs/anulacion-guard-<ISO>.txt`: exactamente el caso 4 |

El segundo control **no existía**: el caso 4 afirmaba sólo
`load_board(vacío) == []`, que es la *premisa* del guard y no el guard —
pasaba igual con la rama `return 2` retirada. Sub-patrón D dentro del propio
instrumento, y por eso se rehizo.

Al rehacerlo, la anulación destapó algo que la versión anterior no podía ver:
sin el guard, `main()` no sólo deja de rehusar — **sigue y publica un cero**,
sobreescribiendo `outputs/summary.json` con ceros en todas sus claves. Ése es
literalmente el verde falso que el guard existe para impedir. De ahí que
`main()` acepte ahora un `out_dir`: el control se repite sin que el
experimento contamine la evidencia que mide.

Un control que sólo comprobara «se volcaron 296 tarjetas» pasaría igual con el
mecanismo y sin él.

## Los resultados

*Métrica:* los `NNN.json` del tablero de ESTA sesión, agrupados por `status`; y
de las abiertas, cuántas tienen fila y `citation_id` en `agent_store.sqlite3`.

*Ciega a:* una tarea cuyo sujeto se renombró tras acuñar su cita — el cruce por
texto la lee como ausente aunque su fila exista; la dependencia que sólo vive en
la cabeza de quien escribió la tarea; y el grafo de bloqueo, que sólo ve el
ordinal `#NNN` escrito y no la dependencia real.
