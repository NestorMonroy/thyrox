# La recuperación que toma un ítem sube su generación

La arquitectura 1.0.1 fija el contrato de la generación: si la recuperación
toma un ítem, su generación pasa de N a N+1, y un proceso que conserve N ya
no puede actuar sobre él. El código daba una generación al arrancar el ítem
y la comparaba sólo contra la ya publicada; nada permitía tomar el ítem, y
`transition` y `publish` no preguntaban quién actuaba.

- `pool_lifecycle claim` toma un ítem `ABANDONED_RECOVERABLE`, bajo el
  candado de la salida: generación nueva (mayor que la del estado y que la
  publicada) y dueño nuevo.
- `transition` y `publish` aceptan `--generation`; si no es la vigente,
  rehúsan con `StaleGenerationError` (exit 5 por la línea de órdenes).
- `headless-pool` presenta la generación del ítem en sus dos transiciones de
  foto y en la publicación.

Evidencia en `outputs/`:

- `red.txt`: la prueba nueva (caso 7h) sin `claim`.
- `green.txt`: 55 de 55.
- `nullified-guard.txt`: con la guarda de generación vaciada caen
  exactamente las cuatro aserciones del rechazo (51 de 55).
- `shell-red.txt`: caso 4 de `test-headless-pool-lifecycle`, con el pool
  aún sin presentar su generación: el pool publica un ítem que ya es de la
  recuperación (22 de 26). Es el control de anulación del cableado.
- `shell-green.txt`: 26 de 26.
- `regress.txt`: regresión del pool, lanzada con `thyrox-bg` (`regress.sh`).
