# Historial de ejecuciones de headless-pool

Una carpeta por plantilla (`template-<hash>`), con un `runs.jsonl` que
escribe `src/session/pool_history.py`: una fila por ejecución medida con
GNU Time. La siguiente ejecución de la misma plantilla deriva de ahí el TTL de
caché y `--memfree` cuando nadie los declara.

- **Cómo se regenera:** no se regenera; crece con cada ejecución de
  `bin/headless-pool`. Borrarlo solo hace que la siguiente ejecución arranque
  sin nada que derivar.
- **Ruta alterna:** `HEADLESS_POOL_HISTORY_DIR`.
