# ERR-001 — leí el `.output` de un subagente como señal de vivacidad

**Afirmé:** «los agentes llevan 43-72 min sin escribir», con la implicación de
que estaban detenidos.

**Medido:** los tres `.output` pesan **110 bytes** y su `mtime` es la del
spawn (07:23 / 07:28 / 07:52 contra las 08:38 de la medición). Son stubs que el
harness escribe una vez al lanzar, no un registro de progreso.

**Contra-evidencia del mismo turno:** dos agentes re-crearon su banco después de
mi barrido de las 08:27, y uno mandó un `SendMessage` a las 08:37. Estaban vivos.

**Por qué el instrumento no podía ver el fenómeno:** el discriminador real es el
symlink al transcript en el roster, y para estos tres **no existe**. La `mtime`
de un archivo que nadie reescribe no mide actividad — mide cuándo se creó.

**Quién lo delató:** el ejecutor — *«si los agentes llevan mucho tiempo sin
escribir, porque aun estan activos?»*.

**Sucesor:** `TASK-DOCS-0532`.
