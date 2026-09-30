# Historial de ejecuciones de parallel_map

Una carpeta por texto de comando (`command-<hash>`), con un `runs.jsonl` que
escribe `src/session/parallel_map_history.py` a través de `pool_history.record`:
una fila por ejecución medida con GNU Time. La siguiente ejecución del mismo
comando deriva de ahí cuánta RAM reserva cada ítem antes de correr.

- **Cómo se regenera:** no se regenera; crece con cada ejecución de
  `bin/parallel_map`. Borrarlo sólo hace que la siguiente ejecución arranque
  sin nada que reservar.
- **Ruta alterna:** `THYROX_PARALLEL_MAP_HISTORY_DIR`.
- **Lo que NO vive aquí:** las reservas vivas. El registro de RAM
  comprometida (`THYROX_RAM_ADMISSION_LEDGER`) es estado por pid y se retira
  solo cuando no queda ninguna reserva viva.
