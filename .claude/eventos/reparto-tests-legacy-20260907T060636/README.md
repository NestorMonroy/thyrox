# Los rojos del reparto de `tests/legacy`, rescatados de `/tmp`

El agente de #227 dejó el resultado de su ejecución en lote en
`/tmp/sh_results.txt`, que la directiva vigente prohíbe —`.claude/eventos/` es
el hogar— y que además muere con el contenedor. Rescatado aquí antes de que
eso ocurriera: sin este archivo, la lista de qué suites de shell volvieron en
rojo tras el reapuntado no se podría reconstruir sin repetir la ejecución
entera.

Es el mismo defecto que `build-logs.md` ya registra: un `.log` es tan durable
como el contenedor, así que la evidencia que sostiene una afirmación se
persiste en el repositorio, no se cita desde un directorio volátil.

`rojos-sh-repoint.txt` es la salida verbatim, con código de salida y conteo de
líneas por suite. El triaje de esos rojos NO está hecho — la tarea permitía
citarlos en vez de arreglarlos, y su sucesor queda registrado.
