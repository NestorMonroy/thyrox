# descripcion-converge-en-bloque

## La pregunta

`reconcile_status` es lo **único** que recorre el board entero y lo lleva al
store. Escribía `status` y nada más. Entonces, ¿una fila cuya descripción quedó
atrás converge alguna vez?

## La premisa, medida sobre la sesión viva

Pareando las 363 tarjetas contra las filas de la sesión **por sujeto** —que es
la llave que el propio reconciliador usa—:

```
tarjetas=363  emparejadas_por_sujeto=320  sin_fila=42  ambiguo=1
de las emparejadas: drift status=0  description=37
```

El eje del estado ya estaba cerrado. El de la descripción **no lo tocaba
nadie**: `sync_card` lleva las tres columnas desde `thyrox@a75b3300`, pero es
**por tarjeta** y sólo cuando quien llama declara la cita — el board entero no
puede declarar 320 citas.

### El primer instrumento midió el join equivocado

La primera medición pareó **por `task_id`** y publicó `status=127
subject=245 description=247`. Las tres cifras eran correctas y la conclusión
habría sido falsa: `task_id` **no es el ordinal del board** —844 de 1204 filas
llevan uno mayor que 364, y `task_id = '363'` nombra `TASK-API-0205` mientras
la tarjeta #363 es `TASK-THYROX-0020`, cuya fila lleva `task_id` 1208—. Comparar
la tarjeta N contra la fila de `task_id` N compara dos sujetos distintos.

Es la misma premisa falsa que H-DOCS-1260 ya había corregido, cometida otra vez
con el instrumento recién escrito. Lo que la destapó fue rehacer el pareo por la
llave que el código usa, no releer la cifra.

## El diseño: cinco cubos, y cada nombre dice la verdad

| Cubo | Qué significa |
|---|---|
| `same` | no hay nada que escribir **en ninguna columna** |
| `status_drift` | el estado difiere (la descripción puede también; la entrada lo declara) |
| `field_drift` | el estado coincide y **otra** columna no |
| `absent` | la tarjeta no aparea con ninguna fila |
| `ambiguous` | aparea con más de una |

Siguen particionando el universo — la aserción de cobertura lo mide. Lo que
cambia es que `same` ya no contiene tarjetas con trabajo pendiente: antes, una
fila con la descripción atrasada caía ahí y se leía como «al día», que es el
sub-patrón A de `metrica-decide-la-conclusion.md` con el cubo como rótulo.

**`subject` sigue sin escribirse**, y no es una omisión: es la **llave** del
pareo. Reescribirla borraría aquello con lo que se acaba de aparear. La
descripción no es llave, así que puede converger sin ese daño.

**Se escribe SÓLO lo que difiere.** Un `UPDATE` de las dos columnas tocaría
`description` en una fila cuya divergencia era de estado, y con eso el conteo
de escrituras dejaría de decir qué se corrigió.

## Lo que la medición da

| Corrida | Salida | Archivo |
|---|---|---|
| **rojo**, antes del arreglo | `70 aserciones`, 5 fallos: 9a, 9c, 9e, 9f, 9g | `outputs/rojo-antes-del-arreglo.out` |
| **verde**, tras el arreglo | `70 aserciones`, todas pasan | `outputs/verde-tras-el-arreglo.out` |
| **anulación** — `RECONCILED_FIELDS = ("status",)` | los **mismos 5**, ni uno más | `outputs/anulacion-sin-el-eje-de-descripcion.out` |

La tercera es lo que hace del bloque 9 un control: con el código presente y la
causa retirada caen exactamente las aserciones que dependen de ella. Las otras
cinco del bloque —9b, 9d, 9h, 9i, 9j— sobreviven, porque miden el eje del
estado, la partición y la llave, que esta causa no toca.

**La causa que se retira es la CONSTANTE, no una variable del cuerpo.** La
primera versión de este control anulaba `desc_drifted = False` dentro del
recorrido, y caían los mismos cinco — pero eso medía el cuerpo, no el
contrato. `RECONCILED_FIELDS` gobierna hoy las **tres** superficies (el
`SELECT` del pareo, la comparación y el `SET` del `UPDATE`), así que retirar
una columna de la tupla es retirar el eje entero, y el control pasa a medir lo
que la constante promete.

No era un detalle de forma: en la primera versión la constante estaba
**declarada y muerta** —`grep -c RECONCILED_FIELDS` daba **1**, su propia
línea— mientras el cuerpo enumeraba las dos columnas a mano en la comparación
y otra vez en el `SET`. Eso es la segunda fuente de verdad que
`calibration-verified-numbers.md` prohíbe para una cifra, y que este mismo
pase acababa de rehusar en `agent_store.py` importando `UNKNOWN_LAYER` en vez
de copiar el literal `"gen"`. Lo destapó el advisor, no una relectura.

Tras restaurar, `git diff --stat src/task/board_sync.py` da
`1 file changed, 77 insertions(+), 21 deletions(-)`: el cambio intencional y
nada más.

## Lo que NO cierra

Las **42 sin fila** y la **1 ambigua** siguen sin converger, y por diseño: sin
pareja no hay nada que escribir, y con dos parejas escribir sería elegir a
ciegas. Un renombre cae ahí — cambia el sujeto, que es la llave — y esta
medición no dice nada sobre él.

*Métrica:* cada `<ordinal>.json` del board contra las filas de `tasks` de la
misma sesión, por igualdad exacta de `subject`, comparando `status` y
`description` con `None` y `""` normalizados al mismo «sin texto».
*Ciega a:* el renombre, que rompe la llave y cae en `absent`; y a cualquier
columna fuera de las dos declaradas en `RECONCILED_FIELDS`.

## Sucesor

**TASK-THYROX-0022** — esta misma pieza, acuñada al crear su tarjeta.

**NO es TASK-THYROX-0020.** El manifiesto de este banco lo citaba a él, y es
otro escritor: el defecto de la #363 es que `task_ids.py ingerir-board` es
**INSERT-only** (`:639`, con su conjunto `vistos`), así que un cambio de estado
o de sujeto en una tarjeta **ya ingerida** nunca llega al store. Ése es un
universo distinto del de `reconcile_status` —el board entero contra las 1204
filas de la sesión, de las cuales 845 no tienen tarjeta— y sigue abierto.

## Aplicado sobre el store vivo — 2026-09-12T10:58:17

El mecanismo estaba verde y **los datos que existe para corregir seguían sin
tocar**: `sync_card` se había ejercitado por tarjeta (#364, #365), pero
`reconciliar-estados --aplicar` no había corrido nunca contra el store.

```
universo: 364 tarjeta(s) del board
  same             283
  status_drift       1
  field_drift       37
  absent            42
  ambiguous          1
escritas: 38 fila(s)
```

La re-medición **con un recorrido propio** —no el del reconciliador, pareando
por `subject` igual que la premisa de arriba— da el «después»:

| | `drift status` | `drift description` |
|---|---|---|
| antes (320 pareadas) | 0 | **37** |
| después (321 pareadas) | 0 | **0** |

Archivos: `outputs/seco-sobre-el-store-vivo.out`,
`outputs/aplicado-sobre-el-store-vivo.out`,
`outputs/remedicion-pareada-por-sujeto.out`.

Las **42 sin fila** y la **1 ambigua** no se movieron: es lo que la sección
«Lo que NO cierra» ya declaraba.

## El reporte contaba un cubo de dos — descubierto AL aplicar

El modo seco anunciaba **«1 fila(s) quedarían al día»** ante una escritura de
**38**. El núcleo ya derivaba su lote de los dos cubos; el CLI seguía contando
y listando sólo `status_drift`, que era el residuo de cuando el reconciliador
medía una sola columna.

Es la **misma** segunda fuente de verdad que `RECONCILED_FIELDS` cerró un nivel
más abajo, una capa más arriba: la partición escribible se declara ahora una
vez —`DRIFT_BUCKETS`— y la consumen el lote del `UPDATE` y el reporte. La línea
de detalle además publica **qué columnas** difieren y orienta la flecha en la
dirección de la escritura (store → board), no en el orden en que se leyeron.

| Corrida | Salida | Archivo |
|---|---|---|
| **anulación** — el reporte lee sólo `status_drift` | caen **10b, 10c, 10d**, ni una más | `outputs/anulacion-el-reporte-cuenta-un-solo-cubo.out` |

**10e sobrevive a propósito, y ése es el discriminador**: mide la escritura, que
sale del núcleo y no del reporte. Un control que también hubiera caído estaría
midiendo las dos capas a la vez y no diría cuál falló.

*Métrica:* el conteo que el modo seco publica contra el `written` que el mismo
lote produce al aplicar, sobre un fixture con una divergencia de cada clase.
*Ciega a:* un cubo escribible futuro que se añada a `RECONCILE_BUCKETS` y no a
`DRIFT_BUCKETS` — la partición es una declaración, no una derivación.
