# execution-roster-liveness — TASK-THYROX-0781

## El encargo

<!-- verbatim, sin parafrasear -->

> No quiero crear otro mecanismo para esto. Primero reutiliza y compón lo que
> Thyrox ya tiene.
>
> 1. Todo controller job debe registrarse automáticamente en el ledger.
> 2. `thyrox-bg status` no debe presentar `kill -0` como prueba suficiente de progreso.
> 3. Extiende/compon `roster` con `stdin_probe`, `writer_inspector`, `process_ownership` y observación de la ExecutionUnit.
> 4. Añade diagnóstico explícito de zombie.
> 5. Añade progreso por deltas de CPU/output/writers.
> 6. Haz que `TaskContinuationController` consuma ese verdict para producir `stalled` cuando esté realmente demostrado.
> 7. No construyas otro scheduler ni otro sistema de supervisión paralelo.
>
> Para este intento actual no intervengas antes del timeout declarado.
> No quiero que una sola señal decida `stalled`.

Directiva del ejecutor, 2026-10-02.

## La premisa, si se corrigio al primer comando

El encargo nombraba `orphan_task`, `stdin_probe`, `writer_inspector`,
`process_ownership`, `thyrox-bg`, `wait-jobs` y `observe`. Medido en
`src/roster/` hay más, y dos de esas piezas ya resuelven parte del encargo:

| pieza | qué ya hace | qué falta |
|---|---|---|
| `src/roster/process_liveness.py` | veredicto por PID con causa: `dead_pid`/`procstart_mismatch`/`zombie`/`live`, leído de `/proc/<pid>/stat` | aplicarlo al ÁRBOL del trabajo y a la unidad, no a un PID suelto |
| `src/roster/production.py` | separa «vivo» de «avanza» | sólo para transcripts de agente; no para un árbol de procesos (CPU, bytes, escritores) |
| `src/roster/job_liveness.py`, `descriptor_liveness.py` | vivacidad sin PID | no aplican a un job con PID |
| `src/roster/orphan_task.py` + `bin/stdin_probe` | árbol de un trabajo y lectura de stdin | no se componen con lo de arriba |

Es EXTEND sobre `process_liveness` + `production`, no un módulo nuevo.

Defectos medidos en el caso real (`mechanism-registry-run3`):

- se lanzó con `thyrox-bg start` sin `register`: `wait-jobs probe` → «ledger vacío»;
- `thyrox-bg status` = `kill -0` sobre el pidfile (`src/session/bg.sh:574`): `running`, que un zombie también satisface;
- el controlador declara `stalled` en `TRANSIENT_OUTCOMES` (`task_continuation.py:106`) y ningún detector lo publica;
- el tercer intento de deepseek fue `secret_exposure_detected`, no un 502: incidente aparte, fuera de este banco.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/fixture-attempt4-observation.json` | observación real del intento 4 (qwen3.8-flash): fixture de «vivo, no zombie, sin progreso observado, espera de E/S externa» |

## Los resultados

Veredicto a mano del intento 4, sin intervenir antes de su `timeout 2700`:
`alive=true · zombie=false · progress=not observed · external I/O wait observed · cause=unknown`.

**Corregido 2026-10-02T07:40Z — el progreso se medía en el archivo equivocado.**
`probes/delegate.sh` escribe el stream-json **al terminar**; su 0 no dice nada.
El progreso estaba en el transcript, escrito turno a turno: 89 turnos, 666 865
bytes, último turno 07:29:33; el 502 llegó a las 07:32:03. Veredicto corregido:
`alive=true · zombie=false · progress=observed · stall=false · cause_of_502=unknown`.
Consecuencia para el contrato: los destinos de salida de `output_delta` se
DECLARAN por tipo de trabajo (aquí, el transcript), no se infieren de los
descriptores 1 y 2 del proceso.

El tamaño solo ya está refutado como causa del 502 por una medición previa
(`managed-podman-execution-boundary-20261001T164746/outputs/p2-provider-502-size.txt`:
344 447 tokens de entrada responden 200; ciega a streaming, herramientas y
duración). En el último turno bueno el contexto era 114 939 tokens, por encima
del techo de compactación que `delegate.sh` declara (110 000): hecho medido, no causa.

*Metrica:* estado de `/proc/<pid>/stat` de los diez procesos del árbol, canal
de espera de la hoja, CPU acumulada y bytes del stream en dos muestras.
*Ciega a:* qué componente retiene la petición (proveedor, `thyrox -p`, proxy);
y el conteo de TCP establecidas de `/proc/<pid>/net/tcp` es del espacio de red
entero (la unidad usa `--network host`), no de ese proceso.
