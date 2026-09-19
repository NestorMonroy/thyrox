# Un comando largo va a segundo plano; un subagente es otra cosa y cuesta

Un comando cuya duración estimada supere el medio minuto **no se espera en
primer plano ni se delega a un subagente**: se lanza como proceso y se recoge
con la barrera. El mecanismo ya está construido en este árbol y tiene tres
piezas, una por forma del problema:

| Forma | Pieza (dónde vive) | Se invoca | Qué hace |
|---|---|---|---|
| un trabajo | `src/session/bg.sh` | `bin/thyrox-bg` | `start` lo lanza detached con log e id · `wait` bloquea · `status` da `running`/`done:<exit>` |
| N trabajos con anchura acotada | `src/session/run-task-pool.sh` | `bin/run-task-pool` | una línea = un comando; registra cada uno en el ledger |
| la barrera de N | `src/session/wait-jobs.sh` | `bin/wait-jobs` | bloquea hasta que **todos** se asienten, con veredicto por trabajo |

Debajo están los primitivos: `background.spawn_detached`, `job_ledger`,
`marker_wait` y `task_pool`.

**Se invoca por el nombre corto, no por la ruta al fuente.** `bin/` está
**versionado** —no se genera al clonar—, así que `bash "$T/bin/<nombre>"`
funciona en un clon recién bajado sin ningún paso previo. La ruta a
`src/session/**` es la **definición**; el envoltorio resuelve `THYROX_ROOT`
desde su propia ubicación y exporta `PYTHONPATH`, que es justo lo que una
invocación por ruta no hace: `python3 src/session/job_runs.py` muere con
`ModuleNotFoundError` porque `job_runs` es **biblioteca** —la consume `bg.sh`—
y ni siquiera tiene superficie de CLI.

Dos precondiciones, declaradas porque su ausencia es ruidosa y no silenciosa:
un envoltorio de un `.py` exige el entorno del proveedor y **rehúsa con exit 2
nombrando `uv sync`** si falta; y `bg` a secas colisiona con el builtin de
bash, de ahí `thyrox-bg`. `bin/` **no** está en `PATH` por defecto: se invoca
con ruta relativa a la raíz de thyrox, o se copia a `~/.local/bin` con
`python3 src/session/generate_bin.py --install-user-bin` —conveniencia para un
shell interactivo, nunca precondición—. Que `bin/` esté al día lo publica
`python3 src/session/generate_bin.py --check`.

## Por qué un subagente NO es «segundo plano»

Son dos mecanismos con costes de órdenes distintos, y confundirlos es caro en
una dirección sola:

- **Un trabajo en segundo plano es un proceso.** Cuesta **cero tokens**. No
  tiene conversación, no relee contexto, no hereda el piso de instrucciones.
- **Un subagente es una conversación.** Paga **en frío** el piso siempre-cargado
  —126 029 tokens medidos (`H-DOCS-99`)— y lo paga **por turno**; el 98.07 % de
  su consumo es caché releída (n = 313 con telemetría). Un agente de 21+ turnos
  cuesta ~18× uno de 1-3.

De ahí el criterio, que no es de estilo: **el agente rinde cuando el trabajo es
ancho y exige juicio**. Una suite, un gate, un censo, un barrido determinista —
cualquier cosa cuyo resultado no dependa de decidir nada— es un proceso, y
despachar un agente para eso es pagar una conversación por un `exit code`.

## Antes de elegir el instrumento de espera: ¿cómo se lanzó?

> Añadida por el ejecutor 2026-09-18, que la formuló como la pregunta que
> faltaba: *«¿por qué no te haces esta pregunta: cómo ejecutaste el
> proceso?»*. Medido antes de escribirla: esta regla mencionaba `pgrep` cero
> veces y `wait "$pid"` cero veces, y las tres reglas de espera de los
> consumidores tampoco — así que quien las lee no tiene cómo saber que el
> caso más simple existe.

La procedencia decide el instrumento, y decide **antes** de escribir ningún
patrón:

| Cómo se lanzó | Instrumento | Da el código de salida | Puede auto-casar |
|---|---|---|---|
| lo lanzó **el shell que espera** | `wait "$pid"` | **sí** — es su valor de retorno | no: no hay patrón |
| lo lanzó **un pool propio** | `run-task-pool` / `wait-jobs wait` bloquean solos | sí, por trabajo | no |
| es **ajeno**, u otro turno | `marker_wait --pid-only`, o `pgrep '[p]atron'` | **no** — de ahí el marcador | sí, si el patrón va desnudo |

**El discriminador NO es `nohup`/`disown`.** Medido en tres invocaciones:

```text
sleep 1 & pid=$!; wait "$pid"                    -> exit=0   (hijo)
wait 5910   # lo lanzó otro shell                -> «pid 5910 is not a child
                                                    of this shell», exit=127
nohup sleep 2 & pid=$!; disown $pid; wait "$pid" -> exit=0   (sigue siendo hijo)
```

`disown` no rompe `wait`: el shell sigue cosechando a su hijo. Lo que lo rompe
es el cruce de **proceso** — que espere un shell distinto del que lanzó. Y ése
es exactamente el diseño de este árbol: el trabajo sobrevive al turno, así que
el shell que lanzó ya no existe cuando alguien pregunta.

De ahí la razón de ser del marcador que `bg.sh` escribe, que hasta ahora se
usaba sin declararla: **es el sustituto en espacio de usuario del código de
salida que `wait` habría dado**. Un `wait_for_pid` que observa `/proc` puede
decir *terminó* y nunca *cómo*; eso no es una carencia de su implementación,
es la frontera del tercer caso.

**Y en el tercero, el patrón NUNCA va desnudo.** `pgrep -f` compara contra la
línea de comando **completa**, y el `bash -c` que ejecuta la espera lleva el
patrón como argumento propio: casa consigo mismo y el bucle no termina nunca.
La clase de corchetes es la forma canónica del oficio —`'[p]atron'` casa el
texto `patron` y no el texto `[p]atron`, que es lo que la propia línea
lleva—. El gate que lo ataja es `src/hooks/detect_self_matching_pgrep.py`;
el episodio, `H-THYROX-103`.

*Métrica:* código de salida y stderr de `wait` en las tres formas, en
invocaciones separadas.
*Ciega a:* si el shell que lanzó sigue vivo cuando alguien pregunta — la
condición que decide entre la fila 1 y la 3, y que no se lee del pid.

## La barrera no es opcional

Un trabajo lanzado y no recogido es peor que uno no lanzado: el turno cierra
creyendo que terminó. Por eso cada lanzamiento se registra en el ledger y el
Stop gate bloquea mientras quede algo sin recoger. Se sale de ahí de dos
maneras, y **abandonar en silencio no es una de ellas**: se espera, o se declara
el abandono con `forget`.

«Pendiente» significa **no recogido**, no «no terminado». Un trabajo que ya
escribió su marcador sigue pendiente hasta que alguien lea su resultado: medir
la terminación del proceso en vez de la recogida mide el fenómeno equivocado.

### Recoger NO es bloquear — y bloquear anula el segundo plano

> Directiva del ejecutor 2026-09-10: *«¿con la barrera en primer plano? pero
> queremos seguir trabajando en el primer plano, para eso están las tareas en
> 2do plano»*. Correcta, y corrige una lectura de esta misma sección.

La barrera es **obligatoria al cerrar**, no **inmediata al lanzar**. Su episodio
de origen fue un resultado que nadie leyó, no un turno que no se detuvo: lo que
falla es cerrar con algo sin reclamar, no seguir trabajando mientras corre.

Entre lanzar y recoger se trabaja. Hay tres formas de recoger y sólo una
bloquea:

| Forma | Cuándo | Bloquea |
|---|---|---|
| la **notificación** del cliente cuando el trabajo termina | sola, sin pedirla | no |
| `wait-jobs.sh status` / `pending` al ir a cerrar | cuando el turno va a terminar | no |
| `wait-jobs.sh wait` en Bash primer plano | cuando el **resultado** es lo siguiente que se necesita | sí |

La tercera es legítima **sólo en ese caso**: el trabajo siguiente depende del
resultado y no hay nada más que adelantar. Usarla justo después de lanzar
convierte el segundo plano en un primer plano lento.

**Y ordenar no exige bloquear.** Si B depende de A, la arista se declara **al
lanzar** y el primer plano queda libre — la forma de `qsub -W depend=afterok`:

```bash
bash bin/wait-jobs register b "$LOG_B" --after-ok a --run "<comando>"
bash bin/wait-jobs dispatch     # mueve la cadena; no bloquea
```

`register --after-ok <pred> --run <cmd>` **no lanza nada**: escribe la arista en
el `.job` y el trabajo queda `BLOQUEADO`. `dispatch` lee el veredicto del
predecesor y **lanza** si fue OK, **cancela nombrándolo** si fue BAIL, o lo deja
esperando si aún vive. Un `CANCELADO` ya no retiene el turno; un `BLOQUEADO` sí,
porque su trabajo aún está por hacer.

**El control que discrimina** es el predecesor que falla: un dependiente que
simplemente *no arranca* es indistinguible de uno que nunca se registró, así que
`dispatch` tiene que **decirlo y nombrar al predecesor**. Medido con `dispatch`
anulado a no-op: caen exactamente las cinco aserciones que dependen de que la
cadena se mueva, y sobreviven las cuatro que miden el registro — ni una más
(`.claude/workbench/dependencia-al-lanzar-20260910T232832/`).

```bash
bash tests/session/test-wait-jobs-dependency.sh
```

Antes de esto (medido 2026-09-10) `afterok|depend|blockedBy` daba **0 hits** en
`wait-jobs.sh`, `job_ledger.py` y `task_pool.py`: el único modelo era «lanza N,
espera a todos», que **obligaba** a bloquear para ordenar. Cierra
**TASK-THYROX-0011**.

### Un trabajo que el cliente PROMUEVE no puede llevar marcador

Un comando lanzado en primer plano que agota el tiempo del cliente **se
promueve** a segundo plano. La promoción ocurre *después* de fijar la línea de
comando, así que el patrón `…; echo EXIT=$?` no se pudo aplicar: ese trabajo
**nunca** llevará el marcador, y `marker_wait` no puede separar «murió sin
escribirlo» de «sigue corriendo».

Además nace **fuera del ledger**: el Stop gate no lo ve, así que es huérfano por
construcción. La salida es adoptarlo por su identificador, no re-lanzarlo:

```bash
bash bin/wait-jobs adopt-external --id <task-id> --log <ruta>
```

`adopt-external` engancha el marcador que el propio cliente escribe
(`[exited with code `) en vez del nuestro. Medido en el episodio que originó
esta sección: proceso vivo, `.output` con `mtime` congelado desde el arranque
—o sea que un instrumento de `mtime` lo habría llamado «atascado» mientras
trabajaba, que es `H-DOCS-1004` un nivel más arriba— y **0** trabajos en el
ledger hasta adoptarlo.

### `bg.sh` y `wait-jobs.sh` componen SIN que el marcador se transcriba a mano

`bg.sh` no escribe `EXIT=` — escribe su propio marcador (`_MARK` en el
guion), distinto del que `wait-jobs.sh` busca por defecto. Registrar un
trabajo de `bg.sh` en la barrera con `wait-jobs.sh register` a secas
reproduce H-THYROX-07: el marcador real existe en el log y la barrera declara
BAIL porque busca otro. La corrección no es documentar el patrón del marcador
en esta prosa — eso es justo la forma que `calibration-verified-numbers.md`
prohíbe para una cifra, y aquí sería una CADENA que vive en código
transcrita a mano, con el mismo riesgo de quedar desactualizada. La
corrección es que `bg.sh` mismo componga el `--marker`, con dos subcomandos
que no existían hasta TASK-THYROX-0028:

```bash
bash bin/thyrox-bg start suite --grace 0 -- <comando-largo>
bash bin/thyrox-bg register suite      # compone el --marker correcto solo
bash bin/wait-jobs wait --timeout 1800
```

`bg.sh register <nombre>` resuelve el log y el pid del trabajo ya lanzado
(los mismos que `status`/`wait`/`log` usan) y llama a
`wait-jobs.sh register` con `--marker "$(bg.sh marker-pattern)"` — el patrón
sale de la misma constante que el propio `bg.sh` usa para escribirlo, nunca
de una copia. Quien compone a mano sigue pudiendo hacerlo
(`bg.sh marker-pattern` imprime el regex suelto), pero `register` es la forma
que no puede desincronizarse porque deriva del mismo origen que escribe el
marcador.

## El gate — porque una regla sin script es prosa

`src/hooks/detect_foreground_long_command.py`, cuarto detector de
`pretooluse_dispatch`. Dispara sobre `Bash` y avisa cuando el comando invoca una
familia larga —suite, build, gate de corpus, migración— **en posición de
comando** y no viaja ya por un ensamblador ni por un `nohup` propio.

```bash
uv run pytest tests/hooks/test_detect_foreground_long_command.py -q
```

**Avisa, no bloquea.** El juicio de si este comando concreto es largo lo tiene
quien lo escribe: un patrón léxico no separa `pytest x::test_a` —segundos— de la
suite entera. Bloquear con un instrumento que no discrimina sería el sub-patrón
D con el gate como sujeto.

**Sus dos guardas se probaron por anulación, y la primera vez el control no
discriminó.** Al retirar el descuento de «ya va en segundo plano» la suite
siguió en verde: era código muerto, porque el anclaje a posición de comando ya
silenciaba los tres casos que el test usaba. La forma que sí lo exige es el `&`
final —no es separador de segmento— y está ahora en la suite. Retirado el
anclaje cae el caso de `grep -rn pytest`; retirado el descuento cae el del `&`;
ni una aserción más en ninguno de los dos.

## El segundo gate: ¿proceso o agente? — al DESPACHAR

El detector de arriba mide un **comando** y pregunta «¿primer plano o segundo
plano?». No ve el otro lado de la misma decisión: el despacho de un subagente
para trabajo que es un proceso. Medido antes de cerrarlo: **cero** detectores
veían el tool `Agent`, y el matcher de `PreToolUse` del consumidor sólo cubría
`Write|Edit|MultiEdit` y `Bash`.

`src/hooks/detect_agent_dispatch.py`, quinto detector de
`pretooluse_dispatch`, dispara sobre `Agent` cuando el prompt (o su
descripción) invoca una **familia determinista** —suite, gate, build, censo o
barrido, búsqueda mecánica, migración— **y** no nombra ningún verbo de juicio.

```bash
python3 tests/hooks/test_detect_agent_dispatch.py
```

**La mitad de juicio es la que carga el peso, y su control lo mide.** Sin ella
el aviso saldría en todo despacho que mencione un comando, incluido el análisis
que sí necesita un agente. Retirada —`needs_judgment` a `False`— caen
**exactamente** las dos aserciones que dependen de ella y ninguna más
(`.claude/workbench/proceso-o-agente-al-despachar-20260911T014945/`).

**Avisa, no bloquea**, por la misma razón que su hermano: un patrón léxico no
separa «corre la suite y dime el conteo» de «corre la suite y decide qué rojos
son regresión». La mitad de juicio acota el falso positivo; no lo cierra.

**Su cableado es parámetro del consumidor** (DEC-04): el matcher `Agent` vive
en el `settings.json` de cada clon, no en el proveedor. Y hereda la precondición
de `H-DOCS-1010`: bajo el harness remoto, con cwd en `/home/user`, un
`settings.json` de directorio adicional aporta `CLAUDE.md` y `.claude/rules/`,
**no hooks**. Mientras eso siga así el detector existe y no dispara — la regla
sigue siendo la que gobierna, y este párrafo es su declaración de inercia.

## El tercer gate: el recorrido tiene COTA — y es otro eje

Los dos gates de arriba miden el **despacho**: uno pregunta «¿primer plano o
segundo plano?» y el otro «¿proceso o agente?». Ninguno ve un tercer defecto de
la misma familia, que no es *largo* sino **sin final**: un recorrido recursivo
sin cota —`glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True)`— sobre
una raíz pesada.

Esa forma **no falla: gira**. Agota el tiempo de primer plano, el cliente la
**promueve** a segundo plano —con lo que además nace fuera del ledger, por la
sección de arriba— y ahí queda, sin resultado, sin error y sin final. Lo caro
no es el proceso, que cuesta cero tokens: son los turnos de quien lo descubre,
lo diagnostica y lo mata.

`detect_foreground_long_command` calla con razón: pelado a su programa, ese
comando es `-` —la forma vive dentro de un heredoc, no en posición de comando—
y ninguna familia larga coincide. Es otro eje, no un hueco de aquél.

### El mecanismo: `src/session/bounded_scan.py`

```bash
bash bin/bounded_scan /home/user/thyrox --name '*.sqlite3'
```

Poda `.git`, `node_modules` y los cachés de build; tiene tope de entradas y
plazo de pared; y **declara su corte** por `exit 3` más un aviso por stderr, en
vez de imprimir una salida parcial que se lea como completa.

**No poda `.cache` ni `_references`**, y las dos exclusiones son deliberadas:
el `.claude/.cache` del cliente es telemetría que se analiza, y `_references`
son los corpus vendorizados contra los que se construye. Los dos son **sujeto**
de análisis, no volumen que estorbe — un instrumento que los salta por defecto
queda ciego justo a lo que se le pregunta. Quien necesite saltarlos lo pide con
`--prune`.

El piso siempre disponible, para cuando el recorrido tiene que ser ése:
anteponer **`timeout 60`**. Es coreutils, está siempre, y funciona aunque
ningún hook cargue.

### El gate

`src/hooks/detect_unbounded_traversal.py`, décimo detector de
`pretooluse_dispatch`. **Mide dos familias, y sus condiciones NO son las
mismas** — h-thyrox-29 las separó midiendo, después de que el detector las
tratara como una sola bajo el rótulo «sin cota» (el sub-patrón A de
`metrica-decide-la-conclusion.md`, con este gate como sujeto).

| Familia | Formas | Condición para avisar |
|---|---|---|
| **1 — coste LINEAL** en el tamaño del subárbol | `rglob`, `os.walk`, `grep -r`, `find` sin profundidad, `ls -R` | la forma **y** una raíz pesada |
| **2 — coste COMBINATORIO** por el grafo de enlaces | `glob(…, recursive=True)`, `walk(…, followlinks=True)`, `find -L`, `grep -R`, `rg -L`, `du -L`, `tar -h` | **la forma sola** |

**La familia 1 exige las dos condiciones, y sigue siendo lo correcto para
ella:** con la forma sola el aviso saldría sobre `src/**/*.py` —milisegundos—
y un aviso que sale siempre se aprende a ignorar; con la raíz sola saldría
sobre un `cat`. Un `grep -r` sobre `odoo-tools` —861 555 entradas— es un
timeout real, y ahí el peso de la raíz **sí** discrimina.

**La familia 2 avisa sin condición de raíz, porque el peso de la raíz no
discrimina ese fenómeno.** Medido: `src/packages/agent` tiene **369 entradas**
—la raíz más ligera del árbol— y `glob(…, recursive=True)` **no termina en
30 s** sobre ella, mientras `odoo-tools` con **861 555** termina en **15.51 s**.
Lo que explota es el abanico de enlaces —844 symlinks bajo `src/`, 137 de
workspace en 21 paquetes, abanico hasta 18—, acotado por `ELOOP` a los 41
saltos: explosión combinatoria, no bucle infinito. Aplicarle la condición de
raíz era un **falso negativo medido**: el comando que gira sobre una raíz
ligera pasaba en silencio.

**Cuál sigue enlaces y cuál no está medido por conducta, no supuesto.** Sobre
un árbol con un enlace a directorio: `grep -r` da 0 hits y `grep -R` da 1;
`find` 0 y `find -L` 1; `rg` 0 y `rg -L` 1. De ahí que `-r` viva en la familia
lineal y `-R` en la de giro, que a simple vista parecen la misma bandera.

Los **descuentos** callan lo ya acotado, y sólo aplican a la familia 1:
`--include`, `--exclude-dir`, `-maxdepth`, `-prune`, el índice de git, la poda
in situ de `os.walk`, y `timeout N`.

**`rg` cuenta como acotado, y eso está medido, no supuesto.** Respeta
`.gitignore` y salta los ocultos por defecto: en este árbol visita **14 067**
archivos contra **50 190** con `--no-ignore --hidden` — una cota real de 3.6×
que no hay que pedir. Por eso es descuento y no ceguera. Pero **el descuento se
retira** cuando el comando desactiva la cota: `rg --no-ignore` recorre lo mismo
que un `grep -r` pelado, y tratarlo como acotado sería confiar en el nombre del
programa en vez de en lo que el comando hace. Y `rg -L` **no** lo recibe: sigue
enlaces, así que entra por la familia 2 antes de llegar al descuento.

La familia de **proceso** que este árbol prescribe —`awk`, `sort`, `uniq`,
`comm`, `cut`, `paste`, `xargs`, `wc`— **no lleva patrón propio, y es
deliberado**: ninguno recorre un árbol. Lo que los vuelve caros es de dónde les
llega la entrada, y esa entrada es siempre una de las formas de arriba. Marcar
el literal `awk` no separaría `awk '{s+=$1}' censo.tsv` —instantáneo— de `awk`
alimentado por `find /` —que no termina—, y eso sería medir el consumidor para
concluir sobre el productor.

```bash
python3 tests/hooks/test_detect_unbounded_traversal.py
python3 tests/session/test_bounded_scan.py
```

**Sus cuatro guardas se probaron por anulación** —el eje de raíz, la familia de
enlaces, el descuento y el descuento de `timeout`—, y cada una carga su peso:
al retirarla caen **exactamente** los casos que dependen de ella, ni uno más.
Qué casos son lo publica la suite al correr, no esta prosa: es propiedad de un
artefacto que crece (`calibration-verified-numbers.md`). Los controles
positivos **no son fabricados**: el de la familia 1 es el comando real del
episodio citado verbatim, y el de la familia 2 es el `glob` sobre
`src/packages/agent` que h-thyrox-29 midió sin terminar.

**Avisa, no bloquea**, como sus hermanos: un patrón léxico no distingue un
`os.walk` con poda escrita tres líneas más abajo de uno sin ella.

**Y hereda la misma inercia declarada que su hermano quinto.** Medido en esta
sesión: `/home/user/.claude/settings.local.json` declara `SubagentStart`,
`PreModelSwitch` y `SubagentStop` — **ningún `PreToolUse`**. Así que hoy este
detector existe y **no dispara aquí**. La capa que sí protege sin hooks es el
mecanismo y el `timeout`, y por eso el aviso nombra los dos.

## Por qué esta regla vive aquí

Medido 2026-09-10T05:15:22: de las cinco reglas de THYROX, **ninguna** nombraba
el mecanismo; y los `long-running-commands.md` de los consumidores enseñan el
`nohup` **a mano** —8 hits en docs, 1 en api, 1 en ui— sin nombrar **ninguno**
de los tres ensambladores que este árbol ya entrega. Así que quien carga esas
reglas aprende a copiar el patrón, no a invocar la herramienta.

Es la tercera vez que aparece la misma forma —ERR-063 y ERR-069 son las otras
dos—: una directiva que sólo vive donde no gobierna. THYROX es el **productor**;
la regla vive aquí y los consumidores la heredan.

*Métrica:* archivos de `.claude/rules/` que contienen `bg.sh`, `run-task-pool`,
`wait-jobs`, `nohup` o «segundo plano», por árbol.
*Ciega a:* un consumidor que invoque los ensambladores desde un guion sin
nombrarlos en una regla —el conteo mide la prosa que gobierna, no el uso real—,
y a `db` y `server`, que no llevan ese archivo.
