# Contrato — TASK-THYROX-0770: un veredicto de vivacidad y progreso para los trabajos del controlador

Rige el encargo verbatim del README. Regla de diseño: **EXTEND** de
`src/roster/process_liveness.py` y `src/roster/production.py`; ningún
scheduler ni supervisor nuevo. Una sola señal nunca decide `stalled`.

## Vocabulario

Hechos (`ExecutionRoster.observe(job)`): `alive`, `zombie`, `container_running`,
`process_states` (todo el árbol, de `/proc/<pid>/stat`), `cpu_delta`,
`output_delta` (bytes de los destinos de salida del árbol), `writer_delta`
(`writer_inspector`), `children_delta`, `wait_channels`, `stdin` (`stdin_probe`),
`owner` (`process_ownership`), `unit` (`podman-execution observe`),
`last_progress_at`, `timeout_at`. Cada hecho declara si se midió o no
(`unmeasured` ≠ `0`).

Veredictos, deterministas sobre los hechos de DOS muestras separadas por una
ventana declarada:

| veredicto | condición |
|---|---|
| `dead` | ningún proceso del árbol vive y no hay unidad viva |
| `zombie` | algún proceso del árbol en `Z`, o la raíz en `Z` |
| `running_progress` | `cpu_delta`, `output_delta`, `writer_delta` o `children_delta` > 0 por encima del umbral declarado |
| `waiting_external` | vivo, sin progreso, hoja en un canal de espera de E/S (`ep_poll`, `do_select`, `sk_wait_data`…) y aún sin agotar `stall_after` |
| `suspected_stall` | vivo, sin progreso en N ventanas consecutivas ≥ `stall_after`, cualquier canal de espera |
| `unknown` | algún hecho necesario `unmeasured` |

`suspected_stall` no es `stalled`: el controlador sólo publica `stalled`
según 6. El caso real (`outputs/fixture-attempt4-observation.json`) da
`waiting_external` antes de `stall_after` y `suspected_stall` después; nunca
`zombie` ni `dead`.

## Requisitos

- **R1 — el controlador registra cada trabajo en el ledger.** Todo
  `thyrox-bg start` que lanza `task_continuation` (el run entero y cada
  intento) queda registrado con `thyrox-bg register`. Rojo primero: una
  prueba que lanza un run de controlador con un doble y falla si
  `wait-jobs probe`/`status` no lo lista.
- **R2 — `thyrox-bg status` no presenta `kill -0` como progreso.** Conserva el
  token `running` para sus consumidores, documentado como `alive`; añade
  `thyrox-bg observe <nombre>` que imprime el veredicto de R3.
  **Bloqueado** hasta que P2d (TASK-THYROX-0743) sea aceptada: toca
  `src/session/bg.sh`, que hoy lleva su WIP.
- **R3 — `ExecutionRoster.observe`.** Extiende `process_liveness` del PID al
  árbol y a la unidad, y `production` de transcripts a procesos (CPU, bytes,
  escritores, hijos). Compone `orphan_task.descendants_of`, `stdin_probe`,
  `writer_inspector`, `process_ownership` y `podman-execution observe`;
  ninguno se reimplementa. CLI `bin/execution_roster observe <job> [--window S]`.
- **R4 — zombie explícito** sobre el árbol completo (`/proc/<pid>/stat`
  campo 3 == `Z`). `kill -0` no cuenta. Prueba con un zombie real (hijo que
  sale sin ser cosechado).
- **R5 — progreso por deltas.** Pruebas con dobles: CPU sube y bytes no
  (progreso); nada sube con hoja en `ep_poll` (`waiting_external`); nada sube
  N ventanas (`suspected_stall`); un hecho sin medir (`unknown`).
- **R6 — el controlador consume el veredicto.** `wait_for_job` pregunta a R3
  en cada latido; publica `stalled` sólo con `suspected_stall` sostenido hasta
  `stall_after` declarado en el plan del banco (por ítem o por defecto), y lo
  registra con sus hechos. `waiting_external` sigue esperando hasta el
  timeout. Ninguna inspección privada en el controlador.

## Control de anulación

Por requisito: retirar la pieza hace caer exactamente sus pruebas. En R5, sin
el término de CPU cae el caso «CPU sube, bytes no»; en R4, con `kill -0` en
lugar de leer `stat`, cae el caso del zombie.

## Fuera

Causa del silencio del intento 4 (proveedor, `thyrox -p`, proxy): no se
clasifica sin medición. El incidente `secret_exposure_detected` de deepseek:
otro banco. El reinicio o la parada de un trabajo: ya lo cubren
`process_ownership drain` y `podman-execution reconcile-orphans`.
