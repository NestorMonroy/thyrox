# task-qualification

## El encargo

<!-- verbatim, sin parafrasear -->

> adelante con la cualificación de Qwen en TDD

## La premisa, si se corrigio al primer comando

Se suponía que bastaba correr `local-models-qualify` sobre Qwen. No: el
recomendador exige dos cualificaciones aprobadas —`protocol` y
`task:<clase>` (`modelQualification.ts::qualifiedModels`)— y **ningún código
producía una de tarea**: el tipo `kind: 'task'` existía y la única suite era
`tool-calling@1`. Sin esta tarea, Qwen nunca sería elegible aunque pasara el
protocolo.

Diseño: las clases de tarea son una escala de dificultad compartida por el
recomendador, el pool y el catálogo de Claude; una clase `traduccion` la rompe.
El consumidor cualifica la clase que ya usa (`analisis`) con SU suite y en SU
archivo de cualificaciones (`THYROX_MODEL_QUALIFICATIONS`, parámetro del
consumidor): la aprobación vale para él, y el id de la suite dice qué se midió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/src/taskSuite.ts` | `loadTaskSuite`/`scoreTaskReply`: casos del consumidor con comprobaciones `includes`, `excludes`, `excludes-pattern`; rehúsa al leer un caso sin comprobaciones, un patrón roto o una clase ajena |
| `probes/src/qualifyModel.ts` | `measure` común; `runQualification` (protocolo) y `runTaskQualification` (tarea, `kind: 'task'` con su `taskClass`) |
| `probes/apply_command.py` | `local-models-qualify --suite SUITE.json`: lee la suite antes de pedir admisión |
| `probes/*.test.ts` | las pruebas nuevas, tal como se añadieron |
| `probes/red.sh`, `probes/green.sh`, `probes/annul.py`, `probes/baseline_commands.sh` | rojo, verde, anulaciones y la línea base de `commands.test.ts` |

## Los resultados

| Paso | Resultado | Evidencia |
|---|---|---|
| rojo | `taskSuite` y `qualifyModel` no cargan (módulo ausente); 1 caso de `qualifyCommand` falla | `outputs/red-*.txt` |
| verde | taskSuite 7/7, qualifyModel 11/11, qualifyCommand 6/6, qualificationStore 5/5 | `outputs/green-*.txt` |
| paquete | 219 pasan, 5 fallan: los 5 de `local-models-qualify` en `commands.test.ts`, que fallan IGUAL en HEAD sin el cambio (18/5) | `outputs/commands-*.txt`, H-THYROX-317 |

| Anulación | Cae |
|---|---|
| aceptar un caso sin comprobaciones | sólo «un caso sin comprobaciones se rehúsa» |
| un patrón roto no rehúsa al leer | sólo «un patrón que no compila se rehúsa al leer» |
| cualquier clase es válida | sólo «una clase que no es de thyrox se rehúsa» |
| `excludes-pattern` siempre se cumple | «nombra cada comprobación que falla» y «un caso que falla suspende» |
| la tarea se registra como protocolo | las dos que exigen `kind: 'task'` con su clase |
| `--suite` se ignora | las dos de `--suite` del comando |

Una prueba de `qualifyCommand` pasaba en rojo por el motivo equivocado: «una
suite ilegible se rehúsa» rehusaba porque `--suite` era un argumento
desconocido. Se endureció para exigir que el error nombre el archivo; con
`suite-plan` anulado, cae.

*Metrica:* pruebas que caen en rojo, en verde y bajo cada anulación.
*Ciega a:* el modelo real: la medición contra Qwen es el paso siguiente.
