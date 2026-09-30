# Datos D4 — inventario de los stores Python y del store compartido de agentes

Fase D4 del plan `fases-bases-de-datos-20260928T175719/plan-por-fases.md`.
Es discovery: mapea qué se persiste, quién lo escribe y qué significa
«compartido» antes de decidir SQLite o PostgreSQL. Medido el 2026-09-29 sobre
`feature/thyrox-l6`.

## 1. «Los stores Python» son un solo archivo

Las 37 aperturas `sqlite3.connect` de `src/**/*.py` (sin pruebas) abren
`agent_store.sqlite3` (salvo la de `src/store/agent_sessions.py`, abajo), cuya ruta resuelve `reach.agent_store_path`
(`THYROX_AGENT_STORE`, si no `<thyrox>/agent-results/`). `task_ids`,
`hallazgo_ids`, `board_sync`, `reconcile_store`, `model_catalog` y el resto
son módulos de dominio sobre la misma base, no stores distintos.

Única excepción: `src/store/agent_sessions.py` abre `agent_sessions.sqlite3`,
pero sólo lo importa su propia prueba (`tests/store/test_agent_sessions.py`).
Es un porte paralelo sin consumidor.

## 2. La base tiene escritores en dos lenguas

Tablas, filas y escritores (`bin/writer_census`, `writer-census.txt`):

| Tabla | Filas | Escritores Python | Escritores TS | Semántica |
|---|---|---|---|---|
| `agent_sessions` | 1837 | `agent_store.py`, `reconcile_store.py` (9 sentencias) | `tools/agent.ts` (2) | registro de subagentes; se inserta y luego cambia de estado |
| `tasks` | 2237 | `task_ids.py`, `board_sync.py`, `agent_store.py` (18) | `tools/tasks.ts` (7) | tareas con cita durable `TASK-<CAPA>-NNNN`; cambian de estado |
| `findings_history` (+ `findings_fts`) | 1658 | `agent_store.py`, `backfill_findings_history.py` | — | índice de búsqueda de hallazgos; el `.rst` gobierna |
| `documents` | 6515 | `agent_store.py` | — | eje temporal de documentos, fechado desde git |
| `cleared_tool_results` | 2305 | — | `observability/clearedResults.ts` | telemetría por sesión |
| `task_session_highwater` | 0 | — | `tools/tasks.ts` | contador de asignación por sesión |
| `schema_migrations` | 14 | `agent_store.py` (dueño del esquema, D3-A2) | valida | ledger de migraciones |

WAL y `busy_timeout`: la concurrencia entre procesos de la misma máquina
(hooks, CLI, harness) ya está resuelta por SQLite.

## 3. «Compartido» hoy significa entre sesiones, por git

El archivo está versionado (`agent-results/agent_store.sqlite3
merge=sqlite-union` en `.gitattributes`). Lo tocan **368 commits**, 66 de
ellos el 2026-09-29. Cada sesión (contenedor efímero) escribe su copia y el
merge de git la une con `merge_sqlite_union.py`, que hace
`INSERT OR IGNORE` por clave primaria.

El store compartido de agentes es, por tanto, una base **replicada por git
con consistencia eventual**. No es una base con varios clientes concurrentes
por red.

## 4. Lo que la unión pierde — medido

`probes/union-lost-writes.py` diverge dos copias desde la misma base y ejecuta
el driver real:

| Caso | Escrito | Tras el merge | Salida del driver |
|---|---|---|---|
| actualización de fila existente (`agent_sessions.status` → `completed` en el otro lado) | `completed` | `running` | exit 0 |
| dos hallazgos nuevos que reciben el mismo `id AUTOINCREMENT` | H-OURS-1, H-THEIRS-1 | sólo H-OURS-1 | exit 0 |
| control: el otro hallazgo con `id` distinto | H-OURS-1, H-THEIRS-1 | los dos | 1 fila unida |

El driver avisa «N filas omitidas por clave ya presente», pero N incluye las
miles de filas iguales en los dos lados (11 073 aquí). La pérdida no se
distingue en esa cifra.

Forma de las claves (`pk-por-tabla.txt`): sólo `findings_history` usa un
entero local `AUTOINCREMENT`; las demás usan claves de texto naturales.
Las tablas mutables (`agent_sessions`, `tasks`, `findings_history`,
`documents`) ya tienen `updated_at`. Hay un trigger que lo sella en
`agent_sessions`.

*Métrica:* estado de las filas tras ejecutar el driver real sobre dos copias
del esquema real.
*Ciega a:* cuántas escrituras se perdieron ya en los 368 merges reales, y a
la colisión de citas `TASK-*` acuñadas por dos sesiones a la vez (la clave
de `tasks` incluye `session_id`, así que las dos filas sobreviven; si la cita
se duplica, eso se mide aparte).

## 5. Matriz D4

| Dato | Dueño | Frontera de uso compartido | Vida | Candidato |
|---|---|---|---|---|
| `agent_sessions`, `tasks` | `agent_store.py` (esquema); dominios task/agent | entre sesiones, por git | durable, mutable | durable compartido: hoy SQLite+git con pérdida de actualizaciones |
| `findings_history` | `agent_store.py` | entre sesiones, por git | durable; índice del `.rst` | igual, más colisión de `id` |
| `documents` | `agent_store.py` | se deriva de git | reconstruible | cache local; no necesita viajar |
| `cleared_tool_results`, `task_session_highwater` | observability / tools | una sesión | local | SQLite local |
| estado de pool y ejecución (`.thyrox/runtime`, ledgers, historial de pool) | `pool_lifecycle`, `wait-jobs`, `pool_history` | ejecución | recuperable | nivel A / SnapshotStore; no es persistencia de dominio |
| leases, cuotas, enfriamientos | proxy | entre proxies | efímero | Redis (R1–R5) |

## 6. Qué decide esto, y qué no

PostgreSQL resuelve la pérdida sólo si **todas** las sesiones alcanzan el
mismo servidor. Hoy cada contenedor es efímero y el PostgreSQL de la
infraestructura Podman es local a cada uno: no hay servidor común. Un
PostgreSQL por contenedor reproduciría la misma divergencia, ahora sin driver
de merge. Tampoco hay `psycopg` en `.venv`.

Por eso la decisión del ejecutor tiene dos preguntas, no una:

1. **¿Existirá un servidor PostgreSQL común a todas las sesiones?** Si sí,
   `agent_sessions`, `tasks` y `findings_history` son sus candidatos, y el
   camino es un puerto de dominio con adaptadores SQLite y PostgreSQL (Python
   dueño del esquema, psycopg). Si no, el motor no cambia nada.
2. **Mientras tanto, ¿se corrige la unión?** Sin cambiar de motor:
   reconciliación por fila con resultado explícito (idéntica, insertada,
   actualizada o conflicto) y clave natural (`finding_id`) en lugar del `id`
   local para `findings_history`. El criterio de orden se fija en §7: hoy
   `updated_at` no es un orden fiable.

`documents` y las tablas por sesión no necesitan viajar en ningún caso.

## 7. Revisión tras la lectura del ejecutor (2026-09-29)

La pregunta de D4 deja de ser «SQLite o PostgreSQL». Pasa a ser: **¿existe
una autoridad durable única, alcanzable por todas las sesiones que escriben?**
Hoy no existe. Lo que existe es una base replicada por git, y su unión es la
que pierde datos, no SQLite.

### `findings_history` NO es reconstruible hoy — medido

DEC-07 de `agent_store.py` la declara índice reconstruible y
`backfill_findings_history.py` la rehace desde los `.rst`. Contrastado contra
todo `kaupamex-docs/source/` (`findings-rebuildable.txt`):

| | Cuenta |
|---|---|
| filas | 1659 |
| filas con `.rst` propio | 1580 |
| filas sin `.rst` en ninguna parte (ni monolito) | **79** — 76 `H-THYROX`, 3 `H-API`/`H-SERVER`, `L-032` |
| `.rst` sin fila | 10 |

Una reconstrucción desde los `.rst` borraría 79 hallazgos. La declaración
«el RST siempre gana» es cierta en el diseño, pero no en el estado: la
ventana entre fila y archivo que `CLAUDE.md` admite como legítima se congeló
en 79 casos. Hasta que esos 79 tengan su `.rst` (se generan desde su fila con
`bin/finding rst`; TASK-THYROX-0628), `findings_history` es verdad
durable compartida y su unión tiene que preservar filas.

Llegar a brecha cero una vez no basta. `findings_history` podrá
reclasificarse como índice reconstruible, y dejar de replicarse entre
sesiones, sólo cuando se cumplan las dos condiciones:

1. **brecha histórica = 0** (TASK-THYROX-0628, relleno explícito: el
   `DocumentationPublisher` de TASK-THYROX-0624 publica ítems del pool que
   cierran, no hallazgos históricos);
2. **invariante que impida reabrirla:** ningún hallazgo puede quedar de forma
   permanente sólo como fila.

El instrumento de la segunda ya existe y hoy no gobierna.
`check_finding_id_unique.py` (mitad A: «toda fila tiene su `.rst`») está en el
registro de `thyrox-audit` sólo como aviso, y su baseline congela 3 ids
(`H-THYROX-1..3`). Corrido el 2026-09-29 desde `kaupamex-docs`:
**78 filas sin `.rst` fuera del baseline, exit 0**. Coincide con la sonda de
este banco salvo `L-032`, que no tiene la forma `H-`. Es un instrumento
distinto que da la misma cifra. Y muestra cómo se abrió la brecha: la mitad A
se escribió cuando eran 3, y creció a 78 porque nada la hace bloquear. El
invariante es esa mitad A en modo `--strict` en un punto que el flujo no
pueda saltarse (el cierre de sesión o el `pre-push` de thyrox), con una
ventana de gracia para la fila recién registrada. Qué punto bloquea lo decide
el ejecutor.

*Métrica:* `finding_id` de la tabla contra los nombres `hallazgo-<ID>-*.rst`
de todo `source/`, más una búsqueda del id en los monolitos `audits/hallazgos-*`.
*Ciega a:* un hallazgo cuyo `.rst` tiene otro nombre de archivo, y a que el
cuerpo del `.rst` contenga lo mismo que la fila.

### El dueño del esquema

D3-A2 (TASK #289) fijó a `agent_store.py` como dueño del esquema y a Bun como
validador: fue una decisión del ejecutor para el motor SQLite, no sólo un
hecho histórico. Lo que queda abierto, y va a D4-B, es quién es dueño del
**contrato** si aparece un segundo motor. Qué lenguaje ejecuta las
migraciones se decide después.

### Matriz refinada

| Dato | Naturaleza | Autoridad hoy | Destino |
|---|---|---|---|
| `agent_sessions` | durable, mutable, entre sesiones | la base (replicada por git) | PostgreSQL si hay autoridad común; mientras tanto SQLite + unión corregida |
| `tasks` | durable, mutable, entre sesiones; citas `TASK-*` | la base | igual |
| `findings_history` | índice por diseño; verdad durable en 79 filas | la base mientras la brecha no sea 0 | tras cerrar la brecha: caché local reconstruible |
| `documents` | derivado de git | git | SQLite local |
| `cleared_tool_results`, `task_session_highwater` | de una sesión | la sesión | SQLite local |
| leases, cuotas, enfriamientos | efímero entre proxies | Redis | Redis |
| pool y runtime | estado de ejecución | lifecycle / SnapshotStore | fuera de la persistencia de dominio |

### Dos tareas, no una

- **D4-A — corrección de la replicación SQLite+git** (TASK-THYROX-0626,
  implementable ya, con el criterio de orden de abajo): `findings_history`
  unida por `finding_id`, y cada fila en conflicto clasificada como idéntica,
  insertada, actualizada o conflicto real, con un informe por tabla. Un mismo
  `finding_id` con contenido incompatible es **conflicto declarado**, no «se
  queda una». En TDD, con la sonda de este banco como caso rojo y su control.
- **D4-B — topología de la autoridad durable compartida** (TASK-THYROX-0627,
  discovery): dónde
  vive un PostgreSQL común, quién lo opera, cómo lo encuentran las sesiones,
  qué pasa sin red, quién es dueño del contrato y de las migraciones, si
  Python abre la base directamente o pasa por un puerto o servicio. No se
  toca `InfrastructureBootstrap`: su PostgreSQL es local a cada sesión.
  Ninguna migración de motor antes de que D4-B tenga respuesta.

### El criterio de orden de D4-A: `updated_at` hoy no lo es — medido

> **Reemplazado por §10.** La conclusión sobre `updated_at` se mantiene. La
> propuesta de una revisión lógica como árbitro no: un contador no representa
> causalidad entre copias paralelas, y lo que decide es el merge de tres vías
> contra el ancestro.

`updated-at-resolution.txt`:

| Tabla | Formato | Valores repetidos |
|---|---|---|
| `agent_sessions` | segundos sin zona; sólo 42 filas (las del trigger `agent_sessions_stamp_updated`) con milisegundos y `Z` | 359 de 1837 |
| `tasks` | segundos, sin zona | 1681 de 2240 |
| `findings_history` | segundos, sin zona | 1537 de 1659 |

Con resolución de un segundo, dos sesiones que escriben la misma fila en el
mismo segundo empatan. Sin zona horaria, dos contenedores con distinto `TZ`
escriben valores que no se pueden comparar. Y aunque los dos problemas se
resolvieran, el reloj de pared de contenedores distintos no es un orden total.
Última escritura gana por `updated_at` sería una resolución silenciosa e
indefinida. Por eso D4-A fija:

1. **una revisión lógica por fila** (`revision` entera, +1 en cada escritura,
   la escriba Python o TypeScript) para `agent_sessions` y `tasks`. Gana la
   revisión mayor;
2. **empate de revisión con contenido distinto = conflicto declarado**, nunca
   una elección arbitraria. El driver lo informa por tabla y por clave, y deja
   las dos versiones recuperables;
3. `updated_at` pasa a ISO 8601 UTC con milisegundos en todos los escritores,
   pero como dato informativo, no como árbitro;
4. el criterio de desempate determinista (por ejemplo, por `session_id`) sólo
   se admite en tablas donde el ejecutor declare que perder una de las dos
   versiones es aceptable. Por defecto no se admite.

*Métrica:* formato y repetición de los valores de `updated_at` por tabla.
*Ciega a:* la desviación real entre relojes de dos contenedores (no hay dos
sesiones vivas a la vez que medir), y a si un valor repetido corresponde a la
misma fila en dos lados o a filas distintas: la cifra mide resolución, no
colisiones de merge.

### Reproducir las cifras

Todas salen de instrumentos versionados en este banco, no de lectura:
`probes/union-lost-writes.py` (con `PROBE_CONTROL=1` para el control),
`writer-census.txt` (`bin/writer_census --store …`), `pk-por-tabla.txt`,
`findings-rebuildable.txt` y `updated-at-resolution.txt`. La cifra de 78/79
tiene además un instrumento independiente:
`bin/check_finding_id_unique` corrido desde `kaupamex-docs`.

## 8. Decisión del ejecutor sobre el invariante (2026-09-29)

- **Bloqueo primario: el cierre limpio de sesión.** `SESSION_CLOSED` ⇒
  ningún hallazgo durable de esa sesión queda sólo en `findings_history`. Al
  cerrar, los `PENDING_RST` se reconcilian o publican; si no se resuelven, el
  cierre limpio se rechaza.
- **La ventana de gracia vive mientras vive el productor.** No sobrevive a un
  cierre limpio: al cerrar, el hallazgo pierde al único dueño que lo iba a
  completar.
- **Un crash no es un cierre limpio.** Deja estado recuperable, y no se
  finge que el invariante se cumplió.
- **Defensa secundaria: `pre-push` de thyrox** con el mismo gate
  (`check_finding_id_unique`, mitad A, `--strict`), para lo que haya salido
  del ciclo de vida correcto. Es una frontera de transporte, no dueña del
  invariante.
- TASK-THYROX-0628 sigue separada de `DocumentationPublisher` (0624):
  una elimina deuda histórica, la otra gobierna la publicación futura.

```text
fila del hallazgo -> PENDING_RST -> RST_PUBLISHED -> COMPLETE
SESSION_CLOSE: ¿PENDING_RST? no -> CLOSED
                             sí -> reconciliar/publicar -> ¿resuelto? sí -> CLOSED
                                                                    no -> CLOSE_REJECTED
```

## 9. Cómo lo resuelve OmniRoute — leído en `omniroute@113de57b9`

Evidencia en este banco: `omniroute-113de57b9/` guarda los fragmentos
citados, extraídos con `git -c gc.auto=0 show HEAD:<ruta>` (el commit exacto
está en `COMMIT`; OmniRoute es MIT). Así las citas de abajo se verifican sin
ese clon. Leído del árbol versionado, no del directorio de
trabajo: ese clon tiene 24 231 cambios sin commit en su índice, que no son de
esta sesión y no se tocaron. Una lectura sin `-c gc.auto=0` disparó el
empaquetado automático de git en ese clon; el contenido no cambia, y el resto
de lecturas lo desactivaron.

**OmniRoute no fusiona filas entre instancias.** Tiene una autoridad y copias:

| Mecanismo | Dónde | Qué hace |
|---|---|---|
| sincronización de configuración | `src/lib/sync/bundle.ts:186-238` | la instancia autoridad arma un paquete completo (conexiones, nodos, combos, claves, ajustes, reglas) y lo publica; el receptor lo toma entero |
| versión del paquete | `bundle.ts:178-184` | `sha256` del JSON canónico (claves ordenadas, listas ordenadas por clave estable): la versión es el contenido, no un reloj |
| conflictos de referencia | `bundle.ts:252-285` (`reconcileReasoningRulesForSync`) | una regla que apunta a una clave, combo o conexión que el destino no tiene **se desactiva y se informa como conflicto**; no se descarta ni se aplica a ciegas |
| identidad | `src/lib/db/core.ts:221-486` | toda tabla que viaja en el paquete usa `id TEXT PRIMARY KEY`; `AUTOINCREMENT` aparece sólo en tablas locales de la instancia (`usage_history`, `domain_budget_reset_logs`, `domain_cost_history`, `quota_snapshots`), que el paquete no incluye |
| importación de una base | `src/app/api/db-backups/import/route.ts:48-51,123-134,162` | reemplazo completo, nunca unión: `integrity_check`, validación de esquema y tablas, y copia de respaldo previa (`backupDbFile("pre-import")`) |
| cierre | `core.ts:1447-1480` (`shutdownDbInstance`, `closeDbInstance`) | el ciclo de vida detiene la salud, hace `wal_checkpoint(TRUNCATE)` y cierra. Un fallo del checkpoint **avisa y no bloquea** el cierre |

### Qué toma THYROX de ahí

1. **Identidad global para todo lo que viaja; entero local sólo para lo que
   no viaja.** Es la partición de OmniRoute, y confirma pasar
   `findings_history` a `finding_id`. En THYROX lo que viaja es la base
   entera, así que la regla se aplica tabla por tabla: una tabla que se une
   entre sesiones no usa `AUTOINCREMENT` como identidad.
2. **Versión por contenido para distinguir idéntica de distinta.** El
   `sha256` del contenido canónico de la fila es lo que D4-A necesita para
   clasificar «misma revisión, mismo contenido → idéntica» frente a «misma
   revisión, contenido distinto → conflicto». La revisión ordena; el hash
   compara.
3. **Conflicto declarado, no descartado.** `reconcileReasoningRulesForSync`
   es la forma: el elemento en conflicto queda marcado y recuperable, y el
   informe lo nombra.
4. **Respaldo previo antes de reemplazar o unir.** Su `pre-import` es la
   política que TASK #295 pide para `agent_store.sqlite3` antes de una
   migración o de un merge.

### Dónde THYROX NO copia a OmniRoute

- **Topología.** OmniRoute tiene una autoridad y réplicas de sólo lectura (la
  forma de D4-B). THYROX hoy tiene varias sesiones que escriben la misma base,
  así que D4-A necesita una unión con revisión y conflictos que OmniRoute
  nunca tuvo que escribir. Si D4-B elige una autoridad común, el modelo de
  OmniRoute pasa a aplicar tal cual.
- **Cierre.** El cierre de OmniRoute garantiza la durabilidad del archivo
  local, y un fallo no lo bloquea. El invariante de THYROX
  (`SESSION_CLOSED` ⇒ ningún hallazgo sólo como fila) es de completitud de
  dominio, y por decisión del ejecutor **sí** rechaza el cierre. Coinciden en
  que el dueño es el ciclo de vida, no el transporte.

*Métrica:* lectura del código versionado de OmniRoute en las rutas citadas.
*Ciega a:* cómo se comportan esas rutas en ejecución (no se ejecutó
OmniRoute), y a mecanismos de sincronización que vivan fuera de `src/lib/sync`
y `src/app/api/db-backups`.

## 10. Contrato de D4-A: merge de tres vías con conflictos explícitos (2026-09-29)

Reemplaza el criterio de §7. La corrección que lo cambia: **un contador de
revisión local no representa causalidad entre dos copias que evolucionaron en
paralelo.**

```text
base: rev 11
A:    11 → 12 → 13
B:    11 → 12            (otro cambio)
«13 > 12 → gana A» supone que A incluye a B, y A nunca vio a B:
el cambio de B se pierde sin conflicto.
```

La igualdad de revisión sólo detecta el caso en que los dos lados hicieron el
mismo número de ediciones. Lo que decide es el **ancestro común**, y git ya
lo entrega: el driver `merge=sqlite-union` recibe `<ancestro> <nuestro>
<suyo>`, y hoy `merge_sqlite_union.py` recibe el ancestro y no lo usa (lo
declara su docstring).

### La propiedad no es «determinista»: es «sin pérdida silenciosa»

«Merge determinista» sugiere que siempre sale una fila ganadora, y no es eso.
La propiedad es una **reconciliación de tres vías con conflictos
explícitos**: si puede probar qué cambio aplicar, lo aplica; si los dos lados
cambiaron de forma incompatible, no inventa ganador, declara el conflicto y
conserva las dos versiones.

### Tres clases de campo, declaradas por tabla

| Clase | Qué es | Entra en el hash de dominio |
|---|---|---|
| identidad | la clave global de la fila (`agent_id`, `(task_id, session_id)`, `finding_id`) | no: es lo que empareja las filas |
| contenido de dominio | lo que la fila afirma: estado, sujeto, cuerpo, severidad… | **sí** |
| contabilidad | `revision`, `updated_at`, metadatos de migración y de merge | **no** |

La clasificación se declara por tabla, junto al esquema. Así no se decide
caso por caso. Si el hash incluyera la contabilidad, dos ediciones idénticas
con distinto `updated_at` darían un conflicto falso.

`domain_hash(fila) = sha256(JSON canónico de los campos de contenido)`

### Tabla de decisión, por fila, emparejada por identidad

| Base → nuestro | Base → suyo | Resultado |
|---|---|---|
| igual | igual | sin cambio |
| cambió | igual | nuestro |
| igual | cambió | suyo |
| cambió | cambió, mismo `domain_hash` | la misma modificación, sin conflicto |
| cambió | cambió, `domain_hash` distinto | **CONFLICTO** |
| no existía | sólo un lado inserta | insertar |
| no existía | los dos insertan el mismo contenido | insertar una vez |
| no existía | los dos insertan contenido distinto con la misma identidad | **CONFLICTO** |
| existía | un lado la borra y el otro no la cambió | borrar |
| existía | un lado la borra y el otro la cambió | **CONFLICTO** |

«Cambió» significa `domain_hash` distinto del de la base, no `revision`
distinta.

### El papel de `revision`, acotado

Queda como metadato de evolución local: observabilidad, depuración, detectar
anomalías y, dentro de una autoridad única (D4-B), concurrencia optimista.
**No elige ganador entre copias independientes.** Tampoco `updated_at`, que
es sólo observabilidad (§7 midió que hoy no es un orden fiable).

### Identidad

Toda tabla que viaja entre sesiones tiene identidad global estable.
`findings_history` se empareja por `finding_id`, nunca por su `id
AUTOINCREMENT` local. Eso elimina la colisión y la pérdida del `OR IGNORE`
a la vez.

### Informe del driver

Por tabla: idénticas, insertadas, actualizadas, borradas y conflictos, con la
identidad de cada conflicto. Ningún conflicto real puede degradarse en
silencio a elegir un ganador.

### Respaldo

- **Merge por git:** ancestro, nuestro y suyo ya viven como objetos de git y
  se pueden recuperar. No hace falta copiarlos, pero el driver no reemplaza
  su salida hasta tener un resultado válido.
- **Fuera de git** (`merge_stores.py`, migraciones, importaciones,
  mantenimiento): no hay tres versiones protegidas. Ahí sí se hace respaldo,
  luego la operación, luego `integrity_check`, y sólo entonces se publica.
  Se enlaza con TASK #295.

### Casos TDD obligatorios

1. **El contraejemplo de la revisión:** base con `status = running` (rev 11);
   nuestro `completed` (rev 13, tras dos ediciones), suyo `cancelled` (rev
   12). Tiene que dar **CONFLICTO**, no «gana nuestro». Protege contra que
   alguien vuelva a `max(revision)`.
2. **Misma modificación, contabilidad distinta:** base `running`; nuestro
   `completed` (rev 12, `updated_at` X); suyo `completed` (rev 15,
   `updated_at` Y). Tiene que dar **sin conflicto**. Prueba que la
   contabilidad está fuera del hash.
3. Los dos de §4 (actualización perdida y colisión de `id`), ahora en verde,
   con el control que ya existe.
4. Borrado contra cambio: CONFLICTO.

Y un control de anulación por mitad de juicio: sin el ancestro (tratando la
base como vacía), cae el caso 1; con la contabilidad dentro del hash, cae el
caso 2.

### Por qué esto refuerza D4-B

Esta complejidad existe porque cada sesión escribe su copia y la causalidad
se reconstruye después, con git. Con una autoridad durable común, las
escrituras de `agent_sessions` y `tasks` las serializa la autoridad y no hay
merge entre sesiones. D4-A es la corrección necesaria de la topología de hoy;
D4-B estudia cómo dejar de necesitarla.
