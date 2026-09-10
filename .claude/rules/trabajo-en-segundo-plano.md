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
