# audit-consumer-provider-scripts

## El encargo

> Este script .claude/scripts/gates/check_ids_entre_ramas.py ahora debe de
> estar en el provider que es thyrox [...] revisa que scripts tiene el
> provider thyrox que aun sus consumers no usan de manera correcta, primero
> revisa si no existe ya un analisis en THYROX_WORKBENCH o un THYROX_JOBS.

## La premisa, si se corrigio al primer comando

``check_ids_entre_ramas.py`` ya vive únicamente como mecanismo vigente en
``thyrox/src/verify`` y tiene wrapper en ``thyrox/bin``. Las apariciones bajo
``kaupamex-docs/.claude/eventos`` son evidencia histórica que cita su ruta
anterior; no son copias ejecutables vigentes.

Sí existían antecedentes: el propio docstring de ``check_consumer_copies.py``
y el workbench ``pregunta-de-hooks-no-generalizo-a-dependencias`` describen la
frontera provider/consumer. No existía una medición de los cinco checkouts L7
materializados ni una prueba de que el corredor del proveedor hiciera visible
el incumplimiento. Este run mide esa brecha; no abre un segundo instrumento.

## Las piezas

| archivo | que hace |
|---|---|
| ``src/verify/check_consumer_copies.py`` | Compara ``.sh``/``.py`` del proveedor contra cada ``.claude`` consumidor; separa copia idéntica de fork divergente. |
| ``src/verify/runner.py`` | Ejecuta gates registrados con el consumidor como cwd y compone el veredicto. |
| ``src/verify/registry.py`` | Declara el gate ``consumer-copies`` y, tras la corrección, su argumento bloqueante ``--strict``. |
| ``outputs/*-consumer-copies.txt`` | Censo crudo por consumidor. |
| ``outputs/*-runner.json`` / ``*-runner-after.json`` | Control antes/después del mismo gate pasando por el corredor. |
| ``outputs/summary.json`` | Agregado derivado de las cinco salidas crudas. |

## Los resultados

Se midieron 458 archivos en los cinco consumidores: 35 copias idénticas y 46
forks. API y UI tienen 17 copias y 18 forks cada uno; Docs tiene una copia y
10 forks; DB y Server tienen cero archivos ``.sh``/``.py`` bajo ``.claude``.
Ese cero no prueba adopción correcta: prueba ausencia de superficie medible.

El defecto ejecutable estaba en el corredor. Antes de la corrección, los cinco
JSON declaraban ``passed=1`` porque el registro invocaba el gate sin
``--strict``; el gate reportaba las copias pero salía 0. Después de añadir
argumentos declarativos al registro, API, UI y Docs dan ``failed=1``; DB y
Server siguen ``passed=1`` sobre cero archivos, limitación que se conserva en
el veredicto y no se llama adopción.

No se borraron las 35 copias automáticamente. Las 46 variantes requieren
juicio por archivo, y algunas copias son rutas de hooks todavía consumidas por
settings: borrarlas en bloque rompería sesiones. La corrección de este pase
hace que el proveedor deje de ocultarlas; la migración debe sustituir cada
llamada por su wrapper de ``thyrox/bin`` y probar el hook consumidor antes de
retirar el archivo.

*Métrica:* copias/forks/archivos medidos por consumidor y estado del gate visto
por ``runner`` antes/después, sobre los cinco gitlinks L7 materializados.

*Ciega a:* Markdown/JSON copiado, scripts renombrados y modificados, uso de
wrappers desde archivos fuera de ``.claude``, y ausencia total de configuración
en DB/Server. Tampoco decide si un fork es adaptación legítima.
