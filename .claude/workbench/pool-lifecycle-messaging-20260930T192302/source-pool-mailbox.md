# TASK-THYROX-0672 — Connect the pool lifecycle to the durable peer mailbox

Análisis: `README.md` de este banco (primera parte). El transporte es
`bin/inbox` (`src/peer_mailbox/inbox.py`): durable, un archivo por
destinatario, `post/pending/wait/ack`, deduplicación por `request_id`. Léelo
completo antes de escribir.

## Qué se pide (TDD)

1. **Cada ejecución del pool tiene su buzón** en su runtime
   (`<runtime de la ejecución>/mailbox`, creado por `pool_lifecycle open-run`).
   `headless-pool.sh` lo exporta a cada ítem como `THYROX_MAILBOX_DIR`, junto
   con `THYROX_POOL_ITEM_ADDRESS=item-<n>` (el nombre del destinatario del
   ítem), y lo imprime en su cabecera (`buzón: <ruta>`) para que el
   orquestador lo encuentre.
2. **`pool_lifecycle` deja un sobre al destinatario `orchestrator`** en cada
   cambio: `begin`, `transition`, `claim`, `publish` y `close-run`. Cuerpo
   JSON con ítem, estado, generación y hora; `request_id` estable
   (`<run>:<item>:<evento>:<generación>`) para que un reintento no duplique.
   Reutiliza el módulo de `peer_mailbox`; no escribas un segundo formato.
3. **El ítem lee y responde.** `headless-pool.sh` antepone al prompt del
   ítem (antes de la plantilla del usuario) un párrafo fijo que le dice: entre
   paso y paso, `bash bin/inbox --dir "$THYROX_MAILBOX_DIR" pending --as
   "$THYROX_POOL_ITEM_ADDRESS"`; aplicar y acusar (`ack`) lo que llegue; y
   para una pregunta o un bloqueo, `bin/inbox post --from <su dirección> --to
   orchestrator`. El párrafo es una constante con nombre, probada.
4. Un pool sin mensajes se comporta igual que hoy (ningún cambio de salida
   salvo la línea `buzón:`).

## Controles

- `pool_lifecycle`: cada evento deja exactamente un sobre; repetir el mismo
  evento con la misma generación no duplica; un `claim` con generación nueva
  sí deja otro.
- `headless-pool` (con el doble de `thyrox -p` que ya usan sus suites): el
  ítem recibe `THYROX_MAILBOX_DIR` y su dirección, y el prompt lleva el
  párrafo; un mensaje enviado al ítem antes de que el doble lo lea aparece
  como pendiente para él.
- Anulación, con números: retirar el `post` de `transition` hace caer
  exactamente su caso.

Te pertenecen sólo los archivos del ítem; `bin/inbox` y `src/peer_mailbox/`
se usan, no se modifican.
