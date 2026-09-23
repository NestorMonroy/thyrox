# Interprete que lee stdin: por que un comando promovido acaba en «Terminated»

Episodio: la linea que escribia `hallazgo-H-THYROX-156` llevaba un
`.venv/bin/python` desnudo. En primer plano sale al instante (stdin cerrado);
el cliente la promovio a segundo plano, donde stdin es un tubo que nadie
cierra, y el interprete espero para siempre. Se mato su pid y el shell imprimio
`Terminated`; el resultado nunca se recogio porque el comando nacio fuera del
ledger (sin marcador) — la forma de `adopt-external` en
`trabajo-en-segundo-plano.md`.

Medido (`measured-background-stdin.txt`): en segundo plano el python desnudo
sale 124 con `timeout 10`; con `</dev/null` sale 0.

Gate: `src/hooks/detect_stdin_reading_interpreter.py`, registrado en
`pretooluse_dispatch.DETECTOR_NAMES`. Avisa, no bloquea.

Anulacion (`suite.txt`): con `has_provided_input` forzada a `False` caen
exactamente heredoc, tubo y redireccion; guion y `-c` siguen callando.
La primera version no discriminaba dos de los tres (solo inspeccionaba la
primera etapa del tubo, y no saltaba el destino de `<`): el control lo destapo.

Metrica: casos de la suite, veredicto del detector por forma.
Ciega a: un interprete que lea stdin por otra via (p. ej. `input()` dentro
de un guion) y a interpretes fuera de la lista `_INTERPRETER`.

## Corrección 2026-09-23: la línea tenía DOS intérpretes desnudos

`.venv/bin/python 2>/dev/null` (pid 4203) y `.venv/bin/python - 2>/dev/null`
(pid 4264). Se mató sólo el primero y el episodio se dio por cerrado sin
esperar la notificación de la tarea; el segundo siguió esperando stdin
46 minutos, hasta que el ejecutor preguntó. Se mató primero el shell padre
(4199) para que la última etapa no duplicara la fila de H-THYROX-156 en el
índice, luego 4264; la tarea se recogió con `exited with code 1` y el índice
quedó con una sola fila.

El detector no era el hueco: la sección 8 de la suite reproduce la línea y
nombra los dos, callando el tercero (que recibe heredoc). El hueco era de
recogida: matar un proceso hijo no es recoger la tarea. La tarea está
recogida cuando llega su notificación o su marcador, no cuando muere un pid.
