# Un comando largo va a segundo plano; un subagente es otra cosa y cuesta

Un comando cuya duración estimada supere el medio minuto **no se espera en
primer plano ni se delega a un subagente**: se lanza como proceso y se recoge
con la barrera. El mecanismo ya está construido en este árbol y tiene tres
piezas, una por forma del problema:

| Forma | Pieza | Qué hace |
|---|---|---|
| un trabajo | `src/session/bg.sh` | `start` lo lanza detached con log e id · `wait` bloquea · `status` da `running`/`done:<exit>` |
| N trabajos con anchura acotada | `src/session/run-task-pool.sh` | una línea = un comando; registra cada uno en el ledger |
| la barrera de N | `src/session/wait-jobs.sh` | bloquea hasta que **todos** se asienten, con veredicto por trabajo |

Debajo están los primitivos: `background.spawn_detached`, `job_ledger`,
`marker_wait` y `task_pool`.

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
bash src/session/wait-jobs.sh register b "$LOG_B" --after-ok a --run "<comando>"
bash src/session/wait-jobs.sh dispatch     # mueve la cadena; no bloquea
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
bash tests/session/test-wait-jobs-dependencia.sh
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
bash src/session/wait-jobs.sh adopt-external --id <task-id> --log <ruta>
```

`adopt-external` engancha el marcador que el propio cliente escribe
(`[exited with code `) en vez del nuestro. Medido en el episodio que originó
esta sección: proceso vivo, `.output` con `mtime` congelado desde el arranque
—o sea que un instrumento de `mtime` lo habría llamado «atascado» mientras
trabajaba, que es `H-DOCS-1004` un nivel más arriba— y **0** trabajos en el
ledger hasta adoptarlo.

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
