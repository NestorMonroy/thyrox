# barrera-del-pool-se-espera-a-si-misma

## Qué se pregunta

`run-task-pool.sh` cerraba con `wait-jobs wait` **sin filtro**, y `cmd_wait`
globea `"$LEDGER"/*.job` — todo el ledger. Lanzado a través de `bg.sh`, el
propio pool está registrado ahí, así que **se esperaba a sí mismo**: nunca
asentaba y agotaba su timeout entero aunque sus hijos ya hubieran terminado.

Episodio que lo origina: el pool `triage2` vivo **7:09** con sus 18 hijos
asentados desde el primer minuto. `wait-jobs status` mostraba los 18 en `OK` y
`triage2` en `VIVO`; su propio log dice *«lanzados 18 de 18; esperando en
PRIMER PLANO (timeout 600s)»*.

## El control que discrimina

Un tercero **vivo y sin marcador** en el mismo ledger (`sentinel`, un
`sleep 300`). Sin él, un pool que ignorase el filtro pasaría igual — el verde
no separaría «espera sólo lo suyo» de «no había nada más que esperar», que es
el sub-patrón D con este mismo test como sujeto.

## Qué se midió

| Archivo | Estado |
|---|---|
| `rojo-antes-del-arreglo.txt` | 2 ok, **3 fallo(s)** — el pool sale 3 (timeout), agota los 25 s, y no recoge sus propios trabajos |
| `verde-tras-el-arreglo.txt` | **5 ok**, 0 fallo(s) |
| `anulacion-retirado-el-only.txt` | 2 ok, 3 fallo(s) — idéntico al rojo |

## El arreglo

`cmd_wait` gana `--only <prefijo>`: globea `"$LEDGER/<prefijo>"-*.job` en vez
de `*.job`. El default **no cambia** — quien llame `wait` a secas sigue
esperando a todo el ledger, y el caso 3 del test lo mide. `run-task-pool.sh`
pasa `--only "$PREFIX"`, que es el mismo prefijo con que compone la etiqueta
de cada hijo (`LABEL="$(printf '%s-%03d' "$PREFIX" "$i")"`).

Deuda pagada al tocar la función (regla de corte): `wait-jobs.sh` tenía la
línea `mk=$(sed -n 's/^marker=//p' "$f")` **duplicada** con indentación rota
dentro de `cmd_wait`. Retirada la copia.

## Anulación quirúrgica

Retirado SOLO el `--only "$PREFIX"` de la llamada del pool, caen **exactamente
las tres** aserciones que dependen de él —el exit 0, el reloj, y la recogida de
sus propios trabajos— y sobreviven las dos que no: que el sentinel siga
registrado y que `wait` sin filtro siga topándose con él. Ni una más.
Restaurado, las cinco pasan.

## Subconjunto derivado

```bash
grep -rlE "run-task-pool|wait-jobs|cmd_wait|task_pool|job_ledger" tests/
```

Catorce suites, todas en verde tras el arreglo (sus conteos los publica cada
suite al correr).

## Lo que este banco NO cierra

**Dos pools concurrentes que compartan `--prefix` siguen colisionando.**
`--only` acota por prefijo, no por identidad del pool: dos invocaciones con el
default `job` se ven los trabajos mutuamente. Hoy el mitigante es que el
prefijo se pueda declarar (`--prefix`), no que el mecanismo lo garantice.
Sucesor: **TASK-THYROX-0084**.

*Métrica:* exit code y reloj de pared del pool con un tercero vivo en su mismo
ledger, más el estado del ledger después.
*Ciega a:* la colisión entre dos pools del mismo prefijo (arriba); y a si el
`--only` filtra bien un prefijo que sea prefijo de otro (`lote` contra
`lote2`), que el glob `<prefijo>-*` separa por el guion pero ningún caso mide.
