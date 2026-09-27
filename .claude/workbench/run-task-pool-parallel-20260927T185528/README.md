# run-task-pool sobre GNU Parallel, y la mutación concurrente

Directiva del ejecutor 2026-09-27: `run-task-pool` tiene que usar GNU
Parallel, no un planificador propio. Antes de este banco el pool lanzaba
cada trabajo con su propio bucle (`ALIVE`, `free_a_slot`, `enforce_memfree`);
la única mención a Parallel era la cita de su regla de admisión
(H-THYROX-220).

## Qué hace ahora cada pieza

| Necesidad | Quién | Forma |
|---|---|---|
| anchura, y su relectura | GNU Parallel | `--jobs <archivo>`; el pool escribe la anchura efectiva y adelanta el mtime |
| cota de memoria | GNU Parallel + `run-task-pool-limit.sh` | `--limit`; la sonda es `mem_available_bytes` de `src/lib/memory.sh` |
| reencolar al matado | GNU Parallel | `--retries`; sólo el TERM por memoria sale 143 |
| drenar | GNU Parallel | SIGHUP (`sub start_no_new_jobs`, `/usr/bin/parallel:5562`) |
| marcador, ledger, GNU Time | `run-task-pool-job.sh` | un envoltorio por trabajo |
| barrera | `wait-jobs wait --only <despacho>` | sin cambios |

## Conductas de Parallel 20231122 medidas antes de usarlas

- `probes/`: SIGTERM mata (exit 255, sin salida); SIGHUP drena
  (`outputs/hup.err`: «No new jobs will be started»).
- `--limit` con salida 2 mata al más joven y **no** lo reencola
  (`outputs/limit2.joblog`, Exitval -1); con `--retries` sí
  (`outputs/limit3.joblog`).
- La consulta de `--limit` es hija directa de Parallel si el comando es
  simple (`sh -c` hace exec): `outputs/limit-trace.log`.
- `--jobs <archivo>` se relee por mtime en **segundos enteros**
  (`stat()[9]`, `:4006`): dos escrituras en el mismo segundo no cuentan como
  cambio. Sin adelantar el mtime, 5 de 6 vueltas corren en serie (pico 1);
  con el adelanto, 6 de 6 solapan (pico 3): `outputs/reread-annul-rounds.txt`.

## La cota de memoria bajo carga

`kill_youngest_if_over_limit` (`:6893`) consulta `--limit` una vez por
trabajo, del más joven al más viejo. Con la consulta devolviendo 2, bajo
carga cayó el más viejo (`outputs/suites-3/`). Guardar la decisión un segundo
lo empeoró: mató a los tres (`outputs/oldest-under-load-2/`). La consulta
ahora elige y señala ella misma al más joven vivo no señalado y sale 1:
6 de 6 vueltas bajo carga sin tocar al más viejo
(`probes/oldest-under-load.sh`, `outputs/oldest-under-load-4/`).

## Mutación concurrente

Bash lee un guion por desplazamiento. Reescrito en su sitio mientras corre
(`cat >`, `bin/replace_literal`, que conservan el inodo), el proceso vivo
sigue leyendo el archivo nuevo desde el byte viejo: lo que abortó el primer
despacho de este banco (`outputs/suites-aborted/`, «syntax error near
unexpected token `elif'»).

- **El guion**: `run-task-pool.sh`, `run-task-pool-job.sh` y
  `run-task-pool-limit.sh` van enteros dentro de `{ … exit; }`, que bash
  analiza completo antes de ejecutar. Anulación (`probes/selfedit.sh
  --sin-bloque`): sin el bloque, la misma reescritura da exit 2, ningún
  marcador y `syntax error: unexpected end of file`.
- **El árbol medido**: la huella de `src/verify/tree_fingerprint.py` —la de
  `tests/run.sh`— se toma al empezar y al terminar; si difiere, exit 5 y
  «ÁRBOL MUTADO». Anulación (`probes/tree-moved.sh --sin-comparacion`): el
  mismo trabajo que muta el árbol sale 0.

## Suites

`outputs/suites-4/`: las cuatro del pool, la de admisión de VRAM, las dos de
GPU y `headless-pool`, a la vez y por el propio pool. Todas en verde salvo el
caso de relectura, cuya aserción era de reloj de pared; se cambió por el
solape leído del joblog (pico ≥ 2), que no depende de la carga.

*Métrica:* aserciones de las suites y joblog de GNU Parallel.
*Ciega a:* la memoria de trabajos reales (la suite usa un `/proc/meminfo`
sintético) y la admisión de RAM entre dos trabajos admitidos en el mismo
instante: `--limit` comprueba sin reservar, y como `run-task-pool` no conoce
el pico de un comando arbitrario no tiene qué reservar. Lo cubre la mitad de
aplicación (matar al más joven). La VRAM sí reserva: `gpu_monitor.admit`
comprueba y reserva bajo `shared_lock`.
